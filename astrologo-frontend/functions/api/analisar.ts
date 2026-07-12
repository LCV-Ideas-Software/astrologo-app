// Módulo: astrologo-frontend/functions/api/analisar.ts
// Versão: v02.15.01 + Gemini v1beta Modernization
// Descrição: API de análise astrológica via Gemini v1beta com token counting, structured outputs, e caching otimizado.

import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import {
  appendAdvancedAnalysisPrompt,
  loadCanonicalLocalityMapV1,
  loadCanonicalNatalAnalysisV1,
  loadCanonicalSynastryRunV1,
  loadCanonicalTransitRunV1,
} from './_shared/advancedAnalysisPrompt';
import { buildAnalysisPrompt, loadCanonicalAnalysisV2, V2_SYSTEM_INSTRUCTION } from './_shared/analysisPrompt';
import { loadConfiguredAstrologerModel } from './_shared/modelConfig';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';
import { buildAnalysisGlobalsWithCanonicalTatwa, loadCanonicalTatwa } from './_shared/tatwaPrompt';

interface EnvBindings {
  GEMINI_API_KEY: string;
  BIGDATA_DB: D1DatabaseLike;
}
interface Context {
  request: Request;
  env: EnvBindings;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Logging estruturado com timestamp e contexto
 * (docs: best practice para debugging e observabilidade)
 */
function structuredLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(context && { context }),
  };
  console.log(JSON.stringify(logEntry));
}

// ── Telemetria: registra uso de AI no BIGDATA_DB ──
function logAiUsage(
  db: D1DatabaseLike | undefined,
  entry: {
    module: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    status: string;
    error_detail?: string;
  },
) {
  if (!db || typeof db.prepare !== 'function') return;
  (async () => {
    try {
      await db
        .prepare(`
        INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          entry.module,
          entry.model,
          entry.input_tokens,
          entry.output_tokens,
          entry.latency_ms,
          entry.status,
          entry.error_detail || null,
        )
        .run();
    } catch (err) {
      console.warn('[telemetry] ai_usage_logs INSERT failed:', err instanceof Error ? err.message : err);
    }
  })();
}

// Configuração de modelo e valores de geração otimizados (Gemini v1beta)
const GEMINI_CONFIG_DEFAULTS = {
  model: 'gemini-pro-latest', // Fallback caso configuração do D1 atrase
  apiVersion: 'v1beta',
  maxOutputTokens: 8192, // Limite robusto de output (docs: importante para controle de custo)
  cachedContentTTL: '3600s', // 1h cache de contexto (docs: reduz custo de prompt repetido)
};

const sanitizeGeneratedHtml = (input: string): string => {
  const normalized = input
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!normalized) {
    return '<p>Perturbação no éter na geração.</p>';
  }

  // Whitelist of allowed HTML tags (matching frontend DOMPurify config + style for alignment)
  const ALLOWED_TAGS = new Set(['p', 'strong', 'ul', 'li', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'br']);

  // Allow only safe style properties for text alignment/indent.
  // Linear-time validation (no nested-quantifier regex; the prior
  // /^(?:\s*(?:text-align|text-indent)\s*:\s*[^;"'<>]+;\s*)+$/i was
  // flagged as polynomial-redos by CodeQL — replaced with a manual
  // declaration-by-declaration check that runs in O(n).
  const isSafeStyle = (decls: string): boolean => {
    if (decls.length > 256) return false;
    const parts = decls.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colon = trimmed.indexOf(':');
      if (colon < 1) return false;
      const prop = trimmed.slice(0, colon).trim().toLowerCase();
      const val = trimmed.slice(colon + 1).trim();
      if (prop !== 'text-align' && prop !== 'text-indent') return false;
      if (val.length === 0 || /["'<>]/.test(val)) return false;
    }
    return true;
  };

  // Strip disallowed tags but keep their text content; preserve allowed tags
  const sanitized = normalized.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (match, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return ''; // Strip disallowed tags entirely
      }
      // For allowed tags, only keep safe style attribute
      const isClosing = match.startsWith('</');
      if (isClosing) return `</${tag}>`;
      // Parse style attribute if present
      const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
      const styleValue = styleMatch?.[1];
      if (styleValue && isSafeStyle(styleValue)) {
        return `<${tag} style="${styleValue}">`;
      }
      return `<${tag}>`;
    },
  );

  return sanitized;
};

/**
 * Conta tokens da requisição usando @google/genai SDK
 * Permite validação pré-envio e otimização de custos
 */
const estimateTokenCount = async (ai: GoogleGenAI, prompt: string, model: string): Promise<number> => {
  try {
    const resp = await ai.models.countTokens({
      model,
      contents: prompt,
    });
    return resp.totalTokens ?? -1;
  } catch (err) {
    structuredLog('WARN', 'Erro ao contar tokens', { error: String(err) });
    return -1;
  }
};

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

  const rateLimitError = await enforceRateLimit(env.BIGDATA_DB, request, 'astrologo/analisar');
  if (rateLimitError) {
    return new Response(rateLimitError.body, {
      status: rateLimitError.status,
      headers: { ...Object.fromEntries(rateLimitError.headers.entries()), ...corsHeaders },
    });
  }

  try {
    const _telStart = Date.now();
    const payload = (await request.json()) as Record<string, unknown>;
    const { id, dadosAstronomica, dadosTropical, dadosGlobais, query } = payload;

    if (!dadosAstronomica || !dadosTropical || !dadosGlobais || !query) {
      return new Response(JSON.stringify({ success: false, error: 'Dados insuficientes para análise.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
      });
    }

    // O navegador nunca é autoridade para fatos v2. O servidor reidrata pelo id;
    // mapas legados sem o bloco persistido continuam naturalmente no prompt v1.
    const [canonicalV2, canonicalTatwa, canonicalNatal, canonicalTransit, canonicalSynastry, canonicalLocality] =
      await Promise.all([
        loadCanonicalAnalysisV2(env.BIGDATA_DB, id),
        loadCanonicalTatwa(env.BIGDATA_DB, id),
        loadCanonicalNatalAnalysisV1(env.BIGDATA_DB, id),
        loadCanonicalTransitRunV1(env.BIGDATA_DB, id),
        loadCanonicalSynastryRunV1(env.BIGDATA_DB, id),
        loadCanonicalLocalityMapV1(env.BIGDATA_DB, id),
      ]);
    if (!canonicalTatwa) {
      return jsonResponse(
        {
          success: false,
          code: 'CANONICAL_TATWA_UNAVAILABLE',
          error:
            'Os Tatwas canônicos deste mapa não estão disponíveis com segurança. Recalcule o mapa antes da análise.',
        },
        503,
        corsHeaders,
      );
    }
    const submittedGlobals = isRecord(dadosGlobais) ? dadosGlobais : {};
    const globalsForAnalysis = buildAnalysisGlobalsWithCanonicalTatwa(submittedGlobals, canonicalTatwa);
    const dadosAnalise = `Sistema Tropical: ${JSON.stringify(dadosTropical)} | Sistema Astronômico Constelacional: ${JSON.stringify(dadosAstronomica)} | Globais (Tatwas e Numerologia): ${JSON.stringify(globalsForAnalysis)}`;
    const prompt = appendAdvancedAnalysisPrompt(buildAnalysisPrompt(dadosAnalise, query, canonicalV2, canonicalTatwa), {
      natal: canonicalNatal,
      transit: canonicalTransit,
      synastry: canonicalSynastry,
      locality: canonicalLocality,
    });

    // ==== DYNAMIC MODEL CONFIGURATION VIA BIGDATA_DB ====
    const selectedModel = await loadConfiguredAstrologerModel(env.BIGDATA_DB, GEMINI_CONFIG_DEFAULTS.model);

    // Inicializa a instância do SDK de vanguarda
    const envRec = env as unknown as Record<string, unknown>;
    const apiKeyRaw =
      env.GEMINI_API_KEY || envRec.GEMINI_APP_KEY || envRec['gemini-api-key'] || envRec['gemini-app-key'];
    const ai = new GoogleGenAI({
      apiKey:
        apiKeyRaw && typeof apiKeyRaw === 'object' && 'get' in apiKeyRaw
          ? await (apiKeyRaw as { get(): Promise<string> }).get()
          : String(apiKeyRaw || ''),
    });

    // ==== PASSO 1: Token Counting API (v1beta - best practice) ====
    structuredLog('INFO', 'Iniciando análise astrológica com Gemini SDK', {
      prompt_length: prompt.length,
      model: selectedModel,
    });

    const tokenCount = await estimateTokenCount(ai, prompt, selectedModel);
    if (tokenCount > 0) {
      structuredLog('INFO', 'Token count estimado', { tokens: tokenCount, max_allowed: 128000 });
      if (tokenCount > 120000) {
        return new Response(JSON.stringify({ success: false, error: 'Dados muito extensos para análise.' }), {
          status: 413,
          headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
        });
      }
    }

    // ==== PASSO 2: Requisição com retry e configuração otimizada através do SDK ====
    let lastErrorMsg = 'Desconhecido';
    let generationResult;

    for (let t = 0; t < 2; t++) {
      try {
        generationResult = await ai.models.generateContent({
          model: selectedModel,
          contents: prompt,
          config: {
            ...(canonicalV2 ? { systemInstruction: V2_SYSTEM_INSTRUCTION } : {}),
            maxOutputTokens: GEMINI_CONFIG_DEFAULTS.maxOutputTokens, // Limite robusto (docs: importante)
            temperature: 1.0, // Recomendado para Gemini Flash (docs: evita looping)
            // ==== IMPROVED SAFETY SETTINGS (docs: best practice v1beta) ====
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ],
          },
        });
        break; // Sucesso, quebra o loop de retry
      } catch (fetchErr) {
        lastErrorMsg = String(fetchErr);
        structuredLog('WARN', `Tentativa ${t + 1}/2 falhou na requisição Gemini SDK`, { error: lastErrorMsg });
        if (t === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!generationResult?.text) {
      structuredLog('ERROR', 'Ambas as tentativas falharam ou retornaram status de erro/incompleto', {
        error: lastErrorMsg,
      });
      void logAiUsage(env.BIGDATA_DB, {
        module: 'astrologo-analisar',
        model: selectedModel,
        input_tokens: 0,
        output_tokens: 0,
        latency_ms: Date.now() - _telStart,
        status: 'error',
        error_detail: lastErrorMsg.slice(0, 200),
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Servidor superlotado (Aviso Oculto #77). Tente novamente.' }),
        {
          status: 504,
          headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
        },
      );
    }

    // ==== PASSO 3: Parse da Resposta e Extração de Tokens Otimizado ====
    const generatedText = generationResult.text;
    let analise = sanitizeGeneratedHtml(generatedText);

    if (!analise || analise.trim().length === 0) {
      analise = '<p>Perturbação no éter na geração.</p>';
    }

    structuredLog('INFO', 'Análise gerada com sucesso via SDK', {
      bytesHtml: analise.length,
      usage: generationResult.usageMetadata,
    });

    // Telemetria de sucesso
    const usage = generationResult.usageMetadata;
    void logAiUsage(env.BIGDATA_DB, {
      module: 'astrologo-analisar',
      model: selectedModel,
      input_tokens: usage?.promptTokenCount || 0,
      output_tokens: usage?.candidatesTokenCount || 0,
      latency_ms: Date.now() - _telStart,
      status: 'ok',
    });

    // ==== PASSO 4: Persistência no banco (D1) ====
    if (env.BIGDATA_DB && id && typeof id === 'string') {
      try {
        try {
          await env.BIGDATA_DB.prepare(
            "UPDATE astrologo_mapas SET analise_ia = ?, data_analise = datetime('now') WHERE id = ?",
          )
            .bind(analise, id)
            .run();
        } catch (firstPersistErr) {
          const firstMessage = String(firstPersistErr);
          const missingDataAnaliseColumn = /no such column:\s*data_analise/i.test(firstMessage);

          if (!missingDataAnaliseColumn) {
            throw firstPersistErr;
          }

          structuredLog('WARN', 'Coluna data_analise ausente, aplicando fallback de persistência', {
            id,
            error: firstMessage,
          });

          await env.BIGDATA_DB.prepare('UPDATE astrologo_mapas SET analise_ia = ? WHERE id = ?')
            .bind(analise, id)
            .run();
        }

        structuredLog('INFO', 'Análise persistida no banco', { id });
      } catch (dbErr) {
        structuredLog('WARN', 'Erro ao persistir análise no banco (continuando)', { error: String(dbErr) });
      }
    }

    structuredLog('INFO', 'Análise gerada com sucesso', { analise_length: analise.length });
    return new Response(JSON.stringify({ success: true, analise }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    structuredLog('ERROR', 'Erro não-tratado na análise astrológica', {
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return new Response(JSON.stringify({ success: false, error: 'Falha na comunicação Cósmica.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders, ...securityHeaders },
    });
  }
}
