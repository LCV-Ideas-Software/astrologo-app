import { describe, expect, it } from 'vitest';
import { calculateLocalSolarTimes } from './solarTimes';

describe('nascer e pôr do Sol no horário civil do local natal', () => {
  it('calcula os eventos sem assumir timezone de Brasília para outro local', () => {
    const result = calculateLocalSolarTimes({
      date: '2026-07-11',
      timeZoneIana: 'Europe/Lisbon',
      latitudeDeg: 38.7223,
      longitudeDeg: -9.1393,
      elevationMeters: 2,
    });

    expect(result).not.toBeNull();
    expect(result?.sunrise.hour).toBe(6);
    expect(result?.sunset.hour).toBe(21);
    expect(result?.model.standardRefractionArcminutes).toBe(34);
  });

  it('retorna indisponível em vez de inventar 06:00/18:00 quando não há eventos no dia polar', () => {
    expect(
      calculateLocalSolarTimes({
        date: '2026-06-21',
        timeZoneIana: 'Arctic/Longyearbyen',
        latitudeDeg: 78.2232,
        longitudeDeg: 15.6469,
        elevationMeters: 28,
      }),
    ).toBeNull();
  });
});
