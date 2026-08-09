export interface VertexAnalysisModelProfile {
  readonly model: string;
  readonly inputTokenLimit: number;
  readonly outputTokenLimit: number;
}

export const DEFAULT_VERTEX_ANALYSIS_MODEL = 'gemini-3.1-pro-preview';

const ORCHESTRATION_INPUT_TOKEN_LIMIT = 128_000;

// Tabela de CAPACIDADES validadas empiricamente no Vertex (limites reais por
// modelo). Diretiva do operador (2026-08-09, fleet-wide): o seletor é SEMPRE
// respeitado — esta tabela NÃO gateia a seleção. Um ID configurado que não
// esteja aqui é usado exatamente como está, com limites conservadores; a
// queda para o padrão acontece apenas (a) na seleção, quando o valor é
// ausente/sintaticamente inválido para o path da URL do publisher model, ou
// (b) em runtime, quando o Vertex responde 404 para o modelo selecionado
// (ver modelAvailability.ts).
const VERTEX_ANALYSIS_MODEL_CAPABILITIES = Object.freeze({
  'gemini-3.6-flash': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.5-flash': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.5-flash-lite': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.1-pro-preview': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.1-flash-lite': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3-flash-preview': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-2.5-pro': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-2.5-flash': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-2.5-flash-lite': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_535 },
} satisfies Record<string, Omit<VertexAnalysisModelProfile, 'model'>>);

// Limites conservadores para IDs fora da tabela: entrada limitada pelo teto de
// orquestração (vale para todos os publisher models conhecidos) e saída
// travada no tamanho do request inicial da orquestração (8.192) — assim a
// escalada de MAX_TOKENS nunca dobra além do que o modelo desconhecido
// comprovadamente aceitou, e nenhum 400 por maxOutputTokens é possível.
const CONSERVATIVE_UNKNOWN_MODEL_CAPABILITIES = Object.freeze({
  inputTokenLimit: 1_048_576,
  outputTokenLimit: 8_192,
});

// O ID compõe o path da URL do Vertex (…/publishers/google/models/<id>:verbo);
// aceita apenas o formato de publisher model, sem separadores de path/espaços.
const VALID_MODEL_ID = /^[a-z0-9](?:[a-z0-9.-]{0,126}[a-z0-9])?$/i;

type SupportedVertexAnalysisModel = keyof typeof VERTEX_ANALYSIS_MODEL_CAPABILITIES;

const isSupportedVertexAnalysisModel = (model: string): model is SupportedVertexAnalysisModel =>
  Object.hasOwn(VERTEX_ANALYSIS_MODEL_CAPABILITIES, model);

export const resolveVertexAnalysisModel = (configuredModel: string | null | undefined): VertexAnalysisModelProfile => {
  const candidate = configuredModel?.trim() ?? '';
  const model = VALID_MODEL_ID.test(candidate) ? candidate : DEFAULT_VERTEX_ANALYSIS_MODEL;
  const capabilities = isSupportedVertexAnalysisModel(model)
    ? VERTEX_ANALYSIS_MODEL_CAPABILITIES[model]
    : CONSERVATIVE_UNKNOWN_MODEL_CAPABILITIES;

  return Object.freeze({
    model,
    inputTokenLimit: Math.min(capabilities.inputTokenLimit, ORCHESTRATION_INPUT_TOKEN_LIMIT),
    outputTokenLimit: capabilities.outputTokenLimit,
  });
};
