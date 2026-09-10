import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

test('ingest encerra a falha de cada processo nativo e o sucesso final', () => {
  const codigo = ler('ingest.ps1');
  for (const comando of [
    /npm --prefix audit-engine install/,
    /npm --prefix audit-engine run build/,
    /node audit-engine\\dist\\src\\cli\.js @args/,
  ]) {
    const inicio = codigo.search(comando);
    assert.notEqual(inicio, -1, `comando ausente: ${comando}`);
    const trecho = codigo.slice(inicio, inicio + 240);
    assert.match(trecho, /\$LASTEXITCODE -ne 0[\s\S]*?exit 1/, `falha sem exit 1 após ${comando}`);
  }
  assert.match(codigo, /\nexit 0\s*$/, 'ingest não encerra sucesso explicitamente');
});

test('deploy da conta nova declara status para todos os ramos de saída', () => {
  const codigo = ler('scripts/deploy-nova-conta.ps1');
  for (const ramo of [
    /if \(-not \$tokenAtlas\) \{ exit 1 \}/,
    /if \(\$Whoami\)[\s\S]*?\$LASTEXITCODE -ne 0[\s\S]*?exit 1[\s\S]*?exit 0/,
    /if \(\$DryRun\)[\s\S]*?exit 0/,
    /\$LASTEXITCODE -ne 0 -or \$faltando\.Count -gt 0[\s\S]*?exit 1/,
  ]) {
    assert.match(codigo, ramo, `ramo sem status explícito: ${ramo}`);
  }
  assert.match(codigo, /\nexit 0\s*$/, 'deploy não encerra sucesso explicitamente');
  assert.doesNotMatch(codigo, /if \(-not \$tokenAtlas\) \{ return \}/, 'token ausente não pode parecer sucesso');
});

test('leitura de secrets remove ANSI antes do casamento', () => {
  for (const arquivo of ['scripts/deploy-cf.ps1', 'scripts/deploy-nova-conta.ps1']) {
    assert.match(ler(arquivo), /\[char\]27/, `${arquivo} não remove ANSI antes de ler saída do Wrangler`);
  }
});
