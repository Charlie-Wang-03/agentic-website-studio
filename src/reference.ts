import { createHash } from 'node:crypto';

export function normalizeReferenceUrl(raw: string): string {
  const url = new URL(raw);
  url.username = ''; url.password = ''; url.search = ''; url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export function createReferenceId(raw: string): string {
  return `ref_${createHash('sha256').update(normalizeReferenceUrl(raw)).digest('hex').slice(0, 20)}`;
}
