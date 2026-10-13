import { put, get, list } from '@vercel/blob';
import { createDraftService } from './draft-service.js';

const storage = {
  async read(pathname) {
    const result = await get(pathname, {access: 'private', useCache: false});
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).json();
  },
  async create(pathname, value) {
    try {
      await put(pathname, JSON.stringify(value), {access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json'});
      return true;
    } catch (error) {
      // A repeated checkpoint is harmless; confirm existence before treating it as a duplicate.
      const existing = await get(pathname, {access: 'private', useCache: false});
      if (existing?.statusCode === 200) return false;
      throw error;
    }
  },
  async list(prefix) {
    const entries = []; let cursor;
    do {
      const page = await list({prefix, limit: 1000, ...(cursor ? {cursor} : {})});
      entries.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return entries;
  }
};

export const drafts = createDraftService(storage);
