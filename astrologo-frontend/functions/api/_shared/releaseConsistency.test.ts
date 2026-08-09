import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string): Promise<string> =>
  readFile(new URL(relativePath, import.meta.url), 'utf8');

const releaseMarkerFromPackageVersion = (version: string): string => {
  const segments = version.split('.');
  if (segments.length !== 3 || segments.some((segment) => !/^\d+$/u.test(segment))) {
    throw new TypeError(`Invalid package version: ${version}`);
  }
  return `v${segments.map((segment) => segment.padStart(2, '0')).join('.')}`;
};

describe('release and deployment documentation consistency', () => {
  it('documents the Pages secret command for the configured project', async () => {
    const [rootReadme, wranglerConfigText] = await Promise.all([
      readProjectFile('../../../../README.md'),
      readProjectFile('../../../wrangler.json'),
    ]);
    const wranglerConfig = JSON.parse(wranglerConfigText) as { name: string };

    expect(rootReadme).toContain(`npx wrangler pages secret put VERTEX_SA_KEY --project-name ${wranglerConfig.name}`);
    expect(rootReadme).not.toContain('npx wrangler secret put VERTEX_SA_KEY');
  });

  it('keeps every current-release marker aligned with package.json', async () => {
    const [packageText, rootReadme, frontendReadme, securityPolicy, appSource] = await Promise.all([
      readProjectFile('../../../package.json'),
      readProjectFile('../../../../README.md'),
      readProjectFile('../../../README.md'),
      readProjectFile('../../../../SECURITY.md'),
      readProjectFile('../../../src/App.tsx'),
    ]);
    const packageVersion = (JSON.parse(packageText) as { version: string }).version;
    const releaseMarker = releaseMarkerFromPackageVersion(packageVersion);

    expect(rootReadme).toContain(`Current release: **${releaseMarker}**`);
    expect(frontendReadme).toContain(`Current release: **${releaseMarker}**`);
    expect(securityPolicy).toContain(`Latest supported release: ${releaseMarker}.`);
    expect(appSource).toContain(`// Versão: ${releaseMarker}`);
    expect(appSource).toContain(`const APP_VERSION = 'APP ${releaseMarker}';`);
  });

  it('identifies the active Vertex REST transport in operational logs', async () => {
    const analysisSource = await readProjectFile('../analisar.ts');

    expect(analysisSource).toContain("structuredLog('INFO', 'Iniciando análise astrológica via Vertex AI REST'");
    expect(analysisSource).not.toContain('Iniciando análise astrológica com Gemini SDK');
  });
});
