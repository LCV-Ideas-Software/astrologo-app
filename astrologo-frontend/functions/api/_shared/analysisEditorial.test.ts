import { describe, expect, it } from 'vitest';
import {
  finalizeUserAnalysisHtml,
  hasInternalImplementationLeakage,
  USER_ANALYSIS_CONCEPT_GUIDANCE,
  USER_ANALYSIS_FUNDAMENTAL_NOTICE,
} from './analysisEditorial';

describe('contrato editorial da análise destinada ao consulente', () => {
  it('fixa o Aviso Fundamental e a orientação aos Saiba Mais antes da interpretação', () => {
    const result = finalizeUserAnalysisHtml(
      '<p>Dados posicionais v2 indisponíveis para este mapa legado.</p><p>Interpretação personalizada.</p>',
    );

    expect(result.indexOf(USER_ANALYSIS_FUNDAMENTAL_NOTICE)).toBeLessThan(
      result.indexOf(USER_ANALYSIS_CONCEPT_GUIDANCE),
    );
    expect(result.indexOf(USER_ANALYSIS_CONCEPT_GUIDANCE)).toBeLessThan(result.indexOf('Interpretação personalizada.'));
    expect(result).not.toContain('Dados posicionais v2');
    expect(result).not.toContain('mapa legado');
  });

  it('detecta vocabulário interno que jamais pode chegar à tela, ao e-mail ou ao banco', () => {
    for (const leakage of [
      'schemaVersion 2.0.0',
      'payload canonical.v2',
      'fragmento 3/20',
      'rootInputHash abc',
      'job de análise',
      'consulta ao D1',
      'resposta JSON da API',
      'canonical.tatwa',
      'advanced.synastry',
      'legacy.query',
      'prompt configurado com 2.000 tokens',
      'consulta SQL no BigData_DB',
    ]) {
      expect(hasInternalImplementationLeakage(`<p>${leakage}</p>`)).toBe(true);
    }
    expect(hasInternalImplementationLeakage('<p>Jeliel inspira conciliação na expressão solar.</p>')).toBe(false);
    expect(hasInternalImplementationLeakage('<p>Claude percebe na Casa 7 um chamado à reciprocidade.</p>')).toBe(false);
    expect(hasInternalImplementationLeakage('<p>Gemini aparece como nome próprio nesta interpretação.</p>')).toBe(
      false,
    );
    expect(hasInternalImplementationLeakage('<p>O modelo Gemini recebeu o payload interno.</p>')).toBe(true);
    expect(hasInternalImplementationLeakage('<p>A Claude API respondeu ao worker.</p>')).toBe(true);
  });
});
