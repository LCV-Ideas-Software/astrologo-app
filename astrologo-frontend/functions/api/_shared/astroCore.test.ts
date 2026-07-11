import { describe, expect, it } from 'vitest';
import {
  calcExpressionNumber,
  getJulianDate,
  getLegacyRoundedTatwaAtMoment,
  isValidDateString,
  isValidTimeString,
  reduceNum,
  toHourMinute,
  wrapDegrees,
} from './astroCore';

describe('astroCore', () => {
  it('valida datas reais e rejeita datas inválidas', () => {
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(isValidDateString('2023-02-29')).toBe(false);
    expect(isValidDateString('2024-13-10')).toBe(false);
  });

  it('valida horário 24h corretamente', () => {
    expect(isValidTimeString('00:00')).toBe(true);
    expect(isValidTimeString('23:59')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('12:60')).toBe(false);
  });

  it('normaliza hora/minuto com fallback seguro', () => {
    expect(toHourMinute('06:05', 1, 2)).toEqual([6, 5]);
    expect(toHourMinute('texto', 1, 2)).toEqual([1, 2]);
  });

  it('faz wrap de graus no intervalo 0-360', () => {
    expect(wrapDegrees(370)).toBe(10);
    expect(wrapDegrees(-10)).toBe(350);
  });

  it('reduz números segundo numerologia do app', () => {
    expect(reduceNum('1990-10-25')).toBe(9);
    expect(reduceNum(38)).toBe(11);
  });

  it('calcula número de expressão ignorando acentos e símbolos', () => {
    expect(calcExpressionNumber('João da Silva')).toBeGreaterThanOrEqual(1);
    expect(calcExpressionNumber('João da Silva')).toBeLessThanOrEqual(33);
    expect(calcExpressionNumber('João da Silva')).toBe(calcExpressionNumber('Joao da Silva'));
  });

  it('calcula data juliana de forma determinística', () => {
    expect(getJulianDate(2000, 1, 1, 12, 0)).toBe(2451545);
  });

  it('calcula Vayu-Akasha para 16:45 com nascer do sol 06:00', () => {
    const tatwa = getLegacyRoundedTatwaAtMoment(16, 45, 6, 0);
    expect(tatwa.principal).toBe('Vayu (Ar)');
    expect(tatwa.sub).toBe('Akasha (Éter)');
  });
});
