import {money, weight, displayDate} from './offers-model.js';

let logoPromise;
function logo() {
  logoPromise ||= new Promise((resolve, reject) => {const img = new Image(); img.onload = () => resolve(img); img.onerror = () => {logoPromise = null; reject(new Error('Não consegui carregar o logo. Tente novamente.'));}; img.src = '/assets/pmg-logo.png';});
  return logoPromise;
}
function font(ctx, size, bold = false) {ctx.font = `${bold ? 700 : 400} ${size}px system-ui, -apple-system, sans-serif`;}
function lines(ctx, text, width, size, bold = false) {
  font(ctx, size, bold); const result = [], words = String(text).split(/\s+/); let current = '';
  for (const word of words) {
    if (ctx.measureText(word).width > width) {
      if (current) {result.push(current); current = '';}
      let part = ''; for (const char of word) {if (ctx.measureText(part + char).width > width) {result.push(part); part = char;} else part += char;} current = part; continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > width && current) {result.push(current); current = word;} else current = next;
  }
  if (current) result.push(current); return result;
}
function fitted(ctx, value, right, y, width, size, color) {
  font(ctx, size, true); while (ctx.measureText(value).width > width && size > 15) font(ctx, --size, true);
  ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.fillText(value, right, y); ctx.textAlign = 'left';
}
export async function renderArt(offer) {
  if (offer.errors.length || !offer.rows.length) throw new Error('Confira os valores antes de preparar a imagem.');
  await document.fonts.ready; const mark = await logo(); const canvas = document.createElement('canvas'); canvas.width = 1080;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Este navegador não conseguiu criar a imagem.');
  const rowNames = offer.rows.map(row => lines(ctx, row.brand, 440, 35, true));
  const rowHeights = rowNames.map(name => Math.max(100, 68 + name.length * 39));
  const footer = [
    {text: 'Preço por kg. O total corresponde somente ao peso da peça informada.', size: 24, color: '#526c5c'},
    ...(offer.note ? [{text: offer.note, size: 26, color: '#194b32'}] : []),
    ...(offer.representatives ? [{text: `Representantes: ${offer.representatives}`, size: 26, bold: true, color: '#07573b'}] : []),
    ...(offer.contact ? [{text: `Contato: ${offer.contact}`, size: 27, bold: true, color: '#07573b'}] : []),
    {text: `Valores válidos em ${displayDate(offer.date)}. Sujeitos a alteração.`, size: 22, color: '#65786c'},
    {text: 'Confirme disponibilidade e condições no pedido.', size: 22, color: '#65786c'}
  ].map(item => ({...item, lines: lines(ctx, item.text, 970, item.size, item.bold)}));
  const tableY = 266, headerHeight = 62, tableBottom = tableY + headerHeight + rowHeights.reduce((a, b) => a + b, 0);
  canvas.height = tableBottom + 63 + footer.reduce((sum, item) => sum + item.lines.length * (item.size + 10) + 12, 0) + 28;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#07573b'; ctx.fillRect(0, 0, 1080, 230);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(41, 44, 127, 127);
  const ratio = Math.min(115 / mark.naturalWidth, 115 / mark.naturalHeight);
  ctx.drawImage(mark, 104.5 - mark.naturalWidth * ratio / 2, 107.5 - mark.naturalHeight * ratio / 2, mark.naturalWidth * ratio, mark.naturalHeight * ratio);
  ctx.fillStyle = '#dcebdc'; font(ctx, 22, true); ctx.fillText('PMG · ATACADISTA DE ALIMENTOS E BEBIDAS', 202, 68);
  ctx.fillStyle = '#ffffff'; font(ctx, 60, true); ctx.fillText('Tabela de muçarelas', 198, 141);
  font(ctx, 25); ctx.fillText(`Valores válidos em ${displayDate(offer.date)}`, 202, 184);
  font(ctx, 21); ctx.fillText('Peças de aprox. 4 kg · Caixa com 6 peças', 202, 217);
  ctx.fillStyle = '#f0f4ee'; ctx.fillRect(35, tableY, 1010, headerHeight);
  ctx.fillStyle = '#4a6754'; font(ctx, 22, true); ctx.fillText('PRODUTO', 56, tableY + 39);
  ctx.textAlign = 'right'; ctx.fillText('PREÇO / KG', 705, tableY + 39); ctx.fillText('PESO (KG)', 846, tableY + 39); ctx.fillText('TOTAL / PEÇA', 1024, tableY + 39); ctx.textAlign = 'left';
  let y = tableY + headerHeight;
  offer.rows.forEach((row, i) => {
    const height = rowHeights[i]; if (i % 2 === 0) {ctx.fillStyle = '#f8faf6'; ctx.fillRect(35, y, 1010, height);}
    ctx.fillStyle = '#dde7dd'; ctx.fillRect(35, y + height - 1, 1010, 1);
    ctx.fillStyle = '#163b27'; font(ctx, 35, true); rowNames[i].forEach((part, j) => ctx.fillText(part, 56, y + 43 + j * 39));
    ctx.fillStyle = '#6d7e70'; font(ctx, 20); ctx.fillText('Muçarela · peça aprox. 4 kg', 56, y + height - 20);
    const middle = y + height / 2 + 10;
    fitted(ctx, money(row.priceCents), 705, middle, 177, 34, '#183b28');
    fitted(ctx, row.grams === null ? '—' : weight(row.grams), 846, middle, 125, 28, '#5b6d5e');
    fitted(ctx, row.totalCents === null ? '—' : money(row.totalCents), 1024, middle, 168, 34, '#bc282e');
    y += height;
  });
  y = tableBottom + 46;
  for (const item of footer) {ctx.fillStyle = item.color; font(ctx, item.size, item.bold); for (const part of item.lines) {ctx.fillText(part, 55, y); y += item.size + 10;} y += 12;}
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não consegui salvar a imagem. Tente novamente.')), 'image/png'));
  return {blob, width: canvas.width, height: canvas.height};
}
