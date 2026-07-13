export interface SynastryRunV1 {
  readonly schemaId: 'urn:astrologo:synastry-run';
  readonly schemaVersion: '1.0.0';
  readonly charts: { readonly A: { readonly calculationId: string }; readonly B: { readonly calculationId: string } };
  readonly models: { readonly aspects: { readonly profileId: string; readonly profileVersion: string } };
  readonly presentationPolicy: { readonly timeZone: 'America/Sao_Paulo' };
  readonly aspects: readonly {
    readonly recordId: string;
    readonly pointA: { readonly chartRef: 'A'; readonly bodyId: string };
    readonly pointB: { readonly chartRef: 'B'; readonly bodyId: string };
    readonly displayNamePtBr: string;
    readonly separationDeg: number;
    readonly orbDeg: number;
  }[];
  readonly houseOverlays: {
    readonly aToB: readonly SynastryHouseOverlayV1[];
    readonly bToA: readonly SynastryHouseOverlayV1[];
  };
  readonly diagnostics: readonly { readonly severity: 'warning'; readonly code: string }[];
}

interface SynastryHouseOverlayV1 {
  readonly direction: 'A-to-B' | 'B-to-A';
  readonly sourceBodyId: string;
  readonly placement:
    | { readonly status: 'available'; readonly houseIndex1: number }
    | { readonly status: 'unavailable'; readonly reasonCode?: string };
}

export interface SynastrySubjectNames {
  readonly A: string;
  readonly B: string;
}

const PLANET_NAMES_PT_BR: Readonly<Record<string, string>> = Object.freeze({
  sun: 'Sol',
  moon: 'Lua',
  mercury: 'Mercúrio',
  venus: 'Vênus',
  mars: 'Marte',
  jupiter: 'Júpiter',
  saturn: 'Saturno',
  uranus: 'Urano',
  neptune: 'Netuno',
  pluto: 'Plutão',
});

const DEGREE_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

export const formatSynastryDegreePtBr = (value: number): string =>
  Number.isFinite(value) ? `${DEGREE_FORMATTER.format(value)}°` : 'indisponível';

export const synastryPlanetNamePtBr = (bodyId: string): string => PLANET_NAMES_PT_BR[bodyId] ?? 'Corpo celeste';

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const overlayText = (overlay: SynastryHouseOverlayV1, sourceName: string, targetName: string): string => {
  const planet = synastryPlanetNamePtBr(overlay.sourceBodyId);
  return overlay.placement.status === 'available'
    ? `${planet} de ${sourceName} na Casa ${overlay.placement.houseIndex1} de ${targetName}`
    : `${planet} de ${sourceName}: Casa de ${targetName} indisponível`;
};

export function renderSynastryRunText(data: SynastryRunV1, names: SynastrySubjectNames): string {
  const lines = ['*💞 SINASTRIA*', `*Pessoas:* ${names.A} e ${names.B}`, '', '*Aspectos intermapa:*'];
  if (data.aspects.length === 0) lines.push('• Nenhum aspecto dentro dos orbes declarados.');
  for (const aspect of data.aspects) {
    lines.push(
      `• ${aspect.displayNamePtBr} — ${synastryPlanetNamePtBr(aspect.pointA.bodyId)} de ${names.A} e ${synastryPlanetNamePtBr(aspect.pointB.bodyId)} de ${names.B}: separação ${formatSynastryDegreePtBr(aspect.separationDeg)}, orbe ${formatSynastryDegreePtBr(aspect.orbDeg)}.`,
    );
  }
  lines.push('', `*Corpos de ${names.A} nas Casas de ${names.B}:*`);
  for (const overlay of data.houseOverlays.aToB) lines.push(`• ${overlayText(overlay, names.A, names.B)}.`);
  lines.push('', `*Corpos de ${names.B} nas Casas de ${names.A}:*`);
  for (const overlay of data.houseOverlays.bToA) lines.push(`• ${overlayText(overlay, names.B, names.A)}.`);
  return `${lines.join('\n')}\n`;
}

export function renderSynastryRunEmailHtml(data: SynastryRunV1, names: SynastrySubjectNames): string {
  const aspects = data.aspects.length
    ? data.aspects
        .map(
          (aspect) =>
            `<li style="margin:0 0 8px 0;"><strong>${escapeHtml(aspect.displayNamePtBr)}</strong> — ${escapeHtml(synastryPlanetNamePtBr(aspect.pointA.bodyId))} de ${escapeHtml(names.A)} e ${escapeHtml(synastryPlanetNamePtBr(aspect.pointB.bodyId))} de ${escapeHtml(names.B)} · orbe ${escapeHtml(formatSynastryDegreePtBr(aspect.orbDeg))}</li>`,
        )
        .join('')
    : '<li>Nenhum aspecto dentro dos orbes declarados.</li>';
  const aToB = data.houseOverlays.aToB
    .map((overlay) => `<li>${escapeHtml(overlayText(overlay, names.A, names.B))}</li>`)
    .join('');
  const bToA = data.houseOverlays.bToA
    .map((overlay) => `<li>${escapeHtml(overlayText(overlay, names.B, names.A))}</li>`)
    .join('');

  return `<section style="margin-top:28px;padding:24px;border:1px solid #fbcfe8;border-radius:22px;background:#fdf2f8;">
    <h3 style="font-size:21px;color:#9d174d;margin:0 0 8px 0;">💞 Sinastria</h3>
    <p style="font-size:13px;color:#475569;margin:0 0 5px 0;"><strong>${escapeHtml(names.A)}</strong> e <strong>${escapeHtml(names.B)}</strong></p>
    <h4 style="color:#be185d;margin:14px 0 8px 0;">Aspectos intermapa</h4><ul style="padding-left:20px;">${aspects}</ul>
    <h4 style="color:#7c3aed;margin:18px 0 8px 0;">${escapeHtml(names.A)} nas Casas de ${escapeHtml(names.B)}</h4><ul style="padding-left:20px;">${aToB}</ul>
    <h4 style="color:#7c3aed;margin:18px 0 8px 0;">${escapeHtml(names.B)} nas Casas de ${escapeHtml(names.A)}</h4><ul style="padding-left:20px;">${bToA}</ul>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:18px 0 0 0;">A sinastria é uma leitura simbólica recíproca; não mede compatibilidade científica nem determina o destino da relação.</p>
  </section>`;
}

export const isSynastryRunV1 = (value: unknown): value is SynastryRunV1 => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const charts = candidate.charts as Record<string, unknown> | null;
  const chartA = charts?.A as Record<string, unknown> | null;
  const chartB = charts?.B as Record<string, unknown> | null;
  const models = candidate.models as Record<string, unknown> | null;
  const aspectsModel = models?.aspects as Record<string, unknown> | null;
  const presentationPolicy = candidate.presentationPolicy as Record<string, unknown> | null;
  const overlays = candidate.houseOverlays as Record<string, unknown> | null;
  const isOverlay = (entry: unknown): boolean => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const overlay = entry as Record<string, unknown>;
    const placement = overlay.placement as Record<string, unknown> | null;
    return (
      (overlay.direction === 'A-to-B' || overlay.direction === 'B-to-A') &&
      typeof overlay.sourceBodyId === 'string' &&
      typeof placement === 'object' &&
      placement !== null &&
      (placement.status === 'unavailable' ||
        (placement.status === 'available' &&
          Number.isInteger(placement.houseIndex1) &&
          Number(placement.houseIndex1) >= 1 &&
          Number(placement.houseIndex1) <= 12))
    );
  };
  const isAspect = (entry: unknown): boolean => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const aspect = entry as Record<string, unknown>;
    const pointA = aspect.pointA as Record<string, unknown> | null;
    const pointB = aspect.pointB as Record<string, unknown> | null;
    return (
      typeof aspect.recordId === 'string' &&
      typeof aspect.displayNamePtBr === 'string' &&
      Number.isFinite(aspect.separationDeg) &&
      Number.isFinite(aspect.orbDeg) &&
      pointA?.chartRef === 'A' &&
      typeof pointA.bodyId === 'string' &&
      pointB?.chartRef === 'B' &&
      typeof pointB.bodyId === 'string'
    );
  };
  return (
    candidate.schemaId === 'urn:astrologo:synastry-run' &&
    candidate.schemaVersion === '1.0.0' &&
    typeof charts === 'object' &&
    charts !== null &&
    typeof chartA?.calculationId === 'string' &&
    typeof chartB?.calculationId === 'string' &&
    typeof models === 'object' &&
    models !== null &&
    typeof aspectsModel?.profileId === 'string' &&
    typeof aspectsModel?.profileVersion === 'string' &&
    presentationPolicy?.timeZone === 'America/Sao_Paulo' &&
    Array.isArray(candidate.aspects) &&
    candidate.aspects.every(isAspect) &&
    typeof overlays === 'object' &&
    overlays !== null &&
    Array.isArray(overlays.aToB) &&
    overlays.aToB.every(isOverlay) &&
    Array.isArray(overlays.bToA) &&
    overlays.bToA.every(isOverlay) &&
    Array.isArray(candidate.diagnostics)
  );
};
