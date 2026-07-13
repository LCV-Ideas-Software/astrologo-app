import sanitizeHtml from 'sanitize-html';
import { stripInternalAnalysisMarkers } from '../../src/analysisOutput';
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

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const sanitizeRichEmailHtml = (input: string): string =>
  stripInternalAnalysisMarkers(
    sanitizeHtml(stripInternalAnalysisMarkers(String(input ?? '')).slice(0, 120000), {
      allowedTags: [
        'p',
        'div',
        'span',
        'br',
        'hr',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'bdi',
        'a',
        'img',
      ],
      allowedAttributes: {
        '*': ['style', 'class'],
        a: ['href', 'target', 'rel'],
        bdi: ['lang', 'dir'],
        img: ['src', 'alt', 'width', 'height'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedSchemesByTag: { img: ['http', 'https', 'data'] },
      disallowedTagsMode: 'discard',
      allowProtocolRelative: false,
    }),
  );

export const sanitizeRichEmailText = (input: string): string =>
  stripInternalAnalysisMarkers(String(input ?? '')).slice(0, 120000);

export async function onRequestOptions(context: Context) {
  return new Response(null, {
    headers: { ...getCorsHeaders(context.request, 'https://mapa-astral.lcv.app.br'), ...securityHeaders },
  });
}

export async function onRequestPost(context: Context) {
  const { request, env } = context;
  const corsHeaders = getCorsHeaders(request, 'https://mapa-astral.lcv.app.br');

  if (hasDisallowedOrigin(request)) {
    return jsonResponse({ success: false, error: 'Origem não permitida.' }, 403, corsHeaders);
  }

  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/enviar-email');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: { ...Object.fromEntries(rateLimitError.headers.entries()), ...corsHeaders },
    });
  }

  try {
    const payload = (await request.json()) as Record<string, string>;
    const emailDestino = String(payload.emailDestino ?? '').trim();
    const relatorioHtml = sanitizeRichEmailHtml(String(payload.relatorioHtml ?? ''));
    const relatorioTexto = sanitizeRichEmailText(String(payload.relatorioTexto ?? ''));
    const nomeConsulente = String(payload.nomeConsulente ?? '').trim();
    const envRec = env as unknown as Record<string, unknown>;
    const RESEND_API_KEY = (env.RESEND_API_KEY ||
      envRec.RESEND_APP_KEY ||
      envRec.RESEND_APPKEY ||
      envRec['resend-api-key'] ||
      envRec['resend-appkey'] ||
      envRec.RESEND_APPKEY) as string;

    if (!isValidEmail(emailDestino)) {
      return jsonResponse({ success: false, error: 'E-mail de destino inválido.' }, 400, corsHeaders);
    }
    if (!relatorioHtml && !relatorioTexto) {
      return jsonResponse({ success: false, error: 'Relatório vazio.' }, 400, corsHeaders);
    }

    if (!RESEND_API_KEY) {
      return jsonResponse({ success: false, error: 'Chave do Resend não encontrada.' }, 500, corsHeaders);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Oráculo Astrológico <astrologo@lcv.app.br>',
        to: [emailDestino],
        subject: `🌌 Dossiê Astrológico e Esotérico de ${nomeConsulente}`,
        html: relatorioHtml,
        text: relatorioTexto,
      }),
    });

    const data = (await res.json()) as Record<string, unknown>;

    if (res.ok) {
      return jsonResponse({ success: true, message: 'E-mail enviado com sucesso!' }, 200, corsHeaders);
    } else {
      return jsonResponse({ success: false, error: String(data.message) }, 500, corsHeaders);
    }
  } catch {
    return jsonResponse({ success: false, error: 'Falha interna na comunicação do e-mail.' }, 500, corsHeaders);
  }
}
