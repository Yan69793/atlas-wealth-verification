/**
 * ativo-map.test.ts — o mapa de atributos da instância não pode perder trabalho.
 *
 * O `ativo-map` se resetava em SILÊNCIO quando o arquivo existia, parseava, e
 * tinha perdido a chave `mappings`. Ele caía num `{}` vazio, regenerava tudo do
 * zero, relatava "N novo(s)" e saía com SUCESSO. Horas de preenchimento humano
 * iam embora com mensagem verde. A trava que existia cobria arquivo ILEGÍVEL,
 * que não é o caso que acontece na prática: quem edita o mapa à mão usa uma
 * ferramenta que reescreve o arquivo inteiro.
 *
 * Aconteceu de verdade durante a calibração da Entrega B.1, num mapa com 1.784
 * entradas e 89,4% do PL da casa já classificado.
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '..', 'src', 'snapshot', 'cli-snapshot.js');

interface PosFixture {
  ativo: string;
  valor: number;
  classe?: string;
}

export function rootComSnapshots(periodos: Record<string, Record<string, PosFixture[]>>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-mapas-'));
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
          classe: p.classe ?? null,
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

/** Roda o CLI. Devolve stdout em sucesso; em falha devolve o erro com stderr. */
export function cli(args: string[]): { ok: boolean; saida: string } {
  try {
    const out = execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, saida: out };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, saida: (e.stderr ?? '') + (e.stdout ?? '') };
  }
}

export const lerMapa = (root: string, arq: string) =>
  JSON.parse(fs.readFileSync(path.join(root, arq), 'utf8')) as { mappings: Record<string, unknown> };

describe('ativo-map: guarda contra reset silencioso', () => {
  const rootBase = () =>
    rootComSnapshots({ '2026-05-31': { CARTEIRA_A: [{ ativo: 'PAPEL UM', valor: 1000 }] } });

  it('JSON valido SEM a chave mappings aborta e nao toca o arquivo', () => {
    const root = rootBase();
    const p = path.join(root, 'ativo-map.local.json');
    const original = '{"x":1,"trabalho":"3 horas"}';
    fs.writeFileSync(p, original, 'utf8');

    const r = cli(['ativo-map', '--data', '2026-05-31', '--root', root]);
    assert.equal(r.ok, false, 'deveria abortar');
    assert.match(r.saida, /mappings/);
    assert.equal(fs.readFileSync(p, 'utf8'), original, 'o arquivo NAO pode ser reescrito');
  });

  it('mappings que nao e objeto aborta', () => {
    const root = rootBase();
    const p = path.join(root, 'ativo-map.local.json');
    fs.writeFileSync(p, '{"mappings":["a","b"]}', 'utf8');
    const r = cli(['ativo-map', '--data', '2026-05-31', '--root', root]);
    assert.equal(r.ok, false);
    assert.match(r.saida, /array/);
  });

  it('JSON ilegivel continua abortando (guarda antiga)', () => {
    const root = rootBase();
    fs.writeFileSync(path.join(root, 'ativo-map.local.json'), '{ nao e json', 'utf8');
    const r = cli(['ativo-map', '--data', '2026-05-31', '--root', root]);
    assert.equal(r.ok, false);
    assert.match(r.saida, /nao e JSON valido/);
  });

  it('mapa vazio de verdade (mappings: {}) e aceito', () => {
    const root = rootBase();
    fs.writeFileSync(path.join(root, 'ativo-map.local.json'), '{"mappings":{}}', 'utf8');
    const r = cli(['ativo-map', '--data', '2026-05-31', '--root', root]);
    assert.equal(r.ok, true, r.saida);
  });
});

describe('ativo-map: trabalho humano', () => {
  it('preserva valor humano, inclusive false, 0 e chave que o motor nao conhece', () => {
    const root = rootComSnapshots({
      '2026-05-31': { CARTEIRA_A: [{ ativo: 'PAPEL UM', valor: 1000 }] },
    });
    assert.equal(cli(['ativo-map', '--data', '2026-05-31', '--root', root]).ok, true);

    const antes = lerMapa(root, 'ativo-map.local.json');
    Object.assign(antes.mappings['PAPEL UM'] as Record<string, unknown>, {
      emissorNome: 'CONFERIDO A MAO',
      cobertoFGC: false,
      liquidezDias: 0,
      revisadoPor: 'dono',
    });
    fs.writeFileSync(path.join(root, 'ativo-map.local.json'), JSON.stringify(antes), 'utf8');

    assert.equal(cli(['ativo-map', '--data', '2026-05-31', '--root', root]).ok, true);
    const e = lerMapa(root, 'ativo-map.local.json').mappings['PAPEL UM'] as Record<string, unknown>;
    assert.equal(e.emissorNome, 'CONFERIDO A MAO');
    assert.equal(e.cobertoFGC, false, 'false e valor conhecido, nao ausencia');
    assert.equal(e.liquidezDias, 0, '0 e valor conhecido, nao ausencia');
    assert.equal(e.revisadoPor, 'dono', 'chave desconhecida pelo motor tambem fica');
  });

  it('_ausenteDesde some quando o ativo volta a base', () => {
    const root = rootComSnapshots({
      '2026-04-30': { CARTEIRA_A: [{ ativo: 'PAPEL UM', valor: 1000 }, { ativo: 'PAPEL SAZONAL', valor: 500 }] },
      '2026-05-31': { CARTEIRA_A: [{ ativo: 'PAPEL UM', valor: 1000 }] },
      '2026-06-30': { CARTEIRA_A: [{ ativo: 'PAPEL UM', valor: 1000 }, { ativo: 'PAPEL SAZONAL', valor: 700 }] },
    });
    for (const d of ['2026-04-30', '2026-05-31']) {
      assert.equal(cli(['ativo-map', '--data', d, '--root', root]).ok, true);
    }
    const sumido = lerMapa(root, 'ativo-map.local.json').mappings['PAPEL SAZONAL'] as Record<string, unknown>;
    assert.equal(sumido._ausenteDesde, '2026-05-31', 'sai da base = marcado, nunca apagado');

    assert.equal(cli(['ativo-map', '--data', '2026-06-30', '--root', root]).ok, true);
    const voltou = lerMapa(root, 'ativo-map.local.json').mappings['PAPEL SAZONAL'] as Record<string, unknown>;
    assert.equal(voltou._ausenteDesde, undefined, 'de volta a base = marca limpa');
  });
});
