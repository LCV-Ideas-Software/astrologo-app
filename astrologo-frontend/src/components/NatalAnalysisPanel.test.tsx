import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DadosPosicionaisV2 } from '../astrologyV2';
import type { NatalChartAnalysisV1 } from '../natalAnalysisV1';
import { NatalAnalysisPanel } from './NatalAnalysisPanel';

const positional = {
  houses: {
    status: 'available',
    cusps: Array.from({ length: 12 }, (_, index0) => ({
      houseIndex1: index0 + 1,
      eclipticLongitudeDeg: index0 * 30,
      tropical: { signId: 'aries', signNamePtBr: 'Áries', degreeWithinSignDeg: 0 },
    })),
  },
  angles: [
    { angleId: 'ascendant', eclipticLongitudeDeg: 0 },
    { angleId: 'midheaven', eclipticLongitudeDeg: 270 },
  ],
  positions: [
    {
      bodyId: 'sun',
      displayNamePtBr: 'Sol',
      symbol: '☉',
      coordinates: { eclipticLongitudeDeg: 10, eclipticLatitudeDeg: 0 },
    },
    {
      bodyId: 'moon',
      displayNamePtBr: 'Lua',
      symbol: '☽',
      coordinates: { eclipticLongitudeDeg: 70, eclipticLatitudeDeg: 0 },
    },
  ],
} as unknown as DadosPosicionaisV2;

const analysis = {
  schemaId: 'urn:astrologo:natal-chart-analysis',
  schemaVersion: '1.0.0',
  source: { calculationId: 'mapa-1', calculatedAtUtc: '2026-07-12T15:00:00Z' },
  models: { aspects: { profileId: 'astrologo-natal-major-v1', profileVersion: '1.0.0' } },
  points: [
    { kind: 'planet', id: 'sun', displayNamePtBr: 'Sol', symbol: '☉', eclipticLongitudeDeg: 10 },
    { kind: 'planet', id: 'moon', displayNamePtBr: 'Lua', symbol: '☽', eclipticLongitudeDeg: 70 },
  ],
  movements: [],
  aspects: [
    {
      recordId: 'sun-moon',
      pointA: { kind: 'planet', id: 'sun' },
      pointB: { kind: 'planet', id: 'moon' },
      aspectId: 'sextile',
      displayNamePtBr: 'Sextil',
      separationDeg: 60,
      exactAngleDeg: 60,
      allowedOrbDeg: 4,
      orbDeg: 0,
      intensityPercent: 100,
      phase: { status: 'available', phase: 'exact' },
    },
  ],
  houseOccupancies: [
    {
      bodyId: 'sun',
      occupancy: { status: 'available', houseIndex1: 1 },
      mundaneDegreeWithinHouse: { status: 'available', rawSwissHousePosition: 1.25, degreeWithinHouseDeg: 7.5 },
    },
    {
      bodyId: 'moon',
      occupancy: { status: 'available', houseIndex1: 3 },
      mundaneDegreeWithinHouse: { status: 'unavailable' },
    },
  ],
  diagnostics: [],
} as NatalChartAnalysisV1;

describe('painel natal completo', () => {
  it('mantém três cards leigos, coloridos e com Saiba Mais', () => {
    const html = renderToStaticMarkup(
      <NatalAnalysisPanel positional={positional} analysis={analysis} openInfoModal={vi.fn()} />,
    );

    expect(html).toContain('Roda do Mapa Natal');
    expect(html).toContain('Aspectos Natais');
    expect(html).toContain('Análise das Casas');
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain('Sextil');
    expect(html).toContain('100,00%');
    expect(html).toContain('Casa 1');
    expect(html).toContain('grau mundano 7,50°');
    expect(html).toContain('Identidade, iniciativa e maneira de se apresentar');
    expect(html).toContain('indisponível no registro');
  });
});
