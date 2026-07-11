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

export function renderPositionalV2Text(data: DadosPosicionaisV2): string {
  const lines = [
    '*📐 POSIÇÕES, CASAS E FALANGE ANGELICAL*',
    '',
    `*Nascimento convertido:* ${formatInstantInBrasilia(data.birthContext.timeResolution.instantUtc)} (Hora oficial de Brasília)`,
    `*Mapa calculado:* ${formatInstantInBrasilia(data.calculatedAtUtc)} (Hora oficial de Brasília)`,
    '',
  ];
  for (const planet of data.positions) {
    lines.push(
      `• ${planet.symbol} *${planet.displayNamePtBr}:* ${formatDegreePtBrTruncated(planet.tropical.degreeWithinSignDeg)} de ${planet.tropical.sign.namePtBr}; ${houseLabel(planet)}; céu real: ${constellationLabel(planet)}; anjo #${planet.angelicQuinary.angel.id} ${planet.angelicQuinary.angel.canonicalName} (${planet.angelicQuinary.angel.choir}, ${planet.angelicQuinary.angel.prince}).`,
    );
  }
  lines.push('', '*👼 Falange do mapa:*');
  for (const group of data.aggregates.angelicFalange) {
    const angel = data.positions.find((planet) => planet.angelicQuinary.angel.id === group.angelId)?.angelicQuinary
      .angel;
    if (angel) lines.push(`• #${angel.id} ${angel.canonicalName}: ${group.memberBodyIds.join(', ')}.`);
  }
  lines.push('', '_Constelações IAU são áreas bidimensionais; não existe grau interno de constelação neste método._');
  return lines.join('\n');
}

export function renderPositionalV2EmailHtml(data: DadosPosicionaisV2): string {
  const rows = data.positions
    .map(
      (planet) => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700;">${escapeHtml(planet.symbol)} ${escapeHtml(planet.displayNamePtBr)}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(formatDegreePtBrTruncated(planet.tropical.degreeWithinSignDeg))} de ${escapeHtml(planet.tropical.sign.namePtBr)}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(houseLabel(planet))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">${escapeHtml(constellationLabel(planet))}</td>
          <td style="padding:10px;border-bottom:1px solid #e2e8f0;">#${planet.angelicQuinary.angel.id} ${escapeHtml(planet.angelicQuinary.angel.canonicalName)} <bdi lang="he" dir="rtl">${escapeHtml(planet.angelicQuinary.angel.hebrewTriplet)}</bdi></td>
        </tr>`,
    )
    .join('');
  return `
    <section style="margin-top:40px;padding-top:40px;border-top:1px solid #7c3aed;">
      <h2 style="font-size:26px;color:#6d28d9;margin:0 0 18px 0;">📐 Posições, Casas Placidus e Falange Angelical</h2>
      <p style="color:#475569;">Nascimento convertido: <strong>${escapeHtml(formatInstantInBrasilia(data.birthContext.timeResolution.instantUtc))}</strong> — Hora oficial de Brasília.</p>
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;">
        <thead><tr><th style="padding:10px;text-align:left;">Planeta</th><th style="padding:10px;text-align:left;">Tropical</th><th style="padding:10px;text-align:left;">Casa</th><th style="padding:10px;text-align:left;">Constelação IAU</th><th style="padding:10px;text-align:left;">Correspondência angelical tropical</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p style="font-size:12px;color:#64748b;">Constelações IAU são áreas bidimensionais; o método não define grau interno de constelação. As correspondências angelicais derivam exclusivamente dos quinários tropicais de 5°.</p>
    </section>`;
}
