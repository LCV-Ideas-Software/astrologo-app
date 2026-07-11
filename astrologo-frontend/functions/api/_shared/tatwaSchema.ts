import { Temporal } from '@js-temporal/polyfill';
import { resolveBirthCivilTime } from './birthTime';
import { normalizeObserverElevationMeters } from './solarTimes';
import {
  computeWesternTatwa,
  DEFAULT_TATWA_BOUNDARY_THRESHOLD_SEC,
  type TatwaState,
  WESTERN_TATWA_ALGORITHM_VERSION,
  WESTERN_TATWA_SCHEMA_VERSION,
  WESTERN_TATWA_SYSTEM,
} from './tatwa';
import type { WesternTatwaBirthResult } from './tatwaBirth';

export interface TatwaSchemaValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const stateFields = ['principal', 'sub', 'principalId', 'subId', 'principalIndex', 'subIndex'] as const;

const compareFields = (
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
  fields: readonly string[],
  path: string,
  errors: string[],
): void => {
  for (const field of fields) {
    if (actual[field] !== expected[field]) errors.push(`${path}.${field} is inconsistent`);
  }
};

const compareState = (
  value: unknown,
  expected: TatwaState,
  path: string,
  errors: string[],
): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  compareFields(value, expected as unknown as Record<string, unknown>, stateFields, path, errors);
  return true;
};

const parseInstant = (value: unknown, path: string, errors: string[]): Temporal.Instant | null => {
  if (typeof value !== 'string') {
    errors.push(`${path} must be an ISO UTC instant`);
    return null;
  }
  try {
    return Temporal.Instant.from(value);
  } catch {
    errors.push(`${path} must be an ISO UTC instant`);
    return null;
  }
};

export function validateWesternTatwaBirthResult(value: unknown): TatwaSchemaValidation {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['tatwa must be an object'] };

  if (value.schemaVersion !== WESTERN_TATWA_SCHEMA_VERSION) errors.push('schemaVersion is unsupported');
  if (value.system !== WESTERN_TATWA_SYSTEM) errors.push('system is unsupported');
  if (value.algorithmVersion !== WESTERN_TATWA_ALGORITHM_VERSION) errors.push('algorithmVersion is unsupported');
  if (value.calculationMode !== 'fixed') errors.push('calculationMode must be fixed');
  if (Object.hasOwn(value, 'method') || Object.hasOwn(value, 'subOrder')) {
    errors.push('internal sub-order aliases must not be persisted');
  }
  if (value.boundaryThresholdSec !== DEFAULT_TATWA_BOUNDARY_THRESHOLD_SEC) {
    errors.push('boundaryThresholdSec is unsupported');
  }
  if (value.subIsIndicative !== true) errors.push('subIsIndicative must be true');

  const anchor = isRecord(value.anchor) ? value.anchor : null;
  if (!anchor) {
    errors.push('anchor must be an object');
    return { valid: false, errors };
  }

  const birthInstant = parseInstant(anchor.birthInstantUtc, 'anchor.birthInstantUtc', errors);
  const sunriseInstant = parseInstant(anchor.sunriseInstantUtc, 'anchor.sunriseInstantUtc', errors);
  parseInstant(anchor.calculatedAtUtc, 'anchor.calculatedAtUtc', errors);

  let birthCivil: Temporal.PlainDateTime | null = null;
  try {
    birthCivil =
      typeof anchor.birthCivilLocal === 'string' ? Temporal.PlainDateTime.from(anchor.birthCivilLocal) : null;
    if (
      birthCivil?.second !== 0 ||
      birthCivil.millisecond !== 0 ||
      birthCivil.microsecond !== 0 ||
      birthCivil.nanosecond !== 0
    ) {
      errors.push('anchor.birthCivilLocal must have minute precision');
      birthCivil = null;
    }
  } catch {
    errors.push('anchor.birthCivilLocal must be a civil ISO datetime');
  }

  let timeZoneValid = false;
  if (typeof anchor.timeZoneIana === 'string') {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: anchor.timeZoneIana }).format(0);
      timeZoneValid = true;
    } catch {
      errors.push('anchor.timeZoneIana must be a valid IANA timezone');
    }
  } else {
    errors.push('anchor.timeZoneIana must be a valid IANA timezone');
  }

  if (birthInstant && sunriseInstant) {
    if (birthInstant.epochMilliseconds < sunriseInstant.epochMilliseconds) {
      errors.push('sunrise must anchor the current Tatwa day');
    } else {
      const expected = computeWesternTatwa(
        Math.floor(Number(birthInstant.epochMilliseconds) / 1000),
        Math.floor(Number(sunriseInstant.epochMilliseconds) / 1000),
      );
      compareFields(
        value,
        expected as unknown as Record<string, unknown>,
        [
          ...stateFields,
          'elapsedSec',
          'cyclePositionSec',
          'mainPositionSec',
          'subPositionSec',
          'mainBoundaryMarginSec',
          'subBoundaryMarginSec',
          'boundaryThresholdSec',
          'nearMainBoundary',
          'subIsIndicative',
        ],
        'tatwa',
        errors,
      );
      const adjacent = isRecord(value.adjacentMain) ? value.adjacentMain : null;
      if (!adjacent) {
        errors.push('adjacentMain must be an object');
      } else {
        compareFields(
          adjacent,
          expected.adjacentMain as unknown as Record<string, unknown>,
          [...stateFields, 'relation', 'secondsToBoundary'],
          'adjacentMain',
          errors,
        );
      }

      const variants = isRecord(value.variants) ? value.variants : null;
      if (!variants) {
        errors.push('variants must be an object');
      } else {
        compareState(variants.fixed, expected, 'variants.fixed', errors);
        const legacy = computeWesternTatwa(
          Math.floor(Number(birthInstant.epochMilliseconds) / 1000),
          Math.floor(Number(sunriseInstant.epochMilliseconds) / 1000),
          { subOrder: 'rulingFirst' },
        );
        compareState(variants['legacy-rulingFirst'], legacy, 'variants.legacy-rulingFirst', errors);
      }
    }
  }

  if (birthInstant && birthCivil && timeZoneValid && typeof anchor.timeZoneIana === 'string') {
    const zonedBirth = birthInstant.toZonedDateTimeISO(anchor.timeZoneIana);
    if (!zonedBirth.toPlainDateTime().equals(birthCivil)) errors.push('birth instant does not match birthCivilLocal');
    if (anchor.birthOffset !== zonedBirth.offset) errors.push('birthOffset does not match the resolved instant');

    const expectedConfidence = birthCivil.year >= 1970 ? 'certified-1970-plus' : 'best-effort-1900-1969';
    if (anchor.historicalTimeConfidence !== expectedConfidence) {
      errors.push('historicalTimeConfidence is inconsistent');
    }

    const timeResolution = resolveBirthCivilTime({
      date: birthCivil.toPlainDate().toString(),
      time: `${String(birthCivil.hour).padStart(2, '0')}:${String(birthCivil.minute).padStart(2, '0')}`,
      timeZoneIana: anchor.timeZoneIana,
    });
    if (timeResolution.status === 'ambiguous') {
      if (anchor.birthTimeDisambiguation !== 'earlier' && anchor.birthTimeDisambiguation !== 'later') {
        errors.push('birthTimeDisambiguation must select an ambiguous occurrence');
      } else {
        const selected = timeResolution.candidates.find(
          (candidate) => candidate.disambiguation === anchor.birthTimeDisambiguation,
        );
        if (
          !selected ||
          Temporal.Instant.compare(Temporal.Instant.from(selected.instantUtc), birthInstant) !== 0 ||
          selected.offsetAtBirth !== anchor.birthOffset
        ) {
          errors.push('birthTimeDisambiguation does not match the selected occurrence');
        }
      }
    } else if (timeResolution.status === 'resolved') {
      if (anchor.birthTimeDisambiguation !== 'exact') {
        errors.push('birthTimeDisambiguation must be exact for an unambiguous civil time');
      }
    } else {
      errors.push('birth civil time cannot be resolved by the historical timezone policy');
    }

    if (sunriseInstant) {
      const sunriseDate = sunriseInstant.toZonedDateTimeISO(anchor.timeZoneIana).toPlainDate();
      if (anchor.sunriseLocalDate !== sunriseDate.toString()) errors.push('sunriseLocalDate is inconsistent');
      const sameDate = sunriseDate.equals(birthCivil.toPlainDate());
      const previousDate = sunriseDate.equals(birthCivil.toPlainDate().subtract({ days: 1 }));
      const expectedRelation = sameDate ? 'same-civil-date' : previousDate ? 'previous-civil-date' : null;
      if (!expectedRelation || anchor.sunriseRelation !== expectedRelation) {
        errors.push('sunriseRelation is inconsistent');
      }
    }
  }

  if (!['exact', 'earlier', 'later'].includes(String(anchor.birthTimeDisambiguation))) {
    errors.push('birthTimeDisambiguation is invalid');
  }
  if (anchor.inputTimePrecision !== 'minute') errors.push('inputTimePrecision must be minute');
  if (anchor.epochQuantization !== 'floor-each-instant-to-whole-second') {
    errors.push('epochQuantization is unsupported');
  }
  if (!isFiniteNumber(anchor.latitudeDeg) || anchor.latitudeDeg < -90 || anchor.latitudeDeg > 90) {
    errors.push('latitudeDeg is outside its domain');
  }
  if (!isFiniteNumber(anchor.longitudeDeg) || anchor.longitudeDeg < -180 || anchor.longitudeDeg > 180) {
    errors.push('longitudeDeg is outside its domain');
  }
  if (!Number.isSafeInteger(anchor.placeProviderResultId) || Number(anchor.placeProviderResultId) <= 0) {
    errors.push('placeProviderResultId must be a positive integer');
  }
  if (anchor.elevationInputMeters !== null && !isFiniteNumber(anchor.elevationInputMeters)) {
    errors.push('elevationInputMeters must be finite or null');
  } else if (
    anchor.elevationMeters !== normalizeObserverElevationMeters(anchor.elevationInputMeters as number | null)
  ) {
    errors.push('elevationMeters must be the effective observer elevation');
  }

  const solarModel = isRecord(anchor.solarModel) ? anchor.solarModel : null;
  if (
    solarModel?.engineId !== 'astronomy-engine' ||
    solarModel.engineVersion !== '2.1.19' ||
    solarModel.standardRefractionArcminutes !== 34
  ) {
    errors.push('solarModel is unsupported');
  }

  return { valid: errors.length === 0, errors };
}

export const isWesternTatwaBirthResult = (value: unknown): value is WesternTatwaBirthResult =>
  validateWesternTatwaBirthResult(value).valid;
