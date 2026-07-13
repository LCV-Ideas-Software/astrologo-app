import { describe, expect, it } from 'vitest';
import { sanitizeRichEmailHtml, sanitizeRichEmailText } from './enviar-email';

const internalMarker = `⟦ASTROLOGO_PAYLOAD:advanced.transit:${'c'.repeat(64)}⟧`;

describe('sanitização do HTML de e-mail', () => {
  it('preserva a direção e o idioma do triplete hebraico sem liberar marcação executável', () => {
    const sanitized = sanitizeRichEmailHtml(
      '<bdi lang="he" dir="rtl">והו</bdi><script>alert(1)</script><a href="javascript:alert(2)">link</a>',
    );

    expect(sanitized).toContain('<bdi lang="he" dir="rtl">והו</bdi>');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('javascript:');
  });

  it('remove sentinelas internas tanto do HTML quanto do texto simples', () => {
    const sanitizedHtml = sanitizeRichEmailHtml(
      `<p>Antes ${internalMarker} depois.</p><p>&#10214;ASTROLOGO_PAYLOAD:legacy.query:${'d'.repeat(64)}&#10215;</p>`,
    );
    const sanitizedText = sanitizeRichEmailText(`Antes ${internalMarker} depois.`);

    expect(sanitizedHtml).toContain('Antes');
    expect(sanitizedHtml).toContain('depois.');
    expect(sanitizedHtml).not.toContain('ASTROLOGO_PAYLOAD');
    expect(sanitizedText).toBe('Antes  depois.');
    expect(sanitizedText).not.toContain('ASTROLOGO_PAYLOAD');
  });
});
