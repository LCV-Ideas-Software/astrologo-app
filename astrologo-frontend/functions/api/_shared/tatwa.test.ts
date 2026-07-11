import { describe, expect, it } from 'vitest';
import { computeWesternTatwa } from './tatwa';

const epochSecond = (iso: string): number => Math.floor(Date.parse(iso) / 1000);

describe('ciclo ocidental dos Tatwas em segundos inteiros', () => {
  const caseABirth = epochSecond('1993-05-21T00:12:00Z');
  const caseASunrise = epochSecond('1993-05-20T09:20:43.155Z');
  const caseBBirth = epochSecond('1979-03-26T19:45:00Z');
  const caseBSunrise = epochSecond('1979-03-26T08:56:16.261Z');
  const wrongRioSunriseForCaseB = epochSecond('1979-03-26T08:58:24.754Z');

  it('usa a ordem fixa como padrão nos dois casos reais de regressão', () => {
    const caseA = computeWesternTatwa(caseABirth, caseASunrise);
    const caseB = computeWesternTatwa(caseBBirth, caseBSunrise);

    expect(caseA).toMatchObject({
      subOrder: 'fixed',
      principal: 'Tejas (Fogo)',
      sub: 'Akasha (Éter)',
      elapsedSec: 53_477,
      cyclePositionSec: 3_077,
      mainPositionSec: 197,
      mainBoundaryMarginSec: 197,
      nearMainBoundary: true,
    });
    expect(caseB).toMatchObject({
      subOrder: 'fixed',
      principal: 'Tejas (Fogo)',
      sub: 'Akasha (Éter)',
      elapsedSec: 38_924,
      cyclePositionSec: 2_924,
      mainPositionSec: 44,
      mainBoundaryMarginSec: 44,
      nearMainBoundary: true,
      adjacentMain: { relation: 'previous', principal: 'Vayu (Ar)', sub: 'Prithvi (Terra)' },
    });
  });

  it('documenta a regressão causada pelas coordenadas erradas da capital', () => {
    const wrongCity = computeWesternTatwa(caseBBirth, wrongRioSunriseForCaseB);

    expect(wrongCity).toMatchObject({
      principal: 'Vayu (Ar)',
      sub: 'Prithvi (Terra)',
      cyclePositionSec: 2_796,
      mainPositionSec: 1_356,
      mainBoundaryMarginSec: 84,
      adjacentMain: { relation: 'next', principal: 'Tejas (Fogo)', sub: 'Akasha (Éter)' },
    });
    expect(computeWesternTatwa(caseBBirth, wrongRioSunriseForCaseB, { subOrder: 'rulingFirst' })).toMatchObject({
      principal: 'Vayu (Ar)',
      sub: 'Akasha (Éter)',
    });
  });

  it('mantém disponível a ordem pelo Tatwa principal para reproduzir o legado', () => {
    expect(computeWesternTatwa(caseABirth, caseASunrise, { subOrder: 'rulingFirst' })).toMatchObject({
      subOrder: 'rulingFirst',
      principal: 'Tejas (Fogo)',
      sub: 'Tejas (Fogo)',
    });
    expect(computeWesternTatwa(caseBBirth, caseBSunrise, { subOrder: 'rulingFirst' })).toMatchObject({
      subOrder: 'rulingFirst',
      principal: 'Tejas (Fogo)',
      sub: 'Tejas (Fogo)',
    });
  });

  it('usa intervalos semiabertos nas fronteiras exatas', () => {
    expect(computeWesternTatwa(288, 0)).toMatchObject({ principal: 'Akasha (Éter)', sub: 'Vayu (Ar)' });
    expect(computeWesternTatwa(1_440, 0)).toMatchObject({ principal: 'Vayu (Ar)', sub: 'Akasha (Éter)' });
  });

  it('recusa um nascer posterior ao nascimento em vez de mascarar a data errada', () => {
    expect(() => computeWesternTatwa(999, 1_000)).toThrow(RangeError);
  });
});
