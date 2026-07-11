import { describe, expect, it } from 'vitest';
import { sanitizeRichEmailHtml } from './enviar-email';

describe('sanitização do HTML de e-mail', () => {
  it('preserva a direção e o idioma do triplete hebraico sem liberar marcação executável', () => {
    const sanitized = sanitizeRichEmailHtml(
      '<bdi lang="he" dir="rtl">והו</bdi><script>alert(1)</script><a href="javascript:alert(2)">link</a>',
    );

    expect(sanitized).toContain('<bdi lang="he" dir="rtl">והו</bdi>');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('javascript:');
  });
});
