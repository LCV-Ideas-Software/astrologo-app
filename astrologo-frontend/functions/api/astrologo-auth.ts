import {
  loadCanonicalArtifactBundle,
  resolveCanonicalArtifactBundle,
  SAVED_MAP_HYDRATION_SCHEMA_ID,
  SAVED_MAP_HYDRATION_SCHEMA_VERSION,
} from './_shared/canonicalArtifactBundle';
import {
  claimAndSanitizeSavedMaps,
  MapOwnershipClaimError,
  MapOwnershipClaimInfrastructureError,
} from './_shared/mapOwnershipClaim';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  hashToken,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';

interface EnvBindings {
  BIGDATA_DB: D1DatabaseLike;
  RESEND_API_KEY: string;
}

interface Context {
  request: Request;
  env: EnvBindings;
}

function getCorsResponse(request: Request, data: unknown, status = 200) {
  const corsHeaders = getCorsHeaders(request, 'https://mapa-astral.lcv.app.br');
  return jsonResponse(data, status, corsHeaders);
}

export async function onRequestOptions(context: Context) {
  return new Response(null, {
    headers: { ...getCorsHeaders(context.request, 'https://mapa-astral.lcv.app.br'), ...securityHeaders },
  });
}

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String((array[0] ?? 0) % 1000000).padStart(6, '0');
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutos
const MAP_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;
const MAX_AUTH_BODY_BYTES = 2_000_000;

const isExpiredOrInvalid = (expiresAt: unknown): boolean => {
  if (typeof expiresAt !== 'string') return true;
  const epochMs = Date.parse(expiresAt);
  return !Number.isFinite(epochMs) || epochMs <= Date.now();
};

async function createSessionToken(db: D1DatabaseLike, email: string): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const hashedSessionToken = await hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const id = crypto.randomUUID();
  await db
    .prepare(`INSERT INTO astrologo_auth_tokens (id, email, token, action, expires_at) VALUES (?, ?, ?, 'session', ?)`)
    .bind(id, email, hashedSessionToken, expiresAt)
    .run();
  return sessionToken;
}

async function sendTokenEmail(email: string, token: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Oráculo Astrológico <astrologo-app@lcv.app.br>',
        to: [email],
        subject: 'Seu código de verificação — Oráculo Celestial',
        html: `
          <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0d0d0d; margin-bottom: 8px;">Oráculo Celestial</h2>
            <p style="color: #514b48; margin-bottom: 24px;">Use o código abaixo para verificar sua identidade e gerenciar seus mapas:</p>
            <div style="background: #f5f4f4; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a73e8;">${token}</span>
            </div>
            <p style="color: #888; font-size: 13px;">Este código expira em 10 minutos. Se você não solicitou, ignore este e-mail.</p>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function onRequestPost(context: Context) {
  const { request, env } = context;

  if (hasDisallowedOrigin(request)) {
    return getCorsResponse(request, { ok: false, error: 'Origem não permitida.' }, 403);
  }

  const db = env?.BIGDATA_DB;
  if (!db || typeof db.prepare !== 'function') {
    return getCorsResponse(request, { ok: false, error: 'Database indisponível.' }, 503);
  }

  try {
    const declaredLength = Number.parseInt(request.headers.get('Content-Length') ?? '0', 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_AUTH_BODY_BYTES) {
      return getCorsResponse(request, { ok: false, error: 'Dados de autenticação muito extensos.' }, 413);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_AUTH_BODY_BYTES) {
      return getCorsResponse(request, { ok: false, error: 'Dados de autenticação muito extensos.' }, 413);
    }
    let body: {
      action: string;
      email?: string;
      token?: string;
      dados?: unknown;
      mapaId?: string;
    };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return getCorsResponse(request, { ok: false, error: 'Corpo JSON inválido.' }, 400);
    }
    const action = body.action;
    const readOnlySessionAction = action === 'session-retrieve' || action === 'session-map-artifacts';
    const rateLimitError = await enforceRateLimit(
      db,
      request,
      readOnlySessionAction ? 'astrologo/auth-read' : 'astrologo/auth',
    );
    if (rateLimitError) {
      return new Response(rateLimitError.body, {
        status: rateLimitError.status,
        headers: {
          ...Object.fromEntries(rateLimitError.headers.entries()),
          ...getCorsHeaders(request, 'https://mapa-astral.lcv.app.br'),
        },
      });
    }

    const email = (body.email ?? '').trim().toLowerCase();
    const actionsRequiringEmail = new Set([
      'save',
      'verify-save',
      'request-token',
      'retrieve',
      'request-delete-token',
      'verify-delete',
    ]);

    if (actionsRequiringEmail.has(action) && !email.includes('@')) {
      return getCorsResponse(request, { ok: false, error: 'E-mail inválido.' }, 400);
    }

    const envRec = env as unknown as Record<string, unknown>;
    const apiKey = (env?.RESEND_API_KEY ||
      envRec.RESEND_APP_KEY ||
      envRec.RESEND_APPKEY ||
      envRec['resend-api-key'] ||
      envRec['resend-appkey']) as string;
    if (new Set(['save', 'request-token', 'request-delete-token']).has(action) && !apiKey) {
      return getCorsResponse(request, { ok: false, error: 'RESEND_API_KEY não configurada.' }, 503);
    }

    if (action === 'save') {
      if (!body.dados) {
        return getCorsResponse(request, { ok: false, error: 'Nenhum dado fornecido para salvar.' }, 400);
      }

      const token = generateOTP();
      const hashedOtp = await hashToken(token);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const id = crypto.randomUUID();

      await db
        .prepare(
          `INSERT INTO astrologo_auth_tokens (id, email, token, action, dados_json, expires_at) VALUES (?, ?, ?, 'save', ?, ?)`,
        )
        .bind(id, email, hashedOtp, JSON.stringify(body.dados), expiresAt)
        .run();

      const sent = await sendTokenEmail(email, token, apiKey);
      if (!sent) {
        return getCorsResponse(request, { ok: false, error: 'Falha ao enviar e-mail. Tente novamente.' }, 502);
      }

      return getCorsResponse(request, { ok: true, message: 'Código enviado para seu e-mail.' });
    }

    if (action === 'verify-save') {
      const token = (body.token ?? '').trim();
      if (!token) return getCorsResponse(request, { ok: false, error: 'Token não fornecido.' }, 400);
      const hashedOtp = await hashToken(token);

      const row = await db
        .prepare<{ id: string; dados_json: string; expires_at: string }>(
          `SELECT id, dados_json, expires_at FROM astrologo_auth_tokens
         WHERE email = ? AND token = ? AND action = 'save' AND used = 0
         ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(email, hashedOtp)
        .first();

      if (!row) return getCorsResponse(request, { ok: false, error: 'Código inválido ou expirado.' }, 401);
      if (isExpiredOrInvalid(row.expires_at)) {
        return getCorsResponse(request, { ok: false, error: 'Código expirado. Solicite um novo.' }, 401);
      }

      let sanitizedDataJson: string;
      try {
        sanitizedDataJson = await claimAndSanitizeSavedMaps(db, email, row.dados_json);
      } catch (error) {
        if (error instanceof MapOwnershipClaimError) {
          return getCorsResponse(request, { ok: false, error: error.message }, 409);
        }
        if (error instanceof MapOwnershipClaimInfrastructureError) {
          return getCorsResponse(
            request,
            { ok: false, error: 'Não foi possível confirmar a propriedade dos mapas.' },
            503,
          );
        }
        throw error;
      }

      const existingData = await db
        .prepare('SELECT id FROM astrologo_user_data WHERE email = ? LIMIT 1')
        .bind(email)
        .first();

      if (existingData) {
        await db
          .prepare(`UPDATE astrologo_user_data SET dados_json = ?, updated_at = datetime('now') WHERE email = ?`)
          .bind(sanitizedDataJson, email)
          .run();
      } else {
        const dataId = crypto.randomUUID();
        await db
          .prepare(`INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)`)
          .bind(dataId, email, sanitizedDataJson)
          .run();
      }

      await db.prepare('UPDATE astrologo_auth_tokens SET used = 1 WHERE id = ?').bind(row.id).run();
      const sessionToken = await createSessionToken(db, email);

      return getCorsResponse(request, {
        ok: true,
        message: 'Dados salvos com sucesso.',
        dados: JSON.parse(sanitizedDataJson) as unknown,
        sessionToken,
      });
    }

    if (action === 'request-token') {
      const existingData = await db
        .prepare('SELECT id FROM astrologo_user_data WHERE email = ? LIMIT 1')
        .bind(email)
        .first();

      if (!existingData) {
        return getCorsResponse(request, {
          ok: true,
          message: 'Se houver dados vinculados a este e-mail, um código será enviado.',
        });
      }

      const token = generateOTP();
      const hashedOtp = await hashToken(token);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const id = crypto.randomUUID();

      await db
        .prepare(
          `INSERT INTO astrologo_auth_tokens (id, email, token, action, expires_at) VALUES (?, ?, ?, 'retrieve', ?)`,
        )
        .bind(id, email, hashedOtp, expiresAt)
        .run();

      const sent = await sendTokenEmail(email, token, apiKey);
      if (!sent) {
        return getCorsResponse(request, { ok: false, error: 'Falha ao enviar e-mail. Tente novamente.' }, 502);
      }

      return getCorsResponse(request, {
        ok: true,
        message: 'Se houver dados vinculados a este e-mail, um código será enviado.',
      });
    }

    if (action === 'retrieve') {
      const token = (body.token ?? '').trim();
      if (!token) return getCorsResponse(request, { ok: false, error: 'Token não fornecido.' }, 400);
      const hashedOtp = await hashToken(token);

      const row = await db
        .prepare<{ id: string; expires_at: string }>(
          `SELECT id, expires_at FROM astrologo_auth_tokens
         WHERE email = ? AND token = ? AND action = 'retrieve' AND used = 0
         ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(email, hashedOtp)
        .first();

      if (!row) return getCorsResponse(request, { ok: false, error: 'Código inválido ou expirado.' }, 401);
      if (isExpiredOrInvalid(row.expires_at)) {
        return getCorsResponse(request, { ok: false, error: 'Código expirado. Solicite um novo.' }, 401);
      }

      await db.prepare('UPDATE astrologo_auth_tokens SET used = 1 WHERE id = ?').bind(row.id).run();

      const userData = await db
        .prepare<{ dados_json: string }>('SELECT dados_json FROM astrologo_user_data WHERE email = ? LIMIT 1')
        .bind(email)
        .first();

      if (!userData) return getCorsResponse(request, { ok: false, error: 'Nenhum dado encontrado.' }, 404);

      const sessionToken = await createSessionToken(db, email);

      return getCorsResponse(request, { ok: true, dados: JSON.parse(userData.dados_json as string), sessionToken });
    }

    if (action === 'session-map-artifacts') {
      const sessionTokenInput = (body.token ?? '').trim();
      const mapaId = (body.mapaId ?? '').trim();
      if (!sessionTokenInput) {
        return getCorsResponse(request, { ok: false, error: 'Token de sessão não fornecido.' }, 400);
      }
      const notFound = () => getCorsResponse(request, { ok: false, error: 'Mapa não encontrado.' }, 404);
      if (!MAP_ID_PATTERN.test(mapaId)) return notFound();

      const hashedSessionToken = await hashToken(sessionTokenInput);
      const session = await db
        .prepare<{ id: string; email: string; expires_at: string }>(
          `SELECT id, email, expires_at FROM astrologo_auth_tokens
           WHERE token = ? AND action = 'session' AND used = 0
           ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(hashedSessionToken)
        .first();
      if (!session) return getCorsResponse(request, { ok: false, error: 'Sessão inválida ou expirada.' }, 401);
      if (isExpiredOrInvalid(session.expires_at)) {
        await db.prepare('UPDATE astrologo_auth_tokens SET used = 1 WHERE id = ?').bind(session.id).run();
        return getCorsResponse(request, { ok: false, error: 'Sessão expirada. Autentique-se novamente.' }, 401);
      }

      const userData = await db
        .prepare<{ dados_json: string }>('SELECT dados_json FROM astrologo_user_data WHERE email = ? LIMIT 1')
        .bind(session.email)
        .first();
      if (!userData) return notFound();

      let savedMapIds: string[] = [];
      try {
        const parsed = JSON.parse(userData.dados_json) as { mapasSalvos?: unknown };
        if (Array.isArray(parsed.mapasSalvos)) {
          savedMapIds = parsed.mapasSalvos
            .map((candidate) =>
              typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
                ? (candidate as { id?: unknown }).id
                : null,
            )
            .filter((candidate): candidate is string => typeof candidate === 'string');
        }
      } catch {
        return notFound();
      }
      if (!savedMapIds.includes(mapaId)) return notFound();

      const mapOwner = await db
        .prepare<{ id: string; email?: string | null }>('SELECT id, email FROM astrologo_mapas WHERE id = ? LIMIT 1')
        .bind(mapaId)
        .first();
      const ownerEmail = mapOwner?.email?.trim().toLowerCase();
      if (!ownerEmail || ownerEmail !== session.email.trim().toLowerCase()) return notFound();

      const bundle = resolveCanonicalArtifactBundle(await loadCanonicalArtifactBundle(db, mapaId));
      if (bundle.status === 'error') {
        return getCorsResponse(
          request,
          {
            ok: false,
            code: 'CANONICAL_ARTIFACT_QUERY_FAILED',
            error: 'Os dados avançados canônicos estão temporariamente indisponíveis.',
          },
          503,
        );
      }
      if (bundle.status === 'invalid') {
        return getCorsResponse(
          request,
          {
            ok: false,
            code: 'CANONICAL_ARTIFACT_INVALID',
            error: 'Os dados avançados canônicos deste mapa estão inconsistentes.',
          },
          409,
        );
      }
      return getCorsResponse(request, {
        ok: true,
        schemaId: SAVED_MAP_HYDRATION_SCHEMA_ID,
        schemaVersion: SAVED_MAP_HYDRATION_SCHEMA_VERSION,
        calculationId: mapaId,
        artifacts: bundle.value.artifacts,
        artifactStates: bundle.value.artifactStates,
      });
    }

    if (action === 'session-retrieve') {
      const sessionTokenInput = (body.token ?? '').trim();
      if (!sessionTokenInput)
        return getCorsResponse(request, { ok: false, error: 'Token de sessão não fornecido.' }, 400);
      const hashedSessionToken = await hashToken(sessionTokenInput);

      const row = await db
        .prepare<{ id: string; email: string; expires_at: string }>(
          `SELECT id, email, expires_at FROM astrologo_auth_tokens
         WHERE token = ? AND action = 'session' AND used = 0
         ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(hashedSessionToken)
        .first();

      if (!row) return getCorsResponse(request, { ok: false, error: 'Sessão inválida ou expirada.' }, 401);

      if (isExpiredOrInvalid(row.expires_at)) {
        await db.prepare('UPDATE astrologo_auth_tokens SET used = 1 WHERE id = ?').bind(row.id).run();
        return getCorsResponse(request, { ok: false, error: 'Sessão expirada. Autentique-se novamente.' }, 401);
      }

      const userData = await db
        .prepare<{ dados_json: string }>('SELECT dados_json FROM astrologo_user_data WHERE email = ? LIMIT 1')
        .bind(row.email)
        .first();

      if (!userData) return getCorsResponse(request, { ok: false, error: 'Nenhum dado encontrado.' }, 404);

      await db.prepare('UPDATE astrologo_auth_tokens SET used = 1 WHERE id = ?').bind(row.id).run();
      const newSessionToken = await createSessionToken(db, row.email as string);

      return getCorsResponse(request, {
        ok: true,
        dados: JSON.parse(userData.dados_json as string),
        sessionToken: newSessionToken,
      });
    }

    if (action === 'request-delete-token') {
      const existingData = await db
        .prepare('SELECT id FROM astrologo_user_data WHERE email = ? LIMIT 1')
        .bind(email)
        .first();

      if (!existingData) {
        return getCorsResponse(request, {
          ok: true,
          message: 'Se houver dados vinculados a este e-mail, um código será enviado.',
        });
      }

      const token = generateOTP();
      const hashedOtp = await hashToken(token);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const id = crypto.randomUUID();

      await db
        .prepare(
          `INSERT INTO astrologo_auth_tokens (id, email, token, action, expires_at) VALUES (?, ?, ?, 'delete', ?)`,
        )
        .bind(id, email, hashedOtp, expiresAt)
        .run();

      const sent = await sendTokenEmail(email, token, apiKey);
      if (!sent) {
        return getCorsResponse(request, { ok: false, error: 'Falha ao enviar e-mail. Tente novamente.' }, 502);
      }

      return getCorsResponse(request, {
        ok: true,
        message: 'Se houver dados vinculados a este e-mail, um código será enviado.',
      });
    }

    if (action === 'verify-delete') {
      const token = (body.token ?? '').trim();
      if (!token) return getCorsResponse(request, { ok: false, error: 'Token não fornecido.' }, 400);
      const hashedOtp = await hashToken(token);

      const row = await db
        .prepare<{ id: string; expires_at: string }>(
          `SELECT id, expires_at FROM astrologo_auth_tokens
         WHERE email = ? AND token = ? AND action = 'delete' AND used = 0
         ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(email, hashedOtp)
        .first();

      if (!row) return getCorsResponse(request, { ok: false, error: 'Código inválido ou expirado.' }, 401);
      if (isExpiredOrInvalid(row.expires_at)) {
        return getCorsResponse(request, { ok: false, error: 'Código expirado. Solicite um novo.' }, 401);
      }

      await db.prepare('UPDATE astrologo_auth_tokens SET used = 1 WHERE id = ?').bind(row.id).run();

      await db.prepare('DELETE FROM astrologo_mapas WHERE email = ?').bind(email).run();
      await db.prepare('DELETE FROM astrologo_user_data WHERE email = ?').bind(email).run();
      await db.prepare('DELETE FROM astrologo_auth_tokens WHERE email = ?').bind(email).run();

      return getCorsResponse(request, { ok: true, message: 'Todos os seus dados foram excluídos permanentemente.' });
    }

    return getCorsResponse(request, { ok: false, error: `Ação desconhecida: ${action}` }, 400);
  } catch (error) {
    return getCorsResponse(
      request,
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro interno.',
      },
      500,
    );
  }
}
