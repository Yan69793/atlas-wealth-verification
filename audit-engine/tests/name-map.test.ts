/**
 * name-map.test.ts — o mesmo papel escrito de dois jeitos.
 *
 * O extrator do book PDF ora cola as palavras, ora preserva os espaços. São o
 * mesmo fundo, e para o motor são dois ativos e dois emissores. O efeito é
 * sempre na mesma direção: CONCENTRAÇÃO SUBESTIMADA, porque metade da posição
 * fica com outro nome.
 *
 * Medido no dado real da casa em 2026-08-24: 783 grafias duplicadas ao longo da
 * série para 617 papéis canônicos; num único mês, 60 papéis somando 29% do PL,
 * sendo que o maior deles aparecia como 7,58% numa grafia e 1,54% na outra em
 * vez dos 9,12% verdadeiros.
 *
 * Fixtures em memória, root temporário. Nada de LGPD.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chaveDeGrafia, colisoesDeGrafia } from '../src/snapshot/normalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '..', 'src', 'snapshot', 'cli-snapshot.js');

interface PosFixture {
  ativo: string;
  valor: number;
}

function rootComSnapshots(periodos: Record<string, Record<string, PosFixture[]>>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-namemap-'));
  for (const [data, carteiras] of Object.entries(periodos)) {
    const snap = {
      schema: 'snapshot/v1',
      data,
      periodo: data.length === 10 ? 'diario' : 'mensal',
      fonte: 'teste',
      geradoEm: '2026-08-24T00:00:00.000Z',
      engine: { nome: 'atlas-audit-engine', versao: '0.0.0' },
      tenantId: 'teste',
      carteiras: Object.entries(carteiras).map(([nome, posicoes]) => ({
        nome,
        plTotal: posicoes.reduce((s, p) => s + p.valor, 0),
        posicoes: posicoes.map((p) => ({
          carteira: nome,
          ativo: p.ativo,
          classe: null,
          valor: p.valor,
          vencimento: null,
          quantidade: null,
          instituicao: null,
        })),
      })),
    };
    const d = path.join(dir, 'audits', data);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'snapshot.json'), JSON.stringify(snap), 'utf8');
  }
  return dir;
}

function cli(args: string[]): { ok: boolean; saida: string } {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, saida: out };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, saida: (e.stderr ?? '') + (e.stdout ?? '') };
  }
}

const lerMapa = (root: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'name-map.local.json'), 'utf8')) as {
    mappings: Record<string, string>;
  };

describe('chave de grafia', () => {
  it('ignora espaco, acento, caixa e pontuacao', () => {
    assert.equal(chaveDeGrafia('FUNDO X FIC FIM'), chaveDeGrafia('FUNDOXFICFIM'));
    assert.equal(chaveDeGrafia('Debenture Acao'), chaveDeGrafia('DEBÊNTURE AÇÃO'));
    assert.equal(chaveDeGrafia('NTN-B Vencto: 15/05/2029'), chaveDeGrafia('NTN-BVencto:15/05/2029'));
  });

  it('NAO funde nomes parecidos que sao papeis diferentes', () => {
    // Mesmo emissor, vencimentos distintos: um caractere diferente basta.
    assert.notEqual(chaveDeGrafia('CDB BANCO X 2027'), chaveDeGrafia('CDB BANCO X 2028'));
    // Casamento aproximado fundiria estes dois; igualdade exata nao.
    assert.notEqual(chaveDeGrafia('DEB TIETE'), chaveDeGrafia('DEB RDVT TIETE'));
  });

  it('nome sem caractere significativo nao entra em grupo nenhum', () => {
    assert.equal(colisoesDeGrafia(['---', '   ', '...']).size, 0);
  });
});

describe('colisoes de grafia', () => {
  it('agrupa so o que tem mais de uma grafia', () => {
    const g = colisoesDeGrafia(['FUNDO X FIC FIM', 'FUNDOXFICFIM', 'OUTRO PAPEL']);
    assert.equal(g.size, 1);
    assert.deepEqual([...g.values()][0].sort(), ['FUNDO X FIC FIM', 'FUNDOXFICFIM']);
  });

  it('nome repetido identico nao vira colisao', () => {
    assert.equal(colisoesDeGrafia(['A B', 'A B', 'A B']).size, 0);
  });
});

describe('name-map: funde grafia, nunca semelhanca', () => {
  it('elege a canonica por R$ da SERIE inteira, nao do ultimo periodo', () => {
    // "COLADO" domina a serie; "COM ESPACO" ganha só no último mês. Eleger por
    // período produziria A→B num mês e B→A noutro, e o normalize passaria a
    // trocar as duas de lugar para sempre.
    const root = rootComSnapshots({
      '2026-04-30': { CARTEIRA_A: [{ ativo: 'FUNDOXFICFIM', valor: 10_000 }] },
      '2026-05-31': { CARTEIRA_A: [{ ativo: 'FUNDOXFICFIM', valor: 10_000 }] },
      '2026-06-30': { CARTEIRA_A: [{ ativo: 'FUNDO X FIC FIM', valor: 900 }] },
    });
    assert.equal(cli(['name-map', '--root', root]).ok, true);
    const m = lerMapa(root).mappings;
    assert.equal(m['FUNDO X FIC FIM'], 'FUNDOXFICFIM');
    assert.equal(m['FUNDOXFICFIM'], undefined, 'a canonica nunca vira chave');
  });

  it('nao produz ciclo: nenhuma chave aponta para outra chave', () => {
    const root = rootComSnapshots({
      '2026-04-30': {
        CARTEIRA_A: [
          { ativo: 'PAPEL A B', valor: 500 },
          { ativo: 'PAPELAB', valor: 900 },
          { ativo: 'Papel.A.B', valor: 100 },
        ],
      },
    });
    assert.equal(cli(['name-map', '--root', root]).ok, true);
    const m = lerMapa(root).mappings;
    for (const destino of Object.values(m)) {
      assert.equal(m[destino], undefined, `destino ${destino} nao pode ser chave tambem`);
    }
    assert.equal(Object.keys(m).length, 2, 'as duas grafias perdedoras apontam para a vencedora');
  });

  it('grupo que ja tem mapeamento humano fica INTEIRO de fora', () => {
    const root = rootComSnapshots({
      '2026-04-30': {
        CARTEIRA_A: [
          { ativo: 'FUNDOXFICFIM', valor: 10_000 },
          { ativo: 'FUNDO X FIC FIM', valor: 900 },
        ],
      },
    });
    fs.writeFileSync(
      path.join(root, 'name-map.local.json'),
      JSON.stringify({ mappings: { FUNDOXFICFIM: 'NOME OFICIAL DO FUNDO' } }),
      'utf8'
    );
    const r = cli(['name-map', '--root', root]);
    assert.equal(r.ok, true, r.saida);
    const m = lerMapa(root).mappings;
    assert.equal(m['FUNDOXFICFIM'], 'NOME OFICIAL DO FUNDO', 'humano manda');
    assert.equal(m['FUNDO X FIC FIM'], undefined, 'mapear o resto criaria corrente');
    assert.match(r.saida, /mapeamento humano/);
  });

  it('recusa mapear chave que e nome de CARTEIRA', () => {
    // O normalize aplica o mesmo mapa a nome de carteira e a nome de ativo.
    // Renomear carteira de cliente em silencio e o pior desfecho possivel aqui.
    const root = rootComSnapshots({
      '2026-04-30': {
        'FUNDO X FIC FIM': [
          { ativo: 'FUNDOXFICFIM', valor: 10_000 },
          { ativo: 'FUNDO X FIC FIM', valor: 100 },
        ],
      },
    });
    const r = cli(['name-map', '--root', root]);
    assert.equal(r.ok, true, r.saida);
    assert.equal(lerMapa(root).mappings['FUNDO X FIC FIM'], undefined);
    assert.match(r.saida, /nome de carteira/);
  });

  it('root sem snapshot nenhum aborta em vez de gravar mapa vazio', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-namemap-vazio-'));
    const r = cli(['name-map', '--root', root]);
    assert.equal(r.ok, false);
    assert.match(r.saida, /Nenhum snapshot/);
    assert.equal(fs.existsSync(path.join(root, 'name-map.local.json')), false);
  });

  it('mapa existente sem a chave mappings aborta, mesma guarda do ativo-map', () => {
    const root = rootComSnapshots({
      '2026-04-30': { CARTEIRA_A: [{ ativo: 'PAPEL', valor: 100 }] },
    });
    const p = path.join(root, 'name-map.local.json');
    fs.writeFileSync(p, '{"x":1}', 'utf8');
    const r = cli(['name-map', '--root', root]);
    assert.equal(r.ok, false);
    assert.match(r.saida, /mappings/);
    assert.equal(fs.readFileSync(p, 'utf8'), '{"x":1}');
  });
});
