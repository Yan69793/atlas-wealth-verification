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

## Importação de arquivos

A tela `#/importar` está implementada. Os dados importados substituem o conjunto
demo em todas as telas e vivem **somente em memória do navegador** (atualizar a
página recarrega o demo); nada é persistido nem enviado a serviços externos.

Formatos suportados:

- **CSV** (estável): formato tabular próprio — uma linha por ativo, 10 colunas
  obrigatórias. Template em `docs/templates/atlas_template.csv`.
- **XLSX** (estável): primeira aba, mesmas colunas do CSV. Leitor SheetJS
  carregado sob demanda via CDN com SRI.
- **PDF** (**beta/experimental**): books mensais no layout "Relatório Mensal"
  (SmartBrain/Mirabaud). Extração de texto local via pdf.js (lazy-load com SRI,
  processamento no main thread — nenhum dado sai do navegador). Aceita vários
  arquivos de uma vez (1 book = 1 carteira/mês; meses do mesmo código são
  agregados). A UI exibe a prévia do texto extraído, página a página, antes da
  confirmação.

Regras do fluxo de PDF:

- Carteiras de PDF entram sempre com status `COM ALERTA` (o book não traz o
  campo) e perfil de risco default `moderado`, ajustável na pré-visualização.
- Books que não atingem a confiança mínima de extração (código, mês, PL,
  ativos e somas consistentes) **não são importados**: entram no bloco
  "Revisão manual necessária" com os motivos. CSV/XLSX seguem como alternativa.
- Classes do book são mapeadas para as classes da plataforma
  (ex.: `Prefixado` → `CDB`, `RV Global` → `Internacional`), com aviso.
- Dados reais de clientes não devem ser commitados nem adicionados ao Git.

## Riscos conhecidos

| Risco | Severidade | Observação |
|---|---|---|
| Autenticação localStorage (sem backend) | Médio | Demo apenas — não usar em produção |
| CDN sem fallback local | Baixo | App falha se unpkg.com offline |
| `innerHTML` no módulo de relatório | Médio | Entrada deve ser confiável (dados internos) |
| App sem bundle empacotado | Baixo | Babel compila JSX no browser em cada carregamento |
