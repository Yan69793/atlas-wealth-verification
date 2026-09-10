/**
 * Sigla do cliente — a única função do produto que reduz nome a iniciais.
 *
 * Por que este arquivo existe separado dos outros testes. A sigla é a forma
 * como o cliente aparece para quem está fora do dado interno: tela, CSV,
 * título de gráfico e relatório. Se ela errar, o erro é de identificação, não
 * de estética — dois clientes com a mesma sigla viram o mesmo cliente na
 * leitura de quem decide. Por isso a última bateria aqui não testa a função
 * isolada: testa o conjunto real do demo, nome por nome.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { sigla, siglaCliente } from '../platform-sigla.js';
import { DATASET } from '../demo-worker/src/dataset.js';

describe('sigla: nome vira iniciais', () => {
  test('nome completo de pessoa', () => {
    assert.equal(sigla('Carlos Alberto Pereira'), 'CAP');
  });

  test('partícula não entra na sigla', () => {
    assert.equal(sigla('Ana de Souza Lima'), 'ASL');
    assert.equal(sigla('Joana da Silva dos Santos e Oliveira'), 'JSSO');
    // grafia estrangeira, comum em cadastro feito no Brasil
    assert.equal(sigla('Jan van Der Berg'), 'JDB');
  });

  test('espaço duplo, espaço nas pontas, hífen, barra e vírgula dão o mesmo resultado', () => {
    const esperado = 'ACR';
    for (const entrada of ['Ana Clara Rocha', '  Ana   Clara  Rocha  ', 'Ana-Clara Rocha', 'Ana Clara/Rocha', 'Ana Clara, Rocha']) {
      assert.equal(sigla(entrada), esperado, `falhou em ${JSON.stringify(entrada)}`);
    }
  });

  test('número e símbolo solto não viram letra', () => {
    assert.equal(sigla('Ana Clara Rocha 2'), 'ACR');
    assert.equal(sigla('Ana Clara Rocha (2026)'), 'ACR');
  });

  test('uma palavra devolve uma letra, e ela é a inicial', () => {
    assert.equal(sigla('Olympo'), 'O');
  });

  test('vazio devolve vazio, e o fallback assume', () => {
    for (const v of ['', '   ', null, undefined]) {
      assert.equal(sigla(v), '');
      assert.equal(siglaCliente(v, 'ALPHA_01'), 'ALPHA_01');
    }
  });

  test('o contrato é receber NOME: passar sigla devolve a inicial dela', () => {
    // A sigla não é idempotente por conta própria, e isso é contrato, não
    // descuido. Quem chama guarda o nome por extenso e aplica UMA vez; a
    // camada de dados faz isso em `comSigla`, que se apoia em `nomeInterno`
    // justamente para poder passar duas vezes sem estragar. Este teste tranca
    // o comportamento para ninguém trocá-lo achando que melhora.
    assert.equal(sigla('Ana Beatriz Ribeiro'), 'ABR');
    assert.equal(sigla(sigla('Ana Beatriz Ribeiro')), 'A');
    assert.equal(siglaCliente('Ana Beatriz Ribeiro', 'ALPHA_01'), 'ABR');
  });
});

describe('sigla: nenhum cliente do conjunto colide com outro', () => {
  const doCatalogo = DATASET.catalogo.map((p) => ({ code: p.code, nome: p.name, s: sigla(p.name) }));

  test('todo cliente do conjunto tem sigla', () => {
    assert.equal(doCatalogo.length, 40);
    for (const c of doCatalogo) {
      assert.ok(c.s.length >= 2, `${c.code} ficou com sigla fraca: ${JSON.stringify(c.s)}`);
    }
  });

  test('duas carteiras nunca compartilham a mesma sigla', () => {
    // É o defeito que este arquivo existe para impedir: sigla repetida faz
    // dois clientes diferentes serem lidos como um só.
    const porSigla = {};
    for (const c of doCatalogo) {
      (porSigla[c.s] = porSigla[c.s] || []).push(c.code);
    }
    const repetidas = Object.entries(porSigla).filter(([, codes]) => codes.length > 1);
    assert.deepEqual(repetidas, [], 'sigla repetida entre carteiras: ' + JSON.stringify(repetidas));
  });

  test('a sigla é curta e maiúscula, e não é o nome por extenso', () => {
    for (const c of doCatalogo) {
      assert.match(c.s, /^[A-ZÀ-Ý]{2,6}$/, `${c.code}: ${c.s}`);
      assert.notEqual(c.s, c.nome);
    }
  });
});

describe('sigla: o nome do cliente não é o que o Worker entrega', () => {
  test('o conjunto interno guarda o nome por extenso, e é o único lugar', () => {
    const nomes = DATASET.catalogo.map((p) => p.name);
    assert.ok(nomes.every((n) => n.includes(' ')), 'o conjunto precisa guardar nome completo de pessoa');
  });
});
