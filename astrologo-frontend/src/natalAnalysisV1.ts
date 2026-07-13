export type NatalAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'quincunx' | 'opposition';

export interface NatalChartPoint {
  readonly kind: 'planet' | 'angle';
  readonly id: string;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly eclipticLongitudeDeg: number;
}

export interface NatalChartAnalysisV1 {
  readonly schemaId: 'urn:astrologo:natal-chart-analysis';
  readonly schemaVersion: '1.0.0';
  readonly source: { readonly calculationId: string; readonly calculatedAtUtc: string };
  readonly models: {
    readonly aspects: { readonly profileId: string; readonly profileVersion: string };
  };
  readonly points: readonly NatalChartPoint[];
  readonly movements: readonly {
    readonly bodyId: string;
    readonly status: 'available' | 'unavailable';
    readonly velocityDegPerDay?: number;
    readonly direction?: 'direct' | 'retrograde' | 'stationary';
    readonly reasonCode?: string;
  }[];
  readonly aspects: readonly {
    readonly recordId: string;
    readonly pointA: { readonly kind: 'planet' | 'angle'; readonly id: string };
    readonly pointB: { readonly kind: 'planet' | 'angle'; readonly id: string };
    readonly aspectId: NatalAspectId;
    readonly displayNamePtBr: string;
    readonly separationDeg: number;
    readonly exactAngleDeg: number;
    readonly allowedOrbDeg: number;
    readonly orbDeg: number;
    readonly intensityPercent: number;
    readonly phase:
      | { readonly status: 'available'; readonly phase: 'applying' | 'exact' | 'separating' }
      | { readonly status: 'unavailable'; readonly reasonCode?: string };
  }[];
  readonly houseOccupancies: readonly {
    readonly bodyId: string;
    readonly occupancy:
      | { readonly status: 'available'; readonly houseIndex1: number }
      | { readonly status: 'unavailable'; readonly reasonCode?: string };
    readonly mundaneDegreeWithinHouse:
      | {
          readonly status: 'available';
          readonly rawSwissHousePosition: number;
          readonly degreeWithinHouseDeg: number;
        }
      | { readonly status: 'unavailable'; readonly reasonCode?: string };
  }[];
  readonly diagnostics: readonly { readonly severity: 'info' | 'warning'; readonly code: string }[];
}

export const HOUSE_THEMES_PT_BR = [
  'Identidade, iniciativa e maneira de se apresentar',
  'Recursos, valores e relação com a segurança material',
  'Comunicação, aprendizado próximo e trocas cotidianas',
  'Raízes, intimidade, lar e bases emocionais',
  'Criatividade, expressão, prazer e projetos autorais',
  'Rotinas, serviço, cuidado cotidiano e aperfeiçoamento',
  'Parcerias, acordos e encontro com o outro',
  'Transformações, partilhas, crises e regeneração',
  'Horizontes, estudos amplos, viagens e sistemas de sentido',
  'Vocação, responsabilidade e presença pública',
  'Redes, amizades, coletivos e projetos de futuro',
  'Recolhimento, imaginação, encerramentos e vida interior',
] as const;

const DEGREE_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

export const formatNatalDegreePtBr = (value: number): string =>
  Number.isFinite(value) ? `${DEGREE_FORMATTER.format(value)}°` : 'indisponível';

export const aspectPhaseLabelPtBr = (phase: NatalChartAnalysisV1['aspects'][number]['phase']): string => {
  if (phase.status === 'unavailable') return 'fase indisponível';
  if (phase.phase === 'applying') return 'fase aplicativa';
  if (phase.phase === 'separating') return 'fase separativa';
  return 'fase exata';
};

const pointName = (data: NatalChartAnalysisV1, pointId: string): string =>
  data.points.find(({ id }) => id === pointId)?.displayNamePtBr ?? 'Ponto não identificado';

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function renderNatalChartAnalysisText(data: NatalChartAnalysisV1): string {
  const lines = ['*🔭 ASPECTOS NATAIS E CASAS*', '', '*Aspectos:*'];
  if (data.aspects.length === 0) lines.push('• Nenhum aspecto dentro dos orbes declarados.');
  for (const aspect of data.aspects) {
    lines.push(
      `• ${aspect.displayNamePtBr} — ${pointName(data, aspect.pointA.id)} e ${pointName(data, aspect.pointB.id)}: separação ${formatNatalDegreePtBr(aspect.separationDeg)}, orbe ${formatNatalDegreePtBr(aspect.orbDeg)}, ${aspectPhaseLabelPtBr(aspect.phase)}.`,
    );
  }
  lines.push('', '*Casas Placidus:*');
  for (const house of data.houseOccupancies) {
    const name = pointName(data, house.bodyId);
    if (house.occupancy.status === 'unavailable') {
      lines.push(`• ${name}: Casa Placidus indisponível.`);
      continue;
    }
    const mundane =
      house.mundaneDegreeWithinHouse.status === 'available'
        ? `, grau mundano ${formatNatalDegreePtBr(house.mundaneDegreeWithinHouse.degreeWithinHouseDeg)}`
        : ', posição dentro da casa indisponível';
    lines.push(`• ${name}: Casa ${house.occupancy.houseIndex1}${mundane}.`);
  }
  return `${lines.join('\n')}\n`;
}

export function renderNatalChartAnalysisEmailHtml(data: NatalChartAnalysisV1): string {
  const aspects = data.aspects.length
    ? data.aspects
        .map(
          (aspect) =>
            `<li style="margin:0 0 8px 0;"><strong>${escapeHtml(aspect.displayNamePtBr)}</strong> — ${escapeHtml(pointName(data, aspect.pointA.id))} e ${escapeHtml(pointName(data, aspect.pointB.id))}: separação ${escapeHtml(formatNatalDegreePtBr(aspect.separationDeg))}, orbe ${escapeHtml(formatNatalDegreePtBr(aspect.orbDeg))}, ${escapeHtml(aspectPhaseLabelPtBr(aspect.phase))}.</li>`,
        )
        .join('')
    : '<li>Nenhum aspecto dentro dos orbes declarados.</li>';
  const houses = data.houseOccupancies
    .map((house) => {
      const name = escapeHtml(pointName(data, house.bodyId));
      if (house.occupancy.status === 'unavailable') return `<li><strong>${name}:</strong> Casa indisponível.</li>`;
      const mundane =
        house.mundaneDegreeWithinHouse.status === 'available'
          ? ` · Grau mundano ${escapeHtml(formatNatalDegreePtBr(house.mundaneDegreeWithinHouse.degreeWithinHouseDeg))}`
          : ' · Posição dentro da casa indisponível';
      return `<li style="margin:0 0 8px 0;"><strong>${name}:</strong> Casa ${house.occupancy.houseIndex1}${mundane}</li>`;
    })
    .join('');

  return `<section style="margin-top:28px;padding:24px;border:1px solid #ddd6fe;border-radius:22px;background:#faf5ff;">
    <h3 style="font-size:21px;color:#5b21b6;margin:0 0 8px 0;">🔭 Aspectos Natais e Casas</h3>
    <h4 style="color:#7c3aed;margin:14px 0 8px 0;">Aspectos</h4><ul style="padding-left:20px;">${aspects}</ul>
    <h4 style="color:#047857;margin:18px 0 8px 0;">Casas Placidus e Grau mundano</h4><ul style="padding-left:20px;">${houses}</ul>
  </section>`;
}

export const isNatalChartAnalysisV1 = (value: unknown): value is NatalChartAnalysisV1 => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const source = candidate.source as Record<string, unknown> | null;
  const models = candidate.models as Record<string, unknown> | null;
  const aspectModel = models?.aspects as Record<string, unknown> | null;
  const isPoint = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const point = value as Record<string, unknown>;
    return (
      (point.kind === 'planet' || point.kind === 'angle') &&
      typeof point.id === 'string' &&
      typeof point.displayNamePtBr === 'string' &&
      typeof point.symbol === 'string' &&
      Number.isFinite(point.eclipticLongitudeDeg)
    );
  };
  const isMovement = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const movement = value as Record<string, unknown>;
    return (
      typeof movement.bodyId === 'string' &&
      (movement.status === 'available' || movement.status === 'unavailable') &&
      (movement.status !== 'available' ||
        (Number.isFinite(movement.velocityDegPerDay) &&
          (movement.direction === 'direct' ||
            movement.direction === 'retrograde' ||
            movement.direction === 'stationary')))
    );
  };
  const isAspect = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const aspect = value as Record<string, unknown>;
    const pointA = aspect.pointA as Record<string, unknown> | null;
    const pointB = aspect.pointB as Record<string, unknown> | null;
    const phase = aspect.phase as Record<string, unknown> | null;
    return (
      typeof aspect.recordId === 'string' &&
      typeof aspect.aspectId === 'string' &&
      typeof aspect.displayNamePtBr === 'string' &&
      typeof pointA?.id === 'string' &&
      typeof pointB?.id === 'string' &&
      Number.isFinite(aspect.separationDeg) &&
      Number.isFinite(aspect.allowedOrbDeg) &&
      Number.isFinite(aspect.orbDeg) &&
      Number.isFinite(aspect.intensityPercent) &&
      typeof phase === 'object' &&
      phase !== null &&
      (phase.status === 'unavailable' ||
        (phase.status === 'available' &&
          (phase.phase === 'applying' || phase.phase === 'exact' || phase.phase === 'separating')))
    );
  };
  const isHouseOccupancy = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const house = value as Record<string, unknown>;
    const occupancy = house.occupancy as Record<string, unknown> | null;
    const mundane = house.mundaneDegreeWithinHouse as Record<string, unknown> | null;
    return (
      typeof house.bodyId === 'string' &&
      typeof occupancy === 'object' &&
      occupancy !== null &&
      (occupancy.status === 'unavailable' ||
        (occupancy.status === 'available' &&
          Number.isInteger(occupancy.houseIndex1) &&
          Number(occupancy.houseIndex1) >= 1 &&
          Number(occupancy.houseIndex1) <= 12)) &&
      typeof mundane === 'object' &&
      mundane !== null &&
      (mundane.status === 'unavailable' ||
        (mundane.status === 'available' &&
          Number.isFinite(mundane.rawSwissHousePosition) &&
          Number.isFinite(mundane.degreeWithinHouseDeg)))
    );
  };
  return (
    candidate.schemaId === 'urn:astrologo:natal-chart-analysis' &&
    candidate.schemaVersion === '1.0.0' &&
    typeof source === 'object' &&
    source !== null &&
    typeof source.calculationId === 'string' &&
    typeof source.calculatedAtUtc === 'string' &&
    typeof models === 'object' &&
    models !== null &&
    typeof aspectModel?.profileId === 'string' &&
    typeof aspectModel.profileVersion === 'string' &&
    Array.isArray(candidate.points) &&
    candidate.points.every(isPoint) &&
    Array.isArray(candidate.movements) &&
    candidate.movements.every(isMovement) &&
    Array.isArray(candidate.aspects) &&
    candidate.aspects.every(isAspect) &&
    Array.isArray(candidate.houseOccupancies) &&
    candidate.houseOccupancies.every(isHouseOccupancy) &&
    Array.isArray(candidate.diagnostics)
  );
};
