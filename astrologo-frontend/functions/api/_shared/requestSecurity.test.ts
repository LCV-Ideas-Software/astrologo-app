import fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './requestSecurity';
import {
  enforceRateLimit,
  getClientIp,
  getCorsHeaders,
  hasDisallowedOrigin,
  isAllowedLcvOrigin,
} from './requestSecurity';

const createRequest = (origin?: string, extraHeaders: Record<string, string> = {}) => {
  const headers = new Headers(extraHeaders);
  if (origin) headers.set('Origin', origin);
  return new Request('https://mapa-astral.lcv.app.br/api/teste', { headers });
};

const dnsLabelArbitrary = fc.stringMatching(/^[a-z0-9](?:[a-z0-9-]{0,18}[a-z0-9])?$/);
const trustedOriginArbitrary = fc
  .array(dnsLabelArbitrary, { minLength: 0, maxLength: 4 })
  .map((labels) => `https://${[...labels, 'lcv', 'app', 'br'].join('.')}`);

describe('requestSecurity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aceita apenas origens https em lcv.app.br', () => {
    expect(isAllowedLcvOrigin('https://mapa-astral.lcv.app.br')).toBe(true);
    expect(isAllowedLcvOrigin('https://admin-astrologo.lcv.app.br')).toBe(true);
    expect(isAllowedLcvOrigin('http://mapa-astral.lcv.app.br')).toBe(false);
    expect(isAllowedLcvOrigin('https://evil.com')).toBe(false);
  });

  it('mantém a fronteira de origem sob subdomínios e confusões de autoridade gerados', () => {
    fc.assert(
      fc.property(trustedOriginArbitrary, dnsLabelArbitrary, (trustedOrigin, attackerLabel) => {
        const trustedHost = trustedOrigin.slice('https://'.length);

        expect(isAllowedLcvOrigin(trustedOrigin)).toBe(true);
        expect(isAllowedLcvOrigin(`http://${trustedHost}`)).toBe(false);
        expect(isAllowedLcvOrigin(`https://${trustedHost}.${attackerLabel}.invalid`)).toBe(false);
        expect(isAllowedLcvOrigin(`https://${trustedHost}@${attackerLabel}.invalid`)).toBe(false);
        expect(isAllowedLcvOrigin(`${trustedOrigin}:8443`)).toBe(false);
        expect(isAllowedLcvOrigin(`${trustedOrigin}/caminho`)).toBe(false);
      }),
      { numRuns: 1_000 },
    );
  });

  it('gera cabeçalhos CORS com fallback controlado', () => {
    const allowed = getCorsHeaders(createRequest('https://mapa-astral.lcv.app.br'), 'https://mapa-astral.lcv.app.br');
    const denied = getCorsHeaders(createRequest('https://evil.com'), 'https://mapa-astral.lcv.app.br');

    expect(allowed['Access-Control-Allow-Origin']).toBe('https://mapa-astral.lcv.app.br');
    expect(denied['Access-Control-Allow-Origin']).toBe('https://mapa-astral.lcv.app.br');
  });

  it('detecta origem não permitida', () => {
    expect(hasDisallowedOrigin(createRequest('https://evil.com'))).toBe(true);
    expect(hasDisallowedOrigin(createRequest('https://mapa-astral.lcv.app.br'))).toBe(false);
    expect(hasDisallowedOrigin(createRequest(undefined))).toBe(true);
  });

  it('extrai IP priorizando cabeçalhos do Cloudflare', () => {
    expect(getClientIp(createRequest(undefined, { 'CF-Connecting-IP': '1.2.3.4' }))).toBe('1.2.3.4');
    expect(getClientIp(createRequest(undefined, { 'X-Forwarded-For': '5.6.7.8, 9.9.9.9' }))).toBe('5.6.7.8');
  });

  it('aplica as políticas dos módulos avançados sem executar DDL durante a requisição', async () => {
    const queries: string[] = [];
    const db: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        queries.push(query);
        const statement: D1Statement<TFirst> = {
          bind: () => statement,
          first: async () =>
            (query.includes('astrologo_rate_limit_policies')
              ? { enabled: 1, max_requests: 4, window_minutes: 15 }
              : { request_count: 0 }) as TFirst,
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
    };

    await expect(
      enforceRateLimit(
        db,
        createRequest('https://mapa-astral.lcv.app.br', { 'CF-Connecting-IP': '1.2.3.4' }),
        'astrologo/sinastria',
      ),
    ).resolves.toBeNull();
    expect(queries.some((query) => /CREATE\s+TABLE/i.test(query))).toBe(false);
    expect(queries.some((query) => query.includes('INSERT INTO astrologo_api_rate_limits'))).toBe(true);
  });
});
