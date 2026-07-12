import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

const runtime = vi.hoisted(() => ({
  generateCalls: 0,
  finishReasons: ['STOP'] as string[],
  job: null as Record<string, unknown> | null,
  step: null as Record<string, unknown> | null,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = {
      get: async () => ({ inputTokenLimit: 1_000_000, outputTokenLimit: 65_536 }),
      countTokens: async () => ({ totalTokens: 100 }),
      generateContent: async () => {
        runtime.generateCalls += 1;
        return {
          text: '<p>Análise direta validada.</p>',
          candidates: [{ finishReason: runtime.finishReasons.shift() ?? 'STOP' }],
          usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 100 },
        };
      },
    };
  },
  HarmBlockThreshold: { BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH' },
  HarmCategory: {
    HARM_CATEGORY_DANGEROUS_CONTENT: 'DANGEROUS_CONTENT',
    HARM_CATEGORY_HARASSMENT: 'HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'SEXUALLY_EXPLICIT',
    HARM_CATEGORY_CIVIC_INTEGRITY: 'CIVIC_INTEGRITY',
  },
}));

vi.mock('./_shared/advancedAnalysisPrompt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./_shared/advancedAnalysisPrompt')>();
  return {
    ...actual,
    loadCanonicalNatalAnalysisV1: async () => null,
    loadCanonicalTransitRunV1: async () => null,
    loadCanonicalSynastryRunV1: async () => null,
    loadCanonicalLocalityMapV1: async () => null,
  };
});

vi.mock('./_shared/analysisPrompt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./_shared/analysisPrompt')>();
  return { ...actual, loadCanonicalAnalysisV2: async () => null };
});

vi.mock('./_shared/modelConfig', () => ({
  loadConfiguredAstrologerModel: async () => 'gemini-test',
}));

vi.mock('./_shared/tatwaPrompt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./_shared/tatwaPrompt')>();
  return {
    ...actual,
    loadCanonicalTatwa: async () => ({
      schemaVersion: 'legacy',
      calculationMode: 'legacy-rulingFirst',
      selected: { principal: 'Akasha (Éter)', sub: 'Vayu (Ar)' },
      provenanceAvailable: false,
    }),
  };
});

vi.mock('./_shared/analysisJobRepository', () => {
  const createJobRecord = () => ({
    id: 'analysis:00000000-0000-4000-8000-000000000001',
    capability_hash: 'a'.repeat(64),
    mapa_id: '00000000-0000-4000-8000-000000000002',
    status: 'running',
    phase: 'planning',
    completed_steps: 0,
    total_steps: 1,
    input_tokens: 0,
    output_tokens: 0,
    plan_json: JSON.stringify({
      schemaId: 'urn:astrologo:ai-analysis-job-plan',
      schemaVersion: '1.0.0',
      state: 'planning',
    }),
    fixed_prompt_prefix: '',
    final_result_json: null,
    expires_at: '2099-01-01 00:00:00',
    created_at: '2026-07-12 00:00:00',
    updated_at: '2026-07-12 00:00:00',
  });

  return {
    AnalysisJobAlreadyActiveError: class extends Error {},
    createAnalysisJob: async () => {
      runtime.job = createJobRecord();
      return { job: runtime.job, capability: 'b'.repeat(64) };
    },
    loadAnalysisJob: async () => runtime.job,
    claimAnalysisJob: async () =>
      runtime.job?.status === 'running' ? { job: { ...runtime.job }, leaseOwner: 'lease' } : null,
    releaseAnalysisJob: async () => undefined,
    resetExpiredAnalysisSteps: async () => undefined,
    storeAnalysisPlan: async (options: { plan: unknown; fixedPromptPrefix: string; steps: unknown[] }) => {
      if (!runtime.job) throw new Error('job ausente');
      runtime.job = {
        ...runtime.job,
        phase: 'analyzing',
        completed_steps: 1,
        total_steps: 2,
        plan_json: JSON.stringify(options.plan),
        fixed_prompt_prefix: options.fixedPromptPrefix,
      };
      const input = options.steps[0] as {
        stepKey: string;
        ordinal: number;
        kind: string;
        payload: unknown;
      };
      runtime.step = {
        job_id: runtime.job.id,
        step_key: input.stepKey,
        ordinal: input.ordinal,
        kind: input.kind,
        status: 'pending',
        attempts: 0,
        payload_json: JSON.stringify(input.payload),
        result_json: null,
        input_tokens: 0,
        output_tokens: 0,
      };
    },
    claimNextAnalysisStep: async () => {
      if (runtime.step?.status !== 'pending') return null;
      runtime.step = { ...runtime.step, status: 'running', attempts: Number(runtime.step.attempts) + 1 };
      return { ...runtime.step };
    },
    completeAnalysisStep: async (options: { result: unknown; inputTokens: number; outputTokens: number }) => {
      if (!runtime.job || !runtime.step) throw new Error('estado ausente');
      runtime.step = { ...runtime.step, status: 'completed', result_json: JSON.stringify(options.result) };
      runtime.job = {
        ...runtime.job,
        completed_steps: Number(runtime.job.completed_steps) + 1,
        input_tokens: Number(runtime.job.input_tokens) + options.inputTokens,
        output_tokens: Number(runtime.job.output_tokens) + options.outputTokens,
      };
    },
    retryOrFailAnalysisStep: async (options: { step: { attempts: number }; payload: unknown }) => {
      if (!runtime.job || !runtime.step) throw new Error('estado ausente');
      const retry = options.step.attempts < 3;
      runtime.step = {
        ...runtime.step,
        status: retry ? 'pending' : 'failed',
        payload_json: JSON.stringify(options.payload),
      };
      if (!retry) runtime.job = { ...runtime.job, status: 'failed', phase: 'failed' };
      return retry ? 'retry' : 'failed';
    },
    listAnalysisSteps: async () => (runtime.step ? [runtime.step] : []),
    completeAnalysisJob: async () => {
      if (!runtime.job) throw new Error('job ausente');
      runtime.job = {
        ...runtime.job,
        status: 'completed',
        phase: 'completed',
        completed_steps: runtime.job.total_steps,
        final_result_json: JSON.stringify({ persisted: true, mapaId: MAP_ID }),
      };
    },
    appendAnalysisSteps: async () => undefined,
    failAnalysisJob: async () => {
      if (runtime.job) runtime.job = { ...runtime.job, status: 'failed', phase: 'failed' };
    },
    parseStoredJson: (value: string) => JSON.parse(value),
  };
});

const MAP_ID = '00000000-0000-4000-8000-000000000002';
const CAPABILITY = 'b'.repeat(64);
const JOB_ID = 'analysis:00000000-0000-4000-8000-000000000001';

const createDb = (): D1DatabaseLike =>
  ({
    prepare: (query: string) => {
      const statement: D1Statement<Record<string, unknown>> = {
        bind: () => statement,
        first: async () => {
          if (query.includes('SELECT id FROM astrologo_mapas')) return { id: MAP_ID };
          if (query.includes('dados_astronomica, dados_tropical, dados_globais')) {
            return {
              id: MAP_ID,
              nome: 'Consulente',
              data_nascimento: '2000-01-01',
              hora_nascimento: '12:00',
              local_nascimento: 'Rio de Janeiro, RJ',
              dados_astronomica: JSON.stringify({ astrologia: [] }),
              dados_tropical: JSON.stringify({ astrologia: [] }),
              dados_globais: JSON.stringify({ numerologia: { expressao: 7 } }),
            };
          }
          if (query.includes('AS occupied_bytes')) return { occupied_bytes: 1_000 };
          if (query.includes('SELECT analise_ia FROM astrologo_mapas')) {
            return { analise_ia: '<p>Análise direta validada.</p>' };
          }
          return null;
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [] }),
      };
      return statement;
    },
  }) as D1DatabaseLike;

const request = (body: Record<string, unknown>) =>
  new Request('https://mapa-astral.lcv.app.br/api/analisar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://mapa-astral.lcv.app.br' },
    body: JSON.stringify(body),
  });

const context = (body: Record<string, unknown>) => ({
  request: request(body),
  env: { GEMINI_API_KEY: 'test', BIGDATA_DB: createDb() },
});

beforeEach(() => {
  runtime.generateCalls = 0;
  runtime.finishReasons = ['STOP'];
  runtime.job = null;
  runtime.step = null;
});

afterEach(() => vi.clearAllMocks());

describe('/api/analisar — protocolo reentrante', () => {
  it('inicia, planeja e gera em requisições distintas, com no máximo uma geração por avanço', async () => {
    const { onRequestPost } = await import('./analisar');

    const started = await onRequestPost(context({ action: 'start', id: MAP_ID }));
    expect(started.status).toBe(202);
    expect(runtime.generateCalls).toBe(0);

    const planned = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    expect(planned.status).toBe(202);
    expect(runtime.generateCalls).toBe(0);

    const completed = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    expect(runtime.generateCalls).toBe(1);
    expect(completed.status).toBe(200);
    await expect(completed.json()).resolves.toMatchObject({
      success: true,
      analise: '<p>Análise direta validada.</p>',
      job: { status: 'completed', completedSteps: 2, totalSteps: 2 },
    });
  });

  it('transforma cada tentativa em uma nova requisição e nunca repete dentro do mesmo avanço', async () => {
    runtime.finishReasons = ['MAX_TOKENS', 'STOP'];
    const { onRequestPost } = await import('./analisar');
    await onRequestPost(context({ action: 'start', id: MAP_ID }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    const firstAttempt = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    expect(firstAttempt.status).toBe(202);
    expect(runtime.generateCalls).toBe(1);

    const secondAttempt = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    expect(secondAttempt.status).toBe(200);
    expect(runtime.generateCalls).toBe(2);
  });
});
