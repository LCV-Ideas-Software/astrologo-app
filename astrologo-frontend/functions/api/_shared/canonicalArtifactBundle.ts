import type { LocalityMapV1 } from './localityMapV1';
import { validateLocalityMapV1 } from './localityMapV1Schema';
import type { NatalChartAnalysisV1 } from './natalChartAnalysisV1';
import { validateNatalChartAnalysisV1 } from './natalChartAnalysisV1Schema';
import type { D1DatabaseLike } from './requestSecurity';
import type { SynastryRunV1 } from './synastryRunV1';
import { validateSynastryRunV1 } from './synastryRunV1Schema';
import type { TransitRunV1 } from './transitRunV1';
import { validateTransitRunV1 } from './transitRunV1Schema';

const CALCULATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

export const SAVED_MAP_HYDRATION_SCHEMA_ID = 'urn:astrologo:saved-map-hydration' as const;
export const SAVED_MAP_HYDRATION_SCHEMA_VERSION = '1.0.0' as const;

export interface CanonicalSynastryViewResult {
  readonly run: SynastryRunV1;
  readonly names: {
    readonly A: string;
    readonly B: string;
  };
  readonly secondaryMapId: string;
}

export type CanonicalArtifactOutcome<T> =
  | { readonly status: 'available'; readonly value: T }
  | { readonly status: 'absent' }
  | { readonly status: 'invalid'; readonly reasonCode: 'PAYLOAD_INVALID' }
  | { readonly status: 'error'; readonly reasonCode: 'QUERY_FAILED' };

export interface CanonicalArtifactBundle {
  readonly natalChartAnalysisV1: CanonicalArtifactOutcome<NatalChartAnalysisV1>;
  readonly transitRunV1: CanonicalArtifactOutcome<TransitRunV1>;
  readonly synastryResult: CanonicalArtifactOutcome<CanonicalSynastryViewResult>;
  readonly localityMapV1: CanonicalArtifactOutcome<LocalityMapV1>;
}

export interface ReadyCanonicalArtifactBundle {
  readonly artifacts: {
    readonly natalChartAnalysisV1: NatalChartAnalysisV1 | null;
    readonly transitRunV1: TransitRunV1 | null;
    readonly synastryResult: CanonicalSynastryViewResult | null;
    readonly localityMapV1: LocalityMapV1 | null;
  };
  readonly artifactStates: {
    readonly natalChartAnalysisV1: 'available' | 'absent';
    readonly transitRunV1: 'available' | 'absent';
    readonly synastryResult: 'available' | 'absent';
    readonly localityMapV1: 'available' | 'absent';
  };
}

export type CanonicalArtifactBundleResolution =
  | { readonly status: 'ready'; readonly value: ReadyCanonicalArtifactBundle }
  | { readonly status: 'invalid' }
  | { readonly status: 'error' };

interface PayloadRow {
  readonly payload_json?: string | null;
}

interface PrimarySynastryRow extends PayloadRow {
  readonly primary_name?: string | null;
  readonly secondary_name?: string | null;
  readonly secondary_mapa_id?: string | null;
}

type PayloadValidator<T> = (payload: unknown) => T | null;

const loadPayloadOutcome = async <T>(
  db: D1DatabaseLike,
  query: string,
  bindings: readonly unknown[],
  maxLength: number,
  validate: PayloadValidator<T>,
): Promise<CanonicalArtifactOutcome<T>> => {
  let row: PayloadRow | null;
  try {
    row = await db
      .prepare<PayloadRow>(query)
      .bind(...bindings)
      .first();
  } catch {
    return { status: 'error', reasonCode: 'QUERY_FAILED' };
  }
  if (!row) return { status: 'absent' };

  const serialized = row.payload_json;
  if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > maxLength) {
    return { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' };
  }
  const value = validate(parsed);
  return value === null ? { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' } : { status: 'available', value };
};

const loadCanonicalNatalOutcomeV1 = (
  db: D1DatabaseLike,
  calculationId: string,
): Promise<CanonicalArtifactOutcome<NatalChartAnalysisV1>> =>
  loadPayloadOutcome(
    db,
    `SELECT payload_json
     FROM astrologo_artifacts
     WHERE mapa_id = ?
       AND artifact_type = 'natal_chart_analysis'
       AND schema_id = 'urn:astrologo:natal-chart-analysis'
       AND schema_version = '1.0.0'
       AND status = 'ready'
     ORDER BY updated_at DESC, created_at DESC, id DESC
     LIMIT 1`,
    [calculationId],
    524_288,
    (payload) => {
      const validation = validateNatalChartAnalysisV1(payload);
      return validation.valid && validation.value.source.calculationId === calculationId ? validation.value : null;
    },
  );

const loadCanonicalTransitOutcomeV1 = (
  db: D1DatabaseLike,
  calculationId: string,
): Promise<CanonicalArtifactOutcome<TransitRunV1>> =>
  loadPayloadOutcome(
    db,
    `SELECT artifact.payload_json
     FROM astrologo_transit_runs AS run
     INNER JOIN astrologo_artifacts AS artifact
       ON artifact.id = run.result_artifact_id
      AND artifact.transit_run_id = run.id
     WHERE run.mapa_id = ?
       AND artifact.mapa_id = ?
       AND run.status = 'ready'
       AND artifact.status = 'ready'
       AND artifact.artifact_type = 'transit_result'
       AND artifact.schema_id = 'urn:astrologo:transit-run'
       AND artifact.schema_version = '1.0.0'
     ORDER BY run.reference_instant_utc DESC, run.updated_at DESC, run.id DESC
     LIMIT 1`,
    [calculationId, calculationId],
    1_048_576,
    (payload) => {
      const validation = validateTransitRunV1(payload);
      return validation.valid && validation.value.source.natal.calculationId === calculationId
        ? validation.value
        : null;
    },
  );

const loadCanonicalLocalityOutcomeV1 = (
  db: D1DatabaseLike,
  calculationId: string,
): Promise<CanonicalArtifactOutcome<LocalityMapV1>> =>
  loadPayloadOutcome(
    db,
    `SELECT artifact.payload_json
     FROM astrologo_locality_runs AS run
     INNER JOIN astrologo_artifacts AS artifact
       ON artifact.id = run.result_artifact_id
      AND artifact.locality_run_id = run.id
     WHERE run.mapa_id = ?
       AND artifact.mapa_id = ?
       AND run.status = 'ready'
       AND artifact.status = 'ready'
       AND artifact.artifact_type = 'locality_map'
       AND artifact.schema_id = 'urn:astrologo:locality-map'
       AND artifact.schema_version = '1.0.0'
     ORDER BY run.created_at DESC, run.updated_at DESC, run.id DESC
     LIMIT 1`,
    [calculationId, calculationId],
    4_194_304,
    (payload) => {
      const validation = validateLocalityMapV1(payload);
      return validation.valid && validation.value.source.calculationId === calculationId ? validation.value : null;
    },
  );

/**
 * Public saved maps restore only synastries in which that map is chart A.
 * Chart B is an auxiliary consent-scoped record and must never expose the
 * primary result of a different saved map.
 */
export const loadCanonicalPrimarySynastryViewOutcomeV1 = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<CanonicalArtifactOutcome<CanonicalSynastryViewResult>> => {
  if (!db || typeof calculationId !== 'string' || !CALCULATION_ID_PATTERN.test(calculationId)) {
    return { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' };
  }

  let row: PrimarySynastryRow | null;
  try {
    row = await db
      .prepare<PrimarySynastryRow>(
        `SELECT artifact.payload_json,
                primary_map.nome AS primary_name,
                secondary_map.nome AS secondary_name,
                run.secondary_mapa_id
         FROM astrologo_synastry_runs AS run
         INNER JOIN astrologo_artifacts AS artifact
           ON artifact.id = run.result_artifact_id
          AND artifact.synastry_run_id = run.id
         INNER JOIN astrologo_mapas AS primary_map
           ON primary_map.id = run.primary_mapa_id
         INNER JOIN astrologo_mapas AS secondary_map
           ON secondary_map.id = run.secondary_mapa_id
         WHERE run.primary_mapa_id = ?
           AND artifact.mapa_id = ?
           AND run.status = 'ready'
           AND artifact.status = 'ready'
           AND artifact.artifact_type = 'synastry_result'
           AND artifact.schema_id = 'urn:astrologo:synastry-run'
           AND artifact.schema_version = '1.0.0'
         ORDER BY run.created_at DESC, run.updated_at DESC, run.id DESC
         LIMIT 1`,
      )
      .bind(calculationId, calculationId)
      .first();
  } catch {
    return { status: 'error', reasonCode: 'QUERY_FAILED' };
  }
  if (!row) return { status: 'absent' };

  const serialized = row.payload_json;
  const primaryName = row.primary_name?.trim();
  const secondaryName = row.secondary_name?.trim();
  const secondaryMapId = row.secondary_mapa_id;
  if (
    typeof serialized !== 'string' ||
    serialized.length === 0 ||
    serialized.length > 1_048_576 ||
    !primaryName ||
    !secondaryName ||
    typeof secondaryMapId !== 'string' ||
    !CALCULATION_ID_PATTERN.test(secondaryMapId)
  ) {
    return { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized) as unknown;
  } catch {
    return { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' };
  }
  const validation = validateSynastryRunV1(parsed);
  if (
    !validation.valid ||
    validation.value.charts.A.calculationId !== calculationId ||
    validation.value.charts.B.calculationId !== secondaryMapId
  ) {
    return { status: 'invalid', reasonCode: 'PAYLOAD_INVALID' };
  }

  return {
    status: 'available',
    value: {
      run: validation.value,
      names: { A: primaryName, B: secondaryName },
      secondaryMapId,
    },
  };
};

export const loadCanonicalPrimarySynastryViewV1 = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<CanonicalSynastryViewResult | null> => {
  const outcome = await loadCanonicalPrimarySynastryViewOutcomeV1(db, calculationId);
  return outcome.status === 'available' ? outcome.value : null;
};

export const loadCanonicalArtifactBundle = async (
  db: D1DatabaseLike,
  calculationId: string,
): Promise<CanonicalArtifactBundle> => {
  const [natalChartAnalysisV1, transitRunV1, synastryResult, localityMapV1] = await Promise.all([
    loadCanonicalNatalOutcomeV1(db, calculationId),
    loadCanonicalTransitOutcomeV1(db, calculationId),
    loadCanonicalPrimarySynastryViewOutcomeV1(db, calculationId),
    loadCanonicalLocalityOutcomeV1(db, calculationId),
  ]);

  return { natalChartAnalysisV1, transitRunV1, synastryResult, localityMapV1 };
};

export const resolveCanonicalArtifactBundle = (bundle: CanonicalArtifactBundle): CanonicalArtifactBundleResolution => {
  const outcomes = Object.values(bundle);
  if (outcomes.some(({ status }) => status === 'error')) return { status: 'error' };
  if (outcomes.some(({ status }) => status === 'invalid')) return { status: 'invalid' };

  const valueOrNull = <T>(outcome: CanonicalArtifactOutcome<T>): T | null =>
    outcome.status === 'available' ? outcome.value : null;
  const state = <T>(outcome: CanonicalArtifactOutcome<T>): 'available' | 'absent' =>
    outcome.status === 'available' ? 'available' : 'absent';

  return {
    status: 'ready',
    value: {
      artifacts: {
        natalChartAnalysisV1: valueOrNull(bundle.natalChartAnalysisV1),
        transitRunV1: valueOrNull(bundle.transitRunV1),
        synastryResult: valueOrNull(bundle.synastryResult),
        localityMapV1: valueOrNull(bundle.localityMapV1),
      },
      artifactStates: {
        natalChartAnalysisV1: state(bundle.natalChartAnalysisV1),
        transitRunV1: state(bundle.transitRunV1),
        synastryResult: state(bundle.synastryResult),
        localityMapV1: state(bundle.localityMapV1),
      },
    },
  };
};
