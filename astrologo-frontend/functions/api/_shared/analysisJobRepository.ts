import { hasInternalAnalysisMarkerResidue, stripInternalAnalysisMarkers } from '../../../src/analysisOutput';
import { finalizeUserAnalysisHtml, hasInternalImplementationLeakage } from './analysisEditorial';
import { type D1DatabaseLike, type D1Statement, hashToken } from './requestSecurity';

export type AnalysisJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AnalysisJobPhase = 'planning' | 'analyzing' | 'reducing' | 'synthesizing' | 'completed' | 'failed';
export type AnalysisStepKind = 'direct' | 'fragment' | 'reduction' | 'synthesis';
export type AnalysisStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AnalysisJobRecord {
  readonly id: string;
  readonly capability_hash: string;
  readonly mapa_id: string;
  readonly status: AnalysisJobStatus;
  readonly phase: AnalysisJobPhase;
  readonly lease_owner?: string | null;
  readonly lease_expires_at?: string | null;
  readonly completed_steps: number;
  readonly total_steps: number;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly plan_json: string;
  readonly fixed_prompt_prefix: string;
  readonly final_result_json?: string | null;
  readonly error_code?: string | null;
  readonly error_detail?: string | null;
  readonly expires_at: string;
  readonly completed_at?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AnalysisStepRecord {
  readonly job_id: string;
  readonly step_key: string;
  readonly ordinal: number;
  readonly kind: AnalysisStepKind;
  readonly status: AnalysisStepStatus;
  readonly attempts: number;
  readonly lease_owner?: string | null;
  readonly lease_expires_at?: string | null;
  readonly payload_json: string;
  readonly result_json?: string | null;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly error_code?: string | null;
  readonly error_detail?: string | null;
}

export interface AnalysisStepInput {
  readonly stepKey: string;
  readonly ordinal: number;
  readonly kind: AnalysisStepKind;
  readonly payload: unknown;
}

export class AnalysisJobAlreadyActiveError extends Error {
  override readonly name = 'AnalysisJobAlreadyActiveError';
}

const randomHex = (byteLength: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const requireBatch = (db: D1DatabaseLike) => {
  if (typeof db.batch !== 'function') {
    throw new Error('O banco não oferece lote transacional para a análise reentrante.');
  }
  return db.batch.bind(db);
};

const serializeJson = (value: unknown, label: string): string => {
  const serialized = JSON.stringify(value);
  if (typeof serialized !== 'string') throw new TypeError(`${label} não é serializável.`);
  return serialized;
};

const assertJobLeaseStatement = (db: D1DatabaseLike, jobId: string, leaseOwner: string): D1Statement<unknown> =>
  db
    .prepare(
      `UPDATE astrologo_ai_analysis_jobs
       SET completed_steps = CASE
         WHEN lease_owner = ? AND lease_expires_at > datetime('now') THEN completed_steps
         ELSE -1
       END
       WHERE id = ?`,
    )
    .bind(leaseOwner, jobId);

const assertStepLeaseStatement = (
  db: D1DatabaseLike,
  jobId: string,
  stepKey: string,
  leaseOwner: string,
): D1Statement<unknown> =>
  db
    .prepare(
      `UPDATE astrologo_ai_analysis_steps
       SET attempts = CASE
         WHEN status = 'running' AND lease_owner = ? AND lease_expires_at > datetime('now') THEN attempts
         ELSE -1
       END
       WHERE job_id = ? AND step_key = ?`,
    )
    .bind(leaseOwner, jobId, stepKey);

export const createAnalysisJob = async (
  db: D1DatabaseLike,
  mapaId: string,
): Promise<{ readonly job: AnalysisJobRecord; readonly capability: string }> => {
  await db.prepare("DELETE FROM astrologo_ai_analysis_jobs WHERE expires_at <= datetime('now')").run();
  await db
    .prepare(
      `UPDATE astrologo_ai_analysis_jobs
       SET status = 'cancelled', phase = 'failed', error_code = 'REPLACED_BY_NEW_JOB',
           error_detail = 'Substituído por uma nova solicitação do mesmo mapa.', updated_at = datetime('now')
       WHERE mapa_id = ? AND status IN ('queued', 'running')
         AND updated_at <= datetime('now', '-10 minutes')
         AND (lease_expires_at IS NULL OR lease_expires_at <= datetime('now'))`,
    )
    .bind(mapaId)
    .run();
  const active = await db
    .prepare<{ id: string }>(
      `SELECT id FROM astrologo_ai_analysis_jobs
       WHERE mapa_id = ? AND status IN ('queued', 'running') LIMIT 1`,
    )
    .bind(mapaId)
    .first();
  if (active) throw new AnalysisJobAlreadyActiveError('Já existe uma análise ativa para este mapa.');
  const id = `analysis:${crypto.randomUUID()}`;
  const capability = randomHex(32);
  const capabilityHash = await hashToken(capability);
  const seedPlan = serializeJson(
    { schemaId: 'urn:astrologo:ai-analysis-job-plan', schemaVersion: '1.0.0', state: 'planning' },
    'Plano inicial',
  );
  try {
    await db
      .prepare(
        `INSERT INTO astrologo_ai_analysis_jobs
       (id, capability_hash, mapa_id, status, phase, completed_steps, total_steps,
        input_tokens, output_tokens, plan_json, fixed_prompt_prefix, expires_at)
       VALUES (?, ?, ?, 'running', 'planning', 0, 1, 0, 0, ?, '', datetime('now', '+24 hours'))`,
      )
      .bind(id, capabilityHash, mapaId, seedPlan)
      .run();
  } catch (error) {
    if (/unique|constraint/iu.test(String(error))) {
      throw new AnalysisJobAlreadyActiveError('Outra análise do mesmo mapa foi iniciada simultaneamente.', {
        cause: error,
      });
    }
    throw error;
  }
  const job = await db
    .prepare<AnalysisJobRecord>('SELECT * FROM astrologo_ai_analysis_jobs WHERE id = ? LIMIT 1')
    .bind(id)
    .first();
  if (!job) throw new Error('O trabalho de análise não pôde ser recuperado após a criação.');
  return { job, capability };
};

export const loadAnalysisJob = async (
  db: D1DatabaseLike,
  jobId: string,
  capability: string,
): Promise<AnalysisJobRecord | null> => {
  if (!/^analysis:[0-9a-f-]{36}$/iu.test(jobId) || !/^[0-9a-f]{64}$/u.test(capability)) return null;
  const capabilityHash = await hashToken(capability);
  return db
    .prepare<AnalysisJobRecord>(
      `SELECT * FROM astrologo_ai_analysis_jobs
       WHERE id = ? AND capability_hash = ? AND expires_at > datetime('now')
       LIMIT 1`,
    )
    .bind(jobId, capabilityHash)
    .first();
};

export const claimAnalysisJob = async (
  db: D1DatabaseLike,
  jobId: string,
  capability: string,
): Promise<{ readonly job: AnalysisJobRecord; readonly leaseOwner: string } | null> => {
  if (!/^analysis:[0-9a-f-]{36}$/iu.test(jobId) || !/^[0-9a-f]{64}$/u.test(capability)) return null;
  const capabilityHash = await hashToken(capability);
  const leaseOwner = randomHex(16);
  const job = await db
    .prepare<AnalysisJobRecord>(
      `UPDATE astrologo_ai_analysis_jobs
       SET lease_owner = ?, lease_expires_at = datetime('now', '+118 seconds'), updated_at = datetime('now')
       WHERE id = ?
         AND capability_hash = ?
         AND status = 'running'
         AND expires_at > datetime('now')
         AND (lease_expires_at IS NULL OR lease_expires_at <= datetime('now'))
       RETURNING *`,
    )
    .bind(leaseOwner, jobId, capabilityHash)
    .first();
  return job ? { job, leaseOwner } : null;
};

export const releaseAnalysisJob = async (db: D1DatabaseLike, jobId: string, leaseOwner: string): Promise<void> => {
  await db
    .prepare(
      `UPDATE astrologo_ai_analysis_jobs
       SET lease_owner = NULL, lease_expires_at = NULL, updated_at = datetime('now')
       WHERE id = ? AND lease_owner = ?`,
    )
    .bind(jobId, leaseOwner)
    .run();
};

export const storeAnalysisPlan = async (options: {
  readonly db: D1DatabaseLike;
  readonly jobId: string;
  readonly leaseOwner: string;
  readonly plan: unknown;
  readonly fixedPromptPrefix: string;
  readonly steps: readonly AnalysisStepInput[];
  readonly reservedFinalSteps: number;
}): Promise<void> => {
  const batch = requireBatch(options.db);
  const statements = options.steps.map((step) =>
    options.db
      .prepare(
        `INSERT INTO astrologo_ai_analysis_steps
         (job_id, step_key, ordinal, kind, status, payload_json)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        options.jobId,
        step.stepKey,
        step.ordinal,
        step.kind,
        serializeJson(step.payload, `Payload da etapa ${step.stepKey}`),
      ),
  );
  statements.unshift(assertJobLeaseStatement(options.db, options.jobId, options.leaseOwner));
  statements.push(
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_jobs
         SET phase = 'analyzing', plan_json = ?, fixed_prompt_prefix = ?,
             completed_steps = 1, total_steps = ?, updated_at = datetime('now')
         WHERE id = ? AND lease_owner = ? AND phase = 'planning'`,
      )
      .bind(
        serializeJson(options.plan, 'Plano persistido'),
        options.fixedPromptPrefix,
        options.steps.length + 1 + options.reservedFinalSteps,
        options.jobId,
        options.leaseOwner,
      ),
  );
  await batch(statements);
};

export const resetExpiredAnalysisSteps = async (db: D1DatabaseLike, jobId: string): Promise<void> => {
  await db
    .prepare(
      `UPDATE astrologo_ai_analysis_steps
       SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
           lease_owner = NULL, lease_expires_at = NULL, updated_at = datetime('now')
       WHERE job_id = ? AND status = 'running' AND lease_expires_at <= datetime('now')`,
    )
    .bind(jobId)
    .run();
};

export const claimNextAnalysisStep = async (
  db: D1DatabaseLike,
  jobId: string,
  leaseOwner: string,
  kind: AnalysisStepKind | readonly AnalysisStepKind[],
): Promise<AnalysisStepRecord | null> => {
  const kinds = Array.isArray(kind) ? kind : [kind];
  const placeholders = kinds.map(() => '?').join(', ');
  return db
    .prepare<AnalysisStepRecord>(
      `UPDATE astrologo_ai_analysis_steps
       SET status = 'running', attempts = attempts + 1, lease_owner = ?,
           lease_expires_at = datetime('now', '+115 seconds'),
           started_at = COALESCE(started_at, datetime('now')), updated_at = datetime('now')
       WHERE job_id = ?
         AND step_key = (
           SELECT step_key FROM astrologo_ai_analysis_steps
           WHERE job_id = ? AND status = 'pending' AND attempts < 3 AND kind IN (${placeholders})
           ORDER BY ordinal ASC LIMIT 1
         )
       RETURNING *`,
    )
    .bind(leaseOwner, jobId, jobId, ...kinds)
    .first();
};

export const listAnalysisSteps = async (db: D1DatabaseLike, jobId: string): Promise<readonly AnalysisStepRecord[]> => {
  const result = await db
    .prepare<AnalysisStepRecord>('SELECT * FROM astrologo_ai_analysis_steps WHERE job_id = ? ORDER BY ordinal ASC')
    .bind(jobId)
    .all();
  return result.results;
};

export const completeAnalysisStep = async (options: {
  readonly db: D1DatabaseLike;
  readonly jobId: string;
  readonly leaseOwner: string;
  readonly stepKey: string;
  readonly result: unknown;
  readonly inputTokens: number;
  readonly outputTokens: number;
}): Promise<void> => {
  const batch = requireBatch(options.db);
  await batch([
    assertJobLeaseStatement(options.db, options.jobId, options.leaseOwner),
    assertStepLeaseStatement(options.db, options.jobId, options.stepKey, options.leaseOwner),
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_steps
         SET status = 'completed', result_json = ?,
             input_tokens = input_tokens + ?, output_tokens = output_tokens + ?,
             lease_owner = NULL, lease_expires_at = NULL, completed_at = datetime('now'),
             updated_at = datetime('now'), error_code = NULL, error_detail = NULL
         WHERE job_id = ? AND step_key = ? AND status = 'running' AND lease_owner = ?`,
      )
      .bind(
        serializeJson(options.result, `Resultado da etapa ${options.stepKey}`),
        options.inputTokens,
        options.outputTokens,
        options.jobId,
        options.stepKey,
        options.leaseOwner,
      ),
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_jobs
         SET completed_steps = completed_steps + 1,
             input_tokens = input_tokens + ?, output_tokens = output_tokens + ?,
             updated_at = datetime('now')
         WHERE id = ? AND lease_owner = ?`,
      )
      .bind(options.inputTokens, options.outputTokens, options.jobId, options.leaseOwner),
  ]);
};

export const retryOrFailAnalysisStep = async (options: {
  readonly db: D1DatabaseLike;
  readonly jobId: string;
  readonly leaseOwner: string;
  readonly step: AnalysisStepRecord;
  readonly payload: unknown;
  readonly errorCode: string;
  readonly errorDetail: string;
  readonly retryable?: boolean;
  readonly inputTokens: number;
  readonly outputTokens: number;
}): Promise<'retry' | 'failed'> => {
  const retry = options.retryable !== false && options.step.attempts < 3;
  const batch = requireBatch(options.db);
  const statements = [
    assertJobLeaseStatement(options.db, options.jobId, options.leaseOwner),
    assertStepLeaseStatement(options.db, options.jobId, options.step.step_key, options.leaseOwner),
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_steps
         SET status = ?, payload_json = ?, lease_owner = NULL, lease_expires_at = NULL,
             input_tokens = input_tokens + ?, output_tokens = output_tokens + ?,
             error_code = ?, error_detail = ?, updated_at = datetime('now')
         WHERE job_id = ? AND step_key = ? AND status = 'running' AND lease_owner = ?`,
      )
      .bind(
        retry ? 'pending' : 'failed',
        serializeJson(options.payload, `Payload de repetição ${options.step.step_key}`),
        options.inputTokens,
        options.outputTokens,
        options.errorCode,
        options.errorDetail.slice(0, 2_000),
        options.jobId,
        options.step.step_key,
        options.leaseOwner,
      ),
  ];
  statements.push(
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_jobs
         SET input_tokens = input_tokens + ?, output_tokens = output_tokens + ?, updated_at = datetime('now')
         WHERE id = ? AND lease_owner = ?`,
      )
      .bind(options.inputTokens, options.outputTokens, options.jobId, options.leaseOwner),
  );
  if (!retry) {
    statements.push(
      options.db
        .prepare(
          `UPDATE astrologo_ai_analysis_jobs
           SET status = 'failed', phase = 'failed', error_code = ?, error_detail = ?,
               lease_owner = NULL, lease_expires_at = NULL, updated_at = datetime('now')
           WHERE id = ? AND lease_owner = ?`,
        )
        .bind(options.errorCode, options.errorDetail.slice(0, 2_000), options.jobId, options.leaseOwner),
    );
  }
  await batch(statements);
  return retry ? 'retry' : 'failed';
};

export const appendAnalysisSteps = async (options: {
  readonly db: D1DatabaseLike;
  readonly jobId: string;
  readonly leaseOwner: string;
  readonly phase: 'reducing' | 'synthesizing';
  readonly steps: readonly AnalysisStepInput[];
  readonly plan: unknown;
  readonly reserveWasAlreadyCounted?: boolean;
}): Promise<void> => {
  const batch = requireBatch(options.db);
  const statements = options.steps.map((step) =>
    options.db
      .prepare(
        `INSERT INTO astrologo_ai_analysis_steps
         (job_id, step_key, ordinal, kind, status, payload_json)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        options.jobId,
        step.stepKey,
        step.ordinal,
        step.kind,
        serializeJson(step.payload, `Payload da etapa ${step.stepKey}`),
      ),
  );
  statements.unshift(assertJobLeaseStatement(options.db, options.jobId, options.leaseOwner));
  statements.push(
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_jobs
         SET phase = ?, plan_json = ?, total_steps = total_steps + ?, updated_at = datetime('now')
         WHERE id = ? AND lease_owner = ?`,
      )
      .bind(
        options.phase,
        serializeJson(options.plan, 'Plano atualizado'),
        options.reserveWasAlreadyCounted ? Math.max(0, options.steps.length - 1) : options.steps.length,
        options.jobId,
        options.leaseOwner,
      ),
  );
  await batch(statements);
};

export const failAnalysisJob = async (options: {
  readonly db: D1DatabaseLike;
  readonly jobId: string;
  readonly leaseOwner: string;
  readonly errorCode: string;
  readonly errorDetail: string;
}): Promise<void> => {
  await options.db
    .prepare(
      `UPDATE astrologo_ai_analysis_jobs
       SET status = 'failed', phase = 'failed', error_code = ?, error_detail = ?,
           lease_owner = NULL, lease_expires_at = NULL, updated_at = datetime('now')
       WHERE id = ? AND lease_owner = ?`,
    )
    .bind(options.errorCode, options.errorDetail.slice(0, 2_000), options.jobId, options.leaseOwner)
    .run();
};

export const completeAnalysisJob = async (options: {
  readonly db: D1DatabaseLike;
  readonly job: AnalysisJobRecord;
  readonly leaseOwner: string;
  readonly analysisHtml: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly inputHash: string;
}): Promise<void> => {
  const analysisHtml = finalizeUserAnalysisHtml(stripInternalAnalysisMarkers(options.analysisHtml));
  if (hasInternalAnalysisMarkerResidue(analysisHtml)) {
    throw new TypeError('A análise integral contém resíduo de uma sentinela interna.');
  }
  if (hasInternalImplementationLeakage(analysisHtml)) {
    throw new TypeError('A análise integral contém informação interna do aplicativo.');
  }
  const batch = requireBatch(options.db);
  const finalResult = serializeJson(
    {
      persisted: true,
      mapaId: options.job.mapa_id,
      byteLength: new TextEncoder().encode(analysisHtml).byteLength,
    },
    'Referência do resultado final',
  );
  const completedPlan = serializeJson(
    { schemaId: 'urn:astrologo:ai-analysis-job-plan', schemaVersion: '1.0.0', state: 'completed' },
    'Plano concluído',
  );
  await batch([
    assertJobLeaseStatement(options.db, options.job.id, options.leaseOwner),
    options.db
      .prepare("UPDATE astrologo_mapas SET analise_ia = ?, data_analise = datetime('now') WHERE id = ?")
      .bind(analysisHtml, options.job.mapa_id),
    options.db
      .prepare(
        `INSERT INTO astrologo_ai_analyses
         (id, mapa_id, analysis_type, schema_id, schema_version, prompt_version, model,
          input_hash, output_text, output_html, status, input_tokens, output_tokens,
          diagnostic_json, updated_at)
         VALUES (?, ?, 'integrated', 'urn:astrologo:ai-analysis-integrated', '1.0.0', ?, ?, ?, ?, ?,
                 'ready', ?, ?, json_object('jobId', ?, 'orchestration', 'reentrant-http'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           output_text = excluded.output_text, output_html = excluded.output_html,
           status = 'ready', input_tokens = excluded.input_tokens, output_tokens = excluded.output_tokens,
           diagnostic_json = excluded.diagnostic_json, updated_at = datetime('now')`,
      )
      .bind(
        options.job.id,
        options.job.mapa_id,
        options.promptVersion,
        options.model,
        options.inputHash,
        'Relatório HTML integral persistido em output_html.',
        analysisHtml,
        options.job.input_tokens,
        options.job.output_tokens,
        options.job.id,
      ),
    options.db
      .prepare(
        `UPDATE astrologo_ai_analysis_jobs
         SET status = 'completed', phase = 'completed', completed_steps = total_steps,
             plan_json = ?, fixed_prompt_prefix = '', final_result_json = ?,
             completed_at = datetime('now'), lease_owner = NULL, lease_expires_at = NULL,
             error_code = NULL, error_detail = NULL, updated_at = datetime('now')
         WHERE id = ? AND lease_owner = ?`,
      )
      .bind(completedPlan, finalResult, options.job.id, options.leaseOwner),
  ]);
};

export const parseStoredJson = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new TypeError(`${label} persistido é inválido.`, { cause: error });
  }
};
