import { describe, expect, it } from 'vitest';
import {
  assembleLongAnalysisHtml,
  INTEGRATED_ANALYSIS_PROMPT_VERSION,
  parseGeneratedAnalysisFragment,
  parseGeneratedAnalysisReduction,
  parseGeneratedAnalysisSynthesis,
  RICH_INTERPRETIVE_ANALYSIS_PROMPT_VERSION,
} from './longAnalysisContracts';
import type { PackedAnalysisPlan } from './longAnalysisPlanner';

const plan: PackedAnalysisPlan = {
  manifest: {
    schemaId: 'urn:astrologo:ai-analysis-manifest',
    schemaVersion: '1.0.0',
    promptVersion: RICH_INTERPRETIVE_ANALYSIS_PROMPT_VERSION,
    monolithicPromptHash: 'a'.repeat(64),
    rootInputHash: 'b'.repeat(64),
    evidenceIds: ['legacy.tropical', 'advanced.locality.line.sun:mc'],
    sourceHashes: ['c'.repeat(64), 'd'.repeat(64)],
  },
  fragments: [
    {
      fragmentId: 'fragment:0001:aaaaaaaaaaaaaaaa',
      ordinal: 1,
      domain: 'legacy',
      inputHash: 'e'.repeat(64),
      inputText: 'fragmento 1',
      inputTokens: 100,
      coveredEvidenceIds: ['legacy.tropical'],
      units: [],
    },
    {
      fragmentId: 'fragment:0002:bbbbbbbbbbbbbbbb',
      ordinal: 2,
      domain: 'locality',
      inputHash: 'f'.repeat(64),
      inputText: 'fragmento 2',
      inputTokens: 120,
      coveredEvidenceIds: ['advanced.locality.line.sun:mc'],
      units: [],
    },
  ],
  coverage: {
    rootInputHash: 'b'.repeat(64),
    evidenceIds: ['legacy.tropical', 'advanced.locality.line.sun:mc'],
    sourceEvidenceIds: ['legacy.tropical', 'advanced.locality.line.sun:mc'],
  },
};

const fragmentJson = (index: 0 | 1, html: string) => {
  const fragment = plan.fragments[index];
  if (!fragment) throw new Error('fixture inválida');
  return JSON.stringify({
    schemaId: 'urn:astrologo:ai-analysis-fragment',
    schemaVersion: '1.0.0',
    rootInputHash: plan.manifest.rootInputHash,
    promptVersion: plan.manifest.promptVersion,
    fragmentId: fragment.fragmentId,
    ordinal: fragment.ordinal,
    domain: fragment.domain,
    inputHash: fragment.inputHash,
    coveredEvidenceIds: fragment.coveredEvidenceIds,
    html,
    synthesisNotes: [
      {
        textPtBr: `Nota ${fragment.ordinal}`,
        evidenceIds: fragment.coveredEvidenceIds,
      },
    ],
    warnings: [],
  });
};

const synthesisJson = () =>
  JSON.stringify({
    schemaId: 'urn:astrologo:ai-analysis-synthesis',
    schemaVersion: '1.0.0',
    rootInputHash: plan.manifest.rootInputHash,
    promptVersion: plan.manifest.promptVersion,
    fragmentIds: plan.fragments.map(({ fragmentId }) => fragmentId),
    coveredEvidenceIds: plan.coverage.evidenceIds,
    html: '<p><strong>🔗 Síntese</strong></p><p>Integração.</p>',
    warnings: [],
  });

describe('contratos puros dos fragmentos da análise longa', () => {
  it('aceita somente STOP e valida identidade, hash e cobertura exata do fragmento', () => {
    const parsed = parseGeneratedAnalysisFragment(
      { finishReason: 'STOP', text: fragmentJson(0, '<p>Primeira parte.</p>') },
      plan.manifest,
      plan.fragments[0]!,
    );
    expect(parsed.fragmentId).toBe(plan.fragments[0]?.fragmentId);

    expect(() =>
      parseGeneratedAnalysisFragment(
        { finishReason: 'MAX_TOKENS', text: fragmentJson(0, '<p>Truncado.</p>') },
        plan.manifest,
        plan.fragments[0]!,
      ),
    ).toThrow(/finishReason.*STOP/i);

    const missingCoverage = JSON.parse(fragmentJson(0, '<p>Incompleto.</p>')) as Record<string, unknown>;
    missingCoverage.coveredEvidenceIds = [];
    expect(() =>
      parseGeneratedAnalysisFragment(
        { finishReason: 'STOP', text: JSON.stringify(missingCoverage) },
        plan.manifest,
        plan.fragments[0]!,
      ),
    ).toThrow(/cobertura/i);
  });

  it('rejeita HTML e notas compostos somente por espaços', () => {
    expect(() =>
      parseGeneratedAnalysisFragment(
        { finishReason: 'STOP', text: fragmentJson(0, '   ') },
        plan.manifest,
        plan.fragments[0]!,
      ),
    ).toThrow(/texto não vazio|html/iu);

    const blankNote = JSON.parse(fragmentJson(0, '<p>Parte válida.</p>')) as {
      synthesisNotes: Array<{ textPtBr: string }>;
    };
    blankNote.synthesisNotes[0]!.textPtBr = '   ';
    expect(() =>
      parseGeneratedAnalysisFragment(
        { finishReason: 'STOP', text: JSON.stringify(blankNote) },
        plan.manifest,
        plan.fragments[0]!,
      ),
    ).toThrow(/texto não vazio|textPtBr/iu);
  });

  it('rejeita nota que referencia evidência fora do fragmento', () => {
    const invalid = JSON.parse(fragmentJson(0, '<p>Parte.</p>')) as {
      synthesisNotes: Array<{ evidenceIds: string[] }>;
    };
    invalid.synthesisNotes[0]!.evidenceIds = ['advanced.locality.line.sun:mc'];
    expect(() =>
      parseGeneratedAnalysisFragment(
        { finishReason: 'STOP', text: JSON.stringify(invalid) },
        plan.manifest,
        plan.fragments[0]!,
      ),
    ).toThrow(/evidência/i);
  });

  it('exige que as notas destinadas ao reduce cubram todas as evidências do fragmento', () => {
    const expected = {
      ...plan.fragments[0]!,
      coveredEvidenceIds: ['legacy.tropical', 'legacy.globals'],
    };
    const invalid = JSON.parse(fragmentJson(0, '<p>Parte.</p>')) as {
      coveredEvidenceIds: string[];
      synthesisNotes: Array<{ textPtBr: string; evidenceIds: string[] }>;
    };
    invalid.coveredEvidenceIds = [...expected.coveredEvidenceIds];
    invalid.synthesisNotes = [{ textPtBr: 'Somente a primeira fonte.', evidenceIds: ['legacy.tropical'] }];

    expect(() =>
      parseGeneratedAnalysisFragment({ finishReason: 'STOP', text: JSON.stringify(invalid) }, plan.manifest, expected),
    ).toThrow(/notas.*cobrem/i);
  });

  it('valida que a síntese cobre exatamente todos os fragmentos e evidências', () => {
    const parsed = parseGeneratedAnalysisSynthesis({ finishReason: 'STOP', text: synthesisJson() }, plan);
    expect(parsed.fragmentIds).toEqual(plan.fragments.map(({ fragmentId }) => fragmentId));

    const invalid = JSON.parse(synthesisJson()) as Record<string, unknown>;
    invalid.fragmentIds = [plan.fragments[0]?.fragmentId];
    expect(() =>
      parseGeneratedAnalysisSynthesis({ finishReason: 'STOP', text: JSON.stringify(invalid) }, plan),
    ).toThrow(/fragmentos/i);
  });

  it('valida uma redução intermediária sem perder fragmentos ou evidências', () => {
    const expected = {
      reductionId: 'reduction:01:0001',
      level: 1,
      ordinal: 1,
      fragmentIds: plan.fragments.map(({ fragmentId }) => fragmentId),
      coveredEvidenceIds: plan.coverage.evidenceIds,
    };
    const text = JSON.stringify({
      schemaId: 'urn:astrologo:ai-analysis-reduction',
      schemaVersion: '1.0.0',
      rootInputHash: plan.manifest.rootInputHash,
      promptVersion: plan.manifest.promptVersion,
      ...expected,
      synthesisNotes: [{ textPtBr: 'Integração intermediária.', evidenceIds: expected.coveredEvidenceIds }],
      warnings: [],
    });
    const parsed = parseGeneratedAnalysisReduction({ finishReason: 'STOP', text }, plan.manifest, expected);
    expect(parsed.fragmentIds).toEqual(expected.fragmentIds);
    expect(parsed.coveredEvidenceIds).toEqual(expected.coveredEvidenceIds);

    const invalid = JSON.parse(text) as { synthesisNotes: unknown[] };
    invalid.synthesisNotes = [];
    expect(() =>
      parseGeneratedAnalysisReduction({ finishReason: 'STOP', text: JSON.stringify(invalid) }, plan.manifest, expected),
    ).toThrow(/notas|síntese/iu);
  });

  it('no contrato rico vigente preserva todos os HTMLs na ordem do plano e acrescenta a síntese', () => {
    const first = parseGeneratedAnalysisFragment(
      { finishReason: 'STOP', text: fragmentJson(0, '<p>Primeira parte.</p>') },
      plan.manifest,
      plan.fragments[0]!,
    );
    const second = parseGeneratedAnalysisFragment(
      { finishReason: 'STOP', text: fragmentJson(1, '<p>Segunda parte.</p>') },
      plan.manifest,
      plan.fragments[1]!,
    );
    const synthesis = parseGeneratedAnalysisSynthesis({ finishReason: 'STOP', text: synthesisJson() }, plan);

    expect(assembleLongAnalysisHtml(plan, [second, first], synthesis)).toBe(
      '<p>Primeira parte.</p>\n<p>Segunda parte.</p>\n<p><strong>🔗 Síntese</strong></p><p>Integração.</p>',
    );
    expect(() => assembleLongAnalysisHtml(plan, [first], synthesis)).toThrow(/todos os fragmentos/i);
  });

  it('preserva os fragmentos também em trabalhos v2 já iniciados, sem descartar conteúdo interpretativo', () => {
    const integratedPlan: PackedAnalysisPlan = {
      ...plan,
      manifest: { ...plan.manifest, promptVersion: INTEGRATED_ANALYSIS_PROMPT_VERSION },
    };
    const integratedFragmentJson = (index: 0 | 1, html: string) => {
      const fragment = integratedPlan.fragments[index]!;
      return JSON.stringify({
        schemaId: 'urn:astrologo:ai-analysis-fragment',
        schemaVersion: '1.0.0',
        rootInputHash: integratedPlan.manifest.rootInputHash,
        promptVersion: integratedPlan.manifest.promptVersion,
        fragmentId: fragment.fragmentId,
        ordinal: fragment.ordinal,
        domain: fragment.domain,
        inputHash: fragment.inputHash,
        coveredEvidenceIds: fragment.coveredEvidenceIds,
        html,
        synthesisNotes: [{ textPtBr: `Nota ${fragment.ordinal}`, evidenceIds: fragment.coveredEvidenceIds }],
        warnings: [],
      });
    };
    const first = parseGeneratedAnalysisFragment(
      { finishReason: 'STOP', text: integratedFragmentJson(0, '<p>Interpretação rica 1.</p>') },
      integratedPlan.manifest,
      integratedPlan.fragments[0]!,
    );
    const second = parseGeneratedAnalysisFragment(
      { finishReason: 'STOP', text: integratedFragmentJson(1, '<p>Interpretação rica 2.</p>') },
      integratedPlan.manifest,
      integratedPlan.fragments[1]!,
    );
    const synthesis = parseGeneratedAnalysisSynthesis(
      {
        finishReason: 'STOP',
        text: JSON.stringify({
          schemaId: 'urn:astrologo:ai-analysis-synthesis',
          schemaVersion: '1.0.0',
          rootInputHash: integratedPlan.manifest.rootInputHash,
          promptVersion: integratedPlan.manifest.promptVersion,
          fragmentIds: integratedPlan.fragments.map(({ fragmentId }) => fragmentId),
          coveredEvidenceIds: integratedPlan.coverage.evidenceIds,
          html: '<p><strong>Relatório interpretativo final</strong></p>',
          warnings: [],
        }),
      },
      integratedPlan,
    );

    expect(assembleLongAnalysisHtml(integratedPlan, [first, second], synthesis)).toBe(
      '<p>Interpretação rica 1.</p>\n' +
        '<p>Interpretação rica 2.</p>\n' +
        '<p><strong>Relatório interpretativo final</strong></p>',
    );
    expect(() =>
      assembleLongAnalysisHtml(integratedPlan, [{ ...first, inputHash: 'f'.repeat(64) }, second], synthesis),
    ).toThrow(/hash de entrada|fragmento/i);
    expect(() =>
      assembleLongAnalysisHtml(integratedPlan, [first, second], {
        ...synthesis,
        fragmentIds: [],
        coveredEvidenceIds: [],
      }),
    ).toThrow(/fragmentos|cobertura/i);
  });
});
