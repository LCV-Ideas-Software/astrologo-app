import { describe, expect, it, vi } from 'vitest';
import { estimateTokensWithModelFallback } from './modelAvailability';
import type { VertexGenAI } from './vertex';
import { VertexHttpError } from './vertex';
import { DEFAULT_VERTEX_ANALYSIS_MODEL, resolveVertexAnalysisModel } from './vertexModelCapabilities';

const aiWith = (countTokens: (args: { model: string }) => Promise<{ totalTokens?: number }>): VertexGenAI =>
  ({ models: { countTokens } }) as unknown as VertexGenAI;

describe('estimateTokensWithModelFallback — fallback só em indisponibilidade real', () => {
  it('mantém o modelo do seletor quando a contagem funciona', async () => {
    const profile = resolveVertexAnalysisModel('gemini-9.9-ultra');
    const ai = aiWith(async () => ({ totalTokens: 1234 }));
    const log = vi.fn();

    const result = await estimateTokensWithModelFallback(ai, 'prompt', profile, log);

    expect(result.profile.model).toBe('gemini-9.9-ultra');
    expect(result.tokenCount).toBe(1234);
  });

  it('cai para o padrão validado quando o publisher model responde 404, re-contando com o padrão', async () => {
    const profile = resolveVertexAnalysisModel('gemini-9.9-ultra');
    const chamadas: string[] = [];
    const ai = aiWith(async ({ model }) => {
      chamadas.push(model);
      if (model === 'gemini-9.9-ultra') {
        throw new VertexHttpError(
          'Vertex countTokens falhou (HTTP 404): Publisher Model not found',
          404,
          'countTokens',
        );
      }
      return { totalTokens: 777 };
    });
    const log = vi.fn();

    const result = await estimateTokensWithModelFallback(ai, 'prompt', profile, log);

    expect(chamadas).toEqual(['gemini-9.9-ultra', DEFAULT_VERTEX_ANALYSIS_MODEL]);
    expect(result.profile.model).toBe(DEFAULT_VERTEX_ANALYSIS_MODEL);
    expect(result.tokenCount).toBe(777);
  });

  it('um 404 da mint OAuth NÃO troca o modelo (proveniência da operação)', async () => {
    const profile = resolveVertexAnalysisModel('gemini-9.9-ultra');
    const ai = aiWith(async () => {
      throw new VertexHttpError('Falha ao obter access token OAuth (HTTP 404)', 404, 'oauth-token');
    });

    const result = await estimateTokensWithModelFallback(ai, 'prompt', profile, vi.fn());

    expect(result.profile.model).toBe('gemini-9.9-ultra');
    expect(result.tokenCount).toBe(-1);
  });

  it('não entra em loop quando o próprio padrão está indisponível', async () => {
    const profile = resolveVertexAnalysisModel(DEFAULT_VERTEX_ANALYSIS_MODEL);
    let chamadas = 0;
    const ai = aiWith(async () => {
      chamadas += 1;
      throw new VertexHttpError('Vertex countTokens falhou (HTTP 404): not found', 404, 'countTokens');
    });

    const result = await estimateTokensWithModelFallback(ai, 'prompt', profile, vi.fn());

    expect(chamadas).toBe(1);
    expect(result.profile.model).toBe(DEFAULT_VERTEX_ANALYSIS_MODEL);
    expect(result.tokenCount).toBe(-1);
  });

  it('erro transitório (não-404) preserva o modelo e devolve contagem indisponível', async () => {
    const profile = resolveVertexAnalysisModel('gemini-3.6-flash');
    const ai = aiWith(async () => {
      throw new VertexHttpError('Vertex countTokens falhou (HTTP 500): internal', 500, 'countTokens');
    });

    const result = await estimateTokensWithModelFallback(ai, 'prompt', profile, vi.fn());

    expect(result.profile.model).toBe('gemini-3.6-flash');
    expect(result.tokenCount).toBe(-1);
  });
});
