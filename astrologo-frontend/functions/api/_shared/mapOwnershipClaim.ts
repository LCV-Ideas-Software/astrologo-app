import { type D1DatabaseLike, hashToken } from './requestSecurity';

const MAP_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class MapOwnershipClaimError extends Error {
  override readonly name = 'MapOwnershipClaimError';
}

export class MapOwnershipClaimInfrastructureError extends Error {
  override readonly name = 'MapOwnershipClaimInfrastructureError';
}

interface MapOwnershipRow {
  readonly id?: string;
  readonly email?: string | null;
  readonly save_claim_hash?: string | null;
}

interface PendingOwnershipClaim {
  readonly id: string;
  readonly claimHash: string;
}

export const claimAndSanitizeSavedMaps = async (
  db: D1DatabaseLike,
  rawEmail: string,
  dadosJson: string,
): Promise<string> => {
  const email = rawEmail.trim().toLowerCase();
  let parsed: unknown;
  try {
    parsed = JSON.parse(dadosJson) as unknown;
  } catch (error) {
    throw new MapOwnershipClaimError('Os dados salvos não são JSON válido.', { cause: error });
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.mapasSalvos)) {
    throw new MapOwnershipClaimError('A lista de mapas salvos é inválida.');
  }

  const seen = new Set<string>();
  const sanitizedMaps: Record<string, unknown>[] = [];
  const pendingClaims: PendingOwnershipClaim[] = [];
  for (const [index, candidate] of parsed.mapasSalvos.entries()) {
    if (!isRecord(candidate) || typeof candidate.id !== 'string' || !MAP_ID_PATTERN.test(candidate.id)) {
      throw new MapOwnershipClaimError(`O mapa salvo na posição ${index + 1} possui identificador inválido.`);
    }
    if (seen.has(candidate.id)) throw new MapOwnershipClaimError('A lista de mapas salvos contém duplicatas.');
    seen.add(candidate.id);

    const row = await db
      .prepare<MapOwnershipRow>('SELECT id, email, save_claim_hash FROM astrologo_mapas WHERE id = ? LIMIT 1')
      .bind(candidate.id)
      .first();
    if (!row?.id) throw new MapOwnershipClaimError('Um dos mapas informados não existe mais.');

    const owner = row.email?.trim().toLowerCase() ?? '';
    if (owner && owner !== email) {
      throw new MapOwnershipClaimError('Um dos mapas informados pertence a outra conta.');
    }

    if (!owner) {
      const claim = candidate.saveClaim;
      if (
        typeof claim !== 'string' ||
        claim.length < 16 ||
        claim.length > 256 ||
        typeof row.save_claim_hash !== 'string' ||
        row.save_claim_hash.length !== 64 ||
        (await hashToken(claim)) !== row.save_claim_hash
      ) {
        throw new MapOwnershipClaimError('A prova de propriedade de um dos mapas é inválida ou ausente.');
      }
      pendingClaims.push({ id: candidate.id, claimHash: row.save_claim_hash });
    }

    const sanitized = { ...candidate };
    delete sanitized.saveClaim;
    sanitizedMaps.push(sanitized);
  }

  if (pendingClaims.length > 0) {
    if (typeof db.batch !== 'function') {
      throw new MapOwnershipClaimInfrastructureError('O banco não oferece confirmação transacional de propriedade.');
    }

    const statements = pendingClaims.flatMap(({ id, claimHash }) => [
      db
        .prepare<Record<string, unknown>>(
          `UPDATE astrologo_mapas
           SET email = ?, save_claim_hash = NULL
           WHERE id = ?
             AND save_claim_hash = ?
             AND NULLIF(TRIM(email), '') IS NULL
           RETURNING id`,
        )
        .bind(email, id, claimHash),
      db
        .prepare<Record<string, unknown>>(
          `SELECT CASE
             WHEN EXISTS (
               SELECT 1
               FROM astrologo_mapas
               WHERE id = ?
                 AND lower(trim(email)) = ?
                 AND save_claim_hash IS NULL
             ) THEN 1
             ELSE json('ASTROLOGO_OWNERSHIP_CLAIM_CONFLICT')
           END AS ownership_confirmed`,
        )
        .bind(id, email),
    ]);

    try {
      const results = await db.batch<Record<string, unknown>>(statements);
      if (results.length !== statements.length || results.some(({ success }) => success === false)) {
        throw new Error('Resultado incompleto do batch de propriedade.');
      }
      for (let index = 0; index < pendingClaims.length; index += 1) {
        const assertion = results[index * 2 + 1]?.results?.[0];
        if (assertion?.ownership_confirmed !== 1) {
          throw new Error('Confirmação de propriedade ausente no batch.');
        }
      }
    } catch (error) {
      throw new MapOwnershipClaimError('A propriedade de todos os mapas não pôde ser confirmada atomicamente.', {
        cause: error,
      });
    }
  }

  return JSON.stringify({ ...parsed, mapasSalvos: sanitizedMaps });
};
