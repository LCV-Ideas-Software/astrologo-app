import type { D1DatabaseLike } from './requestSecurity';

type ConfigRow = { config_json?: string };

const readModelField = (row: ConfigRow | null, field: 'modeloSintese' | 'modeloIA'): string | null => {
  if (!row?.config_json) return null;

  try {
    const config: unknown = JSON.parse(row.config_json);
    if (typeof config !== 'object' || config === null || Array.isArray(config)) return null;
    const value = (config as Record<string, unknown>)[field];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
};

const queryConfig = async (db: D1DatabaseLike, query: string, key: string): Promise<ConfigRow | null> => {
  try {
    return await db.prepare<ConfigRow>(query).bind(key).first();
  } catch {
    return null;
  }
};

/**
 * Resolve o modelo configurado no armazenamento canônico do admin.
 * A consulta legada é mantida apenas para bancos anteriores à unificação do config-store.
 */
export async function loadConfiguredAstrologerModel(
  db: D1DatabaseLike | undefined,
  fallbackModel: string,
): Promise<string> {
  if (!db || typeof db.prepare !== 'function') return fallbackModel;

  const canonicalRow = await queryConfig(
    db,
    `SELECT config_json
     FROM admin_module_configs
     WHERE module_key = ?
     LIMIT 1`,
    'astrologo-config',
  );
  const canonicalModel = readModelField(canonicalRow, 'modeloSintese');
  if (canonicalModel) return canonicalModel;

  const legacyRow = await queryConfig(
    db,
    `SELECT config_json
     FROM admin_config_store
     WHERE config_key = ?
     LIMIT 1`,
    'astrologo-config',
  );
  return readModelField(legacyRow, 'modeloIA') ?? fallbackModel;
}
