import { POSITIONAL_SCHEMA_ID, POSITIONAL_SCHEMA_VERSION } from './positionV2';
import {
  resolveSynastryAspect,
  SYNASTRY_ASPECT_PROFILE_V1,
  SYNASTRY_PLANET_BODY_IDS,
  SYNASTRY_RUN_SCHEMA_ID,
  SYNASTRY_RUN_SCHEMA_VERSION,
  SYNASTRY_TARGET_SET_ID,
  type SynastryAspectId,
  type SynastryRunV1,
} from './synastryRunV1';

export interface SynastryRunV1ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type SynastryRunV1ValidationResult =
  | { readonly valid: true; readonly value: SynastryRunV1 }
  | { readonly valid: false; readonly errors: readonly SynastryRunV1ValidationIssue[] };

const ROOT_KEYS = [
  'schemaId',
  'schemaVersion',
  'charts',
  'targetSet',
  'presentationPolicy',
  'models',
  'aspects',
  'houseOverlays',
  'diagnostics',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sameNumber = (left: unknown, right: number): boolean =>
  typeof left === 'number' && Number.isFinite(left) && Math.abs(left - right) <= 1e-9;

const addIssue = (errors: SynastryRunV1ValidationIssue[], path: string, message: string): void => {
  errors.push({ path, message });
};

const exactKeys = (
  value: unknown,
  allowed: readonly string[],
  path: string,
  errors: SynastryRunV1ValidationIssue[],
): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) addIssue(errors, `${path}/${key}`, 'propriedade extra não permitida');
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) addIssue(errors, `${path}/${key}`, 'propriedade obrigatória ausente');
  }
  return true;
};

const isIsoInstant = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value));

const bodyRank = (value: unknown): number =>
  typeof value === 'string' ? (SYNASTRY_PLANET_BODY_IDS as readonly string[]).indexOf(value) : -1;

const validateChartReference = (value: unknown, path: string, errors: SynastryRunV1ValidationIssue[]): void => {
  if (
    !exactKeys(
      value,
      ['schemaId', 'schemaVersion', 'calculationId', 'calculatedAtUtc', 'birthInstantUtc'],
      path,
      errors,
    )
  ) {
    return;
  }
  if (value.schemaId !== POSITIONAL_SCHEMA_ID) addIssue(errors, `${path}/schemaId`, 'schemaId posicional inválido');
  if (value.schemaVersion !== POSITIONAL_SCHEMA_VERSION) {
    addIssue(errors, `${path}/schemaVersion`, 'schemaVersion posicional inválido');
  }
  if (typeof value.calculationId !== 'string' || value.calculationId.length < 1 || value.calculationId.length > 128) {
    addIssue(errors, `${path}/calculationId`, 'calculationId inválido');
  }
  if (!isIsoInstant(value.calculatedAtUtc)) addIssue(errors, `${path}/calculatedAtUtc`, 'instante ISO inválido');
  if (!isIsoInstant(value.birthInstantUtc)) addIssue(errors, `${path}/birthInstantUtc`, 'instante ISO inválido');
};

const validatePointReference = (
  value: unknown,
  expectedChartRef: 'A' | 'B',
  path: string,
  errors: SynastryRunV1ValidationIssue[],
): number => {
  if (!exactKeys(value, ['chartRef', 'bodyId'], path, errors)) return -1;
  if (value.chartRef !== expectedChartRef) addIssue(errors, `${path}/chartRef`, `deve referenciar ${expectedChartRef}`);
  const rank = bodyRank(value.bodyId);
  if (rank < 0) addIssue(errors, `${path}/bodyId`, 'corpo fora do conjunto canônico');
  return rank;
};

const validateAspects = (value: unknown, errors: SynastryRunV1ValidationIssue[]): void => {
  if (!Array.isArray(value)) {
    addIssue(errors, '/aspects', 'deve ser uma lista');
    return;
  }
  if (value.length > 100) addIssue(errors, '/aspects', 'não pode exceder os 100 pares intermapa');

  const pairKeys = new Set<string>();
  let previousPairRank = -1;
  value.forEach((candidate, index) => {
    const path = `/aspects/${index}`;
    if (
      !exactKeys(
        candidate,
        [
          'recordId',
          'pointA',
          'pointB',
          'aspectId',
          'displayNamePtBr',
          'separationDeg',
          'exactAngleDeg',
          'allowedOrbDeg',
          'orbDeg',
        ],
        path,
        errors,
      )
    ) {
      return;
    }

    const rankA = validatePointReference(candidate.pointA, 'A', `${path}/pointA`, errors);
    const rankB = validatePointReference(candidate.pointB, 'B', `${path}/pointB`, errors);
    if (rankA < 0 || rankB < 0) return;
    const pairRank = rankA * SYNASTRY_PLANET_BODY_IDS.length + rankB;
    if (pairRank <= previousPairRank) addIssue(errors, path, 'aspectos fora da ordem canônica ou par duplicado');
    previousPairRank = pairRank;

    const pointA = candidate.pointA as Record<string, unknown>;
    const pointB = candidate.pointB as Record<string, unknown>;
    const pairKey = `${String(pointA.bodyId)}|${String(pointB.bodyId)}`;
    if (pairKeys.has(pairKey)) addIssue(errors, path, 'par intermapa duplicado');
    pairKeys.add(pairKey);

    if (
      typeof candidate.separationDeg !== 'number' ||
      !Number.isFinite(candidate.separationDeg) ||
      candidate.separationDeg < 0 ||
      candidate.separationDeg > 180
    ) {
      addIssue(errors, `${path}/separationDeg`, 'separação deve estar em [0, 180]');
      return;
    }
    const resolved = resolveSynastryAspect(candidate.separationDeg);
    if (!resolved) {
      addIssue(errors, path, 'separação não pertence ao perfil de aspectos declarado');
      return;
    }
    if (candidate.aspectId !== resolved.aspectId) addIssue(errors, `${path}/aspectId`, 'aspecto incoerente');
    if (candidate.displayNamePtBr !== resolved.displayNamePtBr) {
      addIssue(errors, `${path}/displayNamePtBr`, 'nome público incoerente');
    }
    if (!sameNumber(candidate.exactAngleDeg, resolved.exactAngleDeg)) {
      addIssue(errors, `${path}/exactAngleDeg`, 'ângulo exato incoerente');
    }
    if (!sameNumber(candidate.allowedOrbDeg, resolved.allowedOrbDeg)) {
      addIssue(errors, `${path}/allowedOrbDeg`, 'orbe permitido incoerente');
    }
    if (!sameNumber(candidate.orbDeg, resolved.orbDeg)) addIssue(errors, `${path}/orbDeg`, 'orbe calculado incoerente');
    const expectedRecordId = `A:${String(pointA.bodyId)}|B:${String(pointB.bodyId)}|${resolved.aspectId}`;
    if (candidate.recordId !== expectedRecordId) addIssue(errors, `${path}/recordId`, 'recordId incoerente');
  });
};

const validatePlacement = (
  value: unknown,
  path: string,
  errors: SynastryRunV1ValidationIssue[],
): 'available' | 'unavailable' | null => {
  if (!isRecord(value)) {
    addIssue(errors, path, 'deve ser um objeto');
    return null;
  }
  if (value.status === 'available') {
    exactKeys(value, ['status', 'houseIndex1', 'basis', 'intervalConvention'], path, errors);
    if (!Number.isInteger(value.houseIndex1) || Number(value.houseIndex1) < 1 || Number(value.houseIndex1) > 12) {
      addIssue(errors, `${path}/houseIndex1`, 'casa deve ser um inteiro entre 1 e 12');
    }
    if (value.intervalConvention !== '[cusp,next-cusp)') {
      addIssue(errors, `${path}/intervalConvention`, 'convenção de intervalo inválida');
    }
  } else if (value.status === 'unavailable') {
    exactKeys(value, ['status', 'reasonCode', 'basis'], path, errors);
    if (value.reasonCode !== 'PLACIDUS_UNAVAILABLE') {
      addIssue(errors, `${path}/reasonCode`, 'motivo de indisponibilidade inválido');
    }
  } else {
    addIssue(errors, `${path}/status`, 'status inválido');
    return null;
  }
  if (value.basis !== 'recipient-placidus-cusps-ecliptic-longitude') {
    addIssue(errors, `${path}/basis`, 'base de sobreposição inválida');
  }
  return value.status;
};

const validateOverlayDirection = (
  value: unknown,
  key: 'aToB' | 'bToA',
  errors: SynastryRunV1ValidationIssue[],
): 'available' | 'unavailable' | 'mixed' | null => {
  const path = `/houseOverlays/${key}`;
  if (!Array.isArray(value)) {
    addIssue(errors, path, 'deve ser uma lista');
    return null;
  }
  if (value.length !== SYNASTRY_PLANET_BODY_IDS.length) {
    addIssue(errors, path, 'deve conter exatamente os dez corpos canônicos');
  }
  const expected =
    key === 'aToB'
      ? { direction: 'A-to-B', sourceChartRef: 'A', targetChartRef: 'B' }
      : { direction: 'B-to-A', sourceChartRef: 'B', targetChartRef: 'A' };
  const statuses = new Set<'available' | 'unavailable'>();

  value.forEach((candidate, index) => {
    const itemPath = `${path}/${index}`;
    if (
      !exactKeys(
        candidate,
        ['direction', 'sourceChartRef', 'sourceBodyId', 'targetChartRef', 'placement'],
        itemPath,
        errors,
      )
    ) {
      return;
    }
    if (candidate.direction !== expected.direction) addIssue(errors, `${itemPath}/direction`, 'direção incoerente');
    if (candidate.sourceChartRef !== expected.sourceChartRef) {
      addIssue(errors, `${itemPath}/sourceChartRef`, 'referência de origem incoerente');
    }
    if (candidate.targetChartRef !== expected.targetChartRef) {
      addIssue(errors, `${itemPath}/targetChartRef`, 'referência receptora incoerente');
    }
    if (candidate.sourceBodyId !== SYNASTRY_PLANET_BODY_IDS[index]) {
      addIssue(errors, `${itemPath}/sourceBodyId`, 'corpo ausente, duplicado ou fora da ordem canônica');
    }
    const status = validatePlacement(candidate.placement, `${itemPath}/placement`, errors);
    if (status) statuses.add(status);
  });

  if (statuses.size > 1) {
    addIssue(errors, path, 'a disponibilidade das casas deve ser uniforme por mapa receptor');
    return 'mixed';
  }
  return statuses.values().next().value ?? null;
};

const expectedDiagnostics = (
  aToBStatus: ReturnType<typeof validateOverlayDirection>,
  bToAStatus: ReturnType<typeof validateOverlayDirection>,
) => {
  const expected: Array<{ severity: 'warning'; code: string }> = [];
  if (bToAStatus === 'unavailable') expected.push({ severity: 'warning', code: 'CHART_A_PLACIDUS_UNAVAILABLE' });
  if (aToBStatus === 'unavailable') expected.push({ severity: 'warning', code: 'CHART_B_PLACIDUS_UNAVAILABLE' });
  return expected;
};

const validateDiagnostics = (
  value: unknown,
  expected: readonly { readonly severity: 'warning'; readonly code: string }[],
  errors: SynastryRunV1ValidationIssue[],
): void => {
  if (!Array.isArray(value)) {
    addIssue(errors, '/diagnostics', 'deve ser uma lista');
    return;
  }
  if (value.length !== expected.length) addIssue(errors, '/diagnostics', 'diagnósticos incoerentes com as casas');
  value.forEach((candidate, index) => {
    const path = `/diagnostics/${index}`;
    if (!exactKeys(candidate, ['severity', 'code'], path, errors)) return;
    if (candidate.severity !== expected[index]?.severity || candidate.code !== expected[index]?.code) {
      addIssue(errors, path, 'diagnóstico inesperado ou fora da ordem canônica');
    }
  });
};

export function validateSynastryRunV1(value: unknown): SynastryRunV1ValidationResult {
  const errors: SynastryRunV1ValidationIssue[] = [];
  if (!exactKeys(value, ROOT_KEYS, '', errors)) return { valid: false, errors };

  if (value.schemaId !== SYNASTRY_RUN_SCHEMA_ID) addIssue(errors, '/schemaId', 'schemaId inválido');
  if (value.schemaVersion !== SYNASTRY_RUN_SCHEMA_VERSION) addIssue(errors, '/schemaVersion', 'schemaVersion inválida');

  if (exactKeys(value.charts, ['A', 'B'], '/charts', errors)) {
    validateChartReference(value.charts.A, '/charts/A', errors);
    validateChartReference(value.charts.B, '/charts/B', errors);
  }

  if (exactKeys(value.targetSet, ['id', 'version', 'orderedBodyIds'], '/targetSet', errors)) {
    if (value.targetSet.id !== SYNASTRY_TARGET_SET_ID) addIssue(errors, '/targetSet/id', 'target set inválido');
    if (value.targetSet.version !== '1.0.0') addIssue(errors, '/targetSet/version', 'versão do target set inválida');
    if (
      !Array.isArray(value.targetSet.orderedBodyIds) ||
      value.targetSet.orderedBodyIds.length !== SYNASTRY_PLANET_BODY_IDS.length ||
      value.targetSet.orderedBodyIds.some((bodyId, index) => bodyId !== SYNASTRY_PLANET_BODY_IDS[index])
    ) {
      addIssue(errors, '/targetSet/orderedBodyIds', 'conjunto ou ordem de corpos inválido');
    }
  }

  const expectedPresentationPolicy = {
    locale: 'pt-BR',
    timeZone: 'America/Sao_Paulo',
    timeZoneLabel: 'Hora oficial de Brasília',
    calendar: 'gregory',
    numberingSystem: 'latn',
    hourCycle: 'h23',
  };
  if (
    exactKeys(
      value.presentationPolicy,
      ['locale', 'timeZone', 'timeZoneLabel', 'calendar', 'numberingSystem', 'hourCycle'],
      '/presentationPolicy',
      errors,
    ) &&
    JSON.stringify(value.presentationPolicy) !== JSON.stringify(expectedPresentationPolicy)
  ) {
    addIssue(errors, '/presentationPolicy', 'política de apresentação pública inválida');
  }

  if (exactKeys(value.models, ['aspects', 'houseOverlays'], '/models', errors)) {
    if (JSON.stringify(value.models.aspects) !== JSON.stringify(SYNASTRY_ASPECT_PROFILE_V1)) {
      addIssue(errors, '/models/aspects', 'perfil de aspectos inválido ou alterado');
    }
    const expectedHouseModel = {
      systemId: 'placidus',
      sourceCoordinate: 'geocentric-true-ecliptic-longitude-of-date',
      recipientBoundarySource: 'dados-posicionais-v2-cusps',
      intervalConvention: '[cusp,next-cusp)',
    };
    if (
      !exactKeys(
        value.models.houseOverlays,
        ['systemId', 'sourceCoordinate', 'recipientBoundarySource', 'intervalConvention'],
        '/models/houseOverlays',
        errors,
      ) ||
      JSON.stringify(value.models.houseOverlays) !== JSON.stringify(expectedHouseModel)
    ) {
      addIssue(errors, '/models/houseOverlays', 'modelo de sobreposição inválido');
    }
  }

  validateAspects(value.aspects, errors);
  let aToBStatus: ReturnType<typeof validateOverlayDirection> = null;
  let bToAStatus: ReturnType<typeof validateOverlayDirection> = null;
  if (exactKeys(value.houseOverlays, ['aToB', 'bToA'], '/houseOverlays', errors)) {
    aToBStatus = validateOverlayDirection(value.houseOverlays.aToB, 'aToB', errors);
    bToAStatus = validateOverlayDirection(value.houseOverlays.bToA, 'bToA', errors);
  }
  validateDiagnostics(value.diagnostics, expectedDiagnostics(aToBStatus, bToAStatus), errors);

  return errors.length === 0 ? { valid: true, value: value as unknown as SynastryRunV1 } : { valid: false, errors };
}

export function isSynastryRunV1(value: unknown): value is SynastryRunV1 {
  return validateSynastryRunV1(value).valid;
}

export const synastryAspectIds = SYNASTRY_ASPECT_PROFILE_V1.aspectDefinitions.map(
  ({ aspectId }): SynastryAspectId => aspectId,
);
