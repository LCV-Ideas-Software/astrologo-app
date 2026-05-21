import {
  type AstroInfo,
  calcExpressionNumber,
  getJulianDate,
  getTatwaAtMoment,
  isValidDateString,
  isValidTimeString,
  reduceNum,
  wrapDegrees,
} from './_shared/astroCore';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';

interface EnvBindings {
  GEMINI_API_KEY: string;
  BIGDATA_DB: D1DatabaseLike;
}
interface Context {
  request: Request;
  env: EnvBindings;
}

const parseIsoTime = (value: string | undefined, fallbackH: number, fallbackM: number): [number, number] => {
  if (!value) return [fallbackH, fallbackM];
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return [fallbackH, fallbackM];
  return [Number(match[1]), Number(match[2])];
};

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
    const payload = (await request.json()) as Record<string, string>;
    const nome = String(payload.nome ?? '').trim();
    const dataNascimento = String(payload.dataNascimento ?? '').trim();
    const horaNascimento = String(payload.horaNascimento ?? '').trim();
    const localNascimento = String(payload.localNascimento ?? '').trim();

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

    const tz = -3;

    let lat = -22.9068;
    let lon = -43.1729;
    let srH = 6;
    let srM = 0;
    let ssH = 18;
    let ssM = 0;

    try {
      const encodedName = encodeURIComponent(localNascimento);
      const geocodeRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodedName}&count=1&language=pt&format=json`,
      );
      if (geocodeRes.ok) {
        const geocodeData = (await geocodeRes.json()) as { results?: Array<{ latitude: number; longitude: number }> };
        const top = geocodeData.results?.[0];
        if (top) {
          lat = Number(top.latitude) || lat;
          lon = Number(top.longitude) || lon;
        }
      }
      const archiveRes = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dataNascimento}&end_date=${dataNascimento}&daily=sunrise,sunset&timezone=America%2FSao_Paulo`,
      );
      if (archiveRes.ok) {
        const archiveData = (await archiveRes.json()) as { daily?: { sunrise?: string[]; sunset?: string[] } };
        [srH, srM] = parseIsoTime(archiveData.daily?.sunrise?.[0], 6, 0);
        [ssH, ssM] = parseIsoTime(archiveData.daily?.sunset?.[0], 18, 0);
      }
    } catch {
      console.warn('Usando Fallback Geográfico (RJ).');
    }

    const [ano = 0, mes = 1, dia = 1] = dataNascimento.split('-').map(Number);
    const [hLocal = 0, mLocal = 0] = horaNascimento.split(':').map(Number);

    let utcHour = hLocal - tz;
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

    const tatwa = getTatwaAtMoment(hLocal, mLocal, srH, srM);

    const dadosGlobais = {
      tatwa: { principal: tatwa.principal, sub: tatwa.sub },
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

    const idUnico = crypto.randomUUID();
    try {
      if (env.BIGDATA_DB) {
        await env.BIGDATA_DB.prepare(
          `INSERT INTO astrologo_mapas (id, nome, data_nascimento, hora_nascimento, local_nascimento, dados_astronomica, dados_tropical, dados_globais) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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
          )
          .run();
      }
    } catch {
      console.error('Falha ao gravar no BD.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: idUnico,
        dadosGlobais,
        dadosAstronomica,
        dadosTropical,
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
