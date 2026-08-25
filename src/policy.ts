import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

export interface PolicyOptions { allowLocalFixture?: boolean; resolveDns?: boolean }

function isPrivateV4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a = 0, b = 0] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) || (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) || a >= 224;
}

function isPrivateAddress(address: string): boolean {
  const lower = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(lower) === 4) return isPrivateV4(lower);
  if (isIP(lower) !== 6) return true;
  if (lower.startsWith('::ffff:')) return true;
  const mapped = lower.match(/^(?:0*:){5}ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateV4(mapped[1]);
  return lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') ||
    /^fe[89a-f]/.test(lower) || lower.startsWith('ff') || lower.startsWith('2001:db8:');
}

function isLoopback(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h.endsWith('.localhost') || h === '::1' || (isIP(h) === 4 && h.startsWith('127.'));
}

export async function validateUrl(raw: string, options: PolicyOptions = {}): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('URL is invalid'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http: and https: URLs are allowed');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed');
  if (!url.hostname) throw new Error('URL must include a hostname');
  const normalizedHost = url.hostname.replace(/^\[|\]$/g, '');
  if (isLoopback(url.hostname)) {
    if (options.allowLocalFixture === true) return url;
    throw new Error('Loopback targets require the explicit local-fixture override');
  }
  if (isIP(normalizedHost) && isPrivateAddress(normalizedHost)) throw new Error('Private, reserved, or link-local targets are not allowed');
  if (options.resolveDns === true) {
    const answers = await lookup(normalizedHost, { all: true, verbatim: true });
    if (answers.length === 0 || answers.some(({ address }) => isPrivateAddress(address))) {
      throw new Error('Hostname resolves to a private, reserved, or link-local address');
    }
  }
  return url;
}

export function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.username = ''; url.password = ''; url.search = ''; url.hash = '';
    return url.toString().slice(0, 2048);
  } catch { return '[non-http-url]'; }
}

export function redactText(input: string): string {
  return input
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi, '[REDACTED_AUTH]')
    .replace(/\b(token|api[_-]?key|password|secret)=([^\s&]+)/gi, '$1=[REDACTED]')
    .replace(/https?:\/\/[^\s]+/gi, (value) => sanitizeUrl(value))
    .slice(0, 2000);
}
