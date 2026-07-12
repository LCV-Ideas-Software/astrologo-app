import { sha256Hex } from './_shared/artifactPersistence';
import { createAstronomyEngineTransitProvider } from './_shared/astronomyTransitProvider';
import type { DadosPosicionaisV2 } from './_shared/positionV2';
import { validateDadosPosicionaisV2 } from './_shared/positionV2Schema';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';
import { calculateTransitRunV1, TRANSIT_ASPECT_PROFILE_V1 } from './_shared/transitRunV1';
import { validateTransitRunV1 } from './_shared/transitRunV1Schema';

interface EnvBindings {
  BIGDATA_DB: D1DatabaseLike;
}

interface Context {
  request: Request;
  env: EnvBindings;
}

const MAP_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export async function onRequestOptions(context: Context) {
  return new Response(null, {
    headers: { ...getCorsHeaders(context.request, 'https://mapa-astral.lcv.app.br'), ...securityHeaders },
  });
}

export async function onRequestPost({ request, env }: Context) {
  const corsHeaders = getCorsHeaders(request, 'https://mapa-astral.lcv.app.br');
  if (hasDisallowedOrigin(request))
    return jsonResponse({ success: false, error: 'Origem não permitida.' }, 403, corsHeaders);

  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/transitos');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: { ...Object.fromEntries(rateLimitError.headers.entries()), ...corsHeaders },
    });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const mapaId = typeof payload.mapaId === 'string' ? payload.mapaId.trim() : '';
    const horizonDays = payload.horizonDays === undefined ? 7 : Number(payload.horizonDays);
    if (!MAP_ID_PATTERN.test(mapaId)) {
      return jsonResponse({ success: false, error: 'Identificador do mapa inválido.' }, 400, corsHeaders);
    }
    if (!Number.isInteger(horizonDays) || horizonDays < 0 || horizonDays > 30) {
      return jsonResponse({ success: false, error: 'O horizonte deve ficar entre 0 e 30 dias.' }, 400, corsHeaders);
    }

    const row = await env.BIGDATA_DB.prepare<{ dados_posicionais_v2?: string | null }>(
      'SELECT dados_posicionais_v2 FROM astrologo_mapas WHERE id = ? LIMIT 1',
    )
      .bind(mapaId)
      .first();
    if (!row?.dados_posicionais_v2) {
      return jsonResponse({ success: false, error: 'Mapa natal canônico não encontrado.' }, 404, corsHeaders);
    }

    let natal: DadosPosicionaisV2;
    try {
      natal = JSON.parse(row.dados_posicionais_v2) as DadosPosicionaisV2;
    } catch {
      return jsonResponse({ success: false, error: 'O mapa natal armazenado está corrompido.' }, 409, corsHeaders);
    }
    const natalValidation = validateDadosPosicionaisV2(natal);
    if (!natalValidation.valid) {
      return jsonResponse(
        { success: false, error: 'O mapa natal armazenado não passou pelos invariantes.' },
        409,
        corsHeaders,
      );
    }

    const referenceInstantUtc = new Date().toISOString();
    const natalSourceSha256 = await sha256Hex(row.dados_posicionais_v2);
    const provider = createAstronomyEngineTransitProvider();
    const transitRunV1 = calculateTransitRunV1({
      natal,
      natalSourceRef: `d1://bigdata_db/astrologo_mapas/${encodeURIComponent(mapaId)}`,
      natalSourceSha256,
      referenceInstantUtc,
      horizonDays,
      provider,
    });
    const validation = validateTransitRunV1(transitRunV1);
    if (!validation.valid) {
      console.error('Contrato TransitRunV1 inválido.', validation.errors);
      return jsonResponse(
        {
          success: false,
          code: 'TRANSIT_SCHEMA_VALIDATION_FAILED',
          error: 'O céu atual não passou pelos invariantes.',
        },
        500,
        corsHeaders,
      );
    }

    const sourceHash = await sha256Hex(
      JSON.stringify({
        natalSourceSha256,
        referenceInstantUtc,
        horizonDays,
        profile: TRANSIT_ASPECT_PROFILE_V1,
        provider: provider.provenance,
      }),
    );
    const runId = crypto.randomUUID();
    const artifactId = `transit:${runId}:v1`;

    try {
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_transit_runs
          (id, mapa_id, reference_instant_utc, presentation_timezone, horizon_days, orb_profile_id,
           engine_versions_json, source_hash, status, expires_at, diagnostic_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)`,
      )
        .bind(
          runId,
          mapaId,
          referenceInstantUtc,
          'America/Sao_Paulo',
          horizonDays,
          TRANSIT_ASPECT_PROFILE_V1.profileId,
          JSON.stringify(provider.provenance),
          sourceHash,
          JSON.stringify(transitRunV1.diagnostics),
        )
        .run();
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_artifacts
          (id, mapa_id, transit_run_id, artifact_type, schema_id, schema_version, source_hash,
           payload_json, status, diagnostic_json)
         VALUES (?, ?, ?, 'transit_result', ?, ?, ?, ?, 'ready', ?)`,
      )
        .bind(
          artifactId,
          mapaId,
          runId,
          transitRunV1.schemaId,
          transitRunV1.schemaVersion,
          sourceHash,
          JSON.stringify(transitRunV1),
          JSON.stringify(transitRunV1.diagnostics),
        )
        .run();
      await env.BIGDATA_DB.prepare(
        `UPDATE astrologo_transit_runs
         SET result_artifact_id = ?, status = 'ready', updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(artifactId, runId)
        .run();
    } catch (error) {
      try {
        await env.BIGDATA_DB.prepare(
          `UPDATE astrologo_transit_runs
           SET status = 'failed', diagnostic_json = ?, updated_at = datetime('now')
           WHERE id = ?`,
        )
          .bind(JSON.stringify([{ code: 'TRANSIT_PERSISTENCE_FAILED' }]), runId)
          .run();
      } catch {
        // A resposta permanece fail-closed mesmo se o registro de falha também estiver indisponível.
      }
      console.error('Falha ao persistir TransitRunV1.', error);
      return jsonResponse(
        {
          success: false,
          code: 'TRANSIT_PERSISTENCE_FAILED',
          error: 'O céu atual foi calculado, mas não pôde ser persistido com segurança.',
        },
        503,
        corsHeaders,
      );
    }

    return jsonResponse({ success: true, runId, transitRunV1 }, 200, corsHeaders);
  } catch (error) {
    console.error('Falha ao calcular o céu atual.', error);
    return jsonResponse({ success: false, error: 'Não foi possível calcular o céu atual.' }, 500, corsHeaders);
  }
}
