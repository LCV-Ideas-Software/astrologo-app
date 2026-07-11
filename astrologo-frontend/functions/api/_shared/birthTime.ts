import { Temporal } from '@js-temporal/polyfill';

export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo' as const;
export const BRAZIL_LOCALE = 'pt-BR' as const;

export type BirthTimeDisambiguation = 'earlier' | 'later';
export type HistoricalTimeConfidence = 'certified-1970-plus' | 'best-effort-1900-1969';

export interface BirthTimeCandidate {
  readonly disambiguation: BirthTimeDisambiguation;
  readonly instantUtc: string;
  readonly offsetAtBirth: string;
}

export type BirthTimeResolution =
  | {
      readonly status: 'resolved';
      readonly timeZoneIana: string;
      readonly instantUtc: string;
      readonly offsetAtBirth: string;
      readonly disambiguation: 'exact' | BirthTimeDisambiguation;
      readonly historicalConfidence: HistoricalTimeConfidence;
    }
  | {
      readonly status: 'ambiguous';
      readonly timeZoneIana: string;
      readonly candidates: readonly [BirthTimeCandidate, BirthTimeCandidate];
      readonly historicalConfidence: HistoricalTimeConfidence;
    }
  | {
      readonly status: 'nonexistent';
      readonly timeZoneIana: string;
      readonly reasonCode: 'LOCAL_TIME_IN_DST_GAP';
      readonly historicalConfidence: HistoricalTimeConfidence;
    }
  | {
      readonly status: 'blocked';
      readonly timeZoneIana: string;
      readonly reasonCode: 'HISTORICAL_TIMEZONE_BEFORE_1900_UNSUPPORTED';
    };

interface ResolveBirthCivilTimeInput {
  readonly date: string;
  readonly time: string;
  readonly timeZoneIana: string;
  readonly disambiguation?: BirthTimeDisambiguation;
}

const toCandidate = (zoned: Temporal.ZonedDateTime, disambiguation: BirthTimeDisambiguation): BirthTimeCandidate => ({
  disambiguation,
  instantUtc: zoned.toInstant().toString(),
  offsetAtBirth: zoned.offset,
});

export function resolveBirthCivilTime(input: ResolveBirthCivilTimeInput): BirthTimeResolution {
  const plainDateTime = Temporal.PlainDateTime.from(`${input.date}T${input.time}:00`);
  const historicalConfidence: HistoricalTimeConfidence =
    plainDateTime.year >= 1970 ? 'certified-1970-plus' : 'best-effort-1900-1969';

  if (plainDateTime.year < 1900) {
    return {
      status: 'blocked',
      timeZoneIana: input.timeZoneIana,
      reasonCode: 'HISTORICAL_TIMEZONE_BEFORE_1900_UNSUPPORTED',
    };
  }

  const fields = {
    timeZone: input.timeZoneIana,
    year: plainDateTime.year,
    month: plainDateTime.month,
    day: plainDateTime.day,
    hour: plainDateTime.hour,
    minute: plainDateTime.minute,
    second: plainDateTime.second,
  };
  const earlier = Temporal.ZonedDateTime.from(fields, { disambiguation: 'earlier' });
  const later = Temporal.ZonedDateTime.from(fields, { disambiguation: 'later' });
  const earlierMatches = earlier.toPlainDateTime().equals(plainDateTime);
  const laterMatches = later.toPlainDateTime().equals(plainDateTime);

  if (!earlierMatches || !laterMatches) {
    return {
      status: 'nonexistent',
      timeZoneIana: input.timeZoneIana,
      reasonCode: 'LOCAL_TIME_IN_DST_GAP',
      historicalConfidence,
    };
  }

  const isAmbiguous = earlier.epochNanoseconds !== later.epochNanoseconds;
  if (isAmbiguous && !input.disambiguation) {
    return {
      status: 'ambiguous',
      timeZoneIana: input.timeZoneIana,
      candidates: [toCandidate(earlier, 'earlier'), toCandidate(later, 'later')],
      historicalConfidence,
    };
  }

  const selected = input.disambiguation === 'later' ? later : earlier;
  return {
    status: 'resolved',
    timeZoneIana: input.timeZoneIana,
    instantUtc: selected.toInstant().toString(),
    offsetAtBirth: selected.offset,
    disambiguation: isAmbiguous ? (input.disambiguation ?? 'earlier') : 'exact',
    historicalConfidence,
  };
}

const brasiliaDateTimeFormatter = new Intl.DateTimeFormat(BRAZIL_LOCALE, {
  timeZone: BRASILIA_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatInstantInBrasilia(instantUtc: string): string {
  const parts = brasiliaDateTimeFormatter.formatToParts(new Date(instantUtc));
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get('day')}/${byType.get('month')}/${byType.get('year')} às ${byType.get('hour')}:${byType.get('minute')}:${byType.get('second')}`;
}

export function formatBrazilianCivilDate(date: string): string {
  const parsed = Temporal.PlainDate.from(date);
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${String(parsed.year).padStart(4, '0')}`;
}
