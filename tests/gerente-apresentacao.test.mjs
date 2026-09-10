/**
 * Rótulo de gerente na tela.
 *
 * O defeito que este arquivo tranca, medido em produção em 2026-09-10: a tela
 * de Oportunidades mostrava o código técnico do gerente (`AXIOM_AM`) na coluna
 * de gerente, na tela e em todo CSV. A causa não foi a tela — foi o dado: os
 * conjuntos auxiliares do demo gravaram o gerente como código, antes da
 * renomeação, e a tela passou a não reconhecer aquele valor.
 *
 * Então o que se testa aqui é a costura entre as três pontas, que é onde esse
 * tipo de defeito nasce: o de-para canônico existe, os nomes de destino existem
 * de verdade na lista de gerentes, e nenhuma tela renderiza o código cru.
 * Testar só a função não pegaria nada disto.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');
const ler = (nome) => fs.readFileSync(path.join(RAIZ, nome), 'utf8');

const CODIGOS_TECNICOS = ['AXIOM_AM', 'BEACON_WM', 'CREST_FO', 'DELTA_PB'];

const utils = ler('platform-utils.jsx');
const data = ler('platform-data.js');
const oportunidades = ler('platform-oportunidades.jsx');

/** Remove comentário de linha e de bloco, para o teste olhar código vivo. */
function semComentario(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');
}

const PAGINAS = fs.readdirSync(RAIZ)
  .filter((f) => /^platform-.*\.jsx?$/.test(f))
  .map((f) => ({ nome: f, codigo: semComentario(ler(f)) }));

describe('gerente: de-para canônico', () => {
  test('o de-para existe, é único e traduz os quatro códigos técnicos', () => {
    assert.match(utils, /const GERENTE_LEGADO = \{/, 'sem a tabela de tradução em platform-utils.jsx');
    assert.match(utils, /function nomeGerente\(valor\)/, 'sem a função de rótulo de gerente');
    for (const codigo of CODIGOS_TECNICOS) {
      assert.match(utils, new RegExp(`${codigo}:\\s*'[a-z0-9-]+'`), `o de-para não cobre ${codigo}`);
    }
  });

  test('cada destino do de-para existe de verdade na lista de gerentes', () => {
    // É o que impede a tabela de envelhecer: se alguém renomear um gerente em
    // platform-data.js e esquecer daqui, o rótulo volta a cair no código.
    const bloco = utils.split('const GERENTE_LEGADO = {')[1].split('};')[0];
    const destinos = [...bloco.matchAll(/:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
    assert.equal(destinos.length, CODIGOS_TECNICOS.length);
    const blocoMgr = data.split('MANAGERS = [\n')[1].split('\n  ];')[0];
    const ids = [...blocoMgr.matchAll(/id:'([^']+)'/g)].map((m) => m[1]);
    for (const d of destinos) {
      assert.ok(ids.includes(d), `o de-para aponta para "${d}", que não existe em MANAGERS (${ids.join(', ')})`);
    }
  });

  test('nenhum gerente tem código técnico como identificador atual', () => {
    const blocoMgr = data.split('MANAGERS = [\n')[1].split('\n  ];')[0];
    for (const codigo of CODIGOS_TECNICOS) {
      assert.ok(!blocoMgr.includes(`id:'${codigo}'`), `${codigo} voltou a ser identificador de gerente`);
    }
  });
});

describe('gerente: nenhuma tela renderiza código técnico', () => {
  test('o código técnico não aparece em código vivo de tela nenhuma', () => {
    // Código vivo = sem comentário, porque comentário não vai para a tela.
    // O único arquivo autorizado a citar os códigos é o dono do de-para.
    const infratores = [];
    for (const p of PAGINAS) {
      if (p.nome === 'platform-utils.jsx') continue;
      for (const codigo of CODIGOS_TECNICOS) {
        if (p.codigo.includes(codigo)) infratores.push(`${p.nome}:${codigo}`);
      }
    }
    assert.deepEqual(infratores, [], 'código técnico de gerente em código vivo: ' + infratores.join(', '));
  });

  test('a tela de Oportunidades passa o gerente pelo de-para canônico', () => {
    assert.match(oportunidades, /U\.nomeGerente\(id\)/, 'nomeAssessor deixou de delegar para AtlasUtils.nomeGerente');
    assert.match(oportunidades, /\{nomeAssessor\(o\.assessor\)\}/, 'a coluna de gerente deixou de passar por nomeAssessor');
  });

  test('nenhuma tela imprime o campo de gerente cru', () => {
    const crus = [];
    for (const p of PAGINAS) {
      for (const padrao of [/\{o\.assessor\}/, /\{c\.mgr\}/, /\{p\.mgr\}/, /\{row\.mgr\}/]) {
        if (padrao.test(p.codigo)) crus.push(`${p.nome}:${padrao}`);
      }
    }
    assert.deepEqual(crus, [], 'campo de gerente impresso sem tradução: ' + crus.join(', '));
  });
});
