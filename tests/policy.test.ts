import { describe, expect, it } from 'vitest';
import { assertProjectSlug, containedPath } from '../src/paths.js';
import { redactText, sanitizeUrl, validateUrl } from '../src/policy.js';

describe('URL policy', () => {
  it.each(['file:///etc/passwd', 'data:text/plain,x', 'javascript:alert(1)', 'ftp://example.com'])('rejects unsupported %s', async (url) => expect(validateUrl(url)).rejects.toThrow());
  it('rejects credentials', async () => expect(validateUrl('https://user:pass@example.com')).rejects.toThrow(/credentials/));
  it.each(['http://localhost', 'http://127.0.0.1', 'http://2130706433', 'http://10.0.0.1', 'http://192.168.1.1', 'http://192.0.2.1', 'http://198.51.100.1', 'http://203.0.113.1', 'http://[::1]', 'http://[::ffff:7f00:1]', 'http://[fec0::1]', 'http://[ff02::1]'])('rejects private/reserved %s', async (url) => expect(validateUrl(url)).rejects.toThrow());
  it('accepts a public HTTP(S) URL syntactically', async () => expect((await validateUrl('https://example.com/path')).hostname).toBe('example.com'));
  it('allows loopback only with explicit fixture mode', async () => expect((await validateUrl('http://127.0.0.1:1234', { allowLocalFixture: true })).port).toBe('1234'));
  it('removes credentials, query, and fragment', () => expect(sanitizeUrl('https://u:p@example.com/a?token=x#y')).toBe('https://example.com/a'));
  it('redacts console secrets', () => expect(redactText('Bearer abc123 https://x.test/a?token=FIXTURE_SECRET')).not.toMatch(/abc123|FIXTURE_SECRET/));
});

describe('output boundaries', () => {
  it.each(['../escape', '..\\escape', 'C:\\x', '\\\\server\\share', 'CON', 'a/b'])('rejects project %s', (project) => expect(() => assertProjectSlug(project)).toThrow());
  it('keeps paths contained', () => expect(() => containedPath('C:\\safe', '..', 'escape')).toThrow());
});
