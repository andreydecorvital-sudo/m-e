import { normalize, summary, profiles, questionsFor } from './form-schema.js';

const profile = location.pathname.replace(/\/+$/, '') === '/tia' ? 'tia' : 'mae';
const preview = new URLSearchParams(location.search).get('preview') === '1';
const questions = questionsFor(profile), KEY = `pmg-ofertas-draft-v2:${profile}`;
const $ = id => document.getElementById(id);
let state = {answers: normalize({}, profile), step: 0, finished: false};
let context, storageOK = true, lastAck = 0, pending = null, sending = false, timer, retryTimer, retries = 0, toastTimer;
function element(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function token() { const bytes = crypto.getRandomValues(new Uint8Array(32)); return [...bytes].map(n => n.toString(16).padStart(2, '0')).join(''); }
function newContext() { return {id: crypto.randomUUID(), writeToken: token(), revision: Date.now()}; }
function persistLocal() {
  if (preview) return;
  try { localStorage.setItem(KEY, JSON.stringify({version: 2, ...state, ...context})); storageOK = true; } catch { storageOK = false; }
}
function load() {
  try {
    const raw = preview ? null : JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw?.version === 2 && typeof raw.id === 'string' && typeof raw.writeToken === 'string') {
      context = {id: raw.id, writeToken: raw.writeToken, revision: Number.isSafeInteger(raw.revision) ? raw.revision : Date.now()};
      state = {answers: normalize(raw.answers, profile), step: Number.isInteger(raw.step) ? Math.max(0, Math.min(questions.length - 1, raw.step)) : 0, finished: raw.finished === true};
    } else if (profile === 'mae' && !preview) {
      const old = JSON.parse(localStorage.getItem('pmg-ofertas-form-v1') || 'null');
      if (old?.version === 1) {
        const previousSection = Math.max(0, Math.min(3, old.step || 0));
        state = {answers: normalize(old.answers, profile), step: old.finished ? questions.length - 1 : questions.findIndex(q => q.section === previousSection), finished: old.finished === true};
      }
    }
  } catch {storageOK = false;}
  context ||= newContext(); persistLocal();
}
function snapshot() { return {...context, profile, answers: normalize(state.answers, profile), step: state.step, finished: state.finished}; }
function notify(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 4000); }
function status(message, warning = false) {
  $('save-status').textContent = message; $('save-status').parentElement.classList.toggle('warning', warning); $('retry').hidden = !warning || preview;
  if (state.finished) $('result-save').textContent = message;
}
function pendingStatus() {
  if (preview) return status('Prévia: este preenchimento não registra respostas.');
  status(navigator.onLine === false ? 'Sem internet agora. Suas respostas ficam no aparelho e serão enviadas quando voltar.' : 'Salvando suas respostas para o Andrey…', navigator.onLine === false);
}
function changed(immediate = false) { context.revision = Math.max(Date.now(), context.revision + 1); persistLocal(); queue(immediate); }
function queue(immediate = false) {
  if (preview) return pendingStatus();
  pending = snapshot(); pendingStatus(); clearTimeout(timer); timer = setTimeout(send, immediate ? 0 : 700);
}
async function send() {
  clearTimeout(timer); if (sending || !pending || preview) return;
  if (navigator.onLine === false) return pendingStatus();
  sending = true; const payload = pending; pending = null;
  try {
    const response = await fetch('/api/draft', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), keepalive: true, ...(AbortSignal.timeout ? {signal: AbortSignal.timeout(20000)} : {})});
    const data = await response.json(); if (!response.ok || !data.saved) throw new Error('save');
    if (payload.id === context.id) {
      lastAck = Math.max(lastAck, data.revision); retries = 0;
      if (lastAck >= context.revision && !pending) status(state.finished ? '✓ Respostas salvas para o Andrey. Pode fechar esta página.' : '✓ Suas respostas estão salvas para o Andrey. Pode continuar no seu ritmo.');
    }
  } catch {
    if (payload.id === context.id) {
      if (!pending || pending.revision < payload.revision) pending = payload;
      status(storageOK ? 'Suas respostas estão no aparelho. Estou tentando enviar para o Andrey.' : 'Não consegui enviar ainda. Mantenha a página aberta ou copie suas respostas.', true);
      clearTimeout(retryTimer); retryTimer = setTimeout(send, Math.min(30000, 2500 * 2 ** Math.min(retries++, 3)));
    }
  } finally { sending = false; if (pending && (pending.id !== payload.id || pending.revision > payload.revision)) send(); }
}
function flush() {
  if (preview || lastAck >= context.revision) return;
  persistLocal(); const payload = JSON.stringify(snapshot());
  if (navigator.sendBeacon) navigator.sendBeacon('/api/draft', new Blob([payload], {type: 'text/plain;charset=UTF-8'}));
  else fetch('/api/draft', {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: payload, keepalive: true}).catch(() => {});
}
function textInput(id, value, q) {
  const input = element(q.type === 'textarea' ? 'textarea' : 'input', 'field'); if (input.tagName === 'INPUT') input.type = 'text';
  input.id = id; input.name = id; input.value = value || ''; input.maxLength = q.max || 1000; input.placeholder = q.placeholder || ''; input.autocomplete = 'off'; input.setAttribute('aria-labelledby', 'question-title'); return input;
}
function followVisible(q) { const answer = state.answers[q.id]; return q.followup && (Array.isArray(answer) ? answer.includes(q.followup.when) : answer === q.followup.when); }
function syncFollowup(q) {
  if (!q.followup) return; const show = followVisible(q); $('followup').hidden = !show; $(q.followup.id).disabled = !show;
  if (!show) {state.answers[q.followup.id] = ''; $(q.followup.id).value = '';}
}
function render(focus = false) {
  const q = questions[state.step]; $('question-title').textContent = q.label; $('question-count').textContent = `Pergunta ${state.step + 1} de ${questions.length}`;
  $('section-label').textContent = q.sectionShort; $('progress-bar').style.width = `${(state.step + 1) / questions.length * 100}%`; $('progress').setAttribute('aria-valuenow', String(state.step + 1));
  $('intro').hidden = state.step > 0 || state.finished; $('question-card').hidden = state.finished; $('result').hidden = !state.finished;
  $('back').hidden = state.step === 0; $('next').textContent = state.step === questions.length - 1 ? 'Concluir ✓' : 'Continuar →';
  const host = $('question'); host.replaceChildren();
  if (q.known) host.append(element('p', 'hint', q.known)); if (q.hint) host.append(element('p', 'hint', q.hint));
  if (q.type === 'radio' || q.type === 'multi') {
    const group = element('fieldset'); group.append(element('legend', 'sr-only', q.label)); const options = element('div', 'options');
    for (const value of q.options) {
      const label = element('label', 'choice'), input = element('input'); input.type = q.type === 'multi' ? 'checkbox' : 'radio'; input.name = q.id; input.value = value;
      input.checked = Array.isArray(state.answers[q.id]) ? state.answers[q.id].includes(value) : state.answers[q.id] === value;
      label.append(input, element('span', null, value)); options.append(label);
    }
    group.append(options); host.append(group);
  } else host.append(textInput(q.id, state.answers[q.id], q));
  if (q.followup) {
    const follow = element('div', 'followup'); follow.id = 'followup'; const label = element('label', null, q.followup.label); label.htmlFor = q.followup.id;
    const input = textInput(q.followup.id, state.answers[q.followup.id], {...q.followup, type: 'text'}); input.setAttribute('aria-label', q.followup.label); input.removeAttribute('aria-labelledby');
    follow.append(label, input); host.append(follow); syncFollowup(q);
  }
  if (state.finished) {
    const stamp = new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'}).format(new Date());
    $('answer-text').value = summary(state.answers, stamp, profile); $('whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent($('answer-text').value);
    $('result-save').textContent = lastAck >= context.revision ? '✓ Respostas salvas para o Andrey. Pode fechar esta página.' : 'Estou salvando suas últimas respostas…';
  }
  if (focus) {(state.finished ? $('result-title') : $('question-title')).focus({preventScroll: true}); (state.finished ? $('result') : $('question-card')).scrollIntoView({block: 'start', behavior: 'auto'});}
}
$('pmg-form').addEventListener('submit', event => event.preventDefault());
$('question').addEventListener('input', event => {
  const input = event.target, q = questions[state.step]; if (!input.name) return;
  if (q.type === 'multi' && input.name === q.id) {
    let values = [...$('question').querySelectorAll('input:checked')].map(item => item.value);
    if (input.checked && input.value === 'Não sei') values = ['Não sei']; else if (input.checked) values = values.filter(value => value !== 'Não sei');
    state.answers[q.id] = values; for (const item of $('question').querySelectorAll('input[type=checkbox]')) item.checked = values.includes(item.value);
  } else state.answers[input.name] = input.value;
  syncFollowup(q); state.answers = normalize(state.answers, profile); state.finished = false; changed(input.type === 'radio' || input.type === 'checkbox');
});
$('next').addEventListener('click', () => {if (state.step < questions.length - 1) state.step++; else state.finished = true; changed(true); render(true);});
$('back').addEventListener('click', () => {state.step = Math.max(0, state.step - 1); state.finished = false; changed(true); render(true);});
$('edit').addEventListener('click', () => {state.step = 0; state.finished = false; changed(true); render(true);});
$('retry').addEventListener('click', () => {clearTimeout(retryTimer); queue(true);});
$('copy').addEventListener('click', async () => {
  const box = $('answer-text'); try {await navigator.clipboard.writeText(box.value); notify('Respostas copiadas.');} catch {box.focus(); box.select(); try {if (document.execCommand('copy')) return notify('Respostas copiadas.');} catch {} notify('Texto selecionado. Toque e segure para copiar.');}
});
$('reset').addEventListener('click', () => {
  if (!confirm('Começar uma nova resposta? As respostas já salvas continuam disponíveis para o Andrey.')) return;
  flush(); context = newContext(); lastAck = 0; state = {answers: normalize({}, profile), step: 0, finished: false}; changed(true); render(true);
});
window.addEventListener('online', () => queue(true)); window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => {if (document.hidden) flush(); else if (lastAck < context.revision) queue(true);});
load(); $('greeting').textContent = `${profiles[profile].greeting} Vamos facilitar suas ofertas?`;
if (preview) $('notice').textContent = 'Prévia do formulário: as respostas desta tela não serão registradas.';
render(); pendingStatus();
async function start() {
  if (preview) return; const initialRevision = context.revision;
  try {
    const response = await fetch(`/api/draft?id=${encodeURIComponent(context.id)}`, {headers: {'X-Draft-Token': context.writeToken}, cache: 'no-store'});
    if (response.ok) {
      const {draft} = await response.json();
      if (draft.revision > context.revision && context.revision === initialRevision) {
        state = {answers: normalize(draft.answers, profile), step: draft.step, finished: draft.finished}; context.revision = draft.revision; persistLocal(); render();
      }
      lastAck = draft.revision;
    }
  } catch {}
  if (lastAck < context.revision) queue(true); else status(state.finished ? '✓ Respostas salvas para o Andrey. Pode fechar esta página.' : '✓ Continuando de onde você parou. Suas respostas estão salvas.');
}
start();
