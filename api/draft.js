import { drafts } from '../lib/blob-storage.js';
import { adminAllowed, trustedOrigin, json, HttpError } from '../lib/access.js';

export async function POST(request) {
  try {
    if (!trustedOrigin(request)) return json({error: 'Origem não autorizada.'}, 403);
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > 32768) return json({error: 'Resposta muito grande.'}, 413);
    let body; try {body = JSON.parse(text);} catch {return json({error: 'Resposta inválida.'}, 400);}
    const test = body.test === true;
    if (test && !adminAllowed(request)) return json({error: 'Acesso não autorizado.'}, 401);
    return json(await drafts.save(body, test));
  } catch (error) {
    if (error instanceof HttpError) return json({error: error.message}, error.status);
    console.error('PMG draft save failed', error.name);
    return json({error: 'Não foi possível salvar agora. Suas respostas continuam no aparelho.'}, 503);
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const test = url.searchParams.get('test') === '1';
    if (test && !adminAllowed(request)) return json({error: 'Acesso não autorizado.'}, 401);
    const token = request.headers.get('x-draft-token') || '';
    return json({draft: await drafts.read(url.searchParams.get('id'), token, test)});
  } catch (error) {
    if (error instanceof HttpError) return json({error: error.message}, error.status);
    console.error('PMG draft read failed', error.name);
    return json({error: 'Não foi possível recuperar a resposta.'}, 503);
  }
}
