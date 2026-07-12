import { describe, expect, it } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';
import { onRequestPost } from './astrologo-auth';

describe('POST /api/astrologo-auth', () => {
  it('não executa DDL durante a requisição depois que o schema foi migrado', async () => {
    const queries: string[] = [];
    const db: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        queries.push(query);
        const statement: D1Statement<TFirst> = {
          bind: () => statement,
          first: async () =>
            (query.includes('astrologo_rate_limit_policies')
              ? { enabled: 1, max_requests: 8, window_minutes: 15 }
              : { request_count: 0 }) as TFirst,
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
    };
    const request = new Request('https://mapa-astral.lcv.app.br/api/astrologo-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://mapa-astral.lcv.app.br',
        'CF-Connecting-IP': '203.0.113.10',
      },
      body: JSON.stringify({ action: 'ação-inexistente' }),
    });

    const response = await onRequestPost({
      request,
      env: { BIGDATA_DB: db, RESEND_API_KEY: 'chave-de-teste' },
    });

    expect(response.status).toBe(400);
    expect(queries.some((query) => /\b(?:CREATE|ALTER)\s+TABLE\b/iu.test(query))).toBe(false);
  });
});
