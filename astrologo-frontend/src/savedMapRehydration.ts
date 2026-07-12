import type { SynastryViewResult } from './components/SynastryPanel';
import { isLocalityMapV1, type LocalityMapV1 } from './localityMapV1';
import { isNatalChartAnalysisV1, type NatalChartAnalysisV1 } from './natalAnalysisV1';
import { isSynastryRunV1 } from './synastryRunV1';
import { isTransitRunV1, type TransitRunV1 } from './transitRunV1';

export interface CanonicalArtifactsPatch {
  readonly natalChartAnalysisV1: NatalChartAnalysisV1 | null;
  readonly transitRunV1: TransitRunV1 | null;
  readonly synastryResult: SynastryViewResult | null;
  readonly localityMapV1: LocalityMapV1 | null;
}

export const SAVED_MAP_HYDRATION_SCHEMA_ID = 'urn:astrologo:saved-map-hydration' as const;
export const SAVED_MAP_HYDRATION_SCHEMA_VERSION = '1.0.0' as const;
const ADVANCED_ARTIFACT_KEYS = ['natalChartAnalysisV1', 'transitRunV1', 'synastryResult', 'localityMapV1'] as const;

export interface CanonicalHydrationEnvelope {
  readonly ok: true;
  readonly schemaId: typeof SAVED_MAP_HYDRATION_SCHEMA_ID;
  readonly schemaVersion: typeof SAVED_MAP_HYDRATION_SCHEMA_VERSION;
  readonly calculationId: string;
  readonly artifacts: CanonicalArtifactsPatch;
  readonly artifactStates: CanonicalArtifactStates;
}

export type CanonicalArtifactState = 'available' | 'absent';
export type CanonicalArtifactStates = Readonly<Record<(typeof ADVANCED_ARTIFACT_KEYS)[number], CanonicalArtifactState>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSynastryViewResult = (value: unknown): value is SynastryViewResult => {
  if (!isRecord(value) || !isRecord(value.names)) return false;
  return (
    isSynastryRunV1(value.run) &&
    typeof value.names.A === 'string' &&
    value.names.A.trim().length > 0 &&
    typeof value.names.B === 'string' &&
    value.names.B.trim().length > 0 &&
    typeof value.secondaryMapId === 'string' &&
    value.secondaryMapId.trim().length > 0
  );
};

export const canonicalArtifactBacklinksMatch = (artifacts: Record<string, unknown>, calculationId: string): boolean => {
  const natal = artifacts.natalChartAnalysisV1;
  if (natal !== null) {
    if (!isRecord(natal) || !isRecord(natal.source) || natal.source.calculationId !== calculationId) return false;
  }

  const transit = artifacts.transitRunV1;
  if (transit !== null) {
    if (
      !isRecord(transit) ||
      !isRecord(transit.source) ||
      !isRecord(transit.source.natal) ||
      transit.source.natal.calculationId !== calculationId
    ) {
      return false;
    }
  }

  const synastry = artifacts.synastryResult;
  if (synastry !== null) {
    if (
      !isRecord(synastry) ||
      typeof synastry.secondaryMapId !== 'string' ||
      !isRecord(synastry.run) ||
      !isRecord(synastry.run.charts) ||
      !isRecord(synastry.run.charts.A) ||
      !isRecord(synastry.run.charts.B) ||
      synastry.run.charts.A.calculationId !== calculationId ||
      synastry.run.charts.B.calculationId !== synastry.secondaryMapId
    ) {
      return false;
    }
  }

  const locality = artifacts.localityMapV1;
  if (locality !== null) {
    if (!isRecord(locality) || !isRecord(locality.source) || locality.source.calculationId !== calculationId)
      return false;
  }

  return true;
};

export const isCanonicalHydrationEnvelope = (
  value: unknown,
  expectedCalculationId: string,
): value is CanonicalHydrationEnvelope => {
  if (!isRecord(value) || !isRecord(value.artifacts) || !isRecord(value.artifactStates)) return false;
  const artifacts = value.artifacts;
  const artifactStates = value.artifactStates;
  if (
    value.ok !== true ||
    value.schemaId !== SAVED_MAP_HYDRATION_SCHEMA_ID ||
    value.schemaVersion !== SAVED_MAP_HYDRATION_SCHEMA_VERSION ||
    value.calculationId !== expectedCalculationId
  ) {
    return false;
  }
  if (
    Object.keys(artifacts).length !== ADVANCED_ARTIFACT_KEYS.length ||
    Object.keys(artifactStates).length !== ADVANCED_ARTIFACT_KEYS.length ||
    !ADVANCED_ARTIFACT_KEYS.every(
      (key) =>
        Object.hasOwn(artifacts, key) &&
        Object.hasOwn(artifactStates, key) &&
        (artifactStates[key] === 'available' || artifactStates[key] === 'absent') &&
        ((artifactStates[key] === 'available' && artifacts[key] !== null) ||
          (artifactStates[key] === 'absent' && artifacts[key] === null)),
    )
  ) {
    return false;
  }
  return (
    (artifacts.natalChartAnalysisV1 === null || isNatalChartAnalysisV1(artifacts.natalChartAnalysisV1)) &&
    (artifacts.transitRunV1 === null || isTransitRunV1(artifacts.transitRunV1)) &&
    (artifacts.synastryResult === null || isSynastryViewResult(artifacts.synastryResult)) &&
    (artifacts.localityMapV1 === null || isLocalityMapV1(artifacts.localityMapV1)) &&
    canonicalArtifactBacklinksMatch(artifacts, expectedCalculationId)
  );
};

/**
 * The id comparison is the final race guard: an A response that arrives after
 * B was selected cannot mutate B, even if abort delivery is delayed.
 */
export const mergeCanonicalArtifacts = <T extends { readonly id: string }>(
  current: T | null,
  responseMapId: string,
  artifacts: CanonicalArtifactsPatch,
): T | null => {
  if (!current || current.id !== responseMapId) return current;

  const merged: Record<string, unknown> = { ...current };
  for (const key of ADVANCED_ARTIFACT_KEYS) {
    const value = artifacts[key];
    if (value !== null) merged[key] = value;
  }
  return merged as T;
};
