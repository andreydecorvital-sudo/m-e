import {catalog, blankDraft, normalizeDraft, buildOffer, parseTable, money, offerText, today, displayDate} from './offers-model.js';
import {renderArt} from './offers-art.js';

const $ = id => document.getElementById(id), query = new URLSearchParams(location.search);
const profile = query.get('para') === 'tia' ? 'tia' : 'mae', preview = query.get('preview') === '1', KEY = `pmg-offer-workbench-v1:${profile}`;
let draft = blankDraft(), offer = null, imageURL = '', file = null, busy = false, timer;
function node(tag, cls, text) {const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e;}
function notify(text) {clearTimeout(timer); $('toast').textContent = text; $('toast').hidden = false; timer = setTimeout(() => $('toast').hidden = true, 4500);}
function persist() {
  if (preview) {$('save-status').textContent = 'Prévia: o preenchimento desta tela não será guardado.'; return;}
  try {localStorage.setItem(KEY, JSON.stringify(draft)); $('save-status').textContent = '✓ Rascunho guardado neste aparelho. Você pode parar e voltar depois.';}
  catch {$('save-status').textContent = 'Este navegador não está guardando o rascunho. Salve a imagem antes de fechar.';}
}
function updateRow(id) {
  const input = draft.rows[id], model = buildOffer({...blankDraft(), rows: {[id]: input}}), row = model.rows[0], host = $(id + '-card');
  host.classList.toggle('ready', Boolean(row)); const label = $(id + '-total');
  label.replaceChildren();
  if (row?.totalCents !== null && row?.totalCents !== undefined) {label.append(node('span', null, 'Total da peça: '), node('strong', null, money(row.totalCents)));}
  else label.textContent = row ? 'Vai na oferta com o preço por kg.' : 'Deixe o preço vazio para não incluir.';
}
function countRows() {const count = buildOffer(draft).rows.length; $('filled-count').textContent = count ? `${count} ${count === 1 ? 'produto na oferta' : 'produtos na oferta'}` : 'Nenhum preço informado';}
function renderEditor() {
  for (const id of ['date', 'reference', 'representatives', 'contact', 'note']) $(id).value = draft[id];
  $('products').replaceChildren();
  for (const p of catalog) {
    const card = node('article', 'product'); card.id = p.id + '-card'; card.append(node('h4', null, p.name), node('p', 'pack', p.pack)); const fields = node('div', 'product-fields');
    for (const [key, text, placeholder] of [['price', 'Preço por kg (R$)', 'Ex.: 34,56'], ['weight', 'Peso real (kg) · opcional', 'Ex.: 3,940']]) {
      const group = node('div'), label = node('label', null, text), input = node('input'); input.id = `${p.id}-${key}`; label.htmlFor = input.id;
      input.type = 'text'; input.inputMode = 'decimal'; input.autocomplete = 'off'; input.maxLength = 25; input.placeholder = placeholder; input.value = draft.rows[p.id][key]; input.dataset.product = p.id; input.dataset.field = key;
      group.append(label, input); fields.append(group);
    }
    const total = node('p', 'product-total'); total.id = p.id + '-total'; card.append(fields, total); $('products').append(card); updateRow(p.id);
  }
  countRows(); $('old-draft').hidden = !(draft.date && draft.date < today());
  if (!$('old-draft').hidden) $('old-draft').textContent = `Você retomou uma tabela de ${displayDate(draft.date)}. Comece uma nova tabela para os preços de hoje ou atualize a data e confira todos os valores.`;
}
function enableExports() {for (const id of ['share', 'download', 'copy-text']) $(id).disabled = !$('confirmed').checked || !file; renderClients();}
function edit() {
  $('editor').hidden = false; $('review').hidden = true; $('edit-step').classList.add('active'); $('edit-step').setAttribute('aria-current', 'step'); $('review-step').classList.remove('active'); $('review-step').removeAttribute('aria-current');
}
function errors(messages) {
  $('errors').replaceChildren(); $('errors').hidden = messages.length === 0; if (!messages.length) return;
  $('errors').append(node('strong', null, 'Só precisamos conferir estes pontos:')); const list = node('ul'); messages.forEach(message => list.append(node('li', null, message))); $('errors').append(list); $('errors').scrollIntoView({block: 'center'});
}
async function prepare() {
  if (busy) return; const next = buildOffer(draft); errors(next.errors); if (next.errors.length) return;
  busy = true; $('prepare').disabled = true; $('prepare').textContent = 'Preparando sua imagem…'; $('review-step').disabled = true;
  try {
    const result = await renderArt(next); if (imageURL) URL.revokeObjectURL(imageURL); imageURL = URL.createObjectURL(result.blob);
    offer = next; file = new File([result.blob], `pmg-mucarelas-${offer.date}.png`, {type: 'image/png'});
    $('art').src = imageURL; $('art').width = result.width; $('art').height = result.height; $('message').value = offerText(offer);
    $('review-description').textContent = `${offer.rows.length} ${offer.rows.length === 1 ? 'produto' : 'produtos'} · Valores de ${displayDate(offer.date)}`;
    $('review-reference').textContent = offer.reference ? `Sua referência: ${offer.reference}. Esse nome não aparece na arte.` : 'Confira se os preços pertencem à condição e ao cliente certos.';
    const withWeight = offer.rows.filter(row => row.grams !== null).length;
    $('review-totals').textContent = withWeight ? `${withWeight} ${withWeight === 1 ? 'total calculado' : 'totais calculados'} com o peso informado. Confira se é o peso da peça que está ofertando.` : 'A oferta mostra somente o preço por kg. Pesos e totais não foram presumidos.';
    $('confirmed').checked = false; enableExports(); $('share-result').textContent = ''; $('download-fallback').hidden = true;
    $('editor').hidden = true; $('review').hidden = false; $('edit-step').classList.remove('active'); $('edit-step').removeAttribute('aria-current'); $('review-step').classList.add('active'); $('review-step').setAttribute('aria-current', 'step');
    $('review-title').focus({preventScroll: true}); $('review').scrollIntoView({block: 'start'});
  } catch (error) {errors([error.message || 'Não consegui preparar a imagem. Tente novamente.']);}
  finally {busy = false; $('prepare').disabled = false; $('prepare').textContent = 'Conferir minha oferta →'; $('review-step').disabled = false;}
}
function download() {
  if (!file || !$('confirmed').checked) return;
  const link = $('download-fallback'); link.href = imageURL; link.download = file.name; link.hidden = false; link.click();
  $('share-result').textContent = 'Se o navegador não salvar automaticamente, use o link abaixo. Depois, anexe a imagem no WhatsApp.';
}
$('editor').addEventListener('input', event => {
  const input = event.target;
  if (input.dataset.product) {draft.rows[input.dataset.product][input.dataset.field] = input.value; updateRow(input.dataset.product); countRows();}
  else if (['date', 'reference', 'representatives', 'contact', 'note'].includes(input.id)) draft[input.id] = input.value;
  else return;
  $('confirmed').checked = false; enableExports(); persist();
});
$('prepare').addEventListener('click', prepare); $('review-step').addEventListener('click', prepare);
$('back').addEventListener('click', () => {edit(); $('editor-title').focus({preventScroll: true}); $('editor').scrollIntoView({block: 'start'});}); $('edit-step').addEventListener('click', edit);
$('confirmed').addEventListener('change', enableExports);
$('new-offer').addEventListener('click', () => {
  if (Object.values(draft.rows).some(row => row.price || row.weight) && !confirm('Começar outra tabela com os preços vazios? Salve a imagem atual primeiro se quiser guardar a oferta.')) return;
  const old = draft; draft = {...blankDraft(), representatives: old.representatives, contact: old.contact}; offer = null; file = null; $('confirmed').checked = false; enableExports(); errors([]); $('import-result').hidden = true; $('paste').value = ''; renderEditor(); persist(); notify('Nova tabela pronta para os valores de hoje.');
});
$('import').addEventListener('click', () => {
  const result = parseTable($('paste').value), host = $('import-result'); host.replaceChildren(); host.hidden = false;
  if (!result.rows.length) host.append(node('p', null, 'Nenhum valor foi aplicado. Tente “Apolo;34,56;4,000” ou preencha os campos abaixo.'));
  else {
    draft.rows = blankDraft().rows; for (const row of result.rows) draft.rows[row.id] = {price: row.price, weight: row.weight};
    $('confirmed').checked = false; enableExports(); renderEditor(); persist(); errors([]);
    host.append(node('strong', null, `${result.rows.length} produtos preenchidos. Os valores anteriores foram substituídos. Confira abaixo.`));
  }
  if (result.issues.length) {const list = node('ul'); result.issues.forEach(issue => list.append(node('li', null, issue))); host.append(list);}
});
$('download').addEventListener('click', download);
$('share').addEventListener('click', async () => {
  if (!file || !$('confirmed').checked) return;
  try {
    if (navigator.share && navigator.canShare?.({files: [file]})) {
      await navigator.share({files: [file], title: 'PMG · Tabela de muçarelas'}); $('share-result').textContent = 'A imagem foi entregue ao menu de compartilhamento. O envio é confirmado no aplicativo escolhido.';
    } else {download(); notify('Salve a imagem e anexe na conversa do WhatsApp.');}
  } catch (error) {if (error.name !== 'AbortError') {$('share-result').textContent = 'Não consegui abrir o compartilhamento. Use “Salvar imagem no aparelho”.';}}
});
$('copy-text').addEventListener('click', async () => {
  if (!file || !$('confirmed').checked) return;
  try {await navigator.clipboard.writeText($('message').value); notify('Mensagem copiada. É só colar no WhatsApp.');}
  catch {$('message').parentElement.open = true; $('message').focus(); $('message').select(); try {if (document.execCommand('copy')) return notify('Mensagem copiada.');} catch {} notify('Texto selecionado. Toque e segure para copiar.');}
});

const CLIENT_KEY = 'pmg-local-contacts-v1:' + profile;
const SENT_KEY = 'pmg-local-sent-v1:' + profile;
let clients = [], sent = {};
try {
  clients = JSON.parse(localStorage.getItem(CLIENT_KEY) || '[]');
  sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  if (!Array.isArray(clients)) clients = [];
  if (!sent || typeof sent !== 'object' || Array.isArray(sent)) sent = {};
} catch { clients = []; sent = {}; }
function contactSave() {
  if (preview) return;
  try { localStorage.setItem(CLIENT_KEY, JSON.stringify(clients)); localStorage.setItem(SENT_KEY, JSON.stringify(sent)); }
  catch { notify('Não foi possível guardar seus contatos neste aparelho.'); }
}
function contactPhone(raw) {
  const digits = String(raw).replace(/\\D/g, '');
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits;
  return '';
}
function sentKey(client) { return (offer?.date || draft.date) + ':' + client.id; }
function renderClients() {
  const host = $('client-list'); host.replaceChildren();
  const completed = clients.filter(c => sent[sentKey(c)] === true).length;
  $('client-count').textContent = clients.length ? completed + ' de ' + clients.length + ' clientes marcados como enviados nesta data.' : 'Nenhum cliente cadastrado.';
  for (const c of clients) {
    const row = node('div', 'client-row'), information = node('div', 'client-info'), actions = node('div', 'client-actions');
    information.append(node('strong', null, c.name), node('small', null, c.phone));
    const done = sent[sentKey(c)] === true;
    const open = node('button', 'client-open', 'Abrir WhatsApp');
    open.type = 'button'; open.disabled = !offer || !$('confirmed').checked || !file;
    open.addEventListener('click', () => {
      const number = contactPhone(c.phone); if (!number || !offer || !$('confirmed').checked) return;
      const url = 'https://wa.me/' + number + '?text=' + encodeURIComponent(offerText(offer));
      const tab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!tab) notify('Seu navegador bloqueou a nova aba. Permita abrir o WhatsApp.');
    });
    const mark = node('button', 'client-mark' + (done ? ' done' : ''), done ? '✓ Enviado' : 'Marcar enviado');
    mark.type = 'button'; mark.addEventListener('click', () => {
      if (!offer || !$('confirmed').checked || !file) return notify('Confira a oferta primeiro.');
      sent[sentKey(c)] = !sent[sentKey(c)]; contactSave(); renderClients();
    });
    const remove = node('button', 'client-remove', 'Excluir'); remove.type = 'button';
    remove.addEventListener('click', () => {if (!confirm('Excluir este contato apenas deste aparelho?')) return; clients = clients.filter(x => x.id !== c.id); contactSave(); renderClients();});
    actions.append(open, mark, remove); row.append(information, actions); host.append(row);
  }
}
$('add-client').addEventListener('click', () => {
  const name = $('contact-name').value.trim(), phone = contactPhone($('contact-phone').value);
  if (!name || !phone) return notify('Informe um nome e um WhatsApp válido com DDD.');
  if (clients.some(c => contactPhone(c.phone) === phone)) return notify('Esse telefone já está cadastrado.');
  clients.push({id: crypto.randomUUID(), name, phone});
  contactSave(); $('contact-name').value = ''; $('contact-phone').value = ''; renderClients(); notify('Cliente adicionado.');
});

try {if (!preview) draft = normalizeDraft(JSON.parse(localStorage.getItem(KEY) || 'null'));} catch {draft = blankDraft();}
$('date').min = today(); $('form-link').href = `/${profile}`; $('hello').textContent = `${profile === 'tia' ? 'Tia' : 'Mãe'}, informe os preços, confira e deixe a arte com a gente.`;
renderEditor(); persist(); renderClients();
