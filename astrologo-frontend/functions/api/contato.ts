import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';

interface EnvBindings {
  RESEND_API_KEY: string;
  BIGDATA_DB: D1DatabaseLike;
}

interface Context {
  request: Request;
  env: EnvBindings;
}
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function getCorsResponse(request: Request, data: unknown, status = 200) {
  const corsHeaders = getCorsHeaders(request, 'https://mapa-astral.lcv.app.br');
  return jsonResponse(data, status, corsHeaders);
}

export async function onRequestOptions(context: Context) {
  return new Response(null, {
    headers: { ...getCorsHeaders(context.request, 'https://mapa-astral.lcv.app.br'), ...securityHeaders },
  });
}

export async function onRequestPost(context: Context) {
  const { request, env } = context;

  if (hasDisallowedOrigin(request)) {
    return getCorsResponse(request, { ok: false, error: 'Origem não permitida.' }, 403);
  }
  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/contato');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: {
        ...Object.fromEntries(rateLimitError.headers.entries()),
        ...getCorsHeaders(request, 'https://mapa-astral.lcv.app.br'),
      },
    });
  }

  const envRec = env as unknown as Record<string, unknown>;
  const apiKey = (env?.RESEND_API_KEY ||
    envRec.RESEND_APP_KEY ||
    envRec.RESEND_APPKEY ||
    envRec['resend-api-key'] ||
    envRec['resend-appkey']) as string;
  if (!apiKey) {
    console.error('Serviço de contato sem credencial de e-mail configurada.');
    return getCorsResponse(
      request,
      { ok: false, error: 'O envio de mensagens está temporariamente indisponível.' },
      503,
    );
  }

  try {
    const body = (await request.json()) as { name?: string; phone?: string; email?: string; message?: string };
    const name = (body.name ?? '').trim();
    const phone = (body.phone ?? '').trim();
    const email = (body.email ?? '').trim();
    const message = (body.message ?? '').trim();
    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    if (!name || !email || !message) {
      return getCorsResponse(request, { ok: false, error: 'Nome, e-mail e mensagem são obrigatórios.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return getCorsResponse(request, { ok: false, error: 'E-mail inválido.' }, 400);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Oráculo Astrológico <astrologo-app@lcv.app.br>',
        to: ['astrologo-app@lcv.app.br'],
        reply_to: email,
        subject: `📬 Contato — ${name}`,
        html: `
          <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0d0d0d; margin: 0 0 24px;">Nova mensagem de contato</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr><td style="padding: 8px 0; color: #888; width: 100px;">Nome</td><td style="padding: 8px 0; font-weight: 700;">${safeName}</td></tr>
              <tr><td style="padding: 8px 0; color: #888;">E-mail</td><td style="padding: 8px 0;"><a href="mailto:${safeEmail}" style="color: #1a73e8;">${safeEmail}</a></td></tr>
              ${phone ? `<tr><td style="padding: 8px 0; color: #888;">Telefone</td><td style="padding: 8px 0;">${safePhone}</td></tr>` : ''}
            </table>
            <div style="background: #f5f4f4; border-radius: 12px; padding: 20px; color: #0d0d0d; line-height: 1.6;">
              ${safeMessage}
            </div>
          </div>
        `,
      }),
    });

    if (res.ok) {
      return getCorsResponse(request, { ok: true, message: 'Mensagem enviada com sucesso!' });
    }
    const data = (await res.json()) as Record<string, unknown>;
    console.error('O serviço de e-mail recusou a mensagem de contato.', { status: res.status, detail: data.message });
    return getCorsResponse(
      request,
      { ok: false, error: 'Não foi possível enviar a mensagem agora. Tente novamente.' },
      502,
    );
  } catch (error) {
    console.error('Falha inesperada no envio da mensagem de contato.', error);
    return getCorsResponse(
      request,
      { ok: false, error: 'Não foi possível enviar a mensagem agora. Tente novamente.' },
      500,
    );
  }
}
