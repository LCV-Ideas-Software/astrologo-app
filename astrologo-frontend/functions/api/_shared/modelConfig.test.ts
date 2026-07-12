import { describe, expect, it } from 'vitest';
import { loadConfiguredAstrologerModel } from './modelConfig';
import type { D1DatabaseLike, D1Statement } from './requestSecurity';

type ConfigRow = { config_json?: string };

const createConfigDb = (rows: { canonical?: ConfigRow | null; legacy?: ConfigRow | null; canonicalError?: Error }) => {
  const queries: string[] = [];
  const db: D1DatabaseLike = {
    prepare: <TFirst>(query: string) => {
      queries.push(query);
      const row = query.includes('admin_module_configs') ? rows.canonical : rows.legacy;
      const statement: D1Statement<TFirst> = {
        bind: () => statement,
        first: async () => {
          if (query.includes('admin_module_configs') && rows.canonicalError) throw rows.canonicalError;
          return (row ?? null) as TFirst | null;
        },
        run: async () => ({ success: true }),
        all: async () => ({ results: [] }),
      };
      return statement;
    },
  };

  return { db, queries };
};

describe('configuração canônica do modelo do Astrólogo', () => {
  it('usa modeloSintese salvo pelo admin em admin_module_configs', async () => {
    const { db, queries } = createConfigDb({
      canonical: { config_json: JSON.stringify({ modeloSintese: 'gemini-admin-canonico' }) },
      legacy: { config_json: JSON.stringify({ modeloIA: 'gemini-legado' }) },
    });

    await expect(loadConfiguredAstrologerModel(db, 'gemini-padrao')).resolves.toBe('gemini-admin-canonico');
    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('admin_module_configs');
    expect(queries[0]).toContain('module_key');
  });

  it('mantém compatibilidade com admin_config_store e modeloIA quando a fonte canônica não existe', async () => {
    const { db, queries } = createConfigDb({
      canonical: null,
      legacy: { config_json: JSON.stringify({ modeloIA: 'gemini-legado' }) },
    });

    await expect(loadConfiguredAstrologerModel(db, 'gemini-padrao')).resolves.toBe('gemini-legado');
    expect(queries.some((query) => query.includes('admin_config_store'))).toBe(true);
  });

  it('usa o fallback legado se a tabela canônica ainda não estiver instalada', async () => {
    const { db } = createConfigDb({
      canonicalError: new Error('no such table: admin_module_configs'),
      legacy: { config_json: JSON.stringify({ modeloIA: 'gemini-legado' }) },
    });

    await expect(loadConfiguredAstrologerModel(db, 'gemini-padrao')).resolves.toBe('gemini-legado');
  });

  it('retorna o padrão quando as configurações estão ausentes ou inválidas', async () => {
    const { db } = createConfigDb({
      canonical: { config_json: '{inválido' },
      legacy: { config_json: JSON.stringify({ modeloIA: '   ' }) },
    });

    await expect(loadConfiguredAstrologerModel(db, 'gemini-padrao')).resolves.toBe('gemini-padrao');
  });
});
