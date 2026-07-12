import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const collectRuntimeTypeScript = async (directory: URL): Promise<URL[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) return collectRuntimeTypeScript(target);
      return entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [target] : [];
    }),
  );
  return nested.flat();
};

describe('schema declarativo do Worker', () => {
  it('não executa CREATE TABLE ou ALTER TABLE em código de requisição', async () => {
    const files = await collectRuntimeTypeScript(new URL('../', import.meta.url));
    const offenders: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (/\b(?:CREATE|ALTER)\s+TABLE\b/iu.test(source)) offenders.push(file.pathname);
    }

    expect(offenders).toEqual([]);
  });
});
