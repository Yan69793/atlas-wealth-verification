# Validação — regra de conciliação de PL e rentabilidade

Versão do `audit-engine` nesta validação: `1.0.0` (`audit-engine/package.json`).
Data: 2026-08-30.

Este documento existe porque a lógica de conciliação de patrimônio foi
investigada como candidata a "otimização" e o resultado real foi outro: o
algoritmo já é O(1) por carteira (nenhum loop, nenhuma busca em array) e a
reconciliação entre meses já usa `Map` para comparar os dois períodos, O(n).
Não havia nada de performance para corrigir. O que fica registrado aqui não é
uma mudança de código, é a especificação formal da regra, para que "por que
esta carteira foi marcada" tenha resposta reproduzível sem precisar ler o
código-fonte toda vez.

## `pl-conciliacao` (`audit-engine/src/rules/pl-conciliacao.ts`)

**Fórmula:**
```
esperado = plBase + compras − vendas + eventos − impostos
diff     = |plRef − esperado|
tolAbs   = plRef × toleranciaPL
```
Dispara alerta quando `diff > tolAbs` **e** `plRef > 0`.

**Invariantes:**
- Sem `carteira.total`, a regra não avalia nada (retorna vazio). Nenhuma
  outra regra alerta a ausência do total hoje (verificado em 2026-08-30, a
  regra mais próxima, `continuidade.ts`, também se cala com campo nulo), então
  uma carteira sem movimentação extraída passa pela conciliação sem finding.
  Limitação conhecida e registrada, não comportamento validado.
- `compras`, `vendas`, `eventos`, `impostos` ausentes em `total` contam como
  zero (`?? 0`), nunca como erro de conta.
- `plRef <= 0` nunca dispara, mesmo com `diff` grande. Não é bug: carteira
  zerada ou negativa não tem base percentual para medir divergência contra.

**Casos-limite e exemplo reproduzível** (mesmos números do teste, em
`audit-engine/tests/pl-conciliacao.test.ts`):

| Cenário | plBase | plRef | total (compras/vendas/eventos/impostos) | Resultado |
|---|---|---|---|---|
| Sem total | — | — | (total ausente) | nenhum finding |
| Dentro da tolerância | 1.000.000 | 1.001.500 | 0/0/0/0 | nenhum finding (diff 1.500 ≤ tolAbs ≈3.004) |
| Acima da tolerância | 1.000.000 | 1.010.000 | 0/0/0/0 | alerta (diff 10.000 > tolAbs ≈3.030) |
| `plRef` ≤ 0 | 1.000.000 | 0 | 0/0/0/0 | nenhum finding (guarda de `plRef > 0`) |
| Campos ausentes no total | 1.000.000 | 900.000 | (nenhum dos quatro presente) | alerta (defaulting pra 0 confirmado, não vira `NaN`) |

## `rentabilidade` (`audit-engine/src/rules/rentabilidade.ts`)

**Regra, em ordem de precedência:**
1. Book offshore (`_OFF`) com `rentRef === null` → alerta de limitação de
   formato conhecida, não bloqueia liberação.
2. `rentRef === 0` ou `null` (fora do caso 1) → erro, requer verificação.
3. `rentRef < -0.15` → alerta de variação negativa extrema.
4. Nenhuma das anteriores → nenhum finding.

**Caso-limite e exemplo reproduzível** (mesmos números do teste, em
`audit-engine/tests/rentabilidade.test.ts`):

| Cenário | rentRef | Resultado |
|---|---|---|
| Variação negativa extrema | -0,20 | alerta ("variação negativa extrema") |
| Fronteira exata | -0,15 | nenhum finding (`<` estrito, não `<=`) |
| Caso normal | 0,08 | nenhum finding |

## Reconciliação entre meses (`audit-engine/src/snapshot/pipeline.ts`, `reconciliar()`)

Compara o snapshot do período atual contra o anterior usando `Map` indexado
por nome de carteira (`mapaAnt`, `mapaNovo`), O(n) no total de carteiras.
Produz três fatos, sem julgamento: carteiras novas (chave em `mapaNovo`,
ausente em `mapaAnt`), carteiras sumidas (o inverso), e carteiras em comum com
o delta de PL entre os dois períodos. Sem período anterior, não grava nada,
porque não existe o que reconciliar.
