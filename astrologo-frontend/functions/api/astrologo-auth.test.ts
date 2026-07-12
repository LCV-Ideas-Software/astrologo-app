import { describe, expect, it } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';
import { onRequestPost } from './astrologo-auth';

const createDb = (
  firstFor: (query: string, bindings: readonly unknown[]) => unknown,
  runFor: (query: string, bindings: readonly unknown[]) => void = () => {},
): D1DatabaseLike => ({
  prepare: <TFirst>(query: string) => {
    let bindings: readonly unknown[] = [];
    const statement: D1Statement<TFirst> = {
      bind: (...values: unknown[]) => {
        bindings = values;
        return statement;
      },
      first: async () => firstFor(query, bindings) as TFirst,
      run: async () => {
        runFor(query, bindings);
        return { success: true };
      },
      all: async () => ({ results: [] }),
    };
    return statement;
  },
});

const makeRequest = (body: unknown) =>
  new Request('https://mapa-astral.lcv.app.br/api/astrologo-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://mapa-astral.lcv.app.br',
      'CF-Connecting-IP': '203.0.113.10',
    },
    body: JSON.stringify(body),
  });

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

  it('restaura uma sessão somente pelo token, sem exigir e-mail nem chave do Resend', async () => {
    let rateRoute = '';
    const db = createDb((query, bindings) => {
      if (query.includes('astrologo_rate_limit_policies')) {
        rateRoute = String(bindings[0]);
        return { enabled: 0 };
      }
      if (query.includes("action = 'session'")) {
        return {
          id: 'session-1',
          email: 'consulente@example.com',
          expires_at: '2999-01-01T00:00:00.000Z',
        };
      }
      if (query.includes('FROM astrologo_user_data')) {
        return { dados_json: JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] }) };
      }
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-retrieve', token: 'sessao-valida' }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      dados?: { mapasSalvos?: Array<{ id?: string }> };
      sessionToken?: string;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.dados?.mapasSalvos?.[0]?.id).toBe('mapa-1');
    expect(payload.sessionToken).toEqual(expect.any(String));
    expect(rateRoute).toBe('astrologo/auth-read');
  });

  it('nunca sobrescreve o proprietário já gravado ao carimbar mapas salvos', async () => {
    let owner = 'proprietario@example.com';
    const db = createDb(
      (query) => {
        if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
        if (query.includes("action = 'save'")) {
          return {
            id: 'otp-1',
            dados_json: JSON.stringify({ mapasSalvos: [{ id: 'mapa-alheio' }] }),
            expires_at: '2999-01-01T00:00:00.000Z',
          };
        }
        if (query.includes('SELECT id, email, save_claim_hash FROM astrologo_mapas')) {
          return { id: 'mapa-alheio', email: owner, save_claim_hash: null };
        }
        if (query.includes('SELECT id FROM astrologo_user_data')) return { id: 'user-data-1' };
        return null;
      },
      (query, bindings) => {
        if (!query.includes('UPDATE astrologo_mapas SET email')) return;
        const protectsExistingOwner = /email\s+IS\s+NULL|NULLIF\s*\(/iu.test(query);
        if (!protectsExistingOwner) owner = String(bindings[0]);
      },
    );

    const response = await onRequestPost({
      request: makeRequest({
        action: 'verify-save',
        email: 'intruso@example.com',
        token: '123456',
      }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: 'chave-de-teste' },
    });

    expect(response.status).toBe(409);
    expect(owner).toBe('proprietario@example.com');
  });

  it('não aceita o hash armazenado como se fosse o token de sessão bruto', async () => {
    const storedHash = 'a'.repeat(64);
    const db = createDb((query, bindings) => {
      if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
      if (query.includes("action = 'session'")) {
        return bindings[0] === storedHash
          ? { id: 'session-1', email: 'consulente@example.com', expires_at: '2999-01-01T00:00:00.000Z' }
          : null;
      }
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-retrieve', token: storedHash }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });

    expect(response.status).toBe(401);
  });

  it.each([
    'data-inválida',
    new Date(Date.now() - 1_000).toISOString(),
  ])('rejeita sessão com expiração inválida ou vencida: %s', async (expiresAt) => {
    const db = createDb((query) => {
      if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
      if (query.includes("action = 'session'")) {
        return { id: 'session-1', email: 'consulente@example.com', expires_at: expiresAt };
      }
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-retrieve', token: 'sessao-invalida' }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });

    expect(response.status).toBe(401);
  });

  it('responde com o mesmo 404 para mapa fora da conta e mapa inexistente', async () => {
    const call = async (savedIds: readonly string[]) => {
      const db = createDb((query) => {
        if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
        if (query.includes("action = 'session'")) {
          return {
            id: 'session-1',
            email: 'consulente@example.com',
            expires_at: '2999-01-01T00:00:00.000Z',
          };
        }
        if (query.includes('FROM astrologo_user_data')) {
          return { dados_json: JSON.stringify({ mapasSalvos: savedIds.map((id) => ({ id })) }) };
        }
        if (query.includes('FROM astrologo_mapas')) return null;
        return null;
      });
      const response = await onRequestPost({
        request: makeRequest({
          action: 'session-map-artifacts',
          token: 'sessao-valida',
          mapaId: 'mapa-procurado',
        }),
        env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
      });
      return { status: response.status, body: await response.text() };
    };

    const outsideAccount = await call(['outro-mapa']);
    const missingRecord = await call(['mapa-procurado']);

    expect(outsideAccount).toEqual(missingRecord);
    expect(outsideAccount.status).toBe(404);
    expect(JSON.parse(outsideAccount.body)).toEqual({ ok: false, error: 'Mapa não encontrado.' });
  });

  it('nega o bundle quando o mapa salvo está carimbado para outro proprietário', async () => {
    const db = createDb((query) => {
      if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
      if (query.includes("action = 'session'")) {
        return {
          id: 'session-1',
          email: 'consulente@example.com',
          expires_at: '2999-01-01T00:00:00.000Z',
        };
      }
      if (query.includes('FROM astrologo_user_data')) {
        return { dados_json: JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] }) };
      }
      if (query.includes('FROM astrologo_mapas')) {
        return { id: 'mapa-1', email: 'outra-pessoa@example.com' };
      }
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-map-artifacts', token: 'sessao-valida', mapaId: 'mapa-1' }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ ok: false, error: 'Mapa não encontrado.' });
  });

  it('devolve um patch explícito e canônico para um mapa pertencente à sessão', async () => {
    const preparedQueries: string[] = [];
    const db = createDb((query) => {
      preparedQueries.push(query);
      if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
      if (query.includes("action = 'session'")) {
        return {
          id: 'session-1',
          email: 'consulente@example.com',
          expires_at: '2999-01-01T00:00:00.000Z',
        };
      }
      if (query.includes('FROM astrologo_user_data')) {
        return { dados_json: JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] }) };
      }
      if (query.includes('SELECT id, email') && query.includes('FROM astrologo_mapas')) {
        return { id: 'mapa-1', email: 'CONSULENTE@example.com' };
      }
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-map-artifacts', token: 'sessao-valida', mapaId: 'mapa-1' }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      schemaId: 'urn:astrologo:saved-map-hydration',
      schemaVersion: '1.0.0',
      calculationId: 'mapa-1',
      artifacts: {
        natalChartAnalysisV1: null,
        transitRunV1: null,
        synastryResult: null,
        localityMapV1: null,
      },
      artifactStates: {
        natalChartAnalysisV1: 'absent',
        transitRunV1: 'absent',
        synastryResult: 'absent',
        localityMapV1: 'absent',
      },
    });
    expect(
      preparedQueries.some(
        (query) => query.includes('astrologo_synastry_runs') && query.includes('run.primary_mapa_id = ?'),
      ),
    ).toBe(true);
    expect(preparedQueries.some((query) => query.includes('run.secondary_mapa_id = ?'))).toBe(false);
  });

  it('não responde ok quando um artefato canônico está corrompido', async () => {
    const db = createDb((query) => {
      if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
      if (query.includes("action = 'session'")) {
        return { id: 'session-1', email: 'consulente@example.com', expires_at: '2999-01-01T00:00:00.000Z' };
      }
      if (query.includes('FROM astrologo_user_data')) {
        return { dados_json: JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] }) };
      }
      if (query.includes('SELECT id, email') && query.includes('FROM astrologo_mapas')) {
        return { id: 'mapa-1', email: 'consulente@example.com' };
      }
      if (query.includes("artifact_type = 'natal_chart_analysis'")) return { payload_json: '{inválido' };
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-map-artifacts', token: 'sessao-valida', mapaId: 'mapa-1' }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      code: 'CANONICAL_ARTIFACT_INVALID',
      error: 'Os dados avançados canônicos deste mapa estão inconsistentes.',
    });
  });

  it('não responde ok quando a consulta canônica falha no D1', async () => {
    const db = createDb((query) => {
      if (query.includes('astrologo_rate_limit_policies')) return { enabled: 0 };
      if (query.includes("action = 'session'")) {
        return { id: 'session-1', email: 'consulente@example.com', expires_at: '2999-01-01T00:00:00.000Z' };
      }
      if (query.includes('FROM astrologo_user_data')) {
        return { dados_json: JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] }) };
      }
      if (query.includes('SELECT id, email') && query.includes('FROM astrologo_mapas')) {
        return { id: 'mapa-1', email: 'consulente@example.com' };
      }
      if (query.includes('astrologo_locality_runs')) throw new Error('D1 indisponível');
      return null;
    });

    const response = await onRequestPost({
      request: makeRequest({ action: 'session-map-artifacts', token: 'sessao-valida', mapaId: 'mapa-1' }),
      env: { BIGDATA_DB: db, RESEND_API_KEY: '' },
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      code: 'CANONICAL_ARTIFACT_QUERY_FAILED',
      error: 'Os dados avançados canônicos estão temporariamente indisponíveis.',
    });
  });
});
