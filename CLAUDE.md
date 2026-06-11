# CLAUDE.md — Instruções obrigatórias para agentes

Estas regras valem para qualquer agente que trabalhe neste repositório.

## Segurança de dados (LGPD)

- Nunca adicionar ao Git a pasta `Verificação Mensal de Carteiras Mirabaud/`
- Nunca versionar PDFs, DOCX, XLSX, ZIPs ou quaisquer dados reais/LGPD
- Se esses arquivos aparecerem em `git status`, investigar e corrigir o `.gitignore` antes de prosseguir

## Autenticação

- A autenticação atual é demo/cosmética — senha `atlas2026` verificada no lado cliente via localStorage
- Não tratar como autenticação real; não confiar nela para controle de acesso

## Antes de finalizar qualquer mudança

1. Rodar `git status` — working tree deve estar limpo (exceto pelas mudanças intencionais)
2. Rodar `npm test` — todos os checks devem passar antes do commit

## Testes

- Não criar features novas sem manter `tests/validate.js` atualizado quando aplicável
- Checks de integridade estrutural são mínimos; não removê-los sem aprovação explícita do operador

## Encoding

- Todos os arquivos devem estar em UTF-8 sem BOM
- Não usar encoding alternativo (Latin-1, Windows-1252)
- Verificar ausência de mojibake após qualquer reescrita de arquivo
