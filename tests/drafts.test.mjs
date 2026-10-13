import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createDraftService, validateDraft} from '../lib/draft-service.js';
import {hash, adminAllowed, trustedOrigin} from '../lib/access.js';
import {normalize, questionsFor} from '../assets/form-schema.js';

function setup() {
  const objects = new Map();
  const storage = {
    async read(path) {return objects.has(path) ? structuredClone(objects.get(path)) : null;},
    async create(path, value) {if (objects.has(path)) return false; objects.set(path, structuredClone(value)); return true;},
    async list(prefix) {return [...objects.keys()].filter(path => path.startsWith(prefix)).map(pathname => ({pathname}));}
  };
  const service = createDraftService(storage); return {service, objects};
}
function draft(profile = 'mae') {return {id: randomUUID(), writeToken: 'a'.repeat(64), profile, revision: 1000, step: 0, finished: false, answers: {device: 'Celular Android'}};}

test('owner can read a partial response before completion', async () => {
  const {service} = setup(), body = draft(); await service.save(body);
  const rows = await service.all(); assert.equal(rows.length, 1); assert.equal(rows[0].finished, false); assert.equal(rows[0].answered, 1); assert.equal(rows[0].answers.device, 'Celular Android'); assert.equal(rows[0].total, 19);
  assert(!Object.hasOwn(rows[0], 'writeToken')); assert(!Object.hasOwn(rows[0], 'tokenHash'));
});
test('a delayed older request cannot overwrite a newer answer', async () => {
  const {service} = setup(), body = draft();
  await service.save({...body, revision: 2000, step: 2, answers: {...body.answers, system: 'Aplicativo confirmado'}});
  await service.save({...body, revision: 1001, step: 1, answers: {...body.answers, system: 'Valor antigo'}});
  const record = await service.read(body.id, body.writeToken); assert.equal(record.revision, 2000); assert.equal(record.step, 2); assert.equal(record.answers.system, 'Aplicativo confirmado');
});
test('resuming preserves an empty-but-started draft and its question position', async () => {
  const {service} = setup(), body = {...draft(), answers: {}, step: 7}; await service.save(body);
  const record = await service.read(body.id, body.writeToken); assert.equal(record.step, 7); assert.equal(record.answered, 0); assert.equal(record.finished, false);
});
test('mother and aunt stay separate even on the same device', async () => {
  const {service} = setup(), mother = draft(), aunt = draft('tia'); await service.save(mother); await service.save({...aunt, answers: {schedule: 'Quarta às 9h'}});
  const rows = await service.all(); assert.equal(rows.length, 2); assert(rows.some(r => r.profile === 'mae')); assert.equal(rows.find(r => r.profile === 'tia').answers.schedule, 'Quarta às 9h');
  assert.equal(questionsFor('tia').find(q => q.id === 'schedule').type, 'text');
});
test('a guessed ID with a different key cannot read or replace a response', async () => {
  const {service} = setup(), body = draft(); await service.save(body);
  await assert.rejects(service.read(body.id, 'b'.repeat(64)), e => e.status === 403);
  await assert.rejects(service.save({...body, writeToken: 'b'.repeat(64), revision: 2000}), e => e.status === 403);
  await assert.rejects(service.save({...body, profile: 'tia', revision: 2000}), e => e.status === 403);
});
test('retries do not create duplicate checkpoints and completion remains explicit', async () => {
  const {service, objects} = setup(), body = draft(); await service.save(body); await service.save(body); assert.equal(objects.size, 2);
  await service.save({...body, revision: 2000, finished: true, step: 18}); assert.equal((await service.all())[0].finished, true);
});
test('test submissions never appear in the real owner panel', async () => {
  const {service} = setup(); await service.save(draft(), true); assert.deepEqual(await service.all(), []); assert.equal((await service.all(true)).length, 1);
});
test('unknown fields, hidden followups, and invalid profiles are rejected or removed', () => {
  const answers = normalize({schedule: 'Isso mesmo', scheduleDetail: 'Detalhe antigo', system: 'x'.repeat(900), unknownSecret: 'senha'});
  assert.equal(answers.scheduleDetail, ''); assert.equal(answers.system.length, 500); assert(!Object.hasOwn(answers, 'unknownSecret'));
  assert.throws(() => validateDraft({...draft(), profile: '__proto__'}), e => e.status === 400);
  assert.throws(() => validateDraft({...draft(), step: 19}), e => e.status === 400);
});
test('the admin API requires its private key and saves reject third-party origins', () => {
  process.env.PMG_ADMIN_TOKEN_HASH = hash('owner-key-'.repeat(8)); process.env.PMG_PUBLIC_ORIGIN = 'https://pmg-ofertas.vercel.app';
  assert.equal(adminAllowed(new Request('https://pmg-ofertas.vercel.app/api/admin')), false);
  assert.equal(adminAllowed(new Request('https://pmg-ofertas.vercel.app/api/admin', {headers: {Authorization: 'Bearer ' + 'owner-key-'.repeat(8)}})), true);
  assert.equal(trustedOrigin(new Request('https://pmg-ofertas.vercel.app/api/draft', {headers: {Origin: 'https://outro.site'}})), false);
  assert.equal(trustedOrigin(new Request('https://pmg-ofertas.vercel.app/api/draft', {headers: {Origin: 'https://pmg-ofertas.vercel.app'}})), true);
});
