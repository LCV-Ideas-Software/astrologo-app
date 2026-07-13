import { Star, Sun } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RenderBlocoAstrologico } from './App';

const astrologia = [
  { astro: 'Sol', signo: 'Áries', simbolo: '☉' },
  { astro: 'Lua', signo: 'Câncer', simbolo: '☽' },
];

const umbanda = [
  { posicao: 'Coroa', orixa: 'Oxalá', simbolo: '✨' },
  { posicao: 'Frente', orixa: 'Ogum', simbolo: '⚔️' },
];

describe('apresentação pública dos módulos originais', () => {
  it('usa o mesmo acabamento e as mesmas microinterações dos cards novos', () => {
    const html = renderToStaticMarkup(
      <RenderBlocoAstrologico
        titulo="Módulo I: Astrológico Tropical"
        dadosAstrologia={astrologia}
        dadosUmbanda={umbanda}
        icon={Sun}
        isTropical={true}
        onInfoClick={vi.fn()}
      />,
    );

    expect(html).toContain('rounded-[1.6rem]');
    expect(html).toContain('bg-linear-to-br');
    expect(html).toContain('hover:scale-[1.01]');
    expect(html).toContain('focus-visible:ring-orange-200');
    expect(html).toContain('motion-reduce:transition-none');
    expect(html.match(/tabindex="0"/g)?.length).toBe(4);
  });

  it('preserva o aviso fundamental sem repetir explicações conceituais no card', () => {
    const html = renderToStaticMarkup(
      <RenderBlocoAstrologico
        titulo="Módulo II: Astronômico Constelacional"
        dadosAstrologia={astrologia}
        dadosUmbanda={umbanda}
        icon={Star}
        isTropical={false}
        onInfoClick={vi.fn()}
      />,
    );

    expect(html).toContain('Lei de Pemba');
    expect(html).not.toContain('Entendendo as Horas');
    expect(html).not.toContain('regia o seu minuto exato');
  });
});
