import { formatInstantInBrasilia } from './astrologyV2';

export type LocalityAngleId = 'mc' | 'ic' | 'ascendant' | 'descendant';
export type LocalityCoordinate = readonly [longitudeDeg: number, latitudeDeg: number];

export interface LocalityMapV1 {
  readonly schemaId: 'urn:astrologo:locality-map';
  readonly schemaVersion: '1.0.0';
  readonly source: { readonly birthInstantUtc: string };
  readonly models: {
    readonly sourceCoordinates: {
      readonly sourceFrame: 'geocentric-apparent-eqj-j2000';
      readonly workingFrame: 'geocentric-apparent-true-equator-of-date-eqd';
      readonly transformation: { readonly methodId: string };
    };
    readonly siderealTime: { readonly kind: 'greenwich-apparent-sidereal-time'; readonly hours: number };
    readonly geometry: { readonly altitudeReferenceDeg: number; readonly refractionModel: 'none' };
    readonly sampling: { readonly latitudeResolutionDeg: number };
  };
  readonly bodies: readonly {
    readonly bodyId: string;
    readonly displayNamePtBr: string;
    readonly symbol: string;
  }[];
  readonly lines: readonly LocalityLineV1[];
  readonly diagnostics: readonly { readonly severity: 'info'; readonly code: string; readonly bodyId?: string }[];
}

export interface LocalityLineV1 {
  readonly recordId: string;
  readonly bodyId: string;
  readonly bodyDisplayNamePtBr: string;
  readonly bodySymbol: string;
  readonly angleId: LocalityAngleId;
  readonly angleDisplayNamePtBr: string;
  readonly availability: {
    readonly status: 'available' | 'partial' | 'unavailable';
    readonly sampledLatitudeCount: number;
    readonly solvedLatitudeCount: number;
    readonly reasonCode?: string;
  };
  readonly geometry: {
    readonly type: 'MultiLineString';
    readonly coordinates: readonly (readonly LocalityCoordinate[])[];
  };
}

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const availabilityPtBr = (line: LocalityLineV1): string => {
  if (line.availability.status === 'available') return 'linha disponível';
  if (line.availability.status === 'partial') {
    return `linha parcial em ${line.availability.solvedLatitudeCount} de ${line.availability.sampledLatitudeCount} latitudes amostradas`;
  }
  return 'linha indisponível na grade amostrada';
};

export function renderLocalityMapText(data: LocalityMapV1): string {
  const lines = [
    '*🗺️ MAPA PLANETÁRIO DE LOCALIDADE*',
    `*Instante natal:* ${formatInstantInBrasilia(data.source.birthInstantUtc)} — Hora oficial de Brasília`,
    `*Resolução latitudinal:* ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(data.models.sampling.latitudeResolutionDeg)}°`,
    '*Referência equatorial:* EQJ/J2000 → EQD verdadeiro da data, com precessão e nutação explícitas.',
    `*Horizonte geométrico:* altitude 0°, sem refração.`,
    '',
    '*Linhas planetárias:*',
  ];
  for (const line of data.lines) {
    lines.push(
      `• ${line.bodySymbol} ${line.bodyDisplayNamePtBr} — ${line.angleDisplayNamePtBr}: ${availabilityPtBr(line)}.`,
    );
  }
  return `${lines.join('\n')}\n`;
}

export function renderLocalityMapEmailHtml(data: LocalityMapV1): string {
  const lines = data.lines
    .map(
      (line) =>
        `<li style="margin:0 0 7px 0;"><strong>${escapeHtml(line.bodySymbol)} ${escapeHtml(line.bodyDisplayNamePtBr)} — ${escapeHtml(line.angleDisplayNamePtBr)}:</strong> ${escapeHtml(availabilityPtBr(line))}</li>`,
    )
    .join('');
  return `<section style="margin-top:28px;padding:24px;border:1px solid #fde68a;border-radius:22px;background:#fffbeb;">
    <h3 style="font-size:21px;color:#92400e;margin:0 0 8px 0;">🗺️ Mapa Planetário de Localidade</h3>
    <p style="font-size:13px;color:#475569;margin:0 0 5px 0;"><strong>Instante natal:</strong> ${escapeHtml(formatInstantInBrasilia(data.source.birthInstantUtc))} — Hora oficial de Brasília</p>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 16px 0;">EQJ/J2000 transformado para EQD verdadeiro da data; horizonte geométrico em 0°, sem refração.</p>
    <h4 style="color:#b45309;margin:14px 0 8px 0;">Linhas planetárias</h4><ul style="padding-left:20px;">${lines}</ul>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:18px 0 0 0;">A cartografia é uma referência simbólica: não recomenda mudança, viagem, investimento ou moradia.</p>
  </section>`;
}

export const isLocalityMapV1 = (value: unknown): value is LocalityMapV1 => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const source = candidate.source as Record<string, unknown> | null;
  const models = candidate.models as Record<string, unknown> | null;
  const sourceCoordinates = models?.sourceCoordinates as Record<string, unknown> | null;
  const transformation = sourceCoordinates?.transformation as Record<string, unknown> | null;
  const siderealTime = models?.siderealTime as Record<string, unknown> | null;
  const geometryModel = models?.geometry as Record<string, unknown> | null;
  const sampling = models?.sampling as Record<string, unknown> | null;
  const isCoordinate = (coordinate: unknown): boolean =>
    Array.isArray(coordinate) &&
    coordinate.length === 2 &&
    Number.isFinite(coordinate[0]) &&
    Number(coordinate[0]) >= -180 &&
    Number(coordinate[0]) <= 180 &&
    Number.isFinite(coordinate[1]) &&
    Number(coordinate[1]) > -90 &&
    Number(coordinate[1]) < 90;
  const isLine = (entry: unknown): boolean => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const line = entry as Record<string, unknown>;
    const availability = line.availability as Record<string, unknown> | null;
    const geometry = line.geometry as Record<string, unknown> | null;
    return (
      typeof line.recordId === 'string' &&
      typeof line.bodyId === 'string' &&
      typeof line.bodyDisplayNamePtBr === 'string' &&
      typeof line.bodySymbol === 'string' &&
      (line.angleId === 'mc' ||
        line.angleId === 'ic' ||
        line.angleId === 'ascendant' ||
        line.angleId === 'descendant') &&
      typeof line.angleDisplayNamePtBr === 'string' &&
      typeof availability === 'object' &&
      availability !== null &&
      (availability.status === 'available' ||
        availability.status === 'partial' ||
        availability.status === 'unavailable') &&
      Number.isInteger(availability.sampledLatitudeCount) &&
      Number.isInteger(availability.solvedLatitudeCount) &&
      geometry?.type === 'MultiLineString' &&
      Array.isArray(geometry.coordinates) &&
      geometry.coordinates.every(
        (segment) => Array.isArray(segment) && segment.length >= 2 && segment.every(isCoordinate),
      )
    );
  };
  return (
    candidate.schemaId === 'urn:astrologo:locality-map' &&
    candidate.schemaVersion === '1.0.0' &&
    typeof source === 'object' &&
    source !== null &&
    typeof source.birthInstantUtc === 'string' &&
    Number.isFinite(Date.parse(source.birthInstantUtc)) &&
    typeof models === 'object' &&
    models !== null &&
    sourceCoordinates?.sourceFrame === 'geocentric-apparent-eqj-j2000' &&
    sourceCoordinates?.workingFrame === 'geocentric-apparent-true-equator-of-date-eqd' &&
    typeof transformation?.methodId === 'string' &&
    siderealTime?.kind === 'greenwich-apparent-sidereal-time' &&
    Number.isFinite(siderealTime.hours) &&
    geometryModel?.altitudeReferenceDeg === 0 &&
    geometryModel?.refractionModel === 'none' &&
    Number.isFinite(sampling?.latitudeResolutionDeg) &&
    Array.isArray(candidate.bodies) &&
    Array.isArray(candidate.lines) &&
    candidate.lines.every(isLine) &&
    Array.isArray(candidate.diagnostics)
  );
};
