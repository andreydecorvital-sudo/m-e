import { profiles, questionsFor, stagesFor } from './form-schema.js';
const $ = id => document.getElementById(id), SESSION = 'pmg-admin-access';
let access = '', records = [], selected = '', filter = 'all', busy = false, fingerprint = '', toastTimer;
const params = new URLSearchParams(location.hash.slice(1));
try {access = params.get('acesso') || sessionStorage.getItem(SESSION) || ''; if (access) sessionStorage.setItem(SESSION, access);} catch {access = params.get('acesso') || '';}
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
function node(tag, cls, text) {const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e;}
function date(value) {return new Intl.DateTimeFormat('pt-BR', {dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo'}).format(new Date(value));}
function badge(record) {return node('span', 'badge ' + (record?.finished ? 'done' : !record || record.answered === 0 ? 'empty' : ''), !record ? 'Ainda não abriu' : record.finished ? 'Concluído' : record.answered === 0 ? 'Abriu, sem respostas' : 'Parcial');}
function notify(text) {clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 3500);}
async function copy(text) {try {await navigator.clipboard.writeText(text); notify('Copiado.');} catch {notify('Não foi possível copiar automaticamente neste navegador.');}}
function personCards() {
  $('person-cards').replaceChildren();
  for (const profile of ['mae', 'tia']) {
    const latest = records.find(r => r.profile === profile), card = node('section', 'person-card'), header = node('header');
    header.append(node('h2', null, profiles[profile].label), badge(latest)); card.append(header);
    card.append(node('p', null, latest ? `${latest.answered} de ${latest.total} perguntas respondidas · Pergunta ${latest.step + 1} de ${latest.total}` : 'Você já pode encaminhar o formulário para ela.'));
    const track = node('div', 'progress-track'), bar = node('div', 'progress-bar'); bar.style.width = latest ? `${latest.answered / latest.total * 100}%` : '0%'; track.append(bar); card.append(track);
    if (latest) card.append(node('p', null, 'Último salvamento: ' + date(latest.updatedAt)));
    const links = node('div', 'person-links'), preview = node('a', null, 'Ver formulário'); preview.href = `/${profile}?preview=1`; preview.target = '_blank'; preview.rel = 'noopener noreferrer';
    const share = node('button', null, 'Copiar link para ela'); share.type = 'button'; share.addEventListener('click', () => copy(`${location.origin}/${profile}`));
    const offers = node('a', null, 'Abrir bancada de ofertas'); offers.href = `/ofertas?para=${profile}`; offers.target = '_blank'; offers.rel = 'noopener noreferrer';
    links.append(preview, share, offers); if (latest) {const read = node('button', null, 'Ver respostas'); read.type = 'button'; read.addEventListener('click', () => {selected = latest.id; filter = 'all'; render(); $('detail').scrollIntoView({block: 'start'});}); links.append(read);} card.append(links); $('person-cards').append(card);
  }
}
function sessions() {
  const visible = records.filter(r => filter === 'all' || r.profile === filter); if (!visible.some(r => r.id === selected)) selected = visible[0]?.id || '';
  $('sessions').replaceChildren();
  if (!visible.length) $('sessions').append(node('div', 'empty', 'Nenhuma resposta registrada ainda.'));
  for (const record of visible) {
    const button = node('button', 'session' + (record.id === selected ? ' active' : '')); button.type = 'button';
    button.append(node('strong', null, profiles[record.profile].label + ' · ' + (record.finished ? 'concluído' : 'parcial')), node('span', null, `${record.answered}/${record.total} respondidas · pergunta ${record.step + 1}`), node('span', null, date(record.updatedAt)));
    button.addEventListener('click', () => {selected = record.id; sessions(); detail();}); $('sessions').append(button);
  }
  for (const button of document.querySelectorAll('.filter')) button.classList.toggle('active', button.dataset.profile === filter);
}
function detail() {
  const record = records.find(r => r.id === selected), host = $('detail'); host.replaceChildren();
  if (!record) return host.append(node('div', 'empty', 'Assim que elas começarem, as respostas aparecem aqui.'));
  const header = node('div', 'detail-header'), title = node('div'); title.append(node('h2', null, 'Respostas da ' + profiles[record.profile].label.toLowerCase()), badge(record));
  const copyButton = node('button', 'btn secondary', 'Copiar resumo'); copyButton.type = 'button'; copyButton.addEventListener('click', () => copy(record.summary)); header.append(title, copyButton); host.append(header);
  host.append(node('p', 'detail-meta', `${record.answered} de ${record.total} respondidas. Parou ou está na pergunta ${record.step + 1}. Último salvamento: ${date(record.updatedAt)}.`));
  const questions = questionsFor(record.profile);
  for (let section = 0; section < stagesFor(record.profile).length; section++) {
    host.append(node('h3', 'section-title', stagesFor(record.profile)[section].title));
    for (const q of questions.filter(q => q.section === section)) {
      const answer = record.answers[q.id], text = Array.isArray(answer) ? answer.join('; ') : (answer || '').trim();
      const row = node('div', 'answer'); row.append(node('p', 'label', q.label), node('p', 'value' + (!text ? ' unanswered' : ''), text || 'Ainda não respondeu')); host.append(row);
      if (q.followup && record.answers[q.followup.id]) {const follow = node('div', 'answer'); follow.append(node('p', 'label', q.followup.label), node('p', 'value', record.answers[q.followup.id])); host.append(follow);}
    }
  }
}
function render() {personCards(); sessions(); detail();}
async function refresh() {
  if (busy) return;
  if (!access) {$('locked').hidden = false; $('dashboard').hidden = true; $('panel-status').textContent = 'Entre pelo seu link privado.'; return;}
  busy = true; $('refresh').disabled = true;
  try {
    const response = await fetch('/api/admin', {headers: {Authorization: 'Bearer ' + access}, cache: 'no-store'}), data = await response.json();
    if (response.status === 401) {$('locked').hidden = false; $('dashboard').hidden = true; $('panel-status').textContent = 'O acesso privado não foi reconhecido. Use o link entregue a você.'; return;}
    if (!response.ok) throw new Error('fetch');
    records = data.drafts; $('locked').hidden = true; $('dashboard').hidden = false;
    const key = records.map(r => `${r.id}:${r.revision}`).join('|'); if (key !== fingerprint || !fingerprint) {fingerprint = key; render();}
    $('panel-status').textContent = 'Atualizado em ' + date(data.checkedAt) + ' · Salvamento automático durante o preenchimento';
  } catch {$('panel-status').textContent = 'Não consegui atualizar agora. As últimas respostas recebidas continuam visíveis.';}
  finally {busy = false; $('refresh').disabled = false;}
}
for (const button of document.querySelectorAll('.filter')) button.addEventListener('click', () => {filter = button.dataset.profile; sessions(); detail();});
$('refresh').addEventListener('click', refresh);
$('private-link').addEventListener('click', () => access ? copy(`${location.origin}/painel#acesso=${encodeURIComponent(access)}`) : notify('Abra primeiro seu link privado.'));
$('logout').addEventListener('click', () => {access = ''; records = []; try {sessionStorage.removeItem(SESSION);} catch {} $('dashboard').hidden = true; refresh();});
setInterval(() => {if (!document.hidden) refresh();}, 10000); document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh();}); refresh();
