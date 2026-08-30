/**
 * Testes de protegerRoot() — trava contra gravar dado real dentro do repo do
 * produto. Cenários sintéticos em mkdtemp, sem tocar arquivo real do projeto.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { protegerRoot } from '../src/snapshot/args.js';

const tmpDirs: string[] = [];
function tmpRoot(prefixo: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefixo));
  tmpDirs.push(root);
  return root;
}
after(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('protegerRoot', () => {
  it('raiz do produto (tem .git e platform-app.jsx) é bloqueada', () => {
    const produto = tmpRoot('atlas-proteger-produto-');
    fs.mkdirSync(path.join(produto, '.git'));
    fs.writeFileSync(path.join(produto, 'platform-app.jsx'), '');
    assert.throws(() => protegerRoot(produto), /cai dentro do repo do produto/);
  });

  it('subpasta dentro do produto é bloqueada', () => {
    const produto = tmpRoot('atlas-proteger-produto-');
    fs.mkdirSync(path.join(produto, '.git'));
    fs.writeFileSync(path.join(produto, 'platform-app.jsx'), '');
    const subpasta = path.join(produto, 'tmp', 'saida');
    fs.mkdirSync(subpasta, { recursive: true });
    assert.throws(() => protegerRoot(subpasta), /cai dentro do repo do produto/);
  });

  it('instância aninhada (tem .git próprio, sem platform-app.jsx) é permitida', () => {
    const produto = tmpRoot('atlas-proteger-produto-');
    fs.mkdirSync(path.join(produto, '.git'));
    fs.writeFileSync(path.join(produto, 'platform-app.jsx'), '');
    const instancia = path.join(produto, 'verificacao-carteiras');
    fs.mkdirSync(instancia, { recursive: true });
    fs.mkdirSync(path.join(instancia, '.git'));
    assert.doesNotThrow(() => protegerRoot(instancia));
  });

  it('pasta externa, fora de qualquer repo do produto, é permitida', () => {
    const externa = tmpRoot('atlas-proteger-externa-');
    assert.doesNotThrow(() => protegerRoot(externa));
  });

  it('checkout do produto aninhado DENTRO da instância é bloqueado (topologia do core/)', () => {
    // produto/verificacao-carteiras/core é outro checkout do produto: tem
    // .git próprio E platform-app.jsx. O marcador do produto no próprio
    // nível decide antes do .git da instância entrar em cena.
    const produto = tmpRoot('atlas-proteger-produto-');
    fs.mkdirSync(path.join(produto, '.git'));
    fs.writeFileSync(path.join(produto, 'platform-app.jsx'), '');
    const instancia = path.join(produto, 'verificacao-carteiras');
    fs.mkdirSync(path.join(instancia, '.git'), { recursive: true });
    const core = path.join(instancia, 'core');
    fs.mkdirSync(path.join(core, '.git'), { recursive: true });
    fs.writeFileSync(path.join(core, 'platform-app.jsx'), '');
    assert.throws(() => protegerRoot(core), /cai dentro do repo do produto/);
    assert.doesNotThrow(() => protegerRoot(instancia)); // a instância em si segue permitida
  });
});
