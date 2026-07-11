import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./swiss_eph.wasm', async () => {
  const bytes = new Uint8Array(await readFile(new URL('./swiss_eph.wasm', import.meta.url)));
  return { default: new WebAssembly.Module(bytes) };
});

import { swissEphemeris } from './swissRuntime';

describe('runtime edge da Swiss Ephemeris vendorizada', () => {
  it('inicializa o contrato WASI e calcula o fixture Placidus conhecido', () => {
    const julianDayUt = 2_448_027.229_166_666_5;
    const houses = swissEphemeris.swe_houses(julianDayUt, -22.90642, -43.18223, 'P'.charCodeAt(0));
    const nutation = swissEphemeris.swe_calc_ut(julianDayUt, -1, 4);

    expect(swissEphemeris.swe_version()).toBe('2.10.03');
    expect(houses.returnCode).toBeGreaterThanOrEqual(0);
    expect(houses.ascmc[0]).toBeCloseTo(183.33501482752527, 9);
    expect(houses.ascmc[1]).toBeCloseTo(92.29373797611643, 9);
    expect(nutation.returnCode).toBeGreaterThanOrEqual(0);
    expect(nutation.xx[0]).toBeGreaterThan(20);
  });
});
