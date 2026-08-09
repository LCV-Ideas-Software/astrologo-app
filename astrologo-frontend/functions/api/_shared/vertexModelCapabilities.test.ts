import { describe, expect, it } from 'vitest';
import { DEFAULT_VERTEX_ANALYSIS_MODEL, resolveVertexAnalysisModel } from './vertexModelCapabilities';

describe('resolveVertexAnalysisModel — seletor sempre respeitado', () => {
  it('aceita gemini-3.6-flash com os limites validados empiricamente', () => {
    const profile = resolveVertexAnalysisModel('gemini-3.6-flash');
    expect(profile.model).toBe('gemini-3.6-flash');
    expect(profile.outputTokenLimit).toBe(65_536);
    expect(profile.inputTokenLimit).toBe(128_000);
  });

  it('respeita ID desconhecido-mas-válido como está, com limites conservadores (nunca rebaixa na seleção)', () => {
    const profile = resolveVertexAnalysisModel('gemini-9.9-ultra');
    expect(profile.model).toBe('gemini-9.9-ultra');
    expect(profile.outputTokenLimit).toBe(65_535);
    expect(profile.inputTokenLimit).toBe(128_000);
  });

  it('cai no padrão apenas para valores ausentes ou sintaticamente inválidos para o path da URL', () => {
    for (const invalido of [
      null,
      undefined,
      '',
      '   ',
      'models/gemini-3.1-pro-preview',
      'gemini 2.5 pro',
      '../x',
      '-gemini',
    ]) {
      expect(resolveVertexAnalysisModel(invalido as string | null | undefined).model).toBe(
        DEFAULT_VERTEX_ANALYSIS_MODEL,
      );
    }
  });

  it('mantém os limites exatos da tabela validada para os nove modelos conhecidos', () => {
    const esperados: Record<string, number> = {
      'gemini-3.6-flash': 65_536,
      'gemini-3.5-flash': 65_536,
      'gemini-3.5-flash-lite': 65_536,
      'gemini-3.1-pro-preview': 65_536,
      'gemini-3.1-flash-lite': 65_536,
      'gemini-3-flash-preview': 65_536,
      'gemini-2.5-pro': 65_536,
      'gemini-2.5-flash': 65_536,
      'gemini-2.5-flash-lite': 65_535,
    };
    for (const [modelo, output] of Object.entries(esperados)) {
      const profile = resolveVertexAnalysisModel(modelo);
      expect(profile.model).toBe(modelo);
      expect(profile.outputTokenLimit).toBe(output);
    }
  });
});
