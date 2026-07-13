import { describe, expect, it, vi } from 'vitest';
import {
  captureMonolithicPrompt,
  createAnalysisManifest,
  createModelInstructionPrefix,
  extractMonolithicPromptPayloads,
  extractSemanticAnalysisUnits,
  packAnalysisUnits,
  restoreJsonDocumentFromParts,
  restoreLocalityFromUnits,
  restoreLocalityLineFromWindows,
  restoreMonolithicPrompt,
  restoreMonolithicPromptPayloads,
  TokenCountUnavailableError,
} from './longAnalysisPlanner';

const localityLine = (recordId: string, coordinateCount: number) => ({
  recordId,
  bodyId: 'sun',
  bodyDisplayNamePtBr: 'Sol',
  bodySymbol: '☉',
  angleId: 'mc',
  angleDisplayNamePtBr: 'Meio do Céu',
  availability: { status: 'available', sampledLatitudeCount: coordinateCount, solvedLatitudeCount: coordinateCount },
  geometry: {
    type: 'MultiLineString',
    coordinates: [
      Array.from({ length: coordinateCount }, (_, index) => [
        Number((-43.25 + index / 100).toFixed(2)),
        Number((-89 + index / 2).toFixed(1)),
      ]),
    ],
  },
});

const sources = (coordinateCount = 4) => ({
  legacy: {
    query: { nome: 'Consulente', localNascimento: 'Rio de Janeiro, RJ' },
    tropical: { astrologia: [{ astro: 'Sol', signo: 'Áries' }] },
    astronomical: { astrologia: [{ astro: 'Sol', signo: 'Peixes' }] },
    globals: { tatwa: { principal: 'Akasha' }, numerologia: { expressao: 7 } },
  },
  canonicalTatwa: { schemaVersion: '1.0.0', principal: 'Akasha' },
  canonicalV2: { schemaVersion: '2.0.0', positions: [{ bodyId: 'sun' }] },
  natal: { schemaId: 'urn:astrologo:natal-chart-analysis', aspects: [{ recordId: 'sun-moon' }] },
  transit: { schemaId: 'urn:astrologo:transit-run', aspects: [{ recordId: 'transit:sun|natal:moon|square' }] },
  synastry: { schemaId: 'urn:astrologo:synastry-run', aspects: [{ recordId: 'A:sun|B:moon|trine' }] },
  locality: {
    schemaId: 'urn:astrologo:locality-map',
    schemaVersion: '1.0.0',
    models: { sampling: { latitudeResolutionDeg: 0.5 } },
    bodies: [{ bodyId: 'sun' }],
    lines: [localityLine('sun:mc', coordinateCount), localityLine('sun:ic', coordinateCount)],
    diagnostics: [],
  },
});

describe('planejador puro da análise longa', () => {
  it('preserva e restaura byte a byte o prompt monolítico, inclusive CRLF, espaços e Unicode', async () => {
    const prompt = 'INÍCIO\r\nLinha com espaço final  \r\n☉ 🌟\nFIM\n';
    const snapshot = await captureMonolithicPrompt(prompt);

    expect(snapshot.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(snapshot.byteLength).toBe(new TextEncoder().encode(prompt).byteLength);
    await expect(restoreMonolithicPrompt(snapshot)).resolves.toBe(prompt);

    const tampered = { ...snapshot, bytes: new Uint8Array(snapshot.bytes) };
    tampered.bytes[0] = (tampered.bytes[0] ?? 0) ^ 1;
    await expect(restoreMonolithicPrompt(tampered)).rejects.toThrow(/hash/i);
  });

  it('extrai somente payloads serializados, conserva todas as frases em ordem e restaura o prompt original', async () => {
    const legacy = '{"tropical":{"signo":"Áries"}}';
    const locality =
      '{"schemaId":"urn:astrologo:locality-map","lines":[{"geometry":{"coordinates":[[[-43.2,-22.9]]]}}]}';
    const prompt = [
      'INSTRUÇÃO ANTERIOR INTACTA.',
      `DADOS LEGADOS — INÍCIO\n${legacy}\nDADOS LEGADOS — FIM`,
      'INSTRUÇÃO INTERMEDIÁRIA INTACTA.',
      `DADOS_LOCALIDADE_V1 — INÍCIO\n${locality}\nDADOS_LOCALIDADE_V1 — FIM`,
      'INSTRUÇÃO FINAL INTACTA.',
    ].join('\r\n');

    const extracted = await extractMonolithicPromptPayloads(prompt, [
      { payloadId: 'legacy', serialized: legacy },
      { payloadId: 'locality', serialized: locality },
    ]);

    expect(extracted.fixedInstructionPrefix).not.toContain(legacy);
    expect(extracted.fixedInstructionPrefix).not.toContain(locality);
    expect(extracted.fixedInstructionPrefix).not.toContain('coordinates');
    expect(extracted.fixedInstructionPrefix.indexOf('INSTRUÇÃO ANTERIOR INTACTA.')).toBeLessThan(
      extracted.fixedInstructionPrefix.indexOf('INSTRUÇÃO INTERMEDIÁRIA INTACTA.'),
    );
    expect(extracted.fixedInstructionPrefix.indexOf('INSTRUÇÃO INTERMEDIÁRIA INTACTA.')).toBeLessThan(
      extracted.fixedInstructionPrefix.indexOf('INSTRUÇÃO FINAL INTACTA.'),
    );
    expect(extracted.payloads.map(({ payloadId }) => payloadId)).toEqual(['legacy', 'locality']);
    expect(extracted.fixedInstructionPrefix).toContain('ASTROLOGO_PAYLOAD');
    const modelInstructionPrefix = createModelInstructionPrefix(extracted);
    expect(modelInstructionPrefix).not.toContain('ASTROLOGO_PAYLOAD');
    expect(modelInstructionPrefix).not.toContain('⟦');
    expect(modelInstructionPrefix).not.toContain('⟧');
    expect(modelInstructionPrefix).toContain('INSTRUÇÃO ANTERIOR INTACTA.');
    expect(modelInstructionPrefix).toContain('INSTRUÇÃO FINAL INTACTA.');
    await expect(restoreMonolithicPromptPayloads(extracted)).resolves.toBe(prompt);
  });

  it('extrai todas as fontes em ordem estável e restaura a localidade sem perder linhas ou coordenadas', async () => {
    const input = sources();
    const units = await extractSemanticAnalysisUnits(input);

    expect(units.map(({ unitId }) => unitId)).toEqual([
      'legacy.query',
      'legacy.tropical',
      'legacy.astronomical',
      'legacy.globals',
      'canonical.tatwa',
      'canonical.v2',
      'advanced.natal',
      'advanced.transit',
      'advanced.synastry',
      'advanced.locality.metadata',
      'advanced.locality.line.sun:mc',
      'advanced.locality.line.sun:ic',
    ]);
    expect(new Set(units.map(({ evidenceId }) => evidenceId)).size).toBe(units.length);
    expect(units.every(({ sourceHash }) => /^[0-9a-f]{64}$/u.test(sourceHash))).toBe(true);
    expect(restoreLocalityFromUnits(units)).toEqual(input.locality);
  });

  it('produz manifesto e hashes determinísticos ligados ao prompt e a todas as fontes', async () => {
    const prompt = await captureMonolithicPrompt('PROMPT VIGENTE, SEM ALTERAÇÃO.');
    const units = await extractSemanticAnalysisUnits(sources());

    const first = await createAnalysisManifest(prompt, units, 'astrologo-long-analysis-v1');
    const second = await createAnalysisManifest(prompt, units, 'astrologo-long-analysis-v1');

    expect(second).toEqual(first);
    expect(first.monolithicPromptHash).toBe(prompt.sha256);
    expect(first.evidenceIds).toEqual(units.map(({ evidenceId }) => evidenceId));
    expect(first.rootInputHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('mantém linhas cartográficas inteiras quando cada linha cabe no orçamento', async () => {
    const prompt = await captureMonolithicPrompt('INSTRUÇÕES FIXAS');
    const units = await extractSemanticAnalysisUnits(sources(4));
    const manifest = await createAnalysisManifest(prompt, units, 'v1');
    const countTokens = vi.fn(async (value: string) => Math.ceil(value.length / 4));

    const plan = await packAnalysisUnits({
      manifest,
      units,
      fixedInstructionPrefix: 'INSTRUÇÕES FIXAS',
      maxInputTokens: 1_000,
      countTokens,
    });

    const localityUnits = plan.fragments.flatMap(({ units: fragmentUnits }) =>
      fragmentUnits.filter(({ kind }) => kind.startsWith('locality-line')),
    );
    expect(localityUnits).toHaveLength(2);
    expect(localityUnits.every(({ kind }) => kind === 'locality-line')).toBe(true);
    expect(plan.fragments.every(({ inputTokens }) => inputTokens <= 1_000)).toBe(true);
    expect(plan.coverage.evidenceIds).toEqual(plan.fragments.flatMap(({ coveredEvidenceIds }) => coveredEvidenceIds));
  });

  it('não consome uma chamada countTokens por unidade quando quarenta linhas cabem no mesmo lote', async () => {
    const input = sources();
    input.locality.lines = Array.from({ length: 40 }, (_, index) => localityLine(`sun:line-${index}`, 4));
    const prompt = await captureMonolithicPrompt('INSTRUÇÕES FIXAS');
    const units = await extractSemanticAnalysisUnits(input);
    const manifest = await createAnalysisManifest(prompt, units, 'v1');
    const countTokens = vi.fn(async (value: string) => Math.ceil(value.length / 4));

    const plan = await packAnalysisUnits({
      manifest,
      units,
      fixedInstructionPrefix: 'INSTRUÇÕES FIXAS',
      maxInputTokens: 100_000,
      countTokens,
    });

    expect(plan.coverage.sourceEvidenceIds).toEqual(units.map(({ sourceEvidenceId }) => sourceEvidenceId));
    expect(countTokens.mock.calls.length).toBeLessThan(10);
  });

  it('mantém consulta, sistemas, fundamentos, Tatwas, V2 e natal no mesmo núcleo quando cabem', async () => {
    const prompt = await captureMonolithicPrompt('INSTRUÇÕES FIXAS');
    const units = await extractSemanticAnalysisUnits(sources());
    const manifest = await createAnalysisManifest(prompt, units, 'v1');
    const plan = await packAnalysisUnits({
      manifest,
      units,
      fixedInstructionPrefix: 'INSTRUÇÕES FIXAS',
      maxInputTokens: 100_000,
      countTokens: async (value) => Math.ceil(value.length / 4),
    });

    const coreIds = [
      'legacy.query',
      'legacy.tropical',
      'legacy.astronomical',
      'legacy.globals',
      'canonical.tatwa',
      'canonical.v2',
      'advanced.natal',
    ];
    const coreFragments = plan.fragments.filter(({ units: fragmentUnits }) =>
      fragmentUnits.some(({ evidenceId }) => coreIds.includes(evidenceId)),
    );
    expect(coreFragments).toHaveLength(1);
    expect(coreFragments[0]?.domain).toBe('core');
    expect(coreFragments[0]?.coveredEvidenceIds).toEqual(coreIds);
    expect(
      plan.fragments.some(
        ({ coveredEvidenceIds }) => coveredEvidenceIds.length === 1 && coveredEvidenceIds[0] === 'legacy.query',
      ),
    ).toBe(false);
  });

  it('divide e reconstrói qualquer documento JSON isoladamente excessivo, não apenas linhas cartográficas', async () => {
    const input = sources();
    input.transit = {
      schemaId: 'urn:astrologo:transit-run',
      aspects: Array.from({ length: 120 }, (_, index) => ({
        recordId: `transit:${index}`,
        description: `Influência ${index} — ${'x'.repeat(80)}`,
        orbDeg: index / 100,
      })),
    };
    const prompt = await captureMonolithicPrompt('PREFIXO');
    const units = await extractSemanticAnalysisUnits(input);
    const manifest = await createAnalysisManifest(prompt, units, 'v1');
    const parent = units.find(({ unitId }) => unitId === 'advanced.transit')!;
    const plan = await packAnalysisUnits({
      manifest,
      units,
      fixedInstructionPrefix: 'PREFIXO',
      maxInputTokens: 220,
      countTokens: async (value) => Math.ceil(value.length / 8),
    });

    const parts = plan.fragments
      .flatMap(({ units: fragmentUnits }) => fragmentUnits)
      .filter(({ parentUnitId }) => parent.unitId === parentUnitId);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every(({ kind }) => kind === 'json-document-part')).toBe(true);
    await expect(restoreJsonDocumentFromParts(parent, parts)).resolves.toEqual(input.transit);
    expect(plan.fragments.every(({ inputTokens }) => inputTokens <= 220)).toBe(true);
  });

  it('divide somente a linha isoladamente excedente em janelas contíguas e preserva toda coordenada', async () => {
    const prompt = await captureMonolithicPrompt('PREFIXO');
    const units = await extractSemanticAnalysisUnits(sources(80));
    const manifest = await createAnalysisManifest(prompt, units, 'v1');
    const countTokens = vi.fn(async (value: string) => Math.ceil(value.length / 8));

    const plan = await packAnalysisUnits({
      manifest,
      units,
      fixedInstructionPrefix: 'PREFIXO',
      maxInputTokens: 180,
      countTokens,
    });

    const windows = plan.fragments
      .flatMap(({ units: fragmentUnits }) => fragmentUnits)
      .filter(({ kind }) => kind === 'locality-line-window');
    expect(windows.length).toBeGreaterThan(2);
    const mcWindows = windows.filter(({ parentUnitId }) => parentUnitId === 'advanced.locality.line.sun:mc');
    expect(mcWindows.length).toBeGreaterThan(1);
    expect(
      mcWindows.map(({ window }) => window && [window.segmentIndex, window.startIndex, window.endIndexExclusive]),
    ).toEqual(expect.arrayContaining([[0, 0, expect.any(Number)]]));
    for (let index = 1; index < mcWindows.length; index += 1) {
      expect(mcWindows[index]?.window?.startIndex).toBe(mcWindows[index - 1]?.window?.endIndexExclusive);
    }
    expect(mcWindows.at(-1)?.window?.endIndexExclusive).toBe(80);
    const allPackedEvidenceIds = plan.fragments.flatMap(({ coveredEvidenceIds }) => coveredEvidenceIds);
    expect(new Set(allPackedEvidenceIds).size).toBe(allPackedEvidenceIds.length);
    expect(plan.coverage.evidenceIds).toEqual(allPackedEvidenceIds);
    expect(plan.coverage.evidenceIds).not.toContain('advanced.locality.line.sun:mc');
    expect(
      await restoreLocalityLineFromWindows(
        units.find(({ unitId }) => unitId === 'advanced.locality.line.sun:mc')!,
        mcWindows,
      ),
    ).toEqual((sources(80).locality.lines as unknown[])[0]);
    expect(plan.fragments.every(({ inputTokens }) => inputTokens <= 180)).toBe(true);
  });

  it('falha fechado quando a contagem de tokens falha ou retorna valor inválido', async () => {
    const prompt = await captureMonolithicPrompt('PREFIXO');
    const units = await extractSemanticAnalysisUnits(sources());
    const manifest = await createAnalysisManifest(prompt, units, 'v1');

    await expect(
      packAnalysisUnits({
        manifest,
        units,
        fixedInstructionPrefix: 'PREFIXO',
        maxInputTokens: 1_000,
        countTokens: async () => {
          throw new Error('indisponível');
        },
      }),
    ).rejects.toBeInstanceOf(TokenCountUnavailableError);

    await expect(
      packAnalysisUnits({
        manifest,
        units,
        fixedInstructionPrefix: 'PREFIXO',
        maxInputTokens: 1_000,
        countTokens: async () => -1,
      }),
    ).rejects.toBeInstanceOf(TokenCountUnavailableError);
  });
});
