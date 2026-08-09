export interface VertexAnalysisModelProfile {
  readonly model: string;
  readonly inputTokenLimit: number;
  readonly outputTokenLimit: number;
}

export const DEFAULT_VERTEX_ANALYSIS_MODEL = 'gemini-3.1-pro-preview';

const ORCHESTRATION_INPUT_TOKEN_LIMIT = 128_000;

// Somente publisher models de texto que as fichas oficiais declaram compatíveis
// com Count Tokens e Structured Output. Uma nova opção do Admin só entra aqui
// depois que seus limites e esses dois contratos forem verificados no Vertex.
const VERTEX_ANALYSIS_MODEL_CAPABILITIES = Object.freeze({
  'gemini-3.5-flash': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.5-flash-lite': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.1-pro-preview': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3.1-flash-lite': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-3-flash-preview': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-2.5-pro': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-2.5-flash': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 },
  'gemini-2.5-flash-lite': { inputTokenLimit: 1_048_576, outputTokenLimit: 65_535 },
} satisfies Record<string, Omit<VertexAnalysisModelProfile, 'model'>>);

type SupportedVertexAnalysisModel = keyof typeof VERTEX_ANALYSIS_MODEL_CAPABILITIES;

const isSupportedVertexAnalysisModel = (model: string): model is SupportedVertexAnalysisModel =>
  Object.hasOwn(VERTEX_ANALYSIS_MODEL_CAPABILITIES, model);

export const resolveVertexAnalysisModel = (configuredModel: string | null | undefined): VertexAnalysisModelProfile => {
  const candidate = configuredModel?.trim() ?? '';
  const model = isSupportedVertexAnalysisModel(candidate) ? candidate : DEFAULT_VERTEX_ANALYSIS_MODEL;
  const capabilities = VERTEX_ANALYSIS_MODEL_CAPABILITIES[model];

  return Object.freeze({
    model,
    inputTokenLimit: Math.min(capabilities.inputTokenLimit, ORCHESTRATION_INPUT_TOKEN_LIMIT),
    outputTokenLimit: capabilities.outputTokenLimit,
  });
};
