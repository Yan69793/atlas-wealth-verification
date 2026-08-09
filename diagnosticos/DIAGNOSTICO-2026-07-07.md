# DIAGNÓSTICO — atlas-wealth-verification
**Data:** 2026-07-07 BRT
**Alvo:** Repositório local `atlas-wealth-verification` (remote: `github.com/Yan69793/atlas-wealth-verification`, branch limpa, HEAD `7e5f6ad`)
**Método:** auditoria generalista — Bloco A (descoberta) escopado à varredura solicitada: mapear todas as referências ao nome de um vínculo profissional anterior do operador no repositório, já que este é o repositório oficial do produto Atlas
**Modo:** `--readonly` (só coleta; nenhuma correção aplicada nesta auditoria)

## 1. Descoberta e drift

- `git status --short`: working tree limpo, sem alterações pendentes
- `git log -1 --oneline`: `7e5f6ad Revert "feat: score de qualidade da verificação no dashboard e detalhe da carteira"`
- Pasta local de dados reais de cliente (gitignored, LGPD): **não existe neste checkout** — sem dados reais em risco
- Arquivo `platform-data-real.js` (gitignored): **não existe neste checkout**

## 2. Varredura de referências ao nome residual (case-insensitive, repositório inteiro)

8 arquivos com ocorrências:

| Arquivo | Ocorrências | Natureza |
|---|---|---|
| `platform-data.js` | 10 | Nome de função, variável global, id/nome de gestor demo, comentários |
| `tests/validate.js` | 9 | Chamadas de função em teste, descrições de teste, comentário de seção |
| `platform-parsers.js` | 4 | Nome de função, comentários de bloco |
| `platform-import.jsx` | 2 | Call-site de função, comentário |
| `README.md` | 2 | Prosa (nome de pasta LGPD, formato de PDF suportado) |
| `PENDENCIAS.md` | 3 | Prosa (registro histórico de achados já resolvidos) |
| `CLAUDE.md` | 1 | Regra de LGPD (nome de pasta) |
| `.gitignore` | 1 | Nome de pasta ignorada |

Nenhuma ocorrência em `index.html`, `package.json`, ou nos demais arquivos `platform-*.jsx`/`.css`.

## 3. UI / Playwright

Não aplicável — escopo desta auditoria foi varredura de conteúdo estático, sem alvo HTTP/produção nem interação de UI a validar.

## 4. Segurança

Não aplicável ao escopo desta varredura.

## 5. Infra

Não aplicável — projeto estático sem Worker/deploy neste checkout.

## 6. Automação

`npm test` (`tests/validate.js`) é o único pipeline de validação do repositório; usado como gate de regressão no plano de remediação.

## 7. Problemas (P0/P1/P2/P3)

- **P2 — Identidade residual de vínculo profissional anterior em código, testes e documentação.** O nome aparece hardcoded em função pública, variável global, função interna, id/nome de gestor demo e em 4 arquivos de documentação/config. Sem risco de segurança ou de dados (não há dados reais no checkout), mas o produto é "Atlas" e não deveria carregar nomenclatura de um vínculo profissional encerrado.

## 8. OK sem ação

- Nenhum dado real/LGPD exposto ou versionado
- `.gitignore` já protege corretamente a pasta e o arquivo de dados reais (apenas o nome precisa de ajuste, não a regra em si)
- Testes cobrem 100% dos identificadores a renomear — safety net adequado para o rename

## 9. Próximos passos

Plano de remediação executado, com diffs por arquivo/linha e checkpoints de `npm test`. Resultado registrado em
[`DIAGNOSTICO-2026-07-15.md`](DIAGNOSTICO-2026-07-15.md).
