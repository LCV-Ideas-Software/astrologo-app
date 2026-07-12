import { describe, expect, it } from 'vitest';
import {
  isNatalChartAnalysisV1,
  type NatalChartAnalysisV1,
  renderNatalChartAnalysisEmailHtml,
  renderNatalChartAnalysisText,
} from './natalAnalysisV1';

const fixture: NatalChartAnalysisV1 = {
  schemaId: 'urn:astrologo:natal-chart-analysis',
  schemaVersion: '1.0.0',
  source: { calculationId: 'mapa-1', calculatedAtUtc: '2026-07-12T15:00:00Z' },
  models: {
    aspects: { profileId: 'astrologo-natal-major-v1', profileVersion: '1.0.0' },
  },
  points: [
    { kind: 'planet', id: 'sun', displayNamePtBr: 'Sol', symbol: '☉', eclipticLongitudeDeg: 10 },
    { kind: 'planet', id: 'moon', displayNamePtBr: 'Lua', symbol: '☽', eclipticLongitudeDeg: 70 },
  ],
  movements: [
    { bodyId: 'sun', status: 'available', velocityDegPerDay: 0.98, direction: 'direct' },
    { bodyId: 'moon', status: 'available', velocityDegPerDay: 13.2, direction: 'direct' },
  ],
  aspects: [
    {
      recordId: 'planet:sun--planet:moon',
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
      occupancy: { status: 'available', houseIndex1: 5 },
      mundaneDegreeWithinHouse: {
        status: 'available',
        rawSwissHousePosition: 5.4,
        degreeWithinHouseDeg: 12,
      },
    },
  ],
  diagnostics: [],
};

describe('apresentação natal completa', () => {
  it('renderiza texto inteiramente em pt-BR com perfil e grau mundano', () => {
    const text = renderNatalChartAnalysisText(fixture);
    expect(text).toContain('ASPECTOS NATAIS E CASAS');
    expect(text).toContain('Sextil — Sol e Lua');
    expect(text).toContain('orbe 0,00°');
    expect(text).toContain('fase exata');
    expect(text).toContain('Sol: Casa 5, grau mundano 12,00°');
    expect(text).toContain('astrologo-natal-major-v1 v1.0.0');
  });

  it('escapa o HTML e preserva a metodologia declarada no e-mail', () => {
    const unsafe = structuredClone(fixture) as NatalChartAnalysisV1;
    (unsafe.points[0] as { displayNamePtBr: string }).displayNamePtBr = '<script>Sol</script>';
    const html = renderNatalChartAnalysisEmailHtml(unsafe);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;Sol&lt;/script&gt;');
    expect(html).toContain('Grau mundano');
    expect(html).toContain('astrologo-natal-major-v1');
  });

  it('rejeita resposta de rede estruturalmente incompleta antes de renderizar', () => {
    expect(isNatalChartAnalysisV1(fixture)).toBe(true);
    expect(isNatalChartAnalysisV1({ ...fixture, source: null })).toBe(false);
    expect(isNatalChartAnalysisV1({ ...fixture, models: null })).toBe(false);
    expect(isNatalChartAnalysisV1({ ...fixture, points: [{ id: 'sun' }] })).toBe(false);
    expect(isNatalChartAnalysisV1({ ...fixture, aspects: [{ recordId: 'quebrado' }] })).toBe(false);
    expect(isNatalChartAnalysisV1({ ...fixture, houseOccupancies: [{ bodyId: 'sun' }] })).toBe(false);
  });
});
