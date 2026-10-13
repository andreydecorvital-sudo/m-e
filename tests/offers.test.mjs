import test from 'node:test';
import assert from 'node:assert/strict';
import {blankDraft, buildOffer, decimal, pieceTotal, parseTable, offerText, today} from '../assets/offers-model.js';

test('uma tabela nova não reaproveita preços nem pesos do exemplo antigo', () => {
  const draft = blankDraft('2026-10-13'); assert.equal(Object.keys(draft.rows).length, 14);
  assert.ok(Object.values(draft.rows).every(row => row.price === '' && row.weight === ''));
  assert.equal(buildOffer(draft, '2026-10-13').rows.length, 0);
});
test('o total usa o peso real e arredonda em centavos, sem presumir uma peça de 4 kg', () => {
  assert.equal(pieceTotal(decimal('39,25'), decimal('3,990', 3)), 15661);
  assert.equal(pieceTotal(decimal('35,15'), decimal('3,940', 3)), 13849);
  const draft = blankDraft('2026-10-13'); draft.rows.apolo.price = '34,56';
  const offer = buildOffer(draft, '2026-10-13'); assert.deepEqual(offer.errors, []);
  assert.equal(offer.rows[0].grams, null); assert.equal(offer.rows[0].totalCents, null);
  assert.ok(!offerText(offer).includes('138,24'));
});
test('valores ambíguos, datas passadas e pesos inválidos bloqueiam a exportação', () => {
  for (const value of ['-34,56', '34,567', '3.456', '3,4,56', '1e3', 'abc', '0', '34x56']) assert.equal(decimal(value), null, value);
  assert.equal(decimal('R$ 1.234,56'), 123456);
  const draft = blankDraft('2026-10-09'); draft.rows.apolo = {price: '34,56', weight: '-4'};
  assert.equal(buildOffer(draft, '2026-10-13').errors.length, 2);
  draft.date = '2026-02-30'; assert.match(buildOffer(draft, '2026-10-13').errors[0], /data válida/);
});
test('importa as colunas da PMG e não confunde kg, preço por kg e total', () => {
  const parsed = parseTable('Produto Unidade Peso Valor Unitário Valor Total R$\nMUÇARELA APOLO 4 KG (CX 6 PÇ) 1 Pç. 4,000 KG 34,56 138,24\nMUÇARELA ITALAC 4 KG (CX 6 PÇ) 1 Pç. 3,990 KG 39,25 156,61');
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.rows, [{id: 'apolo', price: '34,56', weight: '4,000'}, {id: 'italac', price: '39,25', weight: '3,990'}]);
});
test('importação não aplica total divergente nem escolhe entre dois preços do mesmo produto', () => {
  const parsed = parseTable('MUÇARELA APOLO 4 KG (CX 6 PÇ) 1 Pç. 3,940 KG 35,15 140,60\nItalac;39,25;3,990\nItalac;42,00;4,000\nProduto desconhecido 99,00');
  assert.deepEqual(parsed.rows, []); assert.equal(parsed.issues.length, 3);
  assert.ok(parsed.issues.some(s => s.includes('clientes diferentes')));
});
test('importação simples reconhece acentos e não perde milésimos do peso', () => {
  const parsed = parseTable('Clássica;36,32;4,030\nTrês Marias Ouro Preto;39,83;4,140\nHM 33,39');
  assert.equal(parsed.rows.length, 3); assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rows[1].weight, '4,140');
});
test('a referência interna não aparece na mensagem e a data segue São Paulo', () => {
  const draft = blankDraft('2026-10-13'); draft.reference = 'Tabela interna ABC'; draft.rows.apolo.price = '34,56';
  assert.ok(!offerText(buildOffer(draft, '2026-10-13')).includes('Tabela interna ABC'));
  assert.equal(today(new Date('2026-10-14T01:30:00Z')), '2026-10-13');
});
