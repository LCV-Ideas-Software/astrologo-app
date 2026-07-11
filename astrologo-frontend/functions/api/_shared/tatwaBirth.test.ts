import { describe, expect, it, vi } from 'vitest';
import type { LocalSolarTimes } from './solarTimes';
import { calculateWesternTatwaAtBirth } from './tatwaBirth';
import { validateWesternTatwaBirthResult } from './tatwaSchema';

const solarFixture = (sunriseInstantUtc: string): LocalSolarTimes => ({
  sunrise: { instantUtc: sunriseInstantUtc, hour: 6, minute: 0 },
  sunset: { instantUtc: sunriseInstantUtc, hour: 18, minute: 0 },
  model: { engineId: 'astronomy-engine', engineVersion: '2.1.19', standardRefractionArcminutes: 34 },
});

const provenance = (
  birthCivilLocal: string,
  birthOffset: string,
  birthTimeDisambiguation: 'exact' | 'earlier' | 'later' = 'exact',
) => ({
  birthCivilLocal,
  birthOffset,
  birthTimeDisambiguation,
  historicalTimeConfidence: 'certified-1970-plus' as const,
  placeProviderResultId: 1,
  calculatedAtUtc: '2026-07-11T12:00:00Z',
});

describe('âncora natal do cálculo ocidental dos Tatwas', () => {
  it('reproduz os casos reais com o nascer exato e a ordem fixa', () => {
    const caseA = calculateWesternTatwaAtBirth({
      date: '1993-05-20',
      birthInstantUtc: '1993-05-21T00:12:00Z',
      ...provenance('1993-05-20T21:12:00', '-03:00'),
      timeZoneIana: 'America/Sao_Paulo',
      latitudeDeg: -22.90642,
      longitudeDeg: -43.18223,
      elevationMeters: 12,
    });
    const caseB = calculateWesternTatwaAtBirth({
      date: '1979-03-26',
      birthInstantUtc: '1979-03-26T19:45:00Z',
      ...provenance('1979-03-26T16:45:00', '-03:00'),
      timeZoneIana: 'America/Sao_Paulo',
      latitudeDeg: -22.4625,
      longitudeDeg: -42.65306,
      elevationMeters: 63,
    });

    expect(caseA).toMatchObject({
      calculationMode: 'fixed',
      principal: 'Tejas (Fogo)',
      sub: 'Akasha (Éter)',
      variants: {
        fixed: { principal: 'Tejas (Fogo)', sub: 'Akasha (Éter)' },
        'legacy-rulingFirst': { principal: 'Tejas (Fogo)', sub: 'Tejas (Fogo)' },
      },
      anchor: { sunriseLocalDate: '1993-05-20', timeZoneIana: 'America/Sao_Paulo' },
    });
    expect(caseB).toMatchObject({
      principal: 'Tejas (Fogo)',
      sub: 'Akasha (Éter)',
      nearMainBoundary: true,
      anchor: { sunriseLocalDate: '1979-03-26', timeZoneIana: 'America/Sao_Paulo' },
    });
  });

  it('usa o nascer do dia anterior para nascimento pré-alvorada', () => {
    const calculateSolarTimes = vi.fn((input: { date: string }) =>
      input.date === '2026-01-02' ? solarFixture('2026-01-02T06:00:00Z') : solarFixture('2026-01-01T05:59:00Z'),
    );
    const result = calculateWesternTatwaAtBirth(
      {
        date: '2026-01-02',
        birthInstantUtc: '2026-01-02T04:00:00Z',
        ...provenance('2026-01-02T04:00:00', '+00:00'),
        timeZoneIana: 'UTC',
        latitudeDeg: 0,
        longitudeDeg: 0,
        elevationMeters: 0,
      },
      calculateSolarTimes,
    );

    expect(calculateSolarTimes).toHaveBeenCalledTimes(2);
    expect(result?.anchor.sunriseLocalDate).toBe('2026-01-01');
    expect(result?.anchor.sunriseInstantUtc).toBe('2026-01-01T05:59:00Z');
  });

  it('compara os instantes completos antes de quantizar segundos na fronteira da alvorada', () => {
    const calculateSolarTimes = vi.fn((input: { date: string }) =>
      input.date === '2026-01-02' ? solarFixture('2026-01-02T04:00:00.500Z') : solarFixture('2026-01-01T04:00:00.500Z'),
    );
    const result = calculateWesternTatwaAtBirth(
      {
        date: '2026-01-02',
        birthInstantUtc: '2026-01-02T04:00:00.000Z',
        ...provenance('2026-01-02T04:00:00', '+00:00'),
        timeZoneIana: 'UTC',
        latitudeDeg: 0,
        longitudeDeg: 0,
        elevationMeters: 0,
      },
      calculateSolarTimes,
    );

    expect(calculateSolarTimes).toHaveBeenCalledTimes(2);
    expect(result?.anchor.sunriseLocalDate).toBe('2026-01-01');
  });

  it('respeita o instante UTC escolhido em um horário civil repetido', () => {
    const common = {
      date: '2018-02-17',
      timeZoneIana: 'America/Sao_Paulo',
      latitudeDeg: -23.5505,
      longitudeDeg: -46.6333,
      elevationMeters: 760,
      ...provenance('2018-02-17T23:30:00', '-02:00', 'earlier'),
    } as const;
    const earlier = calculateWesternTatwaAtBirth({ ...common, birthInstantUtc: '2018-02-18T01:30:00Z' });
    const later = calculateWesternTatwaAtBirth({
      ...common,
      birthInstantUtc: '2018-02-18T02:30:00Z',
      birthOffset: '-03:00',
      birthTimeDisambiguation: 'later',
    });

    expect(earlier).toMatchObject({
      principal: 'Vayu (Ar)',
      sub: 'Tejas (Fogo)',
      anchor: {
        birthInstantUtc: '2018-02-18T01:30:00Z',
        birthOffset: '-02:00',
        birthTimeDisambiguation: 'earlier',
      },
    });
    expect(later).toMatchObject({
      principal: 'Apas (Água)',
      sub: 'Prithvi (Terra)',
      anchor: {
        birthInstantUtc: '2018-02-18T02:30:00Z',
        birthOffset: '-03:00',
        birthTimeDisambiguation: 'later',
      },
    });
    expect(validateWesternTatwaBirthResult(earlier)).toEqual({ valid: true, errors: [] });
    expect(validateWesternTatwaBirthResult(later)).toEqual({ valid: true, errors: [] });
  });

  it.each([
    [null, 0],
    [-800, -500],
  ] as const)('registra a elevação de entrada %s e a elevação efetiva %s', (elevationMeters, expectedEffective) => {
    const result = calculateWesternTatwaAtBirth(
      {
        date: '2026-01-02',
        birthInstantUtc: '2026-01-02T12:00:00Z',
        ...provenance('2026-01-02T12:00:00', '+00:00'),
        timeZoneIana: 'UTC',
        latitudeDeg: 0,
        longitudeDeg: 0,
        elevationMeters,
      },
      () => solarFixture('2026-01-02T06:00:00Z'),
    );

    expect(result?.anchor).toMatchObject({
      elevationInputMeters: elevationMeters,
      elevationMeters: expectedEffective,
      sunriseRelation: 'same-civil-date',
    });
  });
});
