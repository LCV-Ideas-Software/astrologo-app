export interface PositionalV2Tropical {
  readonly sign: { readonly id: string; readonly namePtBr: string };
  readonly degreeWithinSignDeg: number;
  readonly decan: { readonly index1: number };
}

export interface PositionalV2Planet {
  readonly bodyId: string;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly coordinates: { readonly eclipticLongitudeDeg: number; readonly eclipticLatitudeDeg: number };
  readonly tropical: PositionalV2Tropical;
  readonly astronomicalReal: {
    readonly status: 'available' | 'unavailable';
    readonly constellation?: { readonly iauCode: string; readonly latinName: string; readonly namePtBr: string };
    readonly reasonCode?: string;
  };
  readonly housePlacement: {
    readonly status: 'available' | 'unavailable';
    readonly houseIndex1?: number;
    readonly reasonCode?: string;
  };
  readonly angelicQuinary: {
    readonly basisSystem: 'tropical';
    readonly quinary: {
      readonly index1: number;
      readonly globalStartLongitudeDeg: number;
      readonly globalEndLongitudeDegExclusive: number;
    };
    readonly angel: {
      readonly id: number;
      readonly canonicalName: string;
      readonly aliases: readonly string[];
      readonly hebrewTriplet: string;
      readonly choir: string;
      readonly prince: string;
      readonly qualitySummaryPtBr: string;
      readonly sourcePermalink: string;
    };
  };
}

export interface PlanetPresentationPtBr {
  readonly label: string;
  readonly symbol: string;
}

const PLANET_PRESENTATION_PT_BR: Readonly<Record<string, PlanetPresentationPtBr>> = Object.freeze({
  sun: { label: 'Sol', symbol: '☉' },
  moon: { label: 'Lua', symbol: '☽' },
  mercury: { label: 'Mercúrio', symbol: '☿' },
  venus: { label: 'Vênus', symbol: '♀' },
  mars: { label: 'Marte', symbol: '♂' },
  jupiter: { label: 'Júpiter', symbol: '♃' },
  saturn: { label: 'Saturno', symbol: '♄' },
  uranus: { label: 'Urano', symbol: '♅' },
  neptune: { label: 'Netuno', symbol: '♆' },
  pluto: { label: 'Plutão', symbol: '♇' },
});

export const getPlanetPresentationPtBr = (bodyId: string): PlanetPresentationPtBr =>
  PLANET_PRESENTATION_PT_BR[bodyId] ?? { label: 'Corpo celeste', symbol: '✦' };

export const findConsultantRulingPosition = (
  positions: readonly PositionalV2Planet[],
): PositionalV2Planet | undefined => positions.find((position) => position.bodyId === 'sun');

export interface DadosPosicionaisV2 {
  readonly schemaId: 'urn:astrologo:dados-posicionais';
  readonly schemaVersion: '2.0.0';
  readonly calculationId: string;
  readonly calculatedAtUtc: string;
  readonly birthContext: {
    readonly place: { readonly sourceLabel: string };
    readonly timeResolution: {
      readonly status: 'resolved';
      readonly instantUtc: string;
      readonly timeZoneIana: string;
      readonly offsetAtBirth: string;
      readonly historicalConfidence: 'certified-1970-plus' | 'best-effort-1900-1969';
    };
  };
  readonly presentationPolicy: {
    readonly locale: 'pt-BR';
    readonly timeZone: 'America/Sao_Paulo';
    readonly timeZoneLabel: 'Hora oficial de Brasília';
  };
  readonly houses: {
    readonly systemId: 'placidus';
    readonly status: 'available' | 'unavailable';
    readonly cusps?: readonly {
      readonly houseIndex1: number;
      readonly eclipticLongitudeDeg: number;
      readonly tropical: {
        readonly signId: string;
        readonly signNamePtBr: string;
        readonly degreeWithinSignDeg: number;
      };
    }[];
    readonly reasonCode?: string;
  };
  readonly angles: readonly {
    readonly angleId: 'ascendant' | 'midheaven';
    readonly displayNamePtBr: string;
    readonly eclipticLongitudeDeg: number;
    readonly tropical: { readonly signNamePtBr: string; readonly degreeWithinSignDeg: number };
  }[];
  readonly positions: readonly PositionalV2Planet[];
  readonly aggregates: {
    readonly angelicFalange: readonly {
      readonly angelId: number;
      readonly memberBodyIds: readonly string[];
      readonly occurrenceCount: number;
    }[];
  };
  readonly diagnostics: readonly { readonly code: string; readonly bodyId?: string }[];
}

const BRASILIA_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  calendar: 'gregory',
  numberingSystem: 'latn',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export const formatInstantInBrasilia = (instantUtc: string): string => {
  const parts = BRASILIA_FORMATTER.formatToParts(new Date(instantUtc));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('day')}/${values.get('month')}/${values.get('year')} às ${values.get('hour')}:${values.get('minute')}:${values.get('second')}`;
};

export const formatDegreePtBrTruncated = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) return 'indisponível';
  const scale = 10 ** decimals;
  const truncated = Math.trunc(value * scale) / scale;
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(truncated)}°`;
};

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const constellationLabel = (planet: PositionalV2Planet): string =>
  planet.astronomicalReal.status === 'available' && planet.astronomicalReal.constellation
    ? `${planet.astronomicalReal.constellation.namePtBr} (${planet.astronomicalReal.constellation.iauCode})`
    : 'indisponível junto a limite IAU';

const houseLabel = (planet: PositionalV2Planet): string =>
  planet.housePlacement.status === 'available' && planet.housePlacement.houseIndex1
    ? `Casa ${planet.housePlacement.houseIndex1}`
    : 'Casa Placidus indisponível';

const angelForFalangeGroup = (
  data: DadosPosicionaisV2,
  angelId: number,
): PositionalV2Planet['angelicQuinary']['angel'] | undefined =>
  data.positions.find((planet) => planet.angelicQuinary.angel.id === angelId)?.angelicQuinary.angel;

const falangeMemberLabelsPtBr = (memberBodyIds: readonly string[]): string =>
  memberBodyIds.map((bodyId) => getPlanetPresentationPtBr(bodyId).label).join(', ');

export function renderPositionalV2Text(data: DadosPosicionaisV2): string {
  const rulingPosition = findConsultantRulingPosition(data.positions);
  const lines = [
    '*📐 POSIÇÕES, CASAS E FALANGE ANGELICAL*',
    '',
    `*Nascimento:* ${formatInstantInBrasilia(data.birthContext.timeResolution.instantUtc)} (Hora oficial de Brasília)`,
    '',
  ];
  if (rulingPosition) {
    const presentation = getPlanetPresentationPtBr(rulingPosition.bodyId);
    const { angel, quinary } = rulingPosition.angelicQuinary;
    lines.push(
      '*👼 ANJO REGENTE DO CONSULENTE*',
      `• ${presentation.symbol} *#${angel.id} ${angel.canonicalName}* — ${angel.hebrewTriplet}`,
      `• *Posição do Sol:* ${formatDegreePtBrTruncated(rulingPosition.tropical.degreeWithinSignDeg)} de ${rulingPosition.tropical.sign.namePtBr}; quinário ${formatDegreePtBrTruncated(quinary.globalStartLongitudeDeg, 0)}–${formatDegreePtBrTruncated(quinary.globalEndLongitudeDegExclusive, 0)}.`,
      `• *Coro e príncipe:* ${angel.choir}; ${angel.prince}.`,
      `• *Síntese tradicional:* ${angel.qualitySummaryPtBr}`,
      '',
    );
  }
  for (const planet of data.positions) {
    const presentation = getPlanetPresentationPtBr(planet.bodyId);
    lines.push(
      `• ${presentation.symbol} *${presentation.label}:* ${formatDegreePtBrTruncated(planet.tropical.degreeWithinSignDeg)} de ${planet.tropical.sign.namePtBr}; ${houseLabel(planet)}; céu real: ${constellationLabel(planet)}; anjo #${planet.angelicQuinary.angel.id} ${planet.angelicQuinary.angel.canonicalName} (${planet.angelicQuinary.angel.choir}, ${planet.angelicQuinary.angel.prince}).`,
    );
  }
  lines.push('', '*👼 Falange Angelical do Mapa:*');
  for (const group of data.aggregates.angelicFalange) {
    const angel = angelForFalangeGroup(data, group.angelId);
    if (angel) lines.push(`• #${angel.id} ${angel.canonicalName}: ${falangeMemberLabelsPtBr(group.memberBodyIds)}.`);
  }
  return lines.join('\n');
}

export function renderPositionalV2EmailHtml(data: DadosPosicionaisV2): string {
  const rulingPosition = findConsultantRulingPosition(data.positions);
  const rulingAngelHtml = rulingPosition
    ? (() => {
        const presentation = getPlanetPresentationPtBr(rulingPosition.bodyId);
        const { angel, quinary } = rulingPosition.angelicQuinary;
        return `
      <div style="margin:22px 0;padding:22px;border:2px solid #a78bfa;border-radius:16px;background:#f5f3ff;box-shadow:0 8px 24px rgba(109,40,217,0.10);">
        <h3 style="font-size:21px;color:#5b21b6;margin:0 0 12px 0;">👼 Anjo Regente do Consulente</h3>
        <p style="font-size:18px;color:#312e81;margin:0 0 10px 0;"><strong>${escapeHtml(presentation.symbol)} #${angel.id} ${escapeHtml(angel.canonicalName)}</strong> <bdi lang="he" dir="rtl" style="font-size:20px;">${escapeHtml(angel.hebrewTriplet)}</bdi></p>
        <p style="color:#475569;margin:6px 0;"><strong>Posição do Sol:</strong> ${escapeHtml(formatDegreePtBrTruncated(rulingPosition.tropical.degreeWithinSignDeg))} de ${escapeHtml(rulingPosition.tropical.sign.namePtBr)}; quinário ${escapeHtml(formatDegreePtBrTruncated(quinary.globalStartLongitudeDeg, 0))}–${escapeHtml(formatDegreePtBrTruncated(quinary.globalEndLongitudeDegExclusive, 0))}.</p>
        <p style="color:#475569;margin:6px 0;"><strong>Coro e príncipe:</strong> ${escapeHtml(angel.choir)}; ${escapeHtml(angel.prince)}.</p>
        <p style="color:#475569;margin:6px 0;"><strong>Síntese tradicional:</strong> ${escapeHtml(angel.qualitySummaryPtBr)}</p>
      </div>`;
      })()
    : '';
  const rows = data.positions
    .map((planet) => {
      const presentation = getPlanetPresentationPtBr(planet.bodyId);
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700;">${escapeHtml(presentation.symbol)} ${escapeHtml(presentation.label)}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(formatDegreePtBrTruncated(planet.tropical.degreeWithinSignDeg))} de ${escapeHtml(planet.tropical.sign.namePtBr)}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(houseLabel(planet))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(constellationLabel(planet))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">#${planet.angelicQuinary.angel.id} ${escapeHtml(planet.angelicQuinary.angel.canonicalName)} <bdi lang="he" dir="rtl">${escapeHtml(planet.angelicQuinary.angel.hebrewTriplet)}</bdi></td>
        </tr>`;
    })
    .join('');
  const falangeRows = data.aggregates.angelicFalange
    .map((group) => {
      const angel = angelForFalangeGroup(data, group.angelId);
      if (!angel) return '';
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700;">#${angel.id} ${escapeHtml(angel.canonicalName)}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(falangeMemberLabelsPtBr(group.memberBodyIds))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:center;">${group.occurrenceCount}</td>
        </tr>`;
    })
    .join('');
  return `
    <div style="margin-top:40px;padding-top:40px;border-top:1px solid #7c3aed;">
      <h2 style="font-size:26px;color:#6d28d9;margin:0 0 18px 0;">📐 Posições, Casas Placidus e Falange Angelical</h2>
      <p style="color:#475569;">Nascimento: <strong>${escapeHtml(formatInstantInBrasilia(data.birthContext.timeResolution.instantUtc))}</strong> — Hora oficial de Brasília.</p>
      ${rulingAngelHtml}
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">
        <thead><tr><th style="padding:10px;text-align:left;">Planeta</th><th style="padding:10px;text-align:left;">Tropical</th><th style="padding:10px;text-align:left;">Casa</th><th style="padding:10px;text-align:left;">Constelação IAU</th><th style="padding:10px;text-align:left;">Correspondência angelical tropical</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <h3 style="font-size:21px;color:#5b21b6;margin:24px 0 12px 0;">👼 Falange Angelical do Mapa</h3>
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">
        <thead><tr><th style="padding:10px;text-align:left;">Anjo</th><th style="padding:10px;text-align:left;">Planetas correspondentes</th><th style="padding:10px;text-align:center;">Ocorrências</th></tr></thead>
        <tbody>${falangeRows}</tbody>
      </table></div>
    </div>`;
}
