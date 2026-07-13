import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LocalityMapV1 } from '../localityMapV1';
import { LocalityPanel } from './LocalityPanel';

const data = {
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

describe('painel de localidade', () => {
  it('combina mapa, Brasília e Saiba Mais sem expor detalhes tecnológicos', () => {
    const html = renderToStaticMarkup(
      <LocalityPanel mapaId="mapa-1" data={data} onDataChange={vi.fn()} openInfoModal={vi.fn()} notify={vi.fn()} />,
    );
    expect(html).toContain('Mapa Planetário de Localidade');
    expect(html).toContain('Gerar mapa de localidade');
    expect(html).toContain('Saiba mais');
    expect(html).toContain('26/03/1979 às 16:45:00');
    expect(html).toContain('Hora oficial de Brasília');
    expect(html).toContain('Detalhamento');
    expect(html).toContain('Muito alto');
    expect(html).not.toContain('EQJ/J2000');
    expect(html).not.toContain('EQD verdadeiro da data');
    expect(html).not.toContain('Natural Earth');
    expect(html).not.toContain('resolução latitudinal');
    expect(html).toContain('não recomenda mudança');
  });
});
