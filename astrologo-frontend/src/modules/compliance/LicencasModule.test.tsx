import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LicencasModule } from './LicencasModule';

describe('relatório de licenças do bundle', () => {
  it('não oferece em desenvolvimento um link que só existe após o build de produção', () => {
    expect(import.meta.env.PROD).toBe(false);

    const html = renderToStaticMarkup(<LicencasModule />);

    expect(html).not.toContain('href="/legal/BUNDLED-LICENSES.md"');
    expect(html).not.toContain('href="/legal/FUNCTIONS-BUNDLED-LICENSES.md"');
    expect(html).toContain('disponíveis após o pipeline de publicação');
  });
});
