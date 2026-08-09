// Módulo: functions/api/_shared/modelAvailability.ts
// Fallback de runtime do seletor de modelos (diretiva fleet-wide 2026-08-09):
// o modelo configurado roda primeiro; só quando o Vertex o declara
// indisponível (404 de publisher model — nunca falha da mint OAuth) o perfil
// cai para o padrão validado, ANTES de qualquer plano de análise ser
// persistido. A troca acontece uma única vez por requisição (após o fallback,
// o perfil é o padrão) e nunca no meio de um job particionado.

import { isVertexModelUnavailableError, type VertexGenAI } from './vertex';
import {
  DEFAULT_VERTEX_ANALYSIS_MODEL,
  resolveVertexAnalysisModel,
  type VertexAnalysisModelProfile,
} from './vertexModelCapabilities';

export interface ModelAwareTokenEstimate {
  readonly profile: VertexAnalysisModelProfile;
  readonly tokenCount: number;
}

type StructuredLogFn = (level: 'WARN', message: string, context?: Record<string, unknown>) => void;

/**
 * Conta os tokens do prompt com o modelo do perfil selecionado. Um 404 de
 * publisher model rebaixa o perfil para o padrão validado e re-conta; qualquer
 * outro erro preserva o perfil e devolve contagem indisponível (-1), mantendo
 * a semântica tolerante do planejamento (heurística de bytes).
 */
export const estimateTokensWithModelFallback = async (
  ai: VertexGenAI,
  prompt: string,
  profile: VertexAnalysisModelProfile,
  log: StructuredLogFn,
): Promise<ModelAwareTokenEstimate> => {
  try {
    const resp = await ai.models.countTokens({
      model: profile.model,
      contents: prompt,
      config: { httpOptions: { timeout: 20_000 } },
    });
    return { profile, tokenCount: resp.totalTokens ?? -1 };
  } catch (err) {
    if (isVertexModelUnavailableError(err) && profile.model !== DEFAULT_VERTEX_ANALYSIS_MODEL) {
      log('WARN', 'Modelo do seletor indisponível no Vertex — fallback para o padrão validado', {
        selected_model: profile.model,
        fallback_model: DEFAULT_VERTEX_ANALYSIS_MODEL,
      });
      return estimateTokensWithModelFallback(
        ai,
        prompt,
        resolveVertexAnalysisModel(DEFAULT_VERTEX_ANALYSIS_MODEL),
        log,
      );
    }
    log('WARN', 'Erro ao contar tokens', { error: String(err) });
    return { profile, tokenCount: -1 };
  }
};
