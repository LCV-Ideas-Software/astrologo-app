import { Temporal } from '@js-temporal/polyfill';
import { Body, Observer, SearchRiseSet } from 'astronomy-engine';

export interface LocalSolarTimes {
  readonly sunrise: { readonly instantUtc: string; readonly hour: number; readonly minute: number };
  readonly sunset: { readonly instantUtc: string; readonly hour: number; readonly minute: number };
  readonly model: {
    readonly engineId: 'astronomy-engine';
    readonly engineVersion: '2.1.19';
    readonly standardRefractionArcminutes: 34;
  };
}

const eventInLocalDate = (
  eventDate: Date,
  expectedDate: Temporal.PlainDate,
  timeZoneIana: string,
): { instantUtc: string; hour: number; minute: number } | null => {
  const instant = Temporal.Instant.from(eventDate.toISOString());
  const local = instant.toZonedDateTimeISO(timeZoneIana);
  if (!local.toPlainDate().equals(expectedDate)) return null;
  return { instantUtc: instant.toString(), hour: local.hour, minute: local.minute };
};

export function calculateLocalSolarTimes(input: {
  readonly date: string;
  readonly timeZoneIana: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly elevationMeters: number | null;
}): LocalSolarTimes | null {
  const plainDate = Temporal.PlainDate.from(input.date);
  const localStart = Temporal.ZonedDateTime.from(
    {
      timeZone: input.timeZoneIana,
      year: plainDate.year,
      month: plainDate.month,
      day: plainDate.day,
      hour: 0,
      minute: 0,
    },
    { disambiguation: 'compatible' },
  );
  const observer = new Observer(input.latitudeDeg, input.longitudeDeg, Math.max(-500, input.elevationMeters ?? 0));
  const startDate = new Date(localStart.toInstant().epochMilliseconds);
  const sunriseEvent = SearchRiseSet(Body.Sun, observer, 1, startDate, 1.5);
  const sunsetEvent = SearchRiseSet(Body.Sun, observer, -1, startDate, 1.5);
  if (!sunriseEvent || !sunsetEvent) return null;
  const sunrise = eventInLocalDate(sunriseEvent.date, plainDate, input.timeZoneIana);
  const sunset = eventInLocalDate(sunsetEvent.date, plainDate, input.timeZoneIana);
  if (!sunrise || !sunset) return null;
  return {
    sunrise,
    sunset,
    model: { engineId: 'astronomy-engine', engineVersion: '2.1.19', standardRefractionArcminutes: 34 },
  };
}
