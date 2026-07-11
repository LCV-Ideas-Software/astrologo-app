import { describe, expect, it } from 'vitest';
import { formatBrazilianCivilDate, formatInstantInBrasilia, resolveBirthCivilTime } from './birthTime';

describe('resolução temporal natal por local de nascimento', () => {
  it('converte um horário civil exato usando o offset histórico do local', () => {
    expect(
      resolveBirthCivilTime({
        date: '2000-01-01',
        time: '12:00',
        timeZoneIana: 'America/Sao_Paulo',
      }),
    ).toEqual({
      status: 'resolved',
      timeZoneIana: 'America/Sao_Paulo',
      instantUtc: '2000-01-01T14:00:00Z',
      offsetAtBirth: '-02:00',
      disambiguation: 'exact',
      historicalConfidence: 'certified-1970-plus',
    });
  });

  it('não escolhe silenciosamente entre os dois instantes de um fold de DST', () => {
    const result = resolveBirthCivilTime({
      date: '2018-02-17',
      time: '23:30',
      timeZoneIana: 'America/Sao_Paulo',
    });

    expect(result.status).toBe('ambiguous');
    if (result.status !== 'ambiguous') throw new Error('fixture deveria ser ambígua');
    expect(result.candidates).toEqual([
      { disambiguation: 'earlier', instantUtc: '2018-02-18T01:30:00Z', offsetAtBirth: '-02:00' },
      { disambiguation: 'later', instantUtc: '2018-02-18T02:30:00Z', offsetAtBirth: '-03:00' },
    ]);

    const selected = resolveBirthCivilTime({
      date: '2018-02-17',
      time: '23:30',
      timeZoneIana: 'America/Sao_Paulo',
      disambiguation: 'later',
    });
    expect(selected).toMatchObject({ status: 'resolved', instantUtc: '2018-02-18T02:30:00Z', disambiguation: 'later' });
  });

  it('rejeita horário civil inexistente durante um gap de DST', () => {
    expect(
      resolveBirthCivilTime({
        date: '2018-11-04',
        time: '00:30',
        timeZoneIana: 'America/Sao_Paulo',
      }),
    ).toMatchObject({ status: 'nonexistent', reasonCode: 'LOCAL_TIME_IN_DST_GAP' });
  });

  it('sinaliza 1900–1969 como melhor esforço e bloqueia datas anteriores a 1900', () => {
    expect(resolveBirthCivilTime({ date: '1950-06-01', time: '12:00', timeZoneIana: 'Europe/Lisbon' })).toMatchObject({
      status: 'resolved',
      historicalConfidence: 'best-effort-1900-1969',
    });
    expect(resolveBirthCivilTime({ date: '1899-12-31', time: '12:00', timeZoneIana: 'Europe/Lisbon' })).toEqual({
      status: 'blocked',
      timeZoneIana: 'Europe/Lisbon',
      reasonCode: 'HISTORICAL_TIMEZONE_BEFORE_1900_UNSUPPORTED',
    });
  });
});

describe('apresentação brasileira', () => {
  it('formata todo instante explicitamente na hora oficial de Brasília', () => {
    expect(formatInstantInBrasilia('2026-07-11T03:04:05Z')).toBe('11/07/2026 às 00:04:05');
  });

  it('formata data civil sem convertê-la por timezone', () => {
    expect(formatBrazilianCivilDate('2026-01-02')).toBe('02/01/2026');
  });
});
