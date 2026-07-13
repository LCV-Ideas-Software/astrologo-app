import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NatalChartWheel } from './NatalChartWheel';

describe('Roda do mapa natal', () => {
  it('renderiza uma visualização interativa, acessível e em pt-BR', () => {
    const html = renderToStaticMarkup(
      <NatalChartWheel
        ascendantLongitudeDeg={12}
        midheavenLongitudeDeg={282}
        houseCusps={Array.from({ length: 12 }, (_, index) => (12 + index * 30) % 360)}
        planets={[
          {
            id: 'sun',
            displayNamePtBr: 'Sol',
            symbol: '☉',
            longitudeDeg: 42,
            color: '#f59e0b',
            tropicalSignNamePtBr: 'Touro',
            degreeWithinSignDeg: 12,
            houseIndex1: 2,
            directionPtBr: 'direto',
            astronomicalConstellationPtBr: 'Áries',
            angelName: 'Aladiah',
          },
          { id: 'moon', displayNamePtBr: 'Lua', symbol: '☽', longitudeDeg: 222, color: '#60a5fa' },
        ]}
        aspects={[
          { leftId: 'sun', rightId: 'moon', aspectId: 'opposition', orbDeg: 0.3 },
          { leftId: 'sun', rightId: 'ascendant', aspectId: 'square', orbDeg: 1.2 },
        ]}
      />,
    );

    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('Roda natal tropical com Casas Placidus, planetas e aspectos interativos');
    expect(html.match(/data-house-line=/g)).toHaveLength(12);
    expect(html).toContain('aria-label="Sol a 12,00 graus de Touro, Casa 2"');
    expect(html).toContain('Oposição entre Sol e Lua, orbe de 0,30 grau');
    expect(html).toContain('Quadratura entre Sol e Ascendente, orbe de 1,20 grau');
    expect(html).toContain('stroke="transparent" stroke-width="18"');
    expect(html).toContain(
      'A roda usa os 12 signos tropicais para a escala circular. As constelações oficiais da IAU são regiões bidimensionais do céu e, por isso, não são transformadas artificialmente em 13 setores iguais.',
    );
    expect(html).toContain('Passe o cursor sobre um elemento ou use Tab e as setas');
    expect(html).toContain('text-white md:text-sm');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-label="Explorar elementos da roda natal"');
  });

  it('gera identificadores SVG isolados para duas rodas na mesma tela', () => {
    const wheel = (ascendantLongitudeDeg: number) => (
      <NatalChartWheel
        ascendantLongitudeDeg={ascendantLongitudeDeg}
        houseCusps={Array.from({ length: 12 }, (_, index) => (ascendantLongitudeDeg + index * 30) % 360)}
        planets={[{ id: 'sun', displayNamePtBr: 'Sol', symbol: '☉', longitudeDeg: 42, color: '#f59e0b' }]}
      />
    );
    const html = renderToStaticMarkup(
      <div>
        {wheel(12)}
        {wheel(24)}
      </div>,
    );
    const gradientIds = [...html.matchAll(/id="([^"]+-natal-wheel-core)"/g)].map((match) => match[1]);
    const glowIds = [...html.matchAll(/id="([^"]+-natal-wheel-glow)"/g)].map((match) => match[1]);

    expect(gradientIds).toHaveLength(2);
    expect(new Set(gradientIds).size).toBe(2);
    expect(glowIds).toHaveLength(2);
    expect(new Set(glowIds).size).toBe(2);
    expect(html).not.toContain('id="natal-wheel-core"');
  });
});
