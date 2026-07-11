import { Temporal } from '@js-temporal/polyfill';
import {
  calculateLocalSolarTimes,
  type LocalSolarTimes,
  type LocalSolarTimesInput,
  normalizeObserverElevationMeters,
} from './solarTimes';
import { computeWesternTatwa, type TatwaState, type WesternTatwaResult } from './tatwa';

export interface TatwaBirthInput extends LocalSolarTimesInput {
  readonly birthInstantUtc: string;
  readonly birthCivilLocal: string;
  readonly birthOffset: string;
  readonly birthTimeDisambiguation: 'exact' | 'earlier' | 'later';
  readonly historicalTimeConfidence: 'certified-1970-plus' | 'best-effort-1900-1969';
  readonly placeProviderResultId: number;
  readonly calculatedAtUtc: string;
}

export interface TatwaBirthAnchor {
  readonly birthInstantUtc: string;
  readonly birthCivilLocal: string;
  readonly birthOffset: string;
  readonly birthTimeDisambiguation: 'exact' | 'earlier' | 'later';
  readonly historicalTimeConfidence: 'certified-1970-plus' | 'best-effort-1900-1969';
  readonly inputTimePrecision: 'minute';
  readonly epochQuantization: 'floor-each-instant-to-whole-second';
  readonly sunriseInstantUtc: string;
  readonly sunriseLocalDate: string;
  readonly sunriseRelation: 'same-civil-date' | 'previous-civil-date';
  readonly timeZoneIana: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly elevationInputMeters: number | null;
  readonly elevationMeters: number;
  readonly placeProviderResultId: number;
  readonly calculatedAtUtc: string;
  readonly solarModel: LocalSolarTimes['model'];
}

export interface WesternTatwaBirthResult extends Omit<WesternTatwaResult, 'subOrder'> {
  readonly calculationMode: 'fixed';
  readonly variants: {
    readonly fixed: TatwaState;
    readonly 'legacy-rulingFirst': TatwaState;
  };
  readonly anchor: TatwaBirthAnchor;
}

export type SolarTimesCalculator = (input: LocalSolarTimesInput) => LocalSolarTimes | null;

const epochMilliseconds = (instantUtc: string): number => {
  const epochMilliseconds = Date.parse(instantUtc);
  if (!Number.isFinite(epochMilliseconds)) throw new RangeError('Invalid UTC instant');
  return epochMilliseconds;
};

export function calculateWesternTatwaAtBirth(
  input: TatwaBirthInput,
  calculateSolarTimes: SolarTimesCalculator = calculateLocalSolarTimes,
): WesternTatwaBirthResult | null {
  const birthEpochMilliseconds = epochMilliseconds(input.birthInstantUtc);
  let sunriseLocalDate = Temporal.PlainDate.from(input.date);
  let solarTimes = calculateSolarTimes(input);
  if (!solarTimes) return null;

  if (birthEpochMilliseconds < epochMilliseconds(solarTimes.sunrise.instantUtc)) {
    sunriseLocalDate = sunriseLocalDate.subtract({ days: 1 });
    solarTimes = calculateSolarTimes({ ...input, date: sunriseLocalDate.toString() });
    if (!solarTimes) return null;
  }

  const birthEpochSec = Math.floor(birthEpochMilliseconds / 1000);
  const sunriseEpochSec = Math.floor(epochMilliseconds(solarTimes.sunrise.instantUtc) / 1000);
  const calculated = computeWesternTatwa(birthEpochSec, sunriseEpochSec);
  const legacyRulingFirst = computeWesternTatwa(birthEpochSec, sunriseEpochSec, { subOrder: 'rulingFirst' });
  const persistedCalculation = Object.fromEntries(
    Object.entries(calculated).filter(([key]) => key !== 'subOrder'),
  ) as Omit<WesternTatwaResult, 'subOrder'>;
  return {
    ...persistedCalculation,
    calculationMode: 'fixed',
    variants: {
      fixed: {
        principal: calculated.principal,
        sub: calculated.sub,
        principalId: calculated.principalId,
        subId: calculated.subId,
        principalIndex: calculated.principalIndex,
        subIndex: calculated.subIndex,
      },
      'legacy-rulingFirst': {
        principal: legacyRulingFirst.principal,
        sub: legacyRulingFirst.sub,
        principalId: legacyRulingFirst.principalId,
        subId: legacyRulingFirst.subId,
        principalIndex: legacyRulingFirst.principalIndex,
        subIndex: legacyRulingFirst.subIndex,
      },
    },
    anchor: {
      birthInstantUtc: input.birthInstantUtc,
      birthCivilLocal: input.birthCivilLocal,
      birthOffset: input.birthOffset,
      birthTimeDisambiguation: input.birthTimeDisambiguation,
      historicalTimeConfidence: input.historicalTimeConfidence,
      inputTimePrecision: 'minute',
      epochQuantization: 'floor-each-instant-to-whole-second',
      sunriseInstantUtc: solarTimes.sunrise.instantUtc,
      sunriseLocalDate: sunriseLocalDate.toString(),
      sunriseRelation: sunriseLocalDate.equals(Temporal.PlainDate.from(input.date))
        ? 'same-civil-date'
        : 'previous-civil-date',
      timeZoneIana: input.timeZoneIana,
      latitudeDeg: input.latitudeDeg,
      longitudeDeg: input.longitudeDeg,
      elevationInputMeters: input.elevationMeters,
      elevationMeters: normalizeObserverElevationMeters(input.elevationMeters),
      placeProviderResultId: input.placeProviderResultId,
      calculatedAtUtc: input.calculatedAtUtc,
      solarModel: solarTimes.model,
    },
  };
}
