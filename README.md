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

## Riscos conhecidos

| Risco | Severidade | Observação |
|---|---|---|
| Autenticação localStorage (sem backend) | Médio | Demo apenas — não usar em produção |
| CDN sem fallback local | Baixo | App falha se unpkg.com offline |
| `innerHTML` no módulo de relatório | Médio | Entrada deve ser confiável (dados internos) |
| App sem bundle empacotado | Baixo | Babel compila JSX no browser em cada carregamento |
