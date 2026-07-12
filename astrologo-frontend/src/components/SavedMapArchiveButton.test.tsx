import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SavedMapArchiveButton } from './SavedMapArchiveButton';

describe('botão acessível do Arquivo Akáshico', () => {
  it('usa um botão nativo e anuncia em pt-BR a reidratação em andamento', () => {
    const html = renderToStaticMarkup(
      <SavedMapArchiveButton
        consultantName="Leonardo Cardozo Vargas"
        birthLabel="26/03/1979 às 16:45:00 — Hora oficial de Brasília"
        rehydrating
        onOpen={vi.fn()}
      />,
    );

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Abrir mapa salvo de Leonardo Cardozo Vargas');
    expect(html).toContain('Restaurando dados avançados…');
    expect(html).toContain('role="status"');
  });
});
