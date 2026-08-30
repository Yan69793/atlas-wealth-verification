# ATLAS Wealth Verification

Plataforma de verificação mensal de carteiras de investimento — Meridian Advisory.

## Tecnologia

SPA React buildado com Vite. O build gera `dist-app/` a partir de `src/main.jsx`. A ordem de import desse arquivo é o contrato de inicialização do app.

- React 18.3.1
- React DOM 18.3.1
- Recharts 2.12.7
- Chart.js 4.4.0
- Vite (build + dev)

Os overlays de dado real (instância de cliente) ficam fora do bundle. São scripts clássicos injetados em runtime pela instância, nunca compilados para dentro.

## Como rodar localmente

```bash
npm install
npm run dev
# Vite com HMR, abre em http://localhost:5173 por padrão

# build de produção (gera dist-app/):
npm run build

# servir o build localmente:
npm run preview
```

## Como rodar os testes

```bash
npm test
# roda tests/validate.js (estrutural) e a suíte do audit-engine
```

Os testes validam integridade estrutural dos arquivos (sem execução de browser).

## Autenticação

**Este app não autentica ninguém. O perímetro é responsabilidade do deploy.**

Existia aqui uma senha fixa comparada no navegador, com a sessão gravada no
localStorage. Foi removida: a senha estava no bundle, no README e no placeholder
do próprio campo, então qualquer um que tivesse o arquivo já tinha o dado. Ela
sinalizava proteção sem proteger, que é pior do que não ter portão nenhum.

Quem serve este app com dado real precisa pôr autenticação de verdade na frente.
A arquitetura desenhada é Cloudflare Access como perímetro, com um Worker que
valida o JWT do Access por conta própria antes de responder com dado, de modo que
furar o perímetro não baste.

Rodando local com dados sintéticos, não há o que proteger.

## Dados

- **Dados demo/sintéticos**: os arquivos do repositório contêm estruturas de exemplo sem dados pessoais reais.
- **Dados reais ficam fora do Git**: pastas de instância e qualquer PDF/XLSX/relatório com dado de cliente são LGPD e estão no `.gitignore`. Este repositório é o produto; a operação de cada cliente vive em árvore separada.

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
  (SmartBrain). Extração de texto local via pdf.js (lazy-load com SRI,
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
| App sem autenticação própria | Médio | Por desenho. Servir com dado real exige perímetro na frente |
| CDN só para extras lazy-load | Baixo | SheetJS (XLSX), pdf.js (PDF) e analytics carregam sob demanda. Falha de CDN afeta só a importação |
| `innerHTML` no módulo de relatório | Médio | Entrada deve ser confiável (dados internos) |
