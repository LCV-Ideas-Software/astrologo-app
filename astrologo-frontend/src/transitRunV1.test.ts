import { describe, expect, it } from 'vitest';
import type { TransitRunV1 } from './transitRunV1';
import { isTransitRunV1, renderTransitRunEmailHtml, renderTransitRunText } from './transitRunV1';

const fixture = {
  schemaId: 'urn:astrologo:transit-run',
  schemaVersion: '1.0.0',
  request: {
    referenceInstantUtc: '2026-07-12T15:00:00.000Z',
    phaseProbeInstantUtc: '2026-07-12T21:00:00.000Z',
    horizonDays: 7,
    horizonEndInstantUtc: '2026-07-19T15:00:00.000Z',
  },
  models: { aspects: { profileId: 'astrologo-transit-major-v1', profileVersion: '1.0.0' } },
  presentationPolicy: { timeZone: 'America/Sao_Paulo', timeZoneLabel: 'Hora oficial de Brasília' },
  positionsAtReference: [
    {
      bodyId: 'sun',
      displayNamePtBr: 'Sol',
      symbol: '☉',
      eclipticLongitudeDeg: 110,
      tropical: { signId: 'cancer', signNamePtBr: 'Câncer', degreeWithinSignDeg: 20 },
      astronomicalReal: {
        status: 'available',
        coordinates: { rightAscensionHours: 7.5, declinationDeg: 22.1, referenceFrame: 'equatorial-j2000' },
        constellation: { iauCode: 'Gem', latinName: 'Gemini', namePtBr: 'Gêmeos' },
        degreeWithinConstellation: {
          status: 'not-defined',
          reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
        },
      },
      natalHousePlacement: { status: 'available', houseIndex1: 8 },
    },
  ],
  natalTargets: [{ status: 'available', kind: 'planet', pointId: 'moon', displayNamePtBr: 'Lua' }],
  aspects: [
    {
      recordId: 'sun-moon',
      transitPoint: { bodyId: 'sun', eclipticLongitudeDeg: 110 },
      natalPoint: { kind: 'planet', pointId: 'moon', eclipticLongitudeDeg: 20 },
      aspectId: 'square',
      displayNamePtBr: 'Quadratura',
      separationDeg: 90,
      exactAngleDeg: 90,
      allowedOrbDeg: 2,
      orbDeg: 0,
      phase: { status: 'available', phase: 'exact' },
      exactitude: { status: 'available', exactAtUtc: '2026-07-12T15:00:00.000Z' },
    },
  ],
  diagnostics: [],
} as unknown as TransitRunV1;

describe('apresentação do céu atual', () => {
  it('usa pt-BR e converte todos os instantes para Brasília', () => {
    const text = renderTransitRunText(fixture);
    expect(text).toContain('CÉU ATUAL E TRÂNSITOS');
    expect(text).toContain('12/07/2026 às 12:00:00');
    expect(text).toContain('Quadratura — Sol em trânsito e Lua natal');
    expect(text).toContain('fase exata');
    expect(text).toContain('Aperfeiçoamento: 12/07/2026 às 12:00:00');
    expect(text).toContain('constelação Gêmeos');
    expect(text).not.toContain('astrologo-transit-major-v1');
    expect(text).not.toContain('sem grau interno definido');
  });

  it('gera HTML de e-mail sem abandonar a rotulagem brasileira', () => {
    const html = renderTransitRunEmailHtml(fixture);
    expect(html).toContain('Céu Atual e Trânsitos');
    expect(html).toContain('Hora oficial de Brasília');
    expect(html).toContain('Câncer');
    expect(html).toContain('Casa natal 8');
    expect(html).toContain('Constelação: Gêmeos');
    expect(html).not.toContain('astrologo-transit-major-v1');
    expect(html).not.toContain('sem grau interno definido');
  });

  it('rejeita resposta de rede estruturalmente incompleta antes de renderizar', () => {
    expect(isTransitRunV1(fixture)).toBe(true);
    expect(isTransitRunV1({ ...fixture, request: null })).toBe(false);
    expect(isTransitRunV1({ ...fixture, models: null })).toBe(false);
    expect(isTransitRunV1({ ...fixture, natalTargets: null })).toBe(false);
    expect(isTransitRunV1({ ...fixture, positionsAtReference: [{ bodyId: 'sun' }] })).toBe(false);
    expect(isTransitRunV1({ ...fixture, aspects: [{ recordId: 'quebrado' }] })).toBe(false);
  });
});
