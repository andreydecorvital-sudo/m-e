// Catálogo conferido no exemplo da PMG. Preços e pesos reais começam vazios.
export const catalog = [
  ['apolo', 'Apolo'], ['bari', 'Bari'], ['bonissimo', 'Boníssimo'],
  ['classica', 'Clássica'], ['deale', 'Deale'], ['frizzo', 'Frizzo'],
  ['hm', 'HM'], ['imperador', 'Imperador'], ['italac', 'Italac'],
  ['juquei', 'Juqueí'], ['litoral', 'Litoral'], ['monte-castelo', 'Monte Castelo'],
  ['piloto', 'Piloto'], ['tres-marias', 'Três Marias Ouro Preto']
].map(([id, brand]) => ({id, brand, name: `Muçarela ${brand}`, pack: 'Peça aprox. 4 kg · caixa com 6 peças'}));

export function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
}
export function blankDraft(day = today()) {
  return {version: 1, date: day, reference: '', representatives: 'Eliane e Tatiane', contact: '(11) 98272-6473', note: '', rows: Object.fromEntries(catalog.map(p => [p.id, {price: '', weight: ''}]))};
}
export function normalizeDraft(raw, day = today()) {
  const draft = blankDraft(day);
  if (!raw || raw.version !== 1) return draft;
  for (const [key, max] of Object.entries({date: 10, reference: 70, representatives: 70, contact: 40, note: 180})) {
    if (typeof raw[key] === 'string') draft[key] = raw[key].slice(0, max);
  }
  for (const p of catalog) for (const key of ['price', 'weight']) if (typeof raw.rows?.[p.id]?.[key] === 'string') draft.rows[p.id][key] = raw.rows[p.id][key].slice(0, 25);
  return draft;
}
// Converte valores em inteiros (centavos/gramas) antes de multiplicar.
// Separadores ambíguos, negativos, expoentes e caracteres estranhos são recusados.
export function decimal(raw, scale = 2) {
  let value = String(raw ?? '').trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (!value) return null;
  if (value.includes(',')) {
    if (!/^\d+(?:\.\d{3})*,\d+$/.test(value)) return null;
    value = value.replace(/\./g, '').replace(',', '.');
  }
  const match = value.match(new RegExp(`^(\\d{1,6})(?:\\.(\\d{1,${scale}}))?$`));
  if (!match) return null;
  const number = Number(match[1]) * 10 ** scale + Number((match[2] || '').padEnd(scale, '0'));
  return Number.isSafeInteger(number) && number > 0 && number <= 9999999 ? number : null;
}
export function pieceTotal(priceCents, grams) { return Math.round(priceCents * grams / 1000); }
export function money(cents) { return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(cents / 100); }
export function weight(grams) { return new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 3, maximumFractionDigits: 3}).format(grams / 1000); }
export function displayDate(day) { const [y, m, d] = day.split('-'); return `${d}/${m}/${y}`; }
export function validDate(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const value = new Date(`${day}T12:00:00Z`);
  return !Number.isNaN(value.valueOf()) && value.toISOString().slice(0, 10) === day;
}
export function buildOffer(raw, day = today()) {
  const draft = normalizeDraft(raw, day), rows = [], errors = [];
  if (!validDate(draft.date)) errors.push('Escolha uma data válida para a oferta.');
  else if (draft.date < day) errors.push('Esta tabela é de uma data passada. Atualize a data e confira os preços de hoje.');
  for (const p of catalog) {
    const input = draft.rows[p.id]; if (!input.price.trim() && !input.weight.trim()) continue;
    const priceCents = decimal(input.price), grams = input.weight.trim() ? decimal(input.weight, 3) : null;
    if (priceCents === null) {errors.push(`${p.brand}: informe um preço por kg válido, como 34,56.`); continue;}
    if (input.weight.trim() && grams === null) {errors.push(`${p.brand}: confira o peso, como 3,940 kg.`); continue;}
    rows.push({...p, priceCents, grams, totalCents: grams === null ? null : pieceTotal(priceCents, grams)});
  }
  if (!rows.length && !errors.length) errors.push('Informe o preço de pelo menos um produto.');
  return {...draft, rows, errors};
}
export function offerText(offer) {
  const text = [`*PMG · Tabela de muçarelas*`, `Valores válidos em ${displayDate(offer.date)}.`, ''];
  for (const row of offer.rows) {
    text.push(`*${row.name}* — ${money(row.priceCents)}/kg`);
    if (row.grams !== null) text.push(`Peso: ${weight(row.grams)} kg · Total da peça: ${money(row.totalCents)}`);
  }
  text.push('', 'Peças de aproximadamente 4 kg. Caixa com 6 peças.', 'Quando informado, o total corresponde ao peso da peça indicada.');
  if (offer.note) text.push(offer.note);
  if (offer.representatives) text.push(`Representantes: ${offer.representatives}`);
  if (offer.contact) text.push(`Contato: ${offer.contact}`);
  text.push('Valores sujeitos a alteração. Confirme as condições no pedido.');
  return text.join('\n');
}
function plain(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(); }
function brandFor(line) {
  const normalized = plain(line);
  return [...catalog].sort((a, b) => b.brand.length - a.brand.length).find(p => {
    const terms = p.id === 'tres-marias' ? ['TRES MARIAS'] : [plain(p.brand)];
    return terms.some(term => new RegExp(`(?:^|[^A-Z0-9])${term}(?:$|[^A-Z0-9])`).test(normalized));
  });
}
export function parseTable(text) {
  const parsed = [], issues = [], seen = new Map();
  const lines = String(text).slice(0, 20000).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line) continue;
    const product = brandFor(line);
    if (!product) {
      // Cabeçalhos não são produtos. Outras linhas continuam visíveis como pendências.
      const header = /^(produto\b|peso\b|unidade\b|valor\b|pre[cç]o\b)/i.test(line) && !/\d/.test(line);
      if (header || /^(pmg\b|tabela\b|obs\b|representantes\b|contato\b|valores\b|uma semana\b)/i.test(line)) continue;
      issues.push(`Linha ${i + 1}: não reconheci o produto. Confira ou preencha manualmente.`); continue;
    }
    seen.set(product.id, (seen.get(product.id) || 0) + 1);
    let price = '', realWeight = '', reported = '';
    // Tabela original: produto/unidade/peso KG/preço por kg/total por peça.
    const original = line.match(/(\d{1,4}(?:[.,]\d{1,3})?)\s*KG\s+(?:R\$\s*)?(\d{1,6}(?:[.,]\d{1,2})?)(?:\s+(?:R\$\s*)?(\d{1,6}(?:[.,]\d{1,2})?))?\s*$/i);
    if (original) [, realWeight, price, reported = ''] = original;
    else {
      const columns = line.split(/[;\t]/).map(s => s.trim());
      if (columns.length === 2 || columns.length === 3) {price = columns[1]; realWeight = columns[2] || '';}
      else {
        const normalized = plain(line), brandEnd = product.id === 'tres-marias' ? normalized.indexOf('TRES MARIAS') + 'TRES MARIAS'.length : normalized.indexOf(plain(product.brand)) + product.brand.length;
        const tail = line.slice(brandEnd).trim();
        if (/^(?:R\$\s*)?\d{1,6}(?:[.,]\d{1,2})?$/.test(tail)) price = tail;
      }
    }
    const cents = decimal(price), grams = realWeight ? decimal(realWeight, 3) : null;
    if (cents === null || (realWeight && grams === null)) {issues.push(`Linha ${i + 1} (${product.brand}): não consegui separar preço e peso com segurança.`); continue;}
    if (reported && decimal(reported) !== pieceTotal(cents, grams)) {issues.push(`Linha ${i + 1} (${product.brand}): o total não confere com preço por kg × peso. Preencha após conferir.`); continue;}
    parsed.push({id: product.id, price, weight: realWeight});
  }
  const duplicates = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  for (const id of duplicates) issues.push(`${catalog.find(p => p.id === id).brand} aparece mais de uma vez. Confira se foram misturadas tabelas de clientes diferentes.`);
  return {rows: parsed.filter(row => !duplicates.includes(row.id)), issues};
}
