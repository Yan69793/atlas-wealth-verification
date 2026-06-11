# ATLAS Wealth Verification

Plataforma de verificação mensal de carteiras de investimento — Meridian Advisory.

## Tecnologia

App estático (HTML + JSX via Babel Standalone + Recharts). Sem etapa de build; rodando diretamente no browser via HTTP server local.

- React 18.3.1 (UMD, CDN)
- Recharts 2.12.7 (UMD, CDN)
- Babel Standalone 7.29.0 (transpile JSX no browser)

## Como rodar localmente

```bash
# Pré-requisito: Python 3 instalado
npm run serve
# Abre em http://localhost:7821
```

Senha demo: `atlas2026`

## Como rodar os testes

```bash
npm test
# equivalente:
node tests/validate.js
```

Os testes validam integridade estrutural dos arquivos (sem execução de browser).

## Autenticação

**A autenticação atual é cosmética / demo.**

A senha `atlas2026` é verificada no lado cliente via localStorage. Não há backend, não há sessão real, não há controle de acesso efetivo. O sistema é adequado apenas para uso interno controlado.

## Dados

- **Dados demo/sintéticos**: os arquivos do repositório contêm estruturas de exemplo sem dados pessoais reais.
- **Dados reais ficam fora do Git**: a pasta `Verificação Mensal de Carteiras Mirabaud/` contém dados operacionais reais (PDFs, relatórios, dados de clientes / LGPD) e está explicitamente ignorada pelo `.gitignore`. Nunca deve ser commitada.

## Próxima etapa: parser de arquivos

A tela `#/importar` já existe, mas hoje é apenas um stub visual. O próximo desenvolvimento deve implementar um parser local/seguro para transformar arquivos de carteira em dados estruturados antes de qualquer gravação no sistema.

Formatos desejados:

- **PDF**: extratos ou books mensais emitidos por custodiante/gestor.
- **XLSX/XLS**: planilhas de posições, movimentações, receitas ou conciliações.
- **CSV/TSV**: arquivos tabulares exportados por sistemas internos.
- **Markdown (`.md`)**: tabelas simples ou notas estruturadas de conferência.
- **JSON**: opcional, útil para integrações futuras e testes automatizados.

Contrato mínimo de saída do parser:

```js
{
  fileName: "Book_Cliente_2026_04.pdf",
  month: "2026-04",
  portfolio: {
    code: "CLIENTE_01",
    name: "Cliente 01",
    currency: "BRL"
  },
  positions: [
    {
      name: "Ativo ou Produto",
      cls: "RF Pós-Fixado",
      institution: "Custodiante",
      quantity: 1000,
      saldoFinal: 123456.78,
      pct: 0.1234
    }
  ],
  totals: {
    pl: 1000000,
    positions: 12
  },
  warnings: [
    "Percentuais não somam 100%; revisar arredondamento ou caixa."
  ]
}
```

Regras funcionais esperadas:

- O parser deve rodar no navegador ou em backend controlado, sem enviar dados reais para serviços externos.
- A importação deve primeiro mostrar uma prévia auditável, com posições, classes, PL total e alertas.
- O usuário deve confirmar antes de incorporar os dados à base da plataforma.
- PDF e Excel precisam de parsers específicos; não assumir que todo PDF terá tabela limpa.
- Campos financeiros devem aceitar formato brasileiro (`1.234.567,89`) e internacional (`1,234,567.89`).
- O parser deve identificar colunas comuns: ativo/produto, classe, custodiante/instituição, quantidade, saldo/valor financeiro e percentual.
- Arquivos com baixa confiança devem ser marcados para revisão manual, não importados automaticamente.
- Dados reais de clientes não devem ser commitados nem adicionados ao Git.

## Riscos conhecidos

| Risco | Severidade | Observação |
|---|---|---|
| Autenticação localStorage (sem backend) | Médio | Demo apenas — não usar em produção |
| CDN sem fallback local | Baixo | App falha se unpkg.com offline |
| `innerHTML` no módulo de relatório | Médio | Entrada deve ser confiável (dados internos) |
| App sem bundle empacotado | Baixo | Babel compila JSX no browser em cada carregamento |
