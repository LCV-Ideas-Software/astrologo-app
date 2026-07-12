import { persistReadyNatalArtifact, sha256Hex } from './_shared/artifactPersistence';
import { isValidDateString, isValidTimeString } from './_shared/astroCore';
import { type BirthTimeDisambiguation, resolveBirthCivilTime } from './_shared/birthTime';
import { resolveBirthPlace } from './_shared/location';
import { calculateNatalChartAnalysisSupplementV1, calculateNatalChartAnalysisV1 } from './_shared/natalChartAnalysisV1';
import { validateNatalChartAnalysisV1 } from './_shared/natalChartAnalysisV1Schema';
import { calculateDadosPosicionaisV2, type DadosPosicionaisV2 } from './_shared/positionV2';
import { validateDadosPosicionaisV2 } from './_shared/positionV2Schema';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';
import { swissEphemeris } from './_shared/swissRuntime';
import { calculateSynastryRunV1, SYNASTRY_ASPECT_PROFILE_V1 } from './_shared/synastryRunV1';
import { validateSynastryRunV1 } from './_shared/synastryRunV1Schema';

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

  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/sinastria');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: { ...Object.fromEntries(rateLimitError.headers.entries()), ...corsHeaders },
    });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (payload.consentRecorded !== true) {
      return jsonResponse(
        {
          success: false,
          code: 'SYNASTRY_CONSENT_REQUIRED',
          error: 'Confirme que você possui autorização para usar os dados da Pessoa B.',
        },
        400,
        corsHeaders,
      );
    }
    const primaryMapId = typeof payload.primaryMapId === 'string' ? payload.primaryMapId.trim() : '';
    if (!MAP_ID_PATTERN.test(primaryMapId)) {
      return jsonResponse({ success: false, error: 'Identificador do mapa principal inválido.' }, 400, corsHeaders);
    }
    if (typeof payload.subjectB !== 'object' || payload.subjectB === null || Array.isArray(payload.subjectB)) {
      return jsonResponse({ success: false, error: 'Informe os dados completos da Pessoa B.' }, 400, corsHeaders);
    }
    const subjectB = payload.subjectB as Record<string, unknown>;
    const nome = String(subjectB.nome ?? '').trim();
    const dataNascimento = String(subjectB.dataNascimento ?? '').trim();
    const horaNascimento = String(subjectB.horaNascimento ?? '').trim();
    const localNascimento = String(subjectB.localNascimento ?? '').trim();
    const localNascimentoIdRaw = Number(subjectB.localNascimentoId);
    const localNascimentoId = Number.isSafeInteger(localNascimentoIdRaw) ? localNascimentoIdRaw : undefined;
    const timeDisambiguationRaw = String(subjectB.timeDisambiguation ?? '').trim();
    const timeDisambiguation: BirthTimeDisambiguation | undefined =
      timeDisambiguationRaw === 'earlier' || timeDisambiguationRaw === 'later' ? timeDisambiguationRaw : undefined;

    if (!nome || nome.length < 2 || nome.length > 120) {
      return jsonResponse({ success: false, error: 'Nome da Pessoa B inválido.' }, 400, corsHeaders);
    }
    if (!isValidDateString(dataNascimento) || !isValidTimeString(horaNascimento)) {
      return jsonResponse({ success: false, error: 'Data ou hora da Pessoa B inválida.' }, 400, corsHeaders);
    }
    if (!localNascimento || localNascimento.length < 2 || localNascimento.length > 160) {
      return jsonResponse({ success: false, error: 'Local de nascimento da Pessoa B inválido.' }, 400, corsHeaders);
    }

    const primaryRow = await env.BIGDATA_DB.prepare<{ nome?: string; dados_posicionais_v2?: string | null }>(
      'SELECT nome, dados_posicionais_v2 FROM astrologo_mapas WHERE id = ? LIMIT 1',
    )
      .bind(primaryMapId)
      .first();
    if (!primaryRow?.dados_posicionais_v2) {
      return jsonResponse({ success: false, error: 'Mapa principal canônico não encontrado.' }, 404, corsHeaders);
    }
    let primary: DadosPosicionaisV2;
    try {
      primary = JSON.parse(primaryRow.dados_posicionais_v2) as DadosPosicionaisV2;
    } catch {
      return jsonResponse({ success: false, error: 'O mapa principal armazenado está corrompido.' }, 409, corsHeaders);
    }
    if (!validateDadosPosicionaisV2(primary).valid) {
      return jsonResponse(
        { success: false, error: 'O mapa principal não passou pelos invariantes.' },
        409,
        corsHeaders,
      );
    }

    const placeResolution = await resolveBirthPlace(localNascimento, localNascimentoId);
    if (placeResolution.status === 'provider-unavailable') {
      return jsonResponse(
        { success: false, code: 'GEOCODER_UNAVAILABLE', error: 'O serviço de localidades está indisponível.' },
        503,
        corsHeaders,
      );
    }
    if (placeResolution.status === 'not-found') {
      return jsonResponse(
        { success: false, code: 'BIRTHPLACE_NOT_FOUND', error: 'Local da Pessoa B não encontrado.' },
        422,
        corsHeaders,
      );
    }
    if (placeResolution.status === 'selection-required') {
      return jsonResponse(
        {
          success: false,
          code: 'BIRTHPLACE_SELECTION_REQUIRED',
          error: 'Selecione uma localidade específica para a Pessoa B.',
          candidates: placeResolution.candidates,
        },
        422,
        corsHeaders,
      );
    }
    const place = placeResolution.place;
    const timeResolution = resolveBirthCivilTime({
      date: dataNascimento,
      time: horaNascimento,
      timeZoneIana: place.timeZoneIana,
      ...(timeDisambiguation ? { disambiguation: timeDisambiguation } : {}),
    });
    if (timeResolution.status === 'blocked') {
      return jsonResponse(
        {
          success: false,
          code: timeResolution.reasonCode,
          error: 'A data da Pessoa B é anterior ao limite histórico.',
        },
        422,
        corsHeaders,
      );
    }
    if (timeResolution.status === 'nonexistent') {
      return jsonResponse(
        { success: false, code: timeResolution.reasonCode, error: 'O horário local da Pessoa B não existiu.' },
        422,
        corsHeaders,
      );
    }
    if (timeResolution.status === 'ambiguous') {
      return jsonResponse(
        {
          success: false,
          code: 'LOCAL_TIME_AMBIGUOUS',
          error: 'O horário da Pessoa B ocorreu duas vezes. Escolha a ocorrência correta.',
          candidates: timeResolution.candidates,
        },
        422,
        corsHeaders,
      );
    }

    const calculatedAtUtc = new Date().toISOString();
    const secondaryMapId = crypto.randomUUID();
    const secondary = calculateDadosPosicionaisV2(
      {
        calculationId: secondaryMapId,
        calculatedAtUtc,
        instantUtc: timeResolution.instantUtc,
        date: dataNascimento,
        time: horaNascimento,
        timeResolution,
        place: {
          sourceLabel: place.displayLabel,
          latitudeDeg: place.latitudeDeg,
          longitudeDeg: place.longitudeDeg,
          elevationMeters: place.elevationMeters,
          providerResultId: place.providerResultId,
        },
      },
      swissEphemeris,
    );
    if (!validateDadosPosicionaisV2(secondary).valid) {
      return jsonResponse(
        { success: false, error: 'O segundo mapa não passou pelos invariantes posicionais.' },
        500,
        corsHeaders,
      );
    }
    const secondarySupplement = calculateNatalChartAnalysisSupplementV1(secondary, swissEphemeris);
    const secondaryNatalChartAnalysisV1 = calculateNatalChartAnalysisV1(secondary, secondarySupplement);
    if (!validateNatalChartAnalysisV1(secondaryNatalChartAnalysisV1).valid) {
      return jsonResponse(
        { success: false, error: 'A análise natal da Pessoa B não passou pelos invariantes.' },
        500,
        corsHeaders,
      );
    }
    const synastryRunV1 = calculateSynastryRunV1(primary, secondary);
    const synastryValidation = validateSynastryRunV1(synastryRunV1);
    if (!synastryValidation.valid) {
      console.error('Contrato SynastryRunV1 inválido.', synastryValidation.errors);
      return jsonResponse({ success: false, error: 'A sinastria não passou pelos invariantes.' }, 500, corsHeaders);
    }

    const primarySha256 = await sha256Hex(primaryRow.dados_posicionais_v2);
    const secondarySerialized = JSON.stringify(secondary);
    const secondarySha256 = await sha256Hex(secondarySerialized);
    const secondaryNatalSourceHash = await sha256Hex(
      JSON.stringify({ source: secondary, natalSupplementV1: secondarySupplement }),
    );
    const sourceHash = await sha256Hex(
      JSON.stringify({ primarySha256, secondarySha256, profile: SYNASTRY_ASPECT_PROFILE_V1 }),
    );
    const runId = crypto.randomUUID();
    const artifactId = `synastry:${runId}:v1`;
    const consentRecordedAt = calculatedAtUtc;

    try {
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_mapas
          (id, nome, data_nascimento, hora_nascimento, local_nascimento, dados_posicionais_v2)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(secondaryMapId, nome, dataNascimento, horaNascimento, localNascimento, secondarySerialized)
        .run();
      await persistReadyNatalArtifact(env.BIGDATA_DB, {
        id: `natal:${secondaryMapId}:v1`,
        calculationId: secondaryMapId,
        artifactType: 'natal_chart_analysis',
        schemaId: secondaryNatalChartAnalysisV1.schemaId,
        schemaVersion: secondaryNatalChartAnalysisV1.schemaVersion,
        sourceHash: secondaryNatalSourceHash,
        payload: secondaryNatalChartAnalysisV1,
        diagnostics: secondaryNatalChartAnalysisV1.diagnostics,
      });
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_synastry_runs
          (id, primary_mapa_id, secondary_mapa_id, subject_a_hash, subject_b_hash, consent_recorded_at,
           orb_profile_id, source_hash, status, diagnostic_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
        .bind(
          runId,
          primaryMapId,
          secondaryMapId,
          primarySha256,
          secondarySha256,
          consentRecordedAt,
          SYNASTRY_ASPECT_PROFILE_V1.profileId,
          sourceHash,
          JSON.stringify(synastryRunV1.diagnostics),
        )
        .run();
      await env.BIGDATA_DB.prepare(
        `INSERT INTO astrologo_artifacts
          (id, mapa_id, synastry_run_id, artifact_type, schema_id, schema_version, source_hash,
           payload_json, status, diagnostic_json)
         VALUES (?, ?, ?, 'synastry_result', ?, ?, ?, ?, 'ready', ?)`,
      )
        .bind(
          artifactId,
          primaryMapId,
          runId,
          synastryRunV1.schemaId,
          synastryRunV1.schemaVersion,
          sourceHash,
          JSON.stringify(synastryRunV1),
          JSON.stringify(synastryRunV1.diagnostics),
        )
        .run();
      await env.BIGDATA_DB.prepare(
        `UPDATE astrologo_synastry_runs
         SET result_artifact_id = ?, status = 'ready', updated_at = datetime('now')
         WHERE id = ?`,
      )
        .bind(artifactId, runId)
        .run();
    } catch (error) {
      try {
        await env.BIGDATA_DB.prepare('DELETE FROM astrologo_mapas WHERE id = ?').bind(secondaryMapId).run();
      } catch {
        // Mantém resposta fail-closed; o registro pendente continua rastreável para reconciliação.
      }
      console.error('Falha ao persistir SynastryRunV1.', error);
      return jsonResponse(
        {
          success: false,
          code: 'SYNASTRY_PERSISTENCE_FAILED',
          error: 'A sinastria foi calculada, mas não pôde ser persistida com segurança.',
        },
        503,
        corsHeaders,
      );
    }

    return jsonResponse(
      {
        success: true,
        runId,
        secondaryMapId,
        subjects: { A: primaryRow.nome ?? 'Pessoa A', B: nome },
        secondaryDadosPosicionaisV2: secondary,
        secondaryNatalChartAnalysisV1,
        synastryRunV1,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error('Falha ao calcular sinastria.', error);
    return jsonResponse({ success: false, error: 'Não foi possível calcular a sinastria.' }, 500, corsHeaders);
  }
}
