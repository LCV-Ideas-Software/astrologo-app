import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./swiss_eph.wasm', async () => {
  const bytes = new Uint8Array(await readFile(new URL('./swiss_eph.wasm', import.meta.url)));
  return { default: new WebAssembly.Module(bytes) };
});

import { swissEphemeris } from './swissRuntime';

describe('runtime edge da Swiss Ephemeris fornecida pela dependência fixada', () => {
  it('restringe os imports do módulo a funções WASI preview1', async () => {
    const bytes = new Uint8Array(await readFile(new URL('./swiss_eph.wasm', import.meta.url)));
    const imports = WebAssembly.Module.imports(new WebAssembly.Module(bytes));

    expect(bytes.byteLength).toBe(1_275_365);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c',
    );
    expect([...new Set(imports.map((entry) => entry.module))]).toEqual(['wasi_snapshot_preview1']);
    expect([...new Set(imports.map((entry) => entry.kind))]).toEqual(['function']);
  });

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
