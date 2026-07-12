import type { D1DatabaseLike } from './requestSecurity';

export type AstrologerArtifactType =
  | 'natal_chart_analysis'
  | 'chart_spec'
  | 'transit_result'
  | 'synastry_result'
  | 'locality_map';

export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export interface ReadyNatalArtifactInput {
  readonly id: string;
  readonly calculationId: string;
  readonly artifactType: 'natal_chart_analysis' | 'chart_spec';
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly sourceHash: string;
  readonly payload: unknown;
  readonly diagnostics: unknown;
}

export async function persistReadyNatalArtifact(db: D1DatabaseLike, input: ReadyNatalArtifactInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO astrologo_artifacts
        (id, mapa_id, artifact_type, schema_id, schema_version, source_hash, payload_json, status, diagnostic_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(mapa_id, artifact_type, schema_id, schema_version, source_hash) DO UPDATE SET
         payload_json = excluded.payload_json,
         status = excluded.status,
         diagnostic_json = excluded.diagnostic_json,
         updated_at = datetime('now')`,
    )
    .bind(
      input.id,
      input.calculationId,
      input.artifactType,
      input.schemaId,
      input.schemaVersion,
      input.sourceHash,
      JSON.stringify(input.payload),
      'ready',
      JSON.stringify(input.diagnostics),
    )
    .run();
}
