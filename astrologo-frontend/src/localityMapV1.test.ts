import { describe, expect, it } from 'vitest';
import type { LocalityMapV1 } from './localityMapV1';
import { isLocalityMapV1, renderLocalityMapEmailHtml, renderLocalityMapText } from './localityMapV1';

const map = {
  schemaId: 'urn:astrologo:locality-map',
  schemaVersion: '1.0.0',
  source: { birthInstantUtc: '1979-03-26T19:45:00.000Z' },
  models: {
    sourceCoordinates: {
      sourceFrame: 'geocentric-apparent-eqj-j2000',
      workingFrame: 'geocentric-apparent-true-equator-of-date-eqd',
      transformation: { methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1' },
    },
    siderealTime: { kind: 'greenwich-apparent-sidereal-time', hours: 7.5 },
    geometry: { altitudeReferenceDeg: 0, refractionModel: 'none' },
    sampling: { latitudeResolutionDeg: 1 },
  },
  bodies: [],
  lines: [
    {
      recordId: 'sun:mc',
      bodyId: 'sun',
      bodyDisplayNamePtBr: 'Sol',
      bodySymbol: '☉',
      angleId: 'mc',
      angleDisplayNamePtBr: 'Meio do Céu',
      availability: { status: 'available', sampledLatitudeCount: 179, solvedLatitudeCount: 179 },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [-43, -89],
            [-43, 89],
          ],
        ],
      },
    },
  ],
  diagnostics: [],
} as unknown as LocalityMapV1;

describe('apresentação do mapa de localidade', () => {
  it('apresenta linhas e instante natal em pt-BR sem detalhes internos', () => {
    const text = renderLocalityMapText(map);
    expect(text).toContain('MAPA PLANETÁRIO DE LOCALIDADE');
    expect(text).toContain('26/03/1979 às 16:45:00');
    expect(text).toContain('Sol — Meio do Céu');
    expect(text).not.toContain('EQJ/J2000');
    expect(text).not.toContain('sem refração');
    expect(text).not.toContain('Resolução latitudinal');
  });

  it('gera e-mail com cautela cartográfica', () => {
    const html = renderLocalityMapEmailHtml(map);
    expect(html).toContain('Mapa Planetário de Localidade');
    expect(html).toContain('Hora oficial de Brasília');
    expect(html).toContain('não recomenda mudança');
    expect(html).not.toContain('EQJ/J2000');
    expect(html).not.toContain('sem refração');
  });

  it('rejeita resposta de rede estruturalmente incompleta antes de desenhar', () => {
    expect(isLocalityMapV1(map)).toBe(true);
    expect(isLocalityMapV1({ ...map, source: null })).toBe(false);
    expect(isLocalityMapV1({ ...map, models: { sampling: {} } })).toBe(false);
    expect(isLocalityMapV1({ ...map, lines: [{ recordId: 'quebrado' }] })).toBe(false);
  });
});
