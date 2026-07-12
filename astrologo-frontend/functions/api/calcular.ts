import { persistReadyNatalArtifact, sha256Hex } from './_shared/artifactPersistence';
import {
  type AstroInfo,
  calcExpressionNumber,
  getJulianDate,
  isValidDateString,
  isValidTimeString,
  reduceNum,
  wrapDegrees,
} from './_shared/astroCore';
import { type BirthTimeDisambiguation, resolveBirthCivilTime } from './_shared/birthTime';
import { resolveBirthPlace } from './_shared/location';
import { calculateNatalChartAnalysisSupplementV1, calculateNatalChartAnalysisV1 } from './_shared/natalChartAnalysisV1';
import { validateNatalChartAnalysisV1 } from './_shared/natalChartAnalysisV1Schema';
import { calculateDadosPosicionaisV2 } from './_shared/positionV2';
import { validateDadosPosicionaisV2 } from './_shared/positionV2Schema';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';
import { calculateLocalSolarTimes } from './_shared/solarTimes';
import { swissEphemeris } from './_shared/swissRuntime';
import { calculateWesternTatwaAtBirth } from './_shared/tatwaBirth';
import { validateWesternTatwaBirthResult } from './_shared/tatwaSchema';

interface EnvBindings {
  GEMINI_API_KEY: string;
  BIGDATA_DB: D1DatabaseLike;
}
interface Context {
  request: Request;
  env: EnvBindings;
}

export async function onRequestOptions(context: Context) {
  return new Response(null, {
    headers: { ...getCorsHeaders(context.request, 'https://mapa-astral.lcv.app.br'), ...securityHeaders },
  });
}

export async function onRequestPost(context: Context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request, 'https://mapa-astral.lcv.app.br');

  if (hasDisallowedOrigin(request)) {
    return jsonResponse({ success: false, error: 'Origem não permitida.' }, 403, corsHeaders);
  }
  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/calcular');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: { ...Object.fromEntries(rateLimitError.headers.entries()), ...corsHeaders },
    });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const nome = String(payload.nome ?? '').trim();
    const dataNascimento = String(payload.dataNascimento ?? '').trim();
    const horaNascimento = String(payload.horaNascimento ?? '').trim();
    const localNascimento = String(payload.localNascimento ?? '').trim();
    const localNascimentoIdRaw = Number(payload.localNascimentoId);
    const localNascimentoId = Number.isSafeInteger(localNascimentoIdRaw) ? localNascimentoIdRaw : undefined;
    const timeDisambiguationRaw = String(payload.timeDisambiguation ?? '').trim();
    const timeDisambiguation: BirthTimeDisambiguation | undefined =
      timeDisambiguationRaw === 'earlier' || timeDisambiguationRaw === 'later' ? timeDisambiguationRaw : undefined;

    if (!nome || nome.length < 2 || nome.length > 120) {
      return new Response(JSON.stringify({ success: false, error: 'Nome inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
      });
    }
    if (!isValidDateString(dataNascimento)) {
      return new Response(JSON.stringify({ success: false, error: 'Data de nascimento inválida.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
      });
    }
    if (!isValidTimeString(horaNascimento)) {
      return new Response(JSON.stringify({ success: false, error: 'Hora de nascimento inválida.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
      });
    }
    if (!localNascimento || localNascimento.length < 2 || localNascimento.length > 160) {
      return new Response(JSON.stringify({ success: false, error: 'Local de nascimento inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
      });
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
        { success: false, code: 'BIRTHPLACE_NOT_FOUND', error: 'Local de nascimento não encontrado.' },
        422,
        corsHeaders,
      );
    }
    if (placeResolution.status === 'selection-required') {
      return jsonResponse(
        {
          success: false,
          code: 'BIRTHPLACE_SELECTION_REQUIRED',
          error: 'Selecione uma localidade específica na lista.',
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
          error: 'Datas anteriores a 1900 ainda não possuem base histórica certificada neste serviço.',
        },
        422,
        corsHeaders,
      );
    }
    if (timeResolution.status === 'nonexistent') {
      return jsonResponse(
        {
          success: false,
          code: timeResolution.reasonCode,
          error: 'Esse horário local não existiu devido a uma mudança histórica de horário.',
        },
        422,
        corsHeaders,
      );
    }
    if (timeResolution.status === 'ambiguous') {
      return jsonResponse(
        {
          success: false,
          code: 'LOCAL_TIME_AMBIGUOUS',
          error: 'Esse horário local ocorreu duas vezes. Escolha qual ocorrência consta no registro de nascimento.',
          timeZoneIana: timeResolution.timeZoneIana,
          candidates: timeResolution.candidates,
        },
        422,
        corsHeaders,
      );
    }

    const lat = place.latitudeDeg;
    const lon = place.longitudeDeg;
    const solarTimes = calculateLocalSolarTimes({
      date: dataNascimento,
      timeZoneIana: place.timeZoneIana,
      latitudeDeg: lat,
      longitudeDeg: lon,
      elevationMeters: place.elevationMeters,
    });
    if (!solarTimes) {
      return jsonResponse(
        {
          success: false,
          code: 'SOLAR_TIMES_UNAVAILABLE',
          error: 'Não foi possível determinar nascer e pôr do Sol para esse local e data.',
        },
        422,
        corsHeaders,
      );
    }
    const srH = solarTimes.sunrise.hour;
    const srM = solarTimes.sunrise.minute;
    const ssH = solarTimes.sunset.hour;
    const ssM = solarTimes.sunset.minute;

    const [ano = 0, mes = 1, dia = 1] = dataNascimento.split('-').map(Number);
    const [hLocal = 0, mLocal = 0] = horaNascimento.split(':').map(Number);

    const legacyTimezoneOffsetHours = -3;
    let utcHour = hLocal - legacyTimezoneOffsetHours;
    let utcDay = dia;
    if (utcHour >= 24) {
      utcHour -= 24;
      utcDay += 1;
    } else if (utcHour < 0) {
      utcHour += 24;
      utcDay -= 1;
    }

    const j_date = getJulianDate(ano, mes, utcDay, utcHour, mLocal);
    const T = (j_date - 2451545.0) / 36525.0;
    const rad = Math.PI / 180;

    const L0 = wrapDegrees(280.46646 + 36000.76983 * T);
    const M = wrapDegrees(357.52911 + 35999.05029 * T);
    const sunLon = wrapDegrees(L0 + 1.914602 * Math.sin(M * rad) + 0.019993 * Math.sin(2 * M * rad));

    const L_moon = wrapDegrees(218.316 + 481267.881 * T);
    const D = wrapDegrees(297.85 + 445267.111 * T);
    const M_moon = wrapDegrees(134.963 + 477198.867 * T);
    const moonLon = wrapDegrees(L_moon + 6.289 * Math.sin(M_moon * rad) - 1.274 * Math.sin((M_moon - 2 * D) * rad));

    const th0 = wrapDegrees(280.46061837 + 360.98564736629 * (j_date - 2451545.0) + 0.000387933 * T * T);
    const local_sidereal = wrapDegrees(th0 + lon);
    const eps = 23.43929111 - 0.013004167 * T;

    const mcLon = wrapDegrees(
      Math.atan2(Math.sin(local_sidereal * rad), Math.cos(local_sidereal * rad) * Math.cos(eps * rad)) / rad,
    );
    const ascLon = wrapDegrees(
      Math.atan2(
        Math.cos(local_sidereal * rad),
        -(Math.sin(local_sidereal * rad) * Math.cos(eps * rad) + Math.tan(lat * rad) * Math.sin(eps * rad)),
      ) / rad,
    );

    const signosTropicais = [
      'Áries',
      'Touro',
      'Gêmeos',
      'Câncer',
      'Leão',
      'Virgem',
      'Libra',
      'Escorpião',
      'Sagitário',
      'Capricórnio',
      'Aquário',
      'Peixes',
    ];
    const getTropicalInfo = (lonVal: number): AstroInfo => {
      const idx = Math.floor(wrapDegrees(lonVal) / 30);
      const decanato = Math.floor((wrapDegrees(lonVal) % 30) / 10);
      return { nome: signosTropicais[idx] ?? 'Áries', decanato: decanato > 2 ? 2 : decanato };
    };

    const IAU_BORDERS = [
      { nome: 'Peixes', inicio: 351.5, fim: 29.3 },
      { nome: 'Áries', inicio: 29.3, fim: 53.5 },
      { nome: 'Touro', inicio: 53.5, fim: 90.2 },
      { nome: 'Gêmeos', inicio: 90.2, fim: 118.4 },
      { nome: 'Câncer', inicio: 118.4, fim: 138.2 },
      { nome: 'Leão', inicio: 138.2, fim: 173.9 },
      { nome: 'Virgem', inicio: 173.9, fim: 218.0 },
      { nome: 'Libra', inicio: 218.0, fim: 241.0 },
      { nome: 'Escorpião', inicio: 241.0, fim: 247.7 },
      { nome: 'Ophiuchus', inicio: 247.7, fim: 266.3 },
      { nome: 'Sagitário', inicio: 266.3, fim: 299.7 },
      { nome: 'Capricórnio', inicio: 299.7, fim: 327.6 },
      { nome: 'Aquário', inicio: 327.6, fim: 351.5 },
    ];
    const getIauInfo = (tLon: number): AstroInfo => {
      const shift = (ano - 2000) * (50.29 / 3600);
      const j2000Lon = wrapDegrees(tLon - shift);
      let found = IAU_BORDERS[0] ?? { nome: 'Peixes', inicio: 351.5, fim: 29.3 };
      for (const b of IAU_BORDERS) {
        if (b.inicio > b.fim) {
          if (j2000Lon >= b.inicio || j2000Lon < b.fim) {
            found = b;
            break;
          }
        } else {
          if (j2000Lon >= b.inicio && j2000Lon < b.fim) {
            found = b;
            break;
          }
        }
      }
      const width = wrapDegrees(found.fim - found.inicio) || 360;
      const progress = wrapDegrees(j2000Lon - found.inicio);
      let decanIndex = Math.floor((progress / width) * 3);
      if (decanIndex > 2) decanIndex = 2;
      return { nome: found.nome, decanato: decanIndex };
    };

    const tabelaV: Record<string, string[]> = {
      Leão: ['Orixalá', 'Xangô', 'Ogum'],
      Áries: ['Ogum', 'Orixalá', 'Xangô'],
      Escorpião: ['Ogum', 'Xangô', 'Yemanjá'],
      Touro: ['Oxossi', 'Yori', 'Yorimá'],
      Libra: ['Oxossi', 'Yorimá', 'Yori'],
      Sagitário: ['Xangô', 'Ogum', 'Orixalá'],
      Peixes: ['Xangô', 'Yemanjá', 'Ogum'],
      Capricórnio: ['Yorimá', 'Oxossi', 'Yori'],
      Aquário: ['Yorimá', 'Yori', 'Oxossi'],
      Gêmeos: ['Yori', 'Oxossi', 'Yorimá'],
      Virgem: ['Yori', 'Yorimá', 'Oxossi'],
      Câncer: ['Yemanjá', 'Ogum', 'Xangô'],
      Ophiuchus: ['Ogum', 'Xangô', 'Yemanjá'],
    };

    const getOrixaHora = (h: number) => {
      if (h >= 3 && h < 6) return 'Ogum';
      if (h >= 6 && h < 9) return 'Oxossi';
      if (h >= 9 && h < 12) return 'Orixalá';
      if (h >= 12 && h < 15) return 'Yori';
      if (h >= 15 && h < 18) return 'Xangô';
      if (h >= 18 && h < 21) return 'Yemanjá';
      if (h >= 21 && h < 24) return 'Yorimá';
      return 'Exu';
    };

    const dataLocalObj = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
    const diaDaSemanaIdx = dataLocalObj.getUTCDay();
    const orixasVibracaoMap = ['Orixalá', 'Yemanjá', 'Ogum', 'Yori', 'Xangô', 'Oxossi', 'Yorimá'];
    const orixaDia = orixasVibracaoMap[diaDaSemanaIdx] ?? 'Orixalá';
    const orixaHora = getOrixaHora(hLocal + mLocal / 60);

    const getPlanetaryHour = () => {
      const bMins = hLocal * 60 + mLocal;
      const srMins = srH * 60 + srM;
      const ssMins = ssH * 60 + ssM;
      let isDay: boolean;
      let dayOfWeekAstrological = diaDaSemanaIdx;
      let minsFromStart: number;
      let periodDurationMins: number;

      if (bMins >= srMins && bMins < ssMins) {
        isDay = true;
        minsFromStart = bMins - srMins;
        periodDurationMins = ssMins - srMins;
      } else {
        isDay = false;
        if (bMins < srMins) {
          dayOfWeekAstrological = (diaDaSemanaIdx + 6) % 7;
          minsFromStart = bMins + 1440 - ssMins;
          periodDurationMins = 1440 - ssMins + srMins;
        } else {
          minsFromStart = bMins - ssMins;
          periodDurationMins = 1440 - ssMins + srMins;
        }
      }

      const hourLength = periodDurationMins / 12 || 60;
      const hourIndex = Math.floor(minsFromStart / hourLength);
      const chaldean = ['Saturno', 'Júpiter', 'Marte', 'Sol', 'Vênus', 'Mercúrio', 'Lua'];
      const dayRulerPlanets = ['Sol', 'Lua', 'Marte', 'Mercúrio', 'Júpiter', 'Vênus', 'Saturno'];

      const rulerOfDay = dayRulerPlanets[dayOfWeekAstrological] ?? 'Sol';
      const startIndex = Math.max(0, chaldean.indexOf(rulerOfDay));
      const totalHoursPassed = isDay ? hourIndex : 12 + hourIndex;

      return chaldean[(startIndex + totalHoursPassed) % 7] ?? 'Sol';
    };

    const planetaRegenteHora = getPlanetaryHour();
    const planetaParaOrixa: Record<string, string> = {
      Sol: 'Orixalá',
      Lua: 'Yemanjá',
      Marte: 'Ogum',
      Mercúrio: 'Yori',
      Júpiter: 'Xangô',
      Vênus: 'Oxóssi',
      Saturno: 'Yorimá',
    };
    const orixaHoraPlanetaria = planetaParaOrixa[planetaRegenteHora] || 'Orixalá';
    const planetaSimbolos: Record<string, string> = {
      Sol: '☀️',
      Lua: '🌙',
      Marte: '♂️',
      Mercúrio: '☿️',
      Júpiter: '♃',
      Vênus: '♀️',
      Saturno: '♄',
    };

    const gerarDadosSistema = (infoSol: AstroInfo, infoLua: AstroInfo, infoAsc: AstroInfo, infoMc: AstroInfo) => {
      const orixaCoroa = tabelaV[infoSol.nome]?.[0] || 'Orixalá';
      const orixaFrente = tabelaV[infoMc.nome]?.[0] || 'Orixalá';
      const orixaDecanato = tabelaV[infoSol.nome]?.[infoSol.decanato] || 'Orixalá';

      return {
        astrologia: [
          { astro: 'Sol', signo: infoSol.nome, simbolo: '☀️' },
          { astro: 'Ascendente', signo: infoAsc.nome, simbolo: '⬆️' },
          { astro: 'Lua', signo: infoLua.nome, simbolo: '🌙' },
          { astro: 'Meio do Céu', signo: infoMc.nome, simbolo: '🔭' },
        ],
        umbanda: [
          { posicao: 'Coroa (1º)', orixa: orixaCoroa.toUpperCase(), simbolo: '👑' },
          { posicao: 'Adjuntó (2º)', orixa: orixaDia.toUpperCase(), simbolo: '🌊' },
          { posicao: 'Frente (3º)', orixa: orixaFrente.toUpperCase(), simbolo: '🏹' },
          { posicao: `Decanato (${infoSol.decanato + 1}º)`, orixa: orixaDecanato.toUpperCase(), simbolo: '🌟' },
          { posicao: 'FAIXA HORÁRIA (3H)', orixa: orixaHora.toUpperCase(), simbolo: '⏳' },
          {
            posicao: `HORA PLANETÁRIA (${planetaRegenteHora.toUpperCase()})`,
            orixa: orixaHoraPlanetaria.toUpperCase(),
            simbolo: planetaSimbolos[planetaRegenteHora] ?? '🪐',
          },
        ],
      };
    };

    const idUnico = crypto.randomUUID();
    const calculatedAtUtc = new Date().toISOString();
    const tatwa = calculateWesternTatwaAtBirth({
      date: dataNascimento,
      birthInstantUtc: timeResolution.instantUtc,
      birthCivilLocal: `${dataNascimento}T${horaNascimento}:00`,
      birthOffset: timeResolution.offsetAtBirth,
      birthTimeDisambiguation: timeResolution.disambiguation,
      historicalTimeConfidence: timeResolution.historicalConfidence,
      timeZoneIana: place.timeZoneIana,
      latitudeDeg: lat,
      longitudeDeg: lon,
      elevationMeters: place.elevationMeters,
      placeProviderResultId: place.providerResultId,
      calculatedAtUtc,
    });
    if (!tatwa) {
      return jsonResponse(
        {
          success: false,
          code: 'TATWA_SUNRISE_UNAVAILABLE',
          error: 'Não foi possível determinar o nascer do Sol que ancora o ciclo dos Tatwas.',
        },
        422,
        corsHeaders,
      );
    }
    const tatwaValidation = validateWesternTatwaBirthResult(tatwa);
    if (!tatwaValidation.valid) {
      console.error('Contrato Tatwa v2 inválido.', tatwaValidation.errors);
      return jsonResponse(
        {
          success: false,
          code: 'TATWA_SCHEMA_VALIDATION_FAILED',
          error: 'O cálculo dos Tatwas não passou pelos invariantes de segurança.',
        },
        500,
        corsHeaders,
      );
    }

    const dadosGlobais = {
      tatwa,
      numerologia: {
        expressao: calcExpressionNumber(nome),
        caminhoVida: reduceNum(dataNascimento),
        vibracaoHora: reduceNum(horaNascimento),
      },
    };
    const dadosAstronomica = gerarDadosSistema(
      getIauInfo(sunLon),
      getIauInfo(moonLon),
      getIauInfo(ascLon),
      getIauInfo(mcLon),
    );
    const dadosTropical = gerarDadosSistema(
      getTropicalInfo(sunLon),
      getTropicalInfo(moonLon),
      getTropicalInfo(ascLon),
      getTropicalInfo(mcLon),
    );

    const dadosPosicionaisV2 = calculateDadosPosicionaisV2(
      {
        calculationId: idUnico,
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
    const positionalValidation = validateDadosPosicionaisV2(dadosPosicionaisV2);
    if (!positionalValidation.valid) {
      console.error('Contrato posicional v2 inválido.', positionalValidation.errors);
      return jsonResponse(
        {
          success: false,
          code: 'POSITIONAL_SCHEMA_VALIDATION_FAILED',
          error: 'O cálculo posicional não passou pelos invariantes de segurança.',
        },
        500,
        corsHeaders,
      );
    }
    const natalSupplementV1 = calculateNatalChartAnalysisSupplementV1(dadosPosicionaisV2, swissEphemeris);
    const natalChartAnalysisV1 = calculateNatalChartAnalysisV1(dadosPosicionaisV2, natalSupplementV1);
    const natalValidation = validateNatalChartAnalysisV1(natalChartAnalysisV1);
    if (!natalValidation.valid) {
      console.error('Contrato natal v1 inválido.', natalValidation.errors);
      return jsonResponse(
        {
          success: false,
          code: 'NATAL_ANALYSIS_SCHEMA_VALIDATION_FAILED',
          error: 'A análise geométrica natal não passou pelos invariantes de segurança.',
        },
        500,
        corsHeaders,
      );
    }
    const natalSourceHash = await sha256Hex(JSON.stringify({ source: dadosPosicionaisV2, natalSupplementV1 }));
    try {
      if (env.BIGDATA_DB) {
        await env.BIGDATA_DB.prepare(
          `INSERT INTO astrologo_mapas (id, nome, data_nascimento, hora_nascimento, local_nascimento, dados_astronomica, dados_tropical, dados_globais, dados_posicionais_v2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            idUnico,
            nome,
            dataNascimento,
            horaNascimento,
            localNascimento,
            JSON.stringify(dadosAstronomica),
            JSON.stringify(dadosTropical),
            JSON.stringify(dadosGlobais),
            JSON.stringify(dadosPosicionaisV2),
          )
          .run();
        await persistReadyNatalArtifact(env.BIGDATA_DB, {
          id: `natal:${idUnico}:v1`,
          calculationId: idUnico,
          artifactType: 'natal_chart_analysis',
          schemaId: natalChartAnalysisV1.schemaId,
          schemaVersion: natalChartAnalysisV1.schemaVersion,
          sourceHash: natalSourceHash,
          payload: natalChartAnalysisV1,
          diagnostics: natalChartAnalysisV1.diagnostics,
        });
      }
    } catch (error) {
      console.error('Falha ao gravar no BD.');
      return jsonResponse(
        {
          success: false,
          code: 'POSITIONAL_PERSISTENCE_FAILED',
          error: 'O mapa foi calculado, mas não pôde ser persistido com segurança.',
          detail: error instanceof Error ? error.message : undefined,
        },
        503,
        corsHeaders,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: idUnico,
        dadosGlobais,
        dadosAstronomica,
        dadosTropical,
        dadosPosicionaisV2,
        natalChartAnalysisV1,
        query: { nome, dataNascimento, horaNascimento, localNascimento },
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
    });
  }
}
