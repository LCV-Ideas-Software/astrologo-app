export type TatwaPresentationMode = 'fixed' | 'legacy-rulingFirst' | 'unknown';

export interface TatwaAdjacentPresentation {
  readonly principal: string;
  readonly sub: string;
  readonly relation: 'previous' | 'next' | null;
}

export interface TatwaPresentation {
  readonly principal: string;
  readonly sub: string;
  readonly mode: TatwaPresentationMode;
  readonly modeLabelPtBr: string;
  readonly modeDescriptionPtBr: string;
  readonly modeOrigin: 'explicit' | 'inferred-from-absence' | 'unknown';
  readonly provenanceAvailable: boolean;
  readonly nearMainBoundary: boolean;
  readonly mainBoundaryMarginSec: number | null;
  readonly subBoundaryMarginSec: number | null;
  readonly subIsIndicative: boolean;
  readonly adjacent: TatwaAdjacentPresentation | null;
}

const TATWA_NAMES = new Set(['Akasha (Éter)', 'Vayu (Ar)', 'Tejas (Fogo)', 'Apas (Água)', 'Prithvi (Terra)']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const boundedIntegerOrNull = (value: unknown, maximum: number): number | null =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum ? Number(value) : null;

const tatwaNameOrUnavailable = (value: unknown): string =>
  typeof value === 'string' && TATWA_NAMES.has(value) ? value : 'Não disponível';

const hasValidTatwaPair = (value: Record<string, unknown>): boolean =>
  typeof value.principal === 'string' &&
  TATWA_NAMES.has(value.principal) &&
  typeof value.sub === 'string' &&
  TATWA_NAMES.has(value.sub);

const hasValidPresentationProvenance = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (
    typeof value.birthInstantUtc !== 'string' ||
    !Number.isFinite(Date.parse(value.birthInstantUtc)) ||
    typeof value.sunriseInstantUtc !== 'string' ||
    !Number.isFinite(Date.parse(value.sunriseInstantUtc)) ||
    typeof value.timeZoneIana !== 'string' ||
    typeof value.latitudeDeg !== 'number' ||
    !Number.isFinite(value.latitudeDeg) ||
    value.latitudeDeg < -90 ||
    value.latitudeDeg > 90 ||
    typeof value.longitudeDeg !== 'number' ||
    !Number.isFinite(value.longitudeDeg) ||
    value.longitudeDeg < -180 ||
    value.longitudeDeg > 180
  ) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value.timeZoneIana }).format(0);
    return true;
  } catch {
    return false;
  }
};

const MODE_COPY: Record<TatwaPresentationMode, { label: string; description: string }> = {
  fixed: {
    label: 'Ordem fixa — Akasha primeiro',
    description: 'Em todo Tatwa principal, os subtatwas seguem Akasha, Vayu, Tejas, Apas e Prithvi.',
  },
  'legacy-rulingFirst': {
    label: 'Ordem pelo principal',
    description: 'Cada período começa pelo próprio Tatwa principal e prossegue pela sequência circular.',
  },
  unknown: {
    label: 'Ordem não informada',
    description: 'Este mapa não registra qual ordem foi utilizada.',
  },
};

export const formatTatwaDurationPtBr = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  if (minutes === 0) return `${remainder} s`;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
};

export const presentTatwa = (value: unknown): TatwaPresentation => {
  const tatwa = isRecord(value) ? value : {};
  const hasModeMarker = Object.hasOwn(tatwa, 'calculationMode');
  const hasPair = hasValidTatwaPair(tatwa);
  let mode: TatwaPresentationMode;
  let modeOrigin: TatwaPresentation['modeOrigin'];

  if (hasPair && tatwa.schemaVersion === '2.0.0' && tatwa.calculationMode === 'fixed') {
    mode = 'fixed';
    modeOrigin = 'explicit';
  } else if (hasPair && tatwa.calculationMode === 'legacy-rulingFirst') {
    mode = 'legacy-rulingFirst';
    modeOrigin = 'explicit';
  } else if (hasPair && !hasModeMarker && !Object.hasOwn(tatwa, 'schemaVersion')) {
    mode = 'legacy-rulingFirst';
    modeOrigin = 'inferred-from-absence';
  } else {
    mode = 'unknown';
    modeOrigin = 'unknown';
  }

  const mainBoundaryMarginSec = mode === 'fixed' ? boundedIntegerOrNull(tatwa.mainBoundaryMarginSec, 720) : null;
  const subBoundaryMarginSec = mode === 'fixed' ? boundedIntegerOrNull(tatwa.subBoundaryMarginSec, 144) : null;
  const nearMainBoundary = mode === 'fixed' && tatwa.nearMainBoundary === true && mainBoundaryMarginSec !== null;
  const adjacentRaw =
    nearMainBoundary &&
    isRecord(tatwa.adjacentMain) &&
    hasValidTatwaPair(tatwa.adjacentMain) &&
    (tatwa.adjacentMain.relation === 'previous' || tatwa.adjacentMain.relation === 'next') &&
    tatwa.adjacentMain.secondsToBoundary === mainBoundaryMarginSec
      ? tatwa.adjacentMain
      : null;
  const adjacentRelation: TatwaAdjacentPresentation['relation'] =
    adjacentRaw?.relation === 'previous' || adjacentRaw?.relation === 'next' ? adjacentRaw.relation : null;
  const adjacent: TatwaAdjacentPresentation | null = adjacentRaw
    ? {
        principal: tatwaNameOrUnavailable(adjacentRaw.principal),
        sub: tatwaNameOrUnavailable(adjacentRaw.sub),
        relation: adjacentRelation,
      }
    : null;
  const copy = MODE_COPY[mode];
  const modeLabelPtBr =
    mode === 'legacy-rulingFirst' && modeOrigin === 'explicit'
      ? 'Ordem pelo principal — Tatwa principal primeiro'
      : copy.label;

  return {
    principal: tatwaNameOrUnavailable(tatwa.principal),
    sub: tatwaNameOrUnavailable(tatwa.sub),
    mode,
    modeLabelPtBr,
    modeDescriptionPtBr: copy.description,
    modeOrigin,
    provenanceAvailable: mode === 'fixed' && hasValidPresentationProvenance(tatwa.anchor),
    nearMainBoundary,
    mainBoundaryMarginSec,
    subBoundaryMarginSec,
    subIsIndicative: mode !== 'unknown',
    adjacent,
  };
};

export const renderTatwaEmailCautionHtml = (tatwa: TatwaPresentation): string => {
  const notices: string[] = [];
  if (tatwa.nearMainBoundary && tatwa.mainBoundaryMarginSec !== null) {
    const adjacent = tatwa.adjacent
      ? ` Possibilidade adjacente: ${tatwa.adjacent.principal} / ${tatwa.adjacent.sub}.`
      : '';
    notices.push(
      `<div style="margin-top: 8px; padding: 10px 12px; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #92400e;"><strong>Atenção:</strong> resultado a ${formatTatwaDurationPtBr(tatwa.mainBoundaryMarginSec)} de uma transição.${adjacent}</div>`,
    );
  }
  if (tatwa.subIsIndicative) {
    notices.push(
      '<div style="margin-top: 8px; padding: 10px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #475569;">O subtatwa é indicativo e especialmente sensível à precisão do horário registrado.</div>',
    );
  }
  return notices.join('');
};
