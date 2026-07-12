import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LocalityMapV1 } from '../localityMapV1';
import { LocalityWorldMap } from './LocalityWorldMap';

const map = {
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
} as unknown as LocalityMapV1;

describe('mapa-múndi de localidade', () => {
  it('renderiza Natural Earth, linhas acessíveis e atribuição', () => {
    const html = renderToStaticMarkup(<LocalityWorldMap data={map} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('Mapa-múndi com linhas planetárias de localidade');
    expect(html).toContain('data-world-land="natural-earth-110m"');
    expect(html).toContain('data-locality-line="sun:mc"');
    expect(html).toContain('Sol · Meio do Céu');
    expect(html).toContain('Natural Earth');
    expect(html).toContain('World Atlas');
  });
});
