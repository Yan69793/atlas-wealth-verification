# Pesquisa de marca (Fase 0, Task 9)

Data: 2026-07-18. Autoria: Szuchmacher Consultoria. Escopo: mapear o campo e
trazer uma shortlist com riscos. A escolha final do nome é do operador.

`[Fato]` verificado em fonte primária, `[Hipótese]`, `[Risco]`, `[Recomendação]`.

---

## 1. Colisões já mapeadas, confirmadas em fonte primária

| Nome | Empresa | Segmento | Risco |
|---|---|---|---|
| AtlasFive® | Eton Solutions | ERP de family office, EUA (eton-solutions.com/solutions/atlasfive) | Alto. Símbolo ® visível, plataforma integrada de family office (contabilidade, GL, reporting) |
| ATLAS | Holland Mountain | Plataforma de dados para private equity, Europa (hollandmountain.com/atlas) | Médio-alto. Nicho adjacente (private capital data), fora do Brasil |
| Atlas PAS | Britech | Portfolio Accounting System, **Brasil** (britech.global) | **Muito alto.** Mesmo país, mesmo mercado (sistema de gestão/controle de carteiras), usado em back/middle office de assessorias e gestoras |

**Conclusão sobre "ATLAS":** as três colisões confirmadas, especialmente a Britech (nacional, mesmo nicho), tornam o nome atual inviável para registro e para uso comercial sem risco de confusão ou disputa. Reforça a recomendação já registrada em `estrategia-produto-icp.md`: decisão de marca bloqueia a Fase 1.

---

## 2. Candidatos pesquisados

Tema de busca: verificação, auditoria, precisão, confiança, no vocabulário
financeiro/técnico em português (o produto é PT-BR primeiro).

| Candidato | npm | Domínio .com.br / .com | Colisão encontrada | Veredito |
|---|---|---|---|---|
| **Lastro** | livre | `.com.br` ocupado | **Direta e grave**: Lastro (lastro.com.br) é DTVM/administradora fiduciária de **30 anos**, atua em custódia e escrituração de fundos — vizinhança regulatória exata do ATLAS | **Descartado** |
| **Prumo** | livre | `.com.br` ocupado, `.com` livre | **Direta e grave**: "Prumo Capital" é gestora de recursos independente com wealth management e gestão de carteiras internacionais (prumocapital.com.br); "Prumo Logística" é grande empresa nacional (portos/data centers) | **Descartado** |
| **Zelo** | ocupado | `.com` ocupado (empresa de IA/dev, EUA, sem relação) | Nenhuma no nicho financeiro; domínio e npm ocupados por terceiro não relacionado | Viável com variante (ex.: "Zelo Wealth", domínio alternativo) |
| **Confere** | livre | não verificado | Nenhuma colisão de marca encontrada; aparece só como verbo comum em buscas | **Candidato forte** — nome descritivo do produto (confere = verifica), memorável, curto |
| **Atesta** | livre | não verificado | Nenhuma colisão de marca encontrada | **Candidato forte** — evoca atestado/certificação, tom institucional |
| Crivo | ocupado (npm) | não verificado | Não aprofundado | Candidato secundário, checar antes de avançar |
| Aferir | livre | `.com.br` livre, `.com` ocupado | Não aprofundado | Candidato secundário |
| Verus | ocupado (npm) | não verificado | Nome já comum internacionalmente (Verus Group, Verus Investments existem no mercado americano) | Descartado por uso genérico no setor financeiro internacional |

---

## 3. Shortlist final (3, por risco crescente)

1. **Confere** — nenhuma colisão encontrada, npm livre, nome autoexplicativo
   para o produto (verificação de carteira). Risco: palavra comum em
   português, pode ter uso não-registrável isolado sem qualificador (ex.:
   "Confere Wealth", "Confere Verification").
2. **Atesta** — nenhuma colisão encontrada, npm livre, tom mais institucional
   que "Confere", combina bem com o conceito de selo/trilha de auditoria já
   implementado no relatório. Mesmo risco de palavra comum.
3. **Zelo** — domínio/npm ocupados por empresa não relacionada (baixo risco
   de confusão real, já que é outro país e outro setor), mas exige variante
   de domínio ou negociação/compra do domínio principal.

---

## 4. Limitação desta pesquisa

`[Risco]` **Não foi possível consultar o INPI de forma automatizada.** O
sistema pePI (busca.inpi.gov.br) é uma aplicação Java com sessão stateful que
trava em acesso automatizado (timeout em teste via browser headless nesta
sessão). A pesquisa acima cobre npm, domínio e colisão de marca via busca web
— não confirma registro/pedido de marca ativo no INPI nas classes 9 (software)
e 42 (SaaS).

`[Recomendação]` Antes de decidir e, principalmente, antes de qualquer
depósito de marca: rodar a busca manual em busca.inpi.gov.br para os 2-3
candidatos finais (classes 9 e 42), e confirmar handle disponível nas redes
(Instagram, LinkedIn) para o escolhido. Isso é rápido manualmente e evita
gastar advogado de marca num nome que já falha no primeiro filtro.

---

## 5. Próximo passo

Registrar aqui a escolha (quando o operador decidir) e propagar para
`CLAUDE.md`/`AGENTS.md` do projeto, conforme já apontado em
`estrategia-produto-icp.md` §5, Task 9, Step 4. Sem isso, a Fase 1 não começa.
