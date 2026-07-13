import { SiderealTime } from 'astronomy-engine';
import { sha256Hex } from './_shared/artifactPersistence';
import { calculateLocalityMapV1 } from './_shared/localityMapV1';
import { validateLocalityMapV1 } from './_shared/localityMapV1Schema';
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

  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/localidade');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: { ...Object.fromEntries(rateLimitError.headers.entries()), ...corsHeaders },
    });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const mapaId = typeof payload.mapaId === 'string' ? payload.mapaId.trim() : '';
    const resolutionDeg = payload.resolutionDeg === undefined ? 1 : Number(payload.resolutionDeg);
    if (!MAP_ID_PATTERN.test(mapaId)) {
      return jsonResponse(
        { success: false, error: 'Não foi possível reconhecer este mapa. Abra-o novamente.' },
        400,
        corsHeaders,
      );
    }
    if (!Number.isFinite(resolutionDeg) || resolutionDeg < 0.25 || resolutionDeg > 5) {
      return jsonResponse({ success: false, error: 'A resolução deve ficar entre 0,25° e 5°.' }, 400, corsHeaders);
    }

    const row = await env.BIGDATA_DB.prepare<{ dados_posicionais_v2?: string | null }>(
      'SELECT dados_posicionais_v2 FROM astrologo_mapas WHERE id = ? LIMIT 1',
    )
      .bind(mapaId)
      .first();
    if (!row?.dados_posicionais_v2) {
      return jsonResponse(
        { success: false, error: 'O mapa natal não foi encontrado. Abra-o novamente.' },
        404,
        corsHeaders,
      );
    }
    let natal: DadosPosicionaisV2;
    try {
      natal = JSON.parse(row.dados_posicionais_v2) as DadosPosicionaisV2;
    } catch {
      return jsonResponse(
        { success: false, error: 'Não foi possível abrir o mapa natal. Faça um novo cálculo.' },
        409,
        corsHeaders,
      );
    }
    if (!validateDadosPosicionaisV2(natal).valid) {
      return jsonResponse(
        { success: false, error: 'Não foi possível usar o mapa natal. Faça um novo cálculo.' },
        409,
        corsHeaders,
      );
    }

    const sourceHashSha256 = await sha256Hex(row.dados_posicionais_v2);
    const birthInstantUtc = natal.birthContext.timeResolution.instantUtc;
    const gastHours = SiderealTime(new Date(birthInstantUtc));
    const localityMapV1 = calculateLocalityMapV1(natal, {
      sourceHashSha256,
      greenwichApparentSiderealTime: {
        kind: 'greenwich-apparent-sidereal-time',
        hours: gastHours,
        provenance: {
          engineId: 'astronomy-engine',
          engineVersion: natal.models.ephemeris.engineVersion,
          methodId: 'astronomy-engine-SiderealTime-GAST-v1',
          engineSourceSha256: natal.models.ephemeris.sourceSha256,
          calculatedForInstantUtc: birthInstantUtc,
        },
      },
      latitudeResolutionDeg: resolutionDeg,
    });
    const validation = validateLocalityMapV1(localityMapV1);
    if (!validation.valid) {
      console.error('Contrato LocalityMapV1 inválido.', validation.errors);
      return jsonResponse(
        {
          success: false,
          code: 'LOCALITY_SCHEMA_VALIDATION_FAILED',
          error: 'Não foi possível concluir o mapa de localidade. Tente novamente.',
        },
        500,
        corsHeaders,
      );
    }

    const sourceHash = await sha256Hex(
      JSON.stringify({
        sourceHashSha256,
        gastHours,
        resolutionDeg,
        geometry: localityMapV1.models.geometry,
        transformation: localityMapV1.models.sourceCoordinates.transformation,
      }),
    );
    const runId = crypto.randomUUID();
    const artifactId = `locality:${runId}:v1`;
    try {
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_locality_runs
          (id, mapa_id, projection_id, geometry_version, resolution_degrees, source_hash, status, diagnostic_json)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
        .bind(
          runId,
          mapaId,
          'natural-earth-equirectangular-v1',
          localityMapV1.models.geometry.modelVersion,
          resolutionDeg,
          sourceHash,
          JSON.stringify(localityMapV1.diagnostics),
        )
        .run();
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_artifacts
          (id, mapa_id, locality_run_id, artifact_type, schema_id, schema_version, source_hash,
           payload_json, status, diagnostic_json)
         VALUES (?, ?, ?, 'locality_map', ?, ?, ?, ?, 'ready', ?)`,
      )
        .bind(
          artifactId,
          mapaId,
          runId,
          localityMapV1.schemaId,
          localityMapV1.schemaVersion,
          sourceHash,
          JSON.stringify(localityMapV1),
          JSON.stringify(localityMapV1.diagnostics),
        )
        .run();
      await env.BIGDATA_DB.prepare(
        `UPDATE astrologo_locality_runs
         SET result_artifact_id = ?, status = 'ready', updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(artifactId, runId)
        .run();
    } catch (error) {
      try {
        await env.BIGDATA_DB.prepare(
          `UPDATE astrologo_locality_runs
           SET status = 'failed', diagnostic_json = ?, updated_at = datetime('now')
           WHERE id = ?`,
        )
          .bind(JSON.stringify([{ code: 'LOCALITY_PERSISTENCE_FAILED' }]), runId)
          .run();
      } catch {
        // A resposta permanece fail-closed mesmo sem telemetria de falha.
      }
      console.error('Falha ao persistir LocalityMapV1.', error);
      return jsonResponse(
        {
          success: false,
          code: 'LOCALITY_PERSISTENCE_FAILED',
          error: 'O mapa de localidade foi calculado, mas não pôde ser salvo. Tente novamente em alguns instantes.',
        },
        503,
        corsHeaders,
      );
    }

    return jsonResponse({ success: true, runId, localityMapV1 }, 200, corsHeaders);
  } catch (error) {
    console.error('Falha ao calcular o mapa de localidade.', error);
    return jsonResponse({ success: false, error: 'Não foi possível calcular o mapa de localidade.' }, 500, corsHeaders);
  }
}
