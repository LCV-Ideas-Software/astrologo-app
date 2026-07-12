import type { AnalysisManifest, PackedAnalysisFragment, PackedAnalysisPlan } from './longAnalysisPlanner';

export interface GeneratedTextCandidate {
  readonly finishReason?: unknown;
  readonly text?: unknown;
}

export interface AnalysisSynthesisNoteV1 {
  readonly textPtBr: string;
  readonly evidenceIds: readonly string[];
}

export interface AnalysisFragmentV1 {
  readonly schemaId: 'urn:astrologo:ai-analysis-fragment';
  readonly schemaVersion: '1.0.0';
  readonly rootInputHash: string;
  readonly promptVersion: string;
  readonly fragmentId: string;
  readonly ordinal: number;
  readonly domain: string;
  readonly inputHash: string;
  readonly coveredEvidenceIds: readonly string[];
  readonly html: string;
  readonly synthesisNotes: readonly AnalysisSynthesisNoteV1[];
  readonly warnings: readonly string[];
}

export interface AnalysisSynthesisV1 {
  readonly schemaId: 'urn:astrologo:ai-analysis-synthesis';
  readonly schemaVersion: '1.0.0';
  readonly rootInputHash: string;
  readonly promptVersion: string;
  readonly fragmentIds: readonly string[];
  readonly coveredEvidenceIds: readonly string[];
  readonly html: string;
  readonly warnings: readonly string[];
}

export interface AnalysisReductionExpectation {
  readonly reductionId: string;
  readonly level: number;
  readonly ordinal: number;
  readonly fragmentIds: readonly string[];
  readonly coveredEvidenceIds: readonly string[];
}

export interface AnalysisReductionV1 extends AnalysisReductionExpectation {
  readonly schemaId: 'urn:astrologo:ai-analysis-reduction';
  readonly schemaVersion: '1.0.0';
  readonly rootInputHash: string;
  readonly promptVersion: string;
  readonly synthesisNotes: readonly AnalysisSynthesisNoteV1[];
  readonly warnings: readonly string[];
}

export class LongAnalysisContractError extends Error {
  override readonly name = 'LongAnalysisContractError';
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_HTML_LENGTH = 262_144;
const MAX_NOTE_LENGTH = 4_096;
const MAX_WARNING_LENGTH = 1_024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const exactKeys = (value: Record<string, unknown>, expected: readonly string[], context: string): void => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new LongAnalysisContractError(`${context} contém campos ausentes ou inesperados.`);
  }
};

const requiredText = (value: unknown, context: string, maximumLength = 512): string => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximumLength) {
    throw new LongAnalysisContractError(`${context} deve ser texto não vazio.`);
  }
  return value;
};

const stringArray = (value: unknown, context: string, maximumItemLength = 512): readonly string[] => {
  if (!Array.isArray(value)) throw new LongAnalysisContractError(`${context} deve ser uma lista.`);
  return value.map((item, index) => requiredText(item, `${context}/${index}`, maximumItemLength));
};

const assertExactArray = (
  actual: readonly string[],
  expected: readonly string[],
  context: 'cobertura' | 'fragmentos',
): void => {
  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new LongAnalysisContractError(`A lista de ${context} não coincide exatamente com o plano.`);
  }
};

const parseStoppedJson = (generated: GeneratedTextCandidate): Record<string, unknown> => {
  if (generated.finishReason !== 'STOP') {
    throw new LongAnalysisContractError('A geração só é completa quando finishReason é STOP.');
  }
  if (typeof generated.text !== 'string' || generated.text.length === 0) {
    throw new LongAnalysisContractError('A geração concluída não forneceu texto estruturado.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(generated.text);
  } catch (error) {
    throw new LongAnalysisContractError('A resposta estruturada não é JSON válido.', { cause: error });
  }
  if (!isRecord(parsed)) throw new LongAnalysisContractError('A resposta estruturada deve ser um objeto JSON.');
  return parsed;
};

const parseWarnings = (value: unknown): readonly string[] => {
  const warnings = stringArray(value, '/warnings', MAX_WARNING_LENGTH);
  if (new Set(warnings).size !== warnings.length) throw new LongAnalysisContractError('Warnings contém duplicatas.');
  return warnings;
};

const parseNotes = (value: unknown, allowedEvidenceIds: readonly string[]): readonly AnalysisSynthesisNoteV1[] => {
  if (!Array.isArray(value)) throw new LongAnalysisContractError('/synthesisNotes deve ser uma lista.');
  const allowed = new Set(allowedEvidenceIds);
  const covered = new Set<string>();
  const notes = value.map((candidate, index) => {
    if (!isRecord(candidate)) throw new LongAnalysisContractError(`/synthesisNotes/${index} deve ser um objeto.`);
    exactKeys(candidate, ['textPtBr', 'evidenceIds'], `/synthesisNotes/${index}`);
    const textPtBr = requiredText(candidate.textPtBr, `/synthesisNotes/${index}/textPtBr`, MAX_NOTE_LENGTH);
    const evidenceIds = stringArray(candidate.evidenceIds, `/synthesisNotes/${index}/evidenceIds`);
    if (evidenceIds.length === 0 || evidenceIds.some((id) => !allowed.has(id))) {
      throw new LongAnalysisContractError(`Uma nota de síntese referencia evidência ausente do fragmento.`);
    }
    if (new Set(evidenceIds).size !== evidenceIds.length) {
      throw new LongAnalysisContractError('Uma nota de síntese repete evidência.');
    }
    for (const evidenceId of evidenceIds) covered.add(evidenceId);
    return { textPtBr, evidenceIds };
  });
  if (notes.length === 0 || allowedEvidenceIds.some((evidenceId) => !covered.has(evidenceId))) {
    throw new LongAnalysisContractError('As notas de síntese não cobrem todas as evidências do fragmento.');
  }
  return notes;
};

export const parseGeneratedAnalysisFragment = (
  generated: GeneratedTextCandidate,
  manifest: AnalysisManifest,
  expected: PackedAnalysisFragment,
): AnalysisFragmentV1 => {
  const value = parseStoppedJson(generated);
  exactKeys(
    value,
    [
      'schemaId',
      'schemaVersion',
      'rootInputHash',
      'promptVersion',
      'fragmentId',
      'ordinal',
      'domain',
      'inputHash',
      'coveredEvidenceIds',
      'html',
      'synthesisNotes',
      'warnings',
    ],
    '/',
  );
  if (value.schemaId !== 'urn:astrologo:ai-analysis-fragment' || value.schemaVersion !== '1.0.0') {
    throw new LongAnalysisContractError('Identidade do schema de fragmento inválida.');
  }
  if (value.rootInputHash !== manifest.rootInputHash || !SHA256_PATTERN.test(String(value.rootInputHash))) {
    throw new LongAnalysisContractError('Hash raiz do fragmento divergente.');
  }
  if (value.promptVersion !== manifest.promptVersion)
    throw new LongAnalysisContractError('Versão do prompt divergente.');
  if (value.fragmentId !== expected.fragmentId)
    throw new LongAnalysisContractError('Identificador do fragmento divergente.');
  if (value.ordinal !== expected.ordinal) throw new LongAnalysisContractError('Ordinal do fragmento divergente.');
  if (value.domain !== expected.domain) throw new LongAnalysisContractError('Domínio do fragmento divergente.');
  if (value.inputHash !== expected.inputHash || !SHA256_PATTERN.test(String(value.inputHash))) {
    throw new LongAnalysisContractError('Hash de entrada do fragmento divergente.');
  }
  const coveredEvidenceIds = stringArray(value.coveredEvidenceIds, '/coveredEvidenceIds');
  assertExactArray(coveredEvidenceIds, expected.coveredEvidenceIds, 'cobertura');
  const html = requiredText(value.html, '/html', MAX_HTML_LENGTH);
  const synthesisNotes = parseNotes(value.synthesisNotes, coveredEvidenceIds);
  const warnings = parseWarnings(value.warnings);
  return {
    schemaId: 'urn:astrologo:ai-analysis-fragment',
    schemaVersion: '1.0.0',
    rootInputHash: manifest.rootInputHash,
    promptVersion: manifest.promptVersion,
    fragmentId: expected.fragmentId,
    ordinal: expected.ordinal,
    domain: expected.domain,
    inputHash: expected.inputHash,
    coveredEvidenceIds,
    html,
    synthesisNotes,
    warnings,
  };
};

export const parseGeneratedAnalysisReduction = (
  generated: GeneratedTextCandidate,
  manifest: AnalysisManifest,
  expected: AnalysisReductionExpectation,
): AnalysisReductionV1 => {
  const value = parseStoppedJson(generated);
  exactKeys(
    value,
    [
      'schemaId',
      'schemaVersion',
      'rootInputHash',
      'promptVersion',
      'reductionId',
      'level',
      'ordinal',
      'fragmentIds',
      'coveredEvidenceIds',
      'synthesisNotes',
      'warnings',
    ],
    '/',
  );
  if (value.schemaId !== 'urn:astrologo:ai-analysis-reduction' || value.schemaVersion !== '1.0.0') {
    throw new LongAnalysisContractError('Identidade do schema de redução inválida.');
  }
  if (value.rootInputHash !== manifest.rootInputHash || value.promptVersion !== manifest.promptVersion) {
    throw new LongAnalysisContractError('A redução não pertence ao manifesto vigente.');
  }
  if (
    value.reductionId !== expected.reductionId ||
    value.level !== expected.level ||
    value.ordinal !== expected.ordinal
  ) {
    throw new LongAnalysisContractError('Identidade ordinal da redução divergente.');
  }
  const fragmentIds = stringArray(value.fragmentIds, '/fragmentIds');
  assertExactArray(fragmentIds, expected.fragmentIds, 'fragmentos');
  const coveredEvidenceIds = stringArray(value.coveredEvidenceIds, '/coveredEvidenceIds');
  assertExactArray(coveredEvidenceIds, expected.coveredEvidenceIds, 'cobertura');
  return {
    schemaId: 'urn:astrologo:ai-analysis-reduction',
    schemaVersion: '1.0.0',
    rootInputHash: manifest.rootInputHash,
    promptVersion: manifest.promptVersion,
    reductionId: expected.reductionId,
    level: expected.level,
    ordinal: expected.ordinal,
    fragmentIds,
    coveredEvidenceIds,
    synthesisNotes: parseNotes(value.synthesisNotes, coveredEvidenceIds),
    warnings: parseWarnings(value.warnings),
  };
};

export const parseGeneratedAnalysisSynthesis = (
  generated: GeneratedTextCandidate,
  plan: PackedAnalysisPlan,
): AnalysisSynthesisV1 => {
  const value = parseStoppedJson(generated);
  exactKeys(
    value,
    [
      'schemaId',
      'schemaVersion',
      'rootInputHash',
      'promptVersion',
      'fragmentIds',
      'coveredEvidenceIds',
      'html',
      'warnings',
    ],
    '/',
  );
  if (value.schemaId !== 'urn:astrologo:ai-analysis-synthesis' || value.schemaVersion !== '1.0.0') {
    throw new LongAnalysisContractError('Identidade do schema de síntese inválida.');
  }
  if (value.rootInputHash !== plan.manifest.rootInputHash)
    throw new LongAnalysisContractError('Hash raiz da síntese divergente.');
  if (value.promptVersion !== plan.manifest.promptVersion)
    throw new LongAnalysisContractError('Versão do prompt divergente.');
  const fragmentIds = stringArray(value.fragmentIds, '/fragmentIds');
  assertExactArray(
    fragmentIds,
    plan.fragments.map(({ fragmentId }) => fragmentId),
    'fragmentos',
  );
  const coveredEvidenceIds = stringArray(value.coveredEvidenceIds, '/coveredEvidenceIds');
  assertExactArray(coveredEvidenceIds, plan.coverage.evidenceIds, 'cobertura');
  return {
    schemaId: 'urn:astrologo:ai-analysis-synthesis',
    schemaVersion: '1.0.0',
    rootInputHash: plan.manifest.rootInputHash,
    promptVersion: plan.manifest.promptVersion,
    fragmentIds,
    coveredEvidenceIds,
    html: requiredText(value.html, '/html', MAX_HTML_LENGTH),
    warnings: parseWarnings(value.warnings),
  };
};

export const assembleLongAnalysisHtml = (
  plan: PackedAnalysisPlan,
  fragments: readonly AnalysisFragmentV1[],
  synthesis: AnalysisSynthesisV1,
): string => {
  const byId = new Map<string, AnalysisFragmentV1>();
  for (const fragment of fragments) {
    if (byId.has(fragment.fragmentId)) throw new LongAnalysisContractError('A montagem recebeu fragmento duplicado.');
    byId.set(fragment.fragmentId, fragment);
  }
  if (byId.size !== plan.fragments.length) {
    throw new LongAnalysisContractError('A montagem exige todos os fragmentos do plano.');
  }
  if (
    synthesis.rootInputHash !== plan.manifest.rootInputHash ||
    synthesis.fragmentIds.some((id, index) => id !== plan.fragments[index]?.fragmentId) ||
    synthesis.coveredEvidenceIds.some((id, index) => id !== plan.coverage.evidenceIds[index])
  ) {
    throw new LongAnalysisContractError('A síntese não pertence integralmente ao plano de montagem.');
  }

  const htmlParts = plan.fragments.map((expected) => {
    const fragment = byId.get(expected.fragmentId);
    if (
      !fragment ||
      fragment.rootInputHash !== plan.manifest.rootInputHash ||
      fragment.inputHash !== expected.inputHash ||
      fragment.ordinal !== expected.ordinal
    ) {
      throw new LongAnalysisContractError(`Fragmento inválido na montagem: ${expected.fragmentId}.`);
    }
    return fragment.html.trim();
  });
  htmlParts.push(synthesis.html.trim());
  return htmlParts.join('\n');
};
