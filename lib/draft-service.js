import { normalize, count, summary, profiles, questionsFor } from '../assets/form-schema.js';
import { hash, matchesHash, HttpError } from './access.js';

const ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TOKEN = /^[A-Za-z0-9_-]{32,100}$/;

export function validateDraft(input) {
  if (!input || typeof input !== 'object' || !ID.test(input.id || '') || !TOKEN.test(input.writeToken || '') || !Object.hasOwn(profiles, input.profile)) throw new HttpError(400, 'Resposta inválida.');
  if (!Number.isSafeInteger(input.revision) || input.revision < 1 || input.revision > 9_000_000_000_000_000) throw new HttpError(400, 'Versão inválida.');
  const maxStep = questionsFor(input.profile).length - 1;
  if (!Number.isInteger(input.step) || input.step < 0 || input.step > maxStep || typeof input.finished !== 'boolean') throw new HttpError(400, 'Etapa inválida.');
  return {id: input.id, writeToken: input.writeToken, profile: input.profile, revision: input.revision, step: input.step, finished: input.finished, answers: normalize(input.answers, input.profile)};
}

export function createDraftService(storage, now = () => new Date().toISOString()) {
  function prefix(test = false) { return test ? 'pmg/test/' : 'pmg/live/'; }
  function ownerPath(id, test) { return `${prefix(test)}owners/${id}.json`; }
  function snapshotPrefix(id, test) { return `${prefix(test)}drafts/${id}/`; }

  async function ownerFor(id, token, test) {
    if (!ID.test(id || '') || !TOKEN.test(token || '')) throw new HttpError(400, 'Acesso inválido.');
    const owner = await storage.read(ownerPath(id, test));
    if (!owner) throw new HttpError(404, 'Resposta ainda não registrada.');
    if (!matchesHash(token, owner.tokenHash)) throw new HttpError(403, 'Acesso não autorizado.');
    return owner;
  }

  async function latest(id, test) {
    const snapshots = await storage.list(snapshotPrefix(id, test));
    const best = snapshots.sort((a, b) => b.pathname.localeCompare(a.pathname))[0];
    return best ? storage.read(best.pathname) : null;
  }

  async function save(input, test = false) {
    const draft = validateDraft(input);
    const stamp = now();
    const path = ownerPath(draft.id, test);
    let owner = await storage.read(path);
    if (!owner) {
      const candidate = {id: draft.id, profile: draft.profile, tokenHash: hash(draft.writeToken), createdAt: stamp};
      const created = await storage.create(path, candidate);
      owner = created ? candidate : await storage.read(path);
    }
    if (!owner || !matchesHash(draft.writeToken, owner.tokenHash) || owner.profile !== draft.profile) throw new HttpError(403, 'Acesso não autorizado.');
    const {writeToken, ...safeDraft} = draft;
    const record = {...safeDraft, createdAt: owner.createdAt, updatedAt: stamp, ...count(draft.answers, draft.profile)};
    // Checkpoints are immutable. A delayed request can never overwrite a newer answer.
    const digest = hash(JSON.stringify(safeDraft)).slice(0, 16);
    const checkpoint = `${snapshotPrefix(draft.id, test)}${String(draft.revision).padStart(16, '0')}-${digest}.json`;
    const created = await storage.create(checkpoint, record);
    const saved = created ? record : await storage.read(checkpoint);
    return {saved: true, revision: draft.revision, savedAt: saved.updatedAt};
  }

  async function read(id, token, test = false) {
    await ownerFor(id, token, test);
    const result = await latest(id, test);
    if (!result) throw new HttpError(404, 'Resposta ainda não registrada.');
    return result;
  }

  async function all(test = false) {
    const paths = await storage.list(`${prefix(test)}drafts/`);
    const byId = new Map();
    for (const entry of paths) {
      const relative = entry.pathname.slice(`${prefix(test)}drafts/`.length);
      const id = relative.split('/')[0];
      if (!ID.test(id)) continue;
      const previous = byId.get(id);
      if (!previous || entry.pathname > previous.pathname) byId.set(id, entry);
    }
    const records = [];
    // Small batches avoid flooding storage when the owner opens the panel.
    const entries = [...byId.values()];
    for (let i = 0; i < entries.length; i += 8) {
      const batch = await Promise.all(entries.slice(i, i + 8).map(item => storage.read(item.pathname)));
      records.push(...batch.filter(Boolean));
    }
    return records.map(record => ({...record, label: profiles[record.profile]?.label || 'Resposta', summary: summary(record.answers, record.updatedAt, record.profile)})).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return {save, read, all};
}
