import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1DatabaseLike, D1Statement } from './_shared/requestSecurity';

const runtime = vi.hoisted(() => ({
  generateCalls: 0,
  generateRequests: [] as Array<Record<string, unknown>>,
  generateErrors: [] as Array<Error & { status?: number }>,
  finishReasons: ['STOP'] as string[],
  totalTokens: 100,
  model: 'gemini-3.1-pro-preview',
  fragmentHtml: '<h2>Parte validada</h2><p>Análise fragmentada em português do Brasil.</p>',
  synthesisHtml: '',
  directHtml:
    '<h2>Astrologia Tropical</h2><p>O Sol organiza a expressão pessoal e dialoga com a Lua e o Ascendente.</p><h2>Astrologia Astronômica Constelacional</h2><p>Os planetas em suas constelações acrescentam nuances simbólicas à leitura desta pessoa.</p><h2>Orixás e Astro</h2><p>O Orixá regente dialoga com o Astro da Hora Planetária e orienta sua expressão.</p><h2>Tatwas e Numerologia</h2><p>O Tatwa principal e o subtatwa se integram à Numerologia e ao Caminho da Vida.</p><h2>Síntese Integrada</h2><p>Os padrões reunidos revelam recursos, tensões e possibilidades que podem ser observados conscientemente.</p>',
  job: null as Record<string, unknown> | null,
  step: null as Record<string, unknown> | null,
  steps: [] as Array<Record<string, unknown>>,
  lastRetryOptions: null as Record<string, unknown> | null,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    readonly models = {
      get: async () => ({ inputTokenLimit: 1_000_000, outputTokenLimit: 65_536 }),
      countTokens: async () => ({ totalTokens: runtime.totalTokens }),
      generateContent: async (request: Record<string, unknown>) => {
        runtime.generateCalls += 1;
        runtime.generateRequests.push(request);
        const generateError = runtime.generateErrors.shift();
        if (generateError) throw generateError;
        const config = request.config as
          | {
              responseJsonSchema?: {
                properties?: {
                  html?: unknown;
                  synthesisNotes?: {
                    items?: { properties?: { evidenceIds?: { items?: { enum?: string[] } } } };
                  };
                };
              };
            }
          | undefined;
        const responseSchema = config?.responseJsonSchema;
        const evidenceIds = responseSchema?.properties?.synthesisNotes?.items?.properties?.evidenceIds?.items?.enum;
        const structuredText = responseSchema
          ? responseSchema.properties?.synthesisNotes
            ? JSON.stringify({
                ...(responseSchema.properties.html ? { html: runtime.fragmentHtml } : {}),
                synthesisNotes: [
                  {
                    textPtBr: 'Síntese factual da parte validada.',
                    evidenceIds,
                  },
                ],
                warnings: [],
              })
            : JSON.stringify({ html: runtime.synthesisHtml, warnings: [] })
          : runtime.directHtml;
        return {
          text: structuredText,
          candidates: [{ finishReason: runtime.finishReasons.shift() ?? 'STOP' }],
          usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 100, thoughtsTokenCount: 50 },
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
  ThinkingLevel: { LOW: 'LOW', MEDIUM: 'MEDIUM' },
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
  loadConfiguredAstrologerModel: async () => runtime.model,
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
    storeAnalysisPlan: async (options: {
      plan: unknown;
      fixedPromptPrefix: string;
      steps: unknown[];
      reservedFinalSteps: number;
    }) => {
      if (!runtime.job) throw new Error('job ausente');
      runtime.job = {
        ...runtime.job,
        phase: 'analyzing',
        completed_steps: 1,
        total_steps: options.steps.length + 1 + options.reservedFinalSteps,
        plan_json: JSON.stringify(options.plan),
        fixed_prompt_prefix: options.fixedPromptPrefix,
      };
      runtime.steps = options.steps.map((candidate) => {
        const input = candidate as {
          stepKey: string;
          ordinal: number;
          kind: string;
          payload: unknown;
        };
        return {
          job_id: runtime.job?.id,
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
      });
      runtime.step = runtime.steps[0] ?? null;
    },
    claimNextAnalysisStep: async (_db: unknown, _jobId: string, _leaseOwner: string, kind: string | string[]) => {
      const kinds = Array.isArray(kind) ? kind : [kind];
      const index = runtime.steps.findIndex((step) => step.status === 'pending' && kinds.includes(String(step.kind)));
      if (index < 0) return null;
      const claimed = {
        ...runtime.steps[index],
        status: 'running',
        attempts: Number(runtime.steps[index]?.attempts) + 1,
      };
      runtime.steps[index] = claimed;
      runtime.step = claimed;
      return { ...claimed };
    },
    completeAnalysisStep: async (options: {
      stepKey: string;
      result: unknown;
      inputTokens: number;
      outputTokens: number;
    }) => {
      if (!runtime.job) throw new Error('estado ausente');
      const index = runtime.steps.findIndex((step) => step.step_key === options.stepKey);
      if (index < 0) throw new Error('etapa ausente');
      const completed = {
        ...runtime.steps[index],
        status: 'completed',
        result_json: JSON.stringify(options.result),
        error_code: null,
        error_detail: null,
      };
      runtime.steps[index] = completed;
      runtime.step = completed;
      runtime.job = {
        ...runtime.job,
        completed_steps: Number(runtime.job.completed_steps) + 1,
        input_tokens: Number(runtime.job.input_tokens) + options.inputTokens,
        output_tokens: Number(runtime.job.output_tokens) + options.outputTokens,
      };
    },
    retryOrFailAnalysisStep: async (options: {
      step: { attempts: number; step_key: string };
      payload: unknown;
      retryable?: boolean;
      errorCode: string;
      errorDetail: string;
    }) => {
      if (!runtime.job) throw new Error('estado ausente');
      runtime.lastRetryOptions = options;
      const retry = options.retryable !== false && options.step.attempts < 3;
      const index = runtime.steps.findIndex((step) => step.step_key === options.step.step_key);
      if (index < 0) throw new Error('etapa ausente');
      const retried = {
        ...runtime.steps[index],
        status: retry ? 'pending' : 'failed',
        payload_json: JSON.stringify(options.payload),
        error_code: options.errorCode,
        error_detail: options.errorDetail,
      };
      runtime.steps[index] = retried;
      runtime.step = retried;
      if (!retry) {
        runtime.job = {
          ...runtime.job,
          status: 'failed',
          phase: 'failed',
          error_code: options.errorCode,
          error_detail: options.errorDetail,
        };
      }
      return retry ? 'retry' : 'failed';
    },
    listAnalysisSteps: async () => runtime.steps,
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
    appendAnalysisSteps: async (options: {
      phase: string;
      steps: Array<{ stepKey: string; ordinal: number; kind: string; payload: unknown }>;
      plan: unknown;
      reserveWasAlreadyCounted?: boolean;
    }) => {
      if (!runtime.job) throw new Error('job ausente');
      const appended = options.steps.map((input) => ({
        job_id: runtime.job?.id,
        step_key: input.stepKey,
        ordinal: input.ordinal,
        kind: input.kind,
        status: 'pending',
        attempts: 0,
        payload_json: JSON.stringify(input.payload),
        result_json: null,
        input_tokens: 0,
        output_tokens: 0,
      }));
      runtime.steps.push(...appended);
      runtime.job = {
        ...runtime.job,
        phase: options.phase,
        plan_json: JSON.stringify(options.plan),
        total_steps:
          Number(runtime.job.total_steps) +
          (options.reserveWasAlreadyCounted ? Math.max(0, options.steps.length - 1) : options.steps.length),
      };
    },
    failAnalysisJob: async (options: { errorCode: string; errorDetail: string }) => {
      if (runtime.job)
        runtime.job = {
          ...runtime.job,
          status: 'failed',
          phase: 'failed',
          error_code: options.errorCode,
          error_detail: options.errorDetail,
        };
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
  runtime.generateRequests = [];
  runtime.generateErrors = [];
  runtime.finishReasons = ['STOP'];
  runtime.totalTokens = 100;
  runtime.model = 'gemini-3.1-pro-preview';
  runtime.fragmentHtml = '<h2>Parte validada</h2><p>Análise fragmentada em português do Brasil.</p>';
  runtime.directHtml =
    '<h2>Astrologia Tropical</h2><p>O Sol organiza a expressão pessoal e dialoga com a Lua e o Ascendente.</p><h2>Astrologia Astronômica Constelacional</h2><p>Os planetas em suas constelações acrescentam nuances simbólicas à leitura desta pessoa.</p><h2>Orixás e Astro</h2><p>O Orixá regente dialoga com o Astro da Hora Planetária e orienta sua expressão.</p><h2>Tatwas e Numerologia</h2><p>O Tatwa principal e o subtatwa se integram à Numerologia e ao Caminho da Vida.</p><h2>Síntese Integrada</h2><p>Os padrões reunidos revelam recursos, tensões e possibilidades que podem ser observados conscientemente.</p>';
  runtime.synthesisHtml = runtime.directHtml;
  runtime.job = null;
  runtime.step = null;
  runtime.steps = [];
  runtime.lastRetryOptions = null;
});

afterEach(() => vi.clearAllMocks());

describe('/api/analisar — protocolo reentrante', () => {
  it('deriva do mapa a lista editorial completa enviada à síntese', async () => {
    const { integratedInterpretiveSectionLabels } = await import('./analisar');
    expect(
      integratedInterpretiveSectionLabels([
        'legacy.tropical',
        'legacy.astronomical',
        'canonical.tatwa',
        'canonical.v2',
        'advanced.natal',
        'advanced.transit',
        'advanced.synastry',
        'advanced.locality.mercury',
      ]),
    ).toEqual([
      'Astrologia Tropical',
      'Astrologia Astronômica Constelacional',
      'Orixás e Astro',
      'Tatwas e Numerologia',
      'Aspectos Natais',
      'Análise das Casas',
      'Anjo Regente do Consulente',
      'Falange Angelical do Mapa',
      'Céu Atual e Trânsitos',
      'Sinastria',
      'Mapa Planetário de Localidade',
      'Síntese Integrada',
    ]);
  });

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

  it('fragmenta acima de 6.000 tokens, injeta a identidade no servidor e usa thinking LOW em uma única geração', async () => {
    runtime.totalTokens = 6_001;
    const { onRequestPost } = await import('./analisar');

    await onRequestPost(context({ action: 'start', id: MAP_ID }));
    const planned = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    expect(planned.status).toBe(202);
    expect(JSON.parse(String(runtime.job?.plan_json))).toMatchObject({
      mode: 'partitioned',
      model: 'gemini-3.1-pro-preview',
    });
    expect(runtime.step).toMatchObject({ kind: 'fragment', status: 'pending', attempts: 0 });
    expect(runtime.job?.fixed_prompt_prefix).not.toContain('ASTROLOGO_PAYLOAD');
    expect(runtime.generateCalls).toBe(0);

    const advanced = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    expect(advanced.status).toBe(202);
    expect(runtime.generateCalls).toBe(1);
    expect(runtime.generateRequests).toHaveLength(1);
    expect(runtime.generateRequests[0]).toMatchObject({
      model: 'gemini-3.1-pro-preview',
      config: {
        thinkingConfig: { thinkingLevel: 'LOW' },
        responseMimeType: 'application/json',
      },
    });
    const responseSchema = (
      runtime.generateRequests[0]?.config as { responseJsonSchema?: { required?: string[] } } | undefined
    )?.responseJsonSchema;
    expect(responseSchema?.required).toEqual(['html', 'synthesisNotes', 'warnings']);

    const storedResult = JSON.parse(String(runtime.step?.result_json)) as {
      fragment: Record<string, unknown>;
    };
    expect(storedResult.fragment).toMatchObject({
      schemaId: 'urn:astrologo:ai-analysis-fragment',
      schemaVersion: '1.0.0',
      html: '<h2>Parte validada</h2><p>Análise fragmentada em português do Brasil.</p>',
    });
    expect(storedResult.fragment.rootInputHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(storedResult.fragment.inputHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(storedResult.fragment.fragmentId).toEqual(expect.any(String));
    expect(storedResult.fragment.coveredEvidenceIds).toEqual(expect.any(Array));
    expect(runtime.job?.output_tokens).toBe(150);
  });

  it('remove sentinelas internas do HTML antes de persistir cada fragmento', async () => {
    runtime.totalTokens = 6_001;
    runtime.fragmentHtml =
      `<p>Antes ⟦ASTROLOGO_PAYLOAD:legacy.query:${'a'.repeat(64)}⟧ depois.</p>` +
      `<p>&#x27E6;ASTROLOGO_PAYLOAD:canonical.tatwa:${'b'.repeat(64)}&#x27E7;</p>`;
    const { onRequestPost } = await import('./analisar');

    await onRequestPost(context({ action: 'start', id: MAP_ID }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    const storedResult = JSON.parse(String(runtime.step?.result_json)) as {
      fragment: { html: string };
    };
    expect(storedResult.fragment.html).toContain('Antes');
    expect(storedResult.fragment.html).toContain('depois.');
    expect(storedResult.fragment.html).not.toContain('ASTROLOGO_PAYLOAD');
    expect(storedResult.fragment.html).not.toContain('⟦');
    expect(storedResult.fragment.html).not.toContain('⟧');
  });

  it('preserva de modo seguro o finishReason e a causa estrutural da tentativa particionada', async () => {
    runtime.totalTokens = 6_001;
    runtime.finishReasons = ['SAFETY'];
    const { onRequestPost } = await import('./analisar');

    await onRequestPost(context({ action: 'start', id: MAP_ID }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    const attempted = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    expect(attempted.status).toBe(202);
    expect(runtime.generateCalls).toBe(1);
    expect(runtime.lastRetryOptions?.errorDetail).toEqual(expect.stringContaining('SAFETY'));
    expect(runtime.lastRetryOptions?.errorDetail).toEqual(
      expect.stringContaining('A geração só é completa quando finishReason é STOP.'),
    );
  });

  it('não transforma uma omissão editorial da síntese em falha estrutural do trabalho', async () => {
    runtime.totalTokens = 6_001;
    runtime.synthesisHtml = runtime.directHtml.replace(/<h2>Síntese Integrada<\/h2><p>[\s\S]*?<\/p>/u, '');
    const { onRequestPost } = await import('./analisar');

    await onRequestPost(context({ action: 'start', id: MAP_ID }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    const synthesisScheduled = await onRequestPost(
      context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }),
    );

    expect(synthesisScheduled.status).toBe(202);
    await expect(synthesisScheduled.json()).resolves.toMatchObject({
      success: true,
      job: { status: 'running', phase: 'synthesizing' },
    });

    const completed = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    expect(completed.status).toBe(200);
    await expect(completed.json()).resolves.toMatchObject({
      success: true,
      job: { status: 'completed', phase: 'completed' },
    });
    expect(runtime.steps.find((step) => step.kind === 'synthesis')).toMatchObject({
      status: 'completed',
      attempts: 1,
      error_code: null,
    });
    expect(runtime.lastRetryOptions).toBeNull();
  });

  it('não repete erro HTTP determinístico do provedor', async () => {
    runtime.generateErrors = [
      Object.assign(
        new Error(
          'Invalid API request x-goog-api-key: AIza123456789012345678901234567890 apiKey":"secondary-secret" ' +
            '{"Authorization":"Bearer serialized-auth","x-goog-api-key":"serialized-key"}',
        ),
        { status: 400 },
      ),
    ];
    const { onRequestPost } = await import('./analisar');

    await onRequestPost(context({ action: 'start', id: MAP_ID }));
    await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));
    const attempted = await onRequestPost(context({ action: 'advance', jobId: JOB_ID, capability: CAPABILITY }));

    expect(attempted.status).toBe(422);
    expect(runtime.generateCalls).toBe(1);
    expect(runtime.lastRetryOptions).toMatchObject({
      retryable: false,
      errorCode: 'AI_PROVIDER_REQUEST_FAILED',
    });
    expect(runtime.lastRetryOptions?.errorDetail).toEqual(expect.stringContaining('status=400'));
    expect(runtime.lastRetryOptions?.errorDetail).toEqual(expect.stringContaining('[REDACTED]'));
    expect(runtime.lastRetryOptions?.errorDetail).not.toContain('AIza123456789012345678901234567890');
    expect(runtime.lastRetryOptions?.errorDetail).not.toContain('secondary-secret');
    expect(runtime.lastRetryOptions?.errorDetail).not.toContain('serialized-auth');
    expect(runtime.lastRetryOptions?.errorDetail).not.toContain('serialized-key');
  });
});
