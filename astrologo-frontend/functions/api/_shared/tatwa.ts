export const TATWA_IDS = ['akasha', 'vayu', 'tejas', 'apas', 'prithvi'] as const;
export type TatwaId = (typeof TATWA_IDS)[number];

export const TATWA_ORDER = ['Akasha (Éter)', 'Vayu (Ar)', 'Tejas (Fogo)', 'Apas (Água)', 'Prithvi (Terra)'] as const;

export type TatwaName = (typeof TATWA_ORDER)[number];
export type TatwaSubOrder = 'fixed' | 'rulingFirst';

export const WESTERN_TATWA_SYSTEM = 'westernGoldenDawn120' as const;
export const WESTERN_TATWA_SCHEMA_VERSION = '2.0.0' as const;
export const WESTERN_TATWA_ALGORITHM_VERSION = '2.0.0' as const;
export const DEFAULT_TATWA_BOUNDARY_THRESHOLD_SEC = 300;

const CYCLE_SEC = 7_200;
const MAIN_SEC = 1_440;
const SUB_SEC = 288;

export interface TatwaState {
  readonly principal: TatwaName;
  readonly sub: TatwaName;
  readonly principalId: TatwaId;
  readonly subId: TatwaId;
  readonly principalIndex: number;
  readonly subIndex: number;
}

export interface AdjacentTatwaState extends TatwaState {
  readonly relation: 'previous' | 'next';
  readonly secondsToBoundary: number;
}

export interface WesternTatwaResult extends TatwaState {
  readonly schemaVersion: typeof WESTERN_TATWA_SCHEMA_VERSION;
  readonly system: typeof WESTERN_TATWA_SYSTEM;
  readonly algorithmVersion: typeof WESTERN_TATWA_ALGORITHM_VERSION;
  readonly subOrder: TatwaSubOrder;
  readonly elapsedSec: number;
  readonly cyclePositionSec: number;
  readonly mainPositionSec: number;
  readonly subPositionSec: number;
  readonly mainBoundaryMarginSec: number;
  readonly subBoundaryMarginSec: number;
  readonly boundaryThresholdSec: number;
  readonly nearMainBoundary: boolean;
  readonly subIsIndicative: true;
  readonly adjacentMain: AdjacentTatwaState;
}

const assertSafeEpochSecond = (value: number, field: string): void => {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${field} must be an integer epoch second`);
};

const stateAtCyclePosition = (cyclePositionSec: number, subOrder: TatwaSubOrder): TatwaState => {
  const normalized = ((cyclePositionSec % CYCLE_SEC) + CYCLE_SEC) % CYCLE_SEC;
  const principalIndex = Math.floor(normalized / MAIN_SEC);
  const mainPositionSec = normalized - principalIndex * MAIN_SEC;
  const rawSubIndex = Math.floor(mainPositionSec / SUB_SEC);
  const subIndex = subOrder === 'fixed' ? rawSubIndex : (principalIndex + rawSubIndex) % TATWA_ORDER.length;

  return {
    principal: TATWA_ORDER[principalIndex] ?? TATWA_ORDER[0],
    sub: TATWA_ORDER[subIndex] ?? TATWA_ORDER[0],
    principalId: TATWA_IDS[principalIndex] ?? TATWA_IDS[0],
    subId: TATWA_IDS[subIndex] ?? TATWA_IDS[0],
    principalIndex,
    subIndex,
  };
};

export function computeWesternTatwa(
  birthEpochSec: number,
  sunriseEpochSec: number,
  options: { readonly subOrder?: TatwaSubOrder; readonly boundaryThresholdSec?: number } = {},
): WesternTatwaResult {
  assertSafeEpochSecond(birthEpochSec, 'birthEpochSec');
  assertSafeEpochSecond(sunriseEpochSec, 'sunriseEpochSec');

  const subOrder = options.subOrder ?? 'fixed';
  const boundaryThresholdSec = options.boundaryThresholdSec ?? DEFAULT_TATWA_BOUNDARY_THRESHOLD_SEC;
  if (!Number.isSafeInteger(boundaryThresholdSec) || boundaryThresholdSec < 0) {
    throw new RangeError('boundaryThresholdSec must be a non-negative integer');
  }

  const elapsedSec = birthEpochSec - sunriseEpochSec;
  if (elapsedSec < 0) throw new RangeError('sunriseEpochSec must anchor the current Tatwa day');

  const cyclePositionSec = elapsedSec % CYCLE_SEC;
  const current = stateAtCyclePosition(cyclePositionSec, subOrder);
  const mainPositionSec = cyclePositionSec - current.principalIndex * MAIN_SEC;
  const rawSubIndex = Math.floor(mainPositionSec / SUB_SEC);
  const subPositionSec = mainPositionSec - rawSubIndex * SUB_SEC;
  const distanceToPreviousMain = mainPositionSec;
  const distanceToNextMain = MAIN_SEC - mainPositionSec;
  const mainBoundaryMarginSec = Math.min(distanceToPreviousMain, distanceToNextMain);
  const subBoundaryMarginSec = Math.min(subPositionSec, SUB_SEC - subPositionSec);
  const relation = distanceToPreviousMain <= distanceToNextMain ? 'previous' : 'next';
  const adjacentCyclePosition =
    relation === 'previous'
      ? (cyclePositionSec - distanceToPreviousMain - 1 + CYCLE_SEC) % CYCLE_SEC
      : (cyclePositionSec + distanceToNextMain) % CYCLE_SEC;
  const adjacentState = stateAtCyclePosition(adjacentCyclePosition, subOrder);

  return {
    schemaVersion: WESTERN_TATWA_SCHEMA_VERSION,
    system: WESTERN_TATWA_SYSTEM,
    algorithmVersion: WESTERN_TATWA_ALGORITHM_VERSION,
    subOrder,
    ...current,
    elapsedSec,
    cyclePositionSec,
    mainPositionSec,
    subPositionSec,
    mainBoundaryMarginSec,
    subBoundaryMarginSec,
    boundaryThresholdSec,
    nearMainBoundary: mainBoundaryMarginSec < boundaryThresholdSec,
    subIsIndicative: true,
    adjacentMain: {
      relation,
      secondsToBoundary: mainBoundaryMarginSec,
      ...adjacentState,
    },
  };
}
