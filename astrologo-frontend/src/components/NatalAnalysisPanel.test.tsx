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
      tropical: { sign: { id: 'aries', namePtBr: 'Áries' }, degreeWithinSignDeg: 10, decan: { index1: 1 } },
      astronomicalReal: {
        status: 'available',
        constellation: { iauCode: 'Psc', latinName: 'Pisces', namePtBr: 'Peixes' },
      },
      housePlacement: { status: 'available', houseIndex1: 1 },
      angelicQuinary: {
        basisSystem: 'tropical',
        quinary: { index1: 3, globalStartLongitudeDeg: 10, globalEndLongitudeDegExclusive: 15 },
        angel: {
          id: 3,
          canonicalName: 'Sitael',
          aliases: [],
          hebrewTriplet: 'SIT',
          choir: 'Serafins',
          prince: 'Metraton',
          qualitySummaryPtBr: 'Construção',
          sourcePermalink: 'https://example.com',
        },
      },
    },
    {
      bodyId: 'moon',
      displayNamePtBr: 'Lua',
      symbol: '☽',
      coordinates: { eclipticLongitudeDeg: 70, eclipticLatitudeDeg: 0 },
      tropical: { sign: { id: 'gemini', namePtBr: 'Gêmeos' }, degreeWithinSignDeg: 10, decan: { index1: 1 } },
      astronomicalReal: { status: 'unavailable' },
      housePlacement: { status: 'available', houseIndex1: 3 },
      angelicQuinary: {
        basisSystem: 'tropical',
        quinary: { index1: 15, globalStartLongitudeDeg: 70, globalEndLongitudeDegExclusive: 75 },
        angel: {
          id: 15,
          canonicalName: 'Hariel',
          aliases: [],
          hebrewTriplet: 'HRI',
          choir: 'Querubins',
          prince: 'Raziel',
          qualitySummaryPtBr: 'Clareza',
          sourcePermalink: 'https://example.com',
        },
      },
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
    expect(html.match(/aria-label="Saiba mais/g)).toHaveLength(3);
    expect(html).toContain('Sextil');
    expect(html).toContain('100,00%');
    expect(html).toContain('Casa 1');
    expect(html).toContain('grau mundano 7,50°');
    expect(html).toContain('Identidade, iniciativa e maneira de se apresentar');
    expect(html).toContain('posição dentro da casa indisponível');
    expect(html).not.toContain('profileId');
    expect(html).not.toContain('astrologo-natal-major-v1');
    expect(html).not.toContain('hpos Swiss');
    expect(html).not.toContain('swe_house_pos');
    expect(html).not.toContain('conjunto canônico');
    expect(html).toContain('focus-visible:ring-rose-200');
    expect(html).toContain('focus-visible:ring-emerald-200');
    expect(html).toContain('motion-reduce:transition-none');
  });
});
