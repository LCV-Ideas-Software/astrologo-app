import { formatInstantInBrasilia } from './astrologyV2';

export interface TransitRunV1 {
  readonly schemaId: 'urn:astrologo:transit-run';
  readonly schemaVersion: '1.0.0';
  readonly request: {
    readonly referenceInstantUtc: string;
    readonly phaseProbeInstantUtc: string;
    readonly horizonDays: number;
    readonly horizonEndInstantUtc: string;
  };
  readonly models: {
    readonly aspects: { readonly profileId: string; readonly profileVersion: string };
    readonly astronomicalReal: {
      readonly methodId: string;
      readonly classificationEpoch: 'B1875';
      readonly boundaryGuardArcminutes: 20;
      readonly coordinateInput: 'geocentric-apparent-equatorial-j2000';
    };
  };
  readonly presentationPolicy: { readonly timeZone: 'America/Sao_Paulo'; readonly timeZoneLabel: string };
  readonly positionsAtReference: readonly {
    readonly bodyId: string;
    readonly displayNamePtBr: string;
    readonly symbol: string;
    readonly eclipticLongitudeDeg: number;
    readonly tropical: { readonly signId: string; readonly signNamePtBr: string; readonly degreeWithinSignDeg: number };
    readonly astronomicalReal:
      | {
          readonly status: 'available';
          readonly coordinates: {
            readonly rightAscensionHours: number;
            readonly declinationDeg: number;
            readonly referenceFrame: 'equatorial-j2000';
          };
          readonly constellation: { readonly iauCode: string; readonly latinName: string; readonly namePtBr: string };
          readonly degreeWithinConstellation: {
            readonly status: 'not-defined';
            readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
          };
        }
      | {
          readonly status: 'unavailable';
          readonly reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN';
          readonly coordinates: {
            readonly rightAscensionHours: number;
            readonly declinationDeg: number;
            readonly referenceFrame: 'equatorial-j2000';
          };
          readonly degreeWithinConstellation: {
            readonly status: 'not-defined';
            readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
          };
        };
    readonly natalHousePlacement:
      | { readonly status: 'available'; readonly houseIndex1: number }
      | { readonly status: 'unavailable'; readonly reasonCode?: string };
  }[];
  readonly natalTargets: readonly (
    | {
        readonly status: 'available';
        readonly kind: 'planet' | 'angle';
        readonly pointId: string;
        readonly displayNamePtBr: string;
        readonly eclipticLongitudeDeg?: number;
      }
    | { readonly status: 'unavailable'; readonly pointId: string; readonly displayNamePtBr: string }
  )[];
  readonly aspects: readonly {
    readonly recordId: string;
    readonly transitPoint: { readonly bodyId: string; readonly eclipticLongitudeDeg: number };
    readonly natalPoint: {
      readonly kind: 'planet' | 'angle';
      readonly pointId: string;
      readonly eclipticLongitudeDeg: number;
    };
    readonly aspectId: string;
    readonly displayNamePtBr: string;
    readonly separationDeg: number;
    readonly exactAngleDeg: number;
    readonly allowedOrbDeg: number;
    readonly orbDeg: number;
    readonly phase:
      | { readonly status: 'available'; readonly phase: 'applying' | 'exact' | 'separating' }
      | { readonly status: 'unavailable'; readonly reasonCode?: string };
    readonly exactitude:
      | { readonly status: 'available'; readonly exactAtUtc: string }
      | { readonly status: 'unavailable'; readonly reasonCode?: string };
  }[];
  readonly diagnostics: readonly { readonly severity: 'info' | 'warning'; readonly code: string }[];
}

const DEGREE_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

export const formatTransitDegreePtBr = (value: number): string =>
  Number.isFinite(value) ? `${DEGREE_FORMATTER.format(value)}°` : 'indisponível';

export const transitPhaseLabelPtBr = (phase: TransitRunV1['aspects'][number]['phase']): string => {
  if (phase.status === 'unavailable') return 'fase indeterminada';
  if (phase.phase === 'applying') return 'fase aplicativa';
  if (phase.phase === 'separating') return 'fase separativa';
  return 'fase exata';
};

const transitName = (data: TransitRunV1, bodyId: string): string =>
  data.positionsAtReference.find(({ bodyId: candidate }) => candidate === bodyId)?.displayNamePtBr ??
  'Corpo em trânsito';

const natalName = (data: TransitRunV1, pointId: string): string =>
  data.natalTargets.find(({ pointId: candidate }) => candidate === pointId)?.displayNamePtBr ?? 'Ponto natal';

export const transitIauLabelPtBr = (position: TransitRunV1['positionsAtReference'][number]): string =>
  position.astronomicalReal.status === 'available'
    ? `constelação ${position.astronomicalReal.constellation.namePtBr}`
    : 'constelação indisponível';

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function renderTransitRunText(data: TransitRunV1): string {
  const lines = [
    '*🌌 CÉU ATUAL E TRÂNSITOS*',
    `*Instante de referência:* ${formatInstantInBrasilia(data.request.referenceInstantUtc)} — Hora oficial de Brasília`,
    `*Horizonte:* ${data.request.horizonDays} dia(s), até ${formatInstantInBrasilia(data.request.horizonEndInstantUtc)}`,
    '',
    '*Posições atuais:*',
  ];
  for (const position of data.positionsAtReference) {
    const house =
      position.natalHousePlacement.status === 'available'
        ? `Casa natal ${position.natalHousePlacement.houseIndex1}`
        : 'Casa natal indisponível';
    lines.push(
      `• ${position.symbol} ${position.displayNamePtBr}: ${formatTransitDegreePtBr(position.tropical.degreeWithinSignDeg)} de ${position.tropical.signNamePtBr} · ${transitIauLabelPtBr(position)} · ${house}.`,
    );
  }
  lines.push('', '*Aspectos trânsito–natal:*');
  if (data.aspects.length === 0) lines.push('• Nenhum aspecto dentro do orbe de 2,00° neste instante.');
  for (const aspect of data.aspects) {
    const exactitude =
      aspect.exactitude.status === 'available'
        ? ` Aperfeiçoamento: ${formatInstantInBrasilia(aspect.exactitude.exactAtUtc)}.`
        : ' Momento exato não identificado no período escolhido.';
    lines.push(
      `• ${aspect.displayNamePtBr} — ${transitName(data, aspect.transitPoint.bodyId)} em trânsito e ${natalName(data, aspect.natalPoint.pointId)} natal: orbe ${formatTransitDegreePtBr(aspect.orbDeg)}, ${transitPhaseLabelPtBr(aspect.phase)}.${exactitude}`,
    );
  }
  return `${lines.join('\n')}\n`;
}

export function renderTransitRunEmailHtml(data: TransitRunV1): string {
  const positions = data.positionsAtReference
    .map((position) => {
      const house =
        position.natalHousePlacement.status === 'available'
          ? `Casa natal ${position.natalHousePlacement.houseIndex1}`
          : 'Casa natal indisponível';
      const constellation =
        position.astronomicalReal.status === 'available'
          ? `Constelação: ${position.astronomicalReal.constellation.namePtBr}`
          : 'Constelação indisponível';
      return `<li style="margin:0 0 8px 0;"><strong>${escapeHtml(position.symbol)} ${escapeHtml(position.displayNamePtBr)}:</strong> ${escapeHtml(formatTransitDegreePtBr(position.tropical.degreeWithinSignDeg))} de ${escapeHtml(position.tropical.signNamePtBr)} · ${escapeHtml(constellation)} · ${escapeHtml(house)}</li>`;
    })
    .join('');
  const aspects = data.aspects.length
    ? data.aspects
        .map((aspect) => {
          const exactitude =
            aspect.exactitude.status === 'available'
              ? ` · Aperfeiçoamento ${escapeHtml(formatInstantInBrasilia(aspect.exactitude.exactAtUtc))}`
              : ' · Momento exato não identificado no período escolhido';
          return `<li style="margin:0 0 8px 0;"><strong>${escapeHtml(aspect.displayNamePtBr)}</strong> — ${escapeHtml(transitName(data, aspect.transitPoint.bodyId))} em trânsito e ${escapeHtml(natalName(data, aspect.natalPoint.pointId))} natal · orbe ${escapeHtml(formatTransitDegreePtBr(aspect.orbDeg))} · ${escapeHtml(transitPhaseLabelPtBr(aspect.phase))}${exactitude}</li>`;
        })
        .join('')
    : '<li>Nenhum aspecto dentro do orbe de 2,00° neste instante.</li>';

  return `<section style="margin-top:28px;padding:24px;border:1px solid #bae6fd;border-radius:22px;background:#f0f9ff;">
    <h3 style="font-size:21px;color:#075985;margin:0 0 8px 0;">🌌 Céu Atual e Trânsitos</h3>
    <p style="font-size:13px;color:#475569;margin:0 0 5px 0;"><strong>Referência:</strong> ${escapeHtml(formatInstantInBrasilia(data.request.referenceInstantUtc))} — Hora oficial de Brasília</p>
    <h4 style="color:#0369a1;margin:14px 0 8px 0;">Posições atuais</h4><ul style="padding-left:20px;">${positions}</ul>
    <h4 style="color:#7c3aed;margin:18px 0 8px 0;">Aspectos trânsito–natal</h4><ul style="padding-left:20px;">${aspects}</ul>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:18px 0 0 0;">Esta é uma leitura simbólica e não uma previsão inevitável de acontecimentos.</p>
  </section>`;
}

export const isTransitRunV1 = (value: unknown): value is TransitRunV1 => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const request = candidate.request as Record<string, unknown> | null;
  const models = candidate.models as Record<string, unknown> | null;
  const aspectModel = models?.aspects as Record<string, unknown> | null;
  const presentation = candidate.presentationPolicy as Record<string, unknown> | null;
  const isAstronomicalProjection = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const projection = value as Record<string, unknown>;
    const coordinates = projection.coordinates as Record<string, unknown> | null;
    const degree = projection.degreeWithinConstellation as Record<string, unknown> | null;
    if (
      typeof coordinates !== 'object' ||
      coordinates === null ||
      !Number.isFinite(coordinates.rightAscensionHours) ||
      !Number.isFinite(coordinates.declinationDeg) ||
      coordinates.referenceFrame !== 'equatorial-j2000' ||
      degree?.status !== 'not-defined' ||
      degree.reasonCode !== 'IAU_CONSTELLATIONS_ARE_2D_AREAS'
    )
      return false;
    if (projection.status === 'unavailable') {
      return projection.reasonCode === 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN';
    }
    const constellation = projection.constellation as Record<string, unknown> | null;
    return (
      projection.status === 'available' &&
      typeof constellation?.iauCode === 'string' &&
      typeof constellation.latinName === 'string' &&
      typeof constellation.namePtBr === 'string'
    );
  };
  const isPosition = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const position = value as Record<string, unknown>;
    const tropical = position.tropical as Record<string, unknown> | null;
    const house = position.natalHousePlacement as Record<string, unknown> | null;
    return (
      typeof position.bodyId === 'string' &&
      typeof position.displayNamePtBr === 'string' &&
      typeof position.symbol === 'string' &&
      Number.isFinite(position.eclipticLongitudeDeg) &&
      typeof tropical?.signId === 'string' &&
      typeof tropical.signNamePtBr === 'string' &&
      Number.isFinite(tropical.degreeWithinSignDeg) &&
      isAstronomicalProjection(position.astronomicalReal) &&
      typeof house === 'object' &&
      house !== null &&
      (house.status === 'unavailable' ||
        (house.status === 'available' &&
          Number.isInteger(house.houseIndex1) &&
          Number(house.houseIndex1) >= 1 &&
          Number(house.houseIndex1) <= 12))
    );
  };
  const isNatalTarget = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const target = value as Record<string, unknown>;
    return (
      (target.status === 'available' || target.status === 'unavailable') &&
      typeof target.pointId === 'string' &&
      typeof target.displayNamePtBr === 'string'
    );
  };
  const isAspect = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const aspect = value as Record<string, unknown>;
    const transitPoint = aspect.transitPoint as Record<string, unknown> | null;
    const natalPoint = aspect.natalPoint as Record<string, unknown> | null;
    const phase = aspect.phase as Record<string, unknown> | null;
    const exactitude = aspect.exactitude as Record<string, unknown> | null;
    return (
      typeof aspect.recordId === 'string' &&
      typeof aspect.aspectId === 'string' &&
      typeof aspect.displayNamePtBr === 'string' &&
      Number.isFinite(aspect.separationDeg) &&
      Number.isFinite(aspect.orbDeg) &&
      typeof transitPoint?.bodyId === 'string' &&
      typeof natalPoint?.pointId === 'string' &&
      typeof phase === 'object' &&
      phase !== null &&
      (phase.status === 'unavailable' ||
        (phase.status === 'available' &&
          (phase.phase === 'applying' || phase.phase === 'exact' || phase.phase === 'separating'))) &&
      typeof exactitude === 'object' &&
      exactitude !== null &&
      (exactitude.status === 'unavailable' ||
        (exactitude.status === 'available' && typeof exactitude.exactAtUtc === 'string'))
    );
  };
  return (
    candidate.schemaId === 'urn:astrologo:transit-run' &&
    candidate.schemaVersion === '1.0.0' &&
    typeof request === 'object' &&
    request !== null &&
    typeof request.referenceInstantUtc === 'string' &&
    typeof request.horizonEndInstantUtc === 'string' &&
    Number.isInteger(request.horizonDays) &&
    Number(request.horizonDays) >= 0 &&
    Number(request.horizonDays) <= 30 &&
    typeof models === 'object' &&
    models !== null &&
    typeof aspectModel?.profileId === 'string' &&
    typeof aspectModel.profileVersion === 'string' &&
    presentation?.timeZone === 'America/Sao_Paulo' &&
    Array.isArray(candidate.positionsAtReference) &&
    candidate.positionsAtReference.every(isPosition) &&
    Array.isArray(candidate.natalTargets) &&
    candidate.natalTargets.every(isNatalTarget) &&
    Array.isArray(candidate.aspects) &&
    candidate.aspects.every(isAspect) &&
    Array.isArray(candidate.diagnostics)
  );
};
