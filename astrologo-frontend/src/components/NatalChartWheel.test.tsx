import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NatalChartWheel } from './NatalChartWheel';

describe('Roda do mapa natal', () => {
  it('renderiza uma visualização acessível, em pt-BR e com alternativa textual', () => {
    const html = renderToStaticMarkup(
      <NatalChartWheel
        ascendantLongitudeDeg={12}
        houseCusps={Array.from({ length: 12 }, (_, index) => (12 + index * 30) % 360)}
        planets={[
          { id: 'sun', displayNamePtBr: 'Sol', symbol: '☉', longitudeDeg: 42, color: '#f59e0b' },
          { id: 'moon', displayNamePtBr: 'Lua', symbol: '☽', longitudeDeg: 222, color: '#60a5fa' },
        ]}
        aspects={[
          { leftId: 'sun', rightId: 'moon', aspectId: 'opposition', orbDeg: 0.3 },
          { leftId: 'sun', rightId: 'ascendant', aspectId: 'square', orbDeg: 1.2 },
        ]}
      />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('Roda natal tropical com Casas Placidus, planetas e aspectos');
    expect(html.match(/data-house-line=/g)).toHaveLength(12);
    expect(html).toContain('aria-label="Sol a 42,00 graus"');
    expect(html).toContain('Oposição entre Sol e Lua, orbe de 0,30 grau');
    expect(html).toContain('Quadratura entre Sol e Ascendente, orbe de 1,20 grau');
    expect(html).toContain('A roda usa os 12 signos tropicais');
  });
});
