import { describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';
import { onRequestPost, sanitizeRichEmailHtml, sanitizeRichEmailText } from './enviar-email';

const internalMarker = `⟦ASTROLOGO_PAYLOAD:advanced.transit:${'c'.repeat(64)}⟧`;

const disabledRateLimitDb: D1DatabaseLike = {
  prepare: <TFirst>() => {
    const statement: D1Statement<TFirst> = {
      bind: () => statement,
      first: async () => ({ enabled: 0 }) as unknown as TFirst,
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    return statement;
  },
};

const emailRequest = () =>
  new Request('https://mapa-astral.lcv.app.br/api/enviar-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
    body: JSON.stringify({
      emailDestino: 'consulente@example.com',
      relatorioHtml: '<p>Relatório</p>',
      relatorioTexto: 'Relatório',
      nomeConsulente: 'Consulente',
    }),
  });

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

  it('não expõe fornecedor nem credencial quando o serviço de e-mail está indisponível', async () => {
    const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await onRequestPost({
      request: emailRequest(),
      env: { BIGDATA_DB: disabledRateLimitDb, RESEND_API_KEY: '' },
    });
    const payload = (await response.json()) as { error?: string };
    consoleMock.mockRestore();

    expect(response.status).toBe(503);
    expect(payload.error).toBe('O envio por e-mail está temporariamente indisponível.');
    expect(payload.error).not.toMatch(/resend|api.key/iu);
  });

  it('não repassa a mensagem bruta do fornecedor ao usuário', async () => {
    const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'provider-internal-detail' }), { status: 500 }));
    const response = await onRequestPost({
      request: emailRequest(),
      env: { BIGDATA_DB: disabledRateLimitDb, RESEND_API_KEY: 'teste' },
    });
    const payload = (await response.json()) as { error?: string };
    fetchMock.mockRestore();
    consoleMock.mockRestore();

    expect(response.status).toBe(502);
    expect(payload.error).toBe('Não foi possível enviar o e-mail agora. Tente novamente.');
    expect(payload.error).not.toContain('provider-internal-detail');
  });
});
