import { describe, expect, it } from 'vitest';
import { claimAndSanitizeSavedMaps } from './mapOwnershipClaim';
import type { D1BatchResult, D1DatabaseLike, D1Statement } from './requestSecurity';
import { hashToken } from './requestSecurity';

const createDb = (row: { email?: string | null; save_claim_hash?: string | null }): D1DatabaseLike => ({
  prepare: <TFirst>() => {
    const statement: D1Statement<TFirst> = {
      bind: () => statement,
      first: async () => ({ id: 'mapa-1', ...row }) as TFirst,
      run: async () => ({ success: true }),
      all: async () => ({ results: [] }),
    };
    return statement;
  },
  batch: async <T>(statements: D1Statement<T>[]) =>
    statements.map((_, index) =>
      index % 2 === 0
        ? { success: true, results: [{ id: 'mapa-1' }] }
        : { success: true, results: [{ ownership_confirmed: 1 }] },
    ) as unknown as D1BatchResult<T>[],
});

describe('prova de propriedade ao salvar mapas', () => {
  it('rejeita mapa sem proprietário quando o cliente não apresenta a prova secreta', async () => {
    const db = createDb({ email: null, save_claim_hash: await hashToken('segredo-correto-123') });

    await expect(
      claimAndSanitizeSavedMaps(db, 'consulente@example.com', JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] })),
    ).rejects.toThrow(/prova de propriedade/i);
  });

  it('rejeita prova incorreta e nunca aceita apenas o identificador do mapa', async () => {
    const db = createDb({ email: '', save_claim_hash: await hashToken('segredo-correto-123') });

    await expect(
      claimAndSanitizeSavedMaps(
        db,
        'consulente@example.com',
        JSON.stringify({ mapasSalvos: [{ id: 'mapa-1', saveClaim: 'segredo-incorreto' }] }),
      ),
    ).rejects.toThrow(/prova de propriedade/i);
  });

  it('reivindica atomicamente com a prova correta e remove o segredo antes de persistir', async () => {
    const claim = 'segredo-correto-123';
    const db = createDb({ email: null, save_claim_hash: await hashToken(claim) });

    const sanitized = await claimAndSanitizeSavedMaps(
      db,
      'Consulente@Example.com',
      JSON.stringify({ mapasSalvos: [{ id: 'mapa-1', saveClaim: claim, query: { nome: 'Pessoa' } }] }),
    );

    expect(JSON.parse(sanitized)).toEqual({ mapasSalvos: [{ id: 'mapa-1', query: { nome: 'Pessoa' } }] });
    expect(sanitized).not.toContain(claim);
  });

  it('aceita mapa que já pertence ao mesmo e-mail sem exigir novamente a prova', async () => {
    const db = createDb({ email: 'CONSULENTE@example.com', save_claim_hash: null });

    await expect(
      claimAndSanitizeSavedMaps(db, 'consulente@example.com', JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] })),
    ).resolves.toBe(JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] }));
  });

  it('rejeita mapa pertencente a outra pessoa', async () => {
    const db = createDb({ email: 'outra@example.com', save_claim_hash: null });

    await expect(
      claimAndSanitizeSavedMaps(db, 'consulente@example.com', JSON.stringify({ mapasSalvos: [{ id: 'mapa-1' }] })),
    ).rejects.toThrow(/outra conta/i);
  });

  it('pré-valida todos os mapas antes de preparar qualquer mutação de propriedade', async () => {
    const claim = 'segredo-correto-123';
    const claimHash = await hashToken(claim);
    let updateExecutionCount = 0;
    const db: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        let bindings: readonly unknown[] = [];
        const statement: D1Statement<TFirst> = {
          bind: (...values: unknown[]) => {
            bindings = values;
            return statement;
          },
          first: async () => {
            if (query.includes('UPDATE astrologo_mapas')) {
              updateExecutionCount += 1;
              return { id: bindings[1] } as TFirst;
            }
            return (
              bindings[0] === 'mapa-1'
                ? { id: 'mapa-1', email: null, save_claim_hash: claimHash }
                : { id: 'mapa-2', email: 'outra@example.com', save_claim_hash: null }
            ) as TFirst;
          },
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
    };

    await expect(
      claimAndSanitizeSavedMaps(
        db,
        'consulente@example.com',
        JSON.stringify({
          mapasSalvos: [
            { id: 'mapa-1', saveClaim: claim },
            { id: 'mapa-2', saveClaim: claim },
          ],
        }),
      ),
    ).rejects.toThrow(/outra conta/i);
    expect(updateExecutionCount).toBe(0);
  });

  it('envia todas as reivindicações condicionais em um único batch transacional', async () => {
    const claims = { 'mapa-1': 'segredo-correto-123', 'mapa-2': 'segredo-correto-456' } as const;
    const hashes = {
      'mapa-1': await hashToken(claims['mapa-1']),
      'mapa-2': await hashToken(claims['mapa-2']),
    } as const;
    let batchCalls = 0;
    let batchSize = 0;
    const db: D1DatabaseLike = {
      prepare: <TFirst>(query: string) => {
        let bindings: readonly unknown[] = [];
        const statement: D1Statement<TFirst> = {
          bind: (...values: unknown[]) => {
            bindings = values;
            return statement;
          },
          first: async () => {
            if (query.includes('UPDATE astrologo_mapas')) throw new Error('UPDATE fora de batch');
            const id = bindings[0] as keyof typeof hashes;
            return { id, email: null, save_claim_hash: hashes[id] } as TFirst;
          },
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
        return statement;
      },
      batch: async <T>(statements: D1Statement<T>[]) => {
        batchCalls += 1;
        batchSize = statements.length;
        return statements.map((_, index) =>
          index % 2 === 0
            ? { success: true, results: [{ id: 'ok' }] }
            : { success: true, results: [{ ownership_confirmed: 1 }] },
        ) as unknown as D1BatchResult<T>[];
      },
    };

    await expect(
      claimAndSanitizeSavedMaps(
        db,
        'consulente@example.com',
        JSON.stringify({
          mapasSalvos: [
            { id: 'mapa-1', saveClaim: claims['mapa-1'] },
            { id: 'mapa-2', saveClaim: claims['mapa-2'] },
          ],
        }),
      ),
    ).resolves.not.toContain('saveClaim');
    expect(batchCalls).toBe(1);
    expect(batchSize).toBeGreaterThanOrEqual(2);
  });
});
