// Módulo: astrologo-frontend/functions/api/analisar.ts
// Versão: v02.15.01 + Gemini v1beta Modernization
// Descrição: API de análise astrológica via Gemini v1beta com token counting, structured outputs, e caching otimizado.

import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import {
  type D1DatabaseLike,
  enforceRateLimit,
  getCorsHeaders,
  hasDisallowedOrigin,
  jsonResponse,
  securityHeaders,
} from './_shared/requestSecurity';

interface EnvBindings {
  GEMINI_API_KEY: string;
  BIGDATA_DB: D1DatabaseLike;
}
interface Context {
  request: Request;
  env: EnvBindings;
}

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
      await (
        db.prepare(`
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          module TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0, latency_ms INTEGER DEFAULT 0,
          status TEXT DEFAULT 'ok', error_detail TEXT
        )
      `) as { run(): Promise<unknown> }
      ).run();
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

    const dadosAnalise = `Sistema Tropical: ${JSON.stringify(dadosTropical)} | Sistema Astronômico Constelacional: ${JSON.stringify(dadosAstronomica)} | Globais (Tatwas e Numerologia): ${JSON.stringify(dadosGlobais)}`;

    const prompt = `Atue como um Mestre Iniciador da Investigue as Influências Astrológicas e Psicanalista Junguiano.
Dados calculados astrologicamente: ${dadosAnalise} do consulente: ${JSON.stringify(query)}

O aplicativo exibe ao usuário uma jornada narrativa de choque de realidade: PRIMEIRO apresentamos a Astrologia Tropical (12 signos) como a máscara terrena/Ego, e DEPOIS a Astrologia Astronômica Constelacional (13 signos) como a verdade estelar oculta/Alma.
Siga EXATAMENTE esta mesma ordem! Faça DUAS análises profundas e separadas:
1º. Astrologia Tropical (A Persona)
2º. Astrologia Astronômica (A Essência da Alma)
Integre a Astrologia, a Investigue as Influências Astrológicas de W. W. da Matta e Silva, os Tatwas e a Psicologia Analítica de C. G. Jung. Ao final, efetue uma síntese conjunta comparativa.

ATENÇÃO RIGOROSA 1: Analise a influência do "Astro" (o 6º card da Umbanda, que representa a Hora Planetária do minuto exato baseada na Sequência dos Caldeus) e sua sinergia com o Orixá regente.
ATENÇÃO RIGOROSA 2: Inclua de forma explícita e obrigatória a informação de que a Coroa calculada via data de nascimento serve para revelar a Vibração Original "Teórica/Magnética". Informe claramente que, por necessidades e cobranças cármicas de encarnação, a entidade que atua "de frente" pode pertencer a outra Linha, e que a verdadeira coroa e guias de frente só podem ser atestados de forma inequívoca e prática no terreiro através da "Lei de Pemba" e pelo Mestre de Iniciação.

Retorne APENAS HTML formatado em <p>, <strong>, <ul>, <li>. Sem marcações markdown ou blocos de código e com os títulos alinhados à esquerda e os textos dos parágrafos justificados e com recuo de primeira linha de cada parágrafo.

USE OBRIGATORIAMENTE emojis e símbolos pictóricos Unicode ao longo de todo o texto: símbolos dos astros e planetas (☀️🌙⭐✨🪐💫🌟), dos signos do zodíaco (♈♉♊♋♌♍♎♏♐♑♒♓⛎), dos Orixás e entidades (⚔️🌊🔥🌿🌪️⚡🏹🌹🕯️💀🌺), de elementos esotéricos e místicos (🔮🧿📿☯️🌀🗝️🌑🌕), além de outros símbolos de reforço narrativo (🧠💡⚖️🌐🔗💎🛡️). Coloque-os no início dos títulos e seções, e intercale-os nos parágrafos para enriquecer a leitura e destacar conceitos-chave.`;

    // ==== DYNAMIC MODEL CONFIGURATION VIA BIGDATA_DB ====
    let selectedModel = GEMINI_CONFIG_DEFAULTS.model;
    if (env.BIGDATA_DB && typeof env.BIGDATA_DB.prepare === 'function') {
      try {
        const configRow = (await env.BIGDATA_DB.prepare(
          "SELECT config_json FROM admin_config_store WHERE config_key = 'astrologo-config' LIMIT 1",
        ).first()) as { config_json?: string } | null;
        if (configRow?.config_json) {
          const parsedConfig = JSON.parse(configRow.config_json);
          if (parsedConfig && typeof parsedConfig.modeloIA === 'string' && parsedConfig.modeloIA.trim()) {
            selectedModel = parsedConfig.modeloIA.trim();
          }
        }
      } catch (err) {
        structuredLog('WARN', 'Falha ao recuperar astrologo-config de BIGDATA_DB, usando fallback', {
          error: String(err),
        });
      }
    }

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
