import { drafts } from '../lib/blob-storage.js';
import { adminAllowed, json } from '../lib/access.js';

export async function GET(request) {
  if (!adminAllowed(request)) return json({error: 'Entre pelo seu link privado para visualizar as respostas.'}, 401);
  try {
    const test = new URL(request.url).searchParams.get('test') === '1';
    return json({drafts: await drafts.all(test), checkedAt: new Date().toISOString()});
  } catch (error) {
    console.error('PMG admin read failed', error.name);
    return json({error: 'Não foi possível atualizar o painel. Tente novamente.'}, 503);
  }
}
