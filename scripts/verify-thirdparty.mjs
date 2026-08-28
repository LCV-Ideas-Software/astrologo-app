import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import semver from "semver";
import tseslint from "typescript-eslint";

import { POLICY } from "./legal/thirdparty-policy.mjs";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const REGISTRY_VERSION =
  /^(?:[~^]?)(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const GITHUB_API_VERSION = "2026-03-10";

export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContractError";
  }
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha512 = (bytes) => createHash("sha512").update(bytes).digest("hex");
const sriSha512 = (bytes) =>
  `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
const normalizeFragment = (value) =>
  value.replaceAll("\r\n", "\n").replace(/\n+$/, "");

function extractCopyrightNotice(bytes, sourceName) {
  const source = Buffer.from(bytes).toString("utf8").replaceAll("\r\n", "\n");
  const start = source.indexOf("/* Copyright");
  const end = start < 0 ? -1 : source.indexOf("*/", start);
  assert(
    start >= 0 && end >= 0,
    `${sourceName} não contém o aviso de copyright esperado.`,
  );
  return normalizeFragment(source.slice(start, end + 2))
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
}

function assert(condition, message) {
  if (!condition) throw new ContractError(message);
}

function canonicalGitRepository(value) {
  return String(value ?? "")
    .replace(/^git\+/, "")
    .replace(/\.git$/, "");
}

function githubRepositorySlug(repositoryUrl) {
  const url = new URL(repositoryUrl);
  assert(
    url.protocol === "https:" && url.hostname === "github.com",
    `Origem GitHub inválida: ${repositoryUrl}.`,
  );
  const slug = url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  assert(
    /^[^/]+\/[^/]+$/.test(slug),
    `Repositório GitHub inválido: ${repositoryUrl}.`,
  );
  return slug;
}

async function fetchOfficial(url, { fetchImpl, githubToken, raw = false }) {
  const isGitHub = new URL(url).hostname === "api.github.com";
  const headers = isGitHub
    ? {
        Accept: raw
          ? "application/vnd.github.raw+json"
          : "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
      }
    : { Accept: "application/json" };
  const response = await fetchImpl(url, { headers });
  assert(
    response.ok,
    `Fonte oficial ${url} respondeu HTTP ${response.status}.`,
  );
  return raw
    ? Buffer.from(await response.arrayBuffer())
    : await response.json();
}

export async function loadUpstreamEvidence({
  fetchImpl = fetch,
  githubToken = process.env.GITHUB_TOKEN,
} = {}) {
  const worldSlug = githubRepositorySlug(POLICY.cartography.sourceRepository);
  const swissSlug = githubRepositorySlug(POLICY.swiss.wrapperSourceRepository);
  const wranglerPolicy = POLICY.functionsBundle.licenseFallbacks.wrangler;
  const wranglerSlug = githubRepositorySlug(wranglerPolicy.sourceRepository);
  const registryUrl = (name, version) =>
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`;
  const githubUrl = (slug, suffix) =>
    `https://api.github.com/repos/${slug}/${suffix}`;

  const [worldMetadata, swissMetadata] = await Promise.all([
    fetchOfficial(
      registryUrl(POLICY.cartography.package, POLICY.cartography.version),
      { fetchImpl, githubToken },
    ),
    fetchOfficial(
      registryUrl(POLICY.swiss.package, POLICY.swiss.wrapperVersion),
      { fetchImpl, githubToken },
    ),
  ]);
  assert(
    typeof worldMetadata.dist?.tarball === "string" &&
      typeof swissMetadata.dist?.tarball === "string",
    "Metadados npm oficiais não contêm URLs de tarball.",
  );
  const [
    swissTree,
    swissNotice,
    worldReadme,
    worldTarball,
    swissTarball,
    wranglerMit,
    wranglerApache,
  ] = await Promise.all([
    fetchOfficial(
      githubUrl(
        swissSlug,
        `git/trees/${POLICY.swiss.wrapperGitHead}?recursive=1`,
      ),
      { fetchImpl, githubToken },
    ),
    fetchOfficial(
      githubUrl(
        githubRepositorySlug(POLICY.swiss.upstreamSourceRepository),
        `contents/${POLICY.swiss.upstreamNoticePath}?ref=${POLICY.swiss.upstreamRevision}`,
      ),
      { fetchImpl, githubToken, raw: true },
    ),
    fetchOfficial(
      githubUrl(
        worldSlug,
        `contents/README.md?ref=${POLICY.cartography.gitHead}`,
      ),
      { fetchImpl, githubToken, raw: true },
    ),
    fetchOfficial(worldMetadata.dist.tarball, {
      fetchImpl,
      githubToken,
      raw: true,
    }),
    fetchOfficial(swissMetadata.dist.tarball, {
      fetchImpl,
      githubToken,
      raw: true,
    }),
    fetchOfficial(
      githubUrl(
        wranglerSlug,
        `contents/${wranglerPolicy.licensePaths[0]}?ref=${wranglerPolicy.revision}`,
      ),
      { fetchImpl, githubToken, raw: true },
    ),
    fetchOfficial(
      githubUrl(
        wranglerSlug,
        `contents/${wranglerPolicy.licensePaths[1]}?ref=${wranglerPolicy.revision}`,
      ),
      { fetchImpl, githubToken, raw: true },
    ),
  ]);

  return {
    worldAtlas: {
      metadata: worldMetadata,
      readmeBytes: worldReadme,
      tarballIntegrity: sriSha512(worldTarball),
    },
    swiss: {
      metadata: swissMetadata,
      tree: swissTree,
      noticeBytes: swissNotice,
      tarballIntegrity: sriSha512(swissTarball),
      tarballSha256: sha256(swissTarball),
    },
    functionsBundle: {
      wranglerMit,
      wranglerApache,
    },
  };
}

export function validateUpstreamEvidence(evidence) {
  const world = evidence.worldAtlas;
  assert(
    world.metadata.version === POLICY.cartography.version &&
      world.metadata.license === POLICY.cartography.license &&
      world.metadata.dist?.integrity === POLICY.cartography.integrity &&
      world.metadata.dist?.tarball ===
        expectedRegistryUrl(
          POLICY.cartography.package,
          POLICY.cartography.version,
        ) &&
      world.metadata.gitHead === POLICY.cartography.gitHead &&
      canonicalGitRepository(world.metadata.repository?.url) ===
        POLICY.cartography.sourceRepository,
    "Metadados npm do world-atlas divergiram da política de proveniência.",
  );
  assert(
    world.readmeBytes.byteLength === POLICY.cartography.readmeSize &&
      sha256(world.readmeBytes) === POLICY.cartography.readmeSha256,
    "README no commit GitHub do world-atlas divergiu da evidência instalada.",
  );
  assert(
    world.tarballIntegrity === POLICY.cartography.integrity,
    "Tarball oficial do world-atlas divergiu do SRI auditado.",
  );

  const swiss = evidence.swiss;
  assert(
    swiss.metadata.version === POLICY.swiss.wrapperVersion &&
      swiss.metadata.license === POLICY.swiss.license &&
      swiss.metadata.dist?.integrity === POLICY.swiss.wrapperIntegrity &&
      swiss.metadata.dist?.tarball ===
        expectedRegistryUrl(
          POLICY.swiss.package,
          POLICY.swiss.wrapperVersion,
        ) &&
      swiss.metadata.gitHead === POLICY.swiss.wrapperGitHead &&
      canonicalGitRepository(swiss.metadata.repository?.url) ===
        POLICY.swiss.wrapperSourceRepository,
    "Metadados npm do wrapper Swiss divergiram da política jurídica.",
  );
  assert(
    swiss.tarballIntegrity === POLICY.swiss.wrapperIntegrity &&
      swiss.tarballSha256 === POLICY.swiss.wrapperTarballSha256,
    "Tarball oficial do wrapper Swiss divergiu dos hashes auditados.",
  );
  assert(
    swiss.tree.truncated === false,
    "Árvore GitHub do wrapper Swiss foi truncada; não é evidência completa.",
  );
  const upstreamEntries = swiss.tree.tree.filter(
    (entry) => entry.path === "vendor/swisseph",
  );
  assert(
    upstreamEntries.length === 1 &&
      upstreamEntries[0].mode === "160000" &&
      upstreamEntries[0].type === "commit" &&
      upstreamEntries[0].sha === POLICY.swiss.upstreamRevision,
    "Gitlink vendor/swisseph divergiu da revisão upstream oferecida.",
  );
  const upstreamNotice = extractCopyrightNotice(
    swiss.noticeBytes,
    `${POLICY.swiss.upstreamSourceRepository}/${POLICY.swiss.upstreamNoticePath}`,
  );
  assert(
    sha256(Buffer.from(upstreamNotice, "utf8")) ===
      POLICY.fragments.swissNotice.normalizedSha256,
    "Aviso integral Swiss Ephemeris divergiu da revisão upstream fixada.",
  );

  const functionsBundle = evidence.functionsBundle;
  assert(
    sha256(
      Buffer.from(
        normalizeFragment(functionsBundle.wranglerMit.toString("utf8")),
        "utf8",
      ),
    ) === POLICY.fragments.wranglerMit.normalizedSha256 &&
      sha256(
        Buffer.from(
          normalizeFragment(functionsBundle.wranglerApache.toString("utf8")),
          "utf8",
        ),
      ) === POLICY.fragments.wranglerApache.normalizedSha256,
    "Licenças oficiais do Wrangler divergiram da revisão upstream fixada.",
  );
}

export async function verifyUpstream(options) {
  const evidence = await loadUpstreamEvidence(options);
  validateUpstreamEvidence(evidence);
  return evidence;
}

function trackedFiles(repositoryRoot) {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert(
    result.status === 0,
    `git ls-files falhou: ${result.stderr?.trim() || `status ${result.status}`}`,
  );
  return result.stdout.split("\0").filter(Boolean).sort();
}

function trackedPackageMetadata(repositoryRoot) {
  return trackedFiles(repositoryRoot).filter((file) =>
    /(?:^|\/)(?:package(?:-lock)?\.json|npm-shrinkwrap\.json)$/.test(file),
  );
}

async function trackedPackageImports(repositoryRoot, packageName) {
  const imports = [];
  for (const file of trackedFiles(repositoryRoot).filter((candidate) =>
    /\.(?:[cm]?[jt]sx?)$/.test(candidate),
  )) {
    const source = await readFile(path.join(repositoryRoot, file), "utf8");
    for (const specifier of extractPackageImports(source, packageName, file)) {
      imports.push({ source: file, specifier });
    }
  }
  return imports.sort((left, right) =>
    `${left.source}\0${left.specifier}`.localeCompare(
      `${right.source}\0${right.specifier}`,
    ),
  );
}

function staticModuleSpecifier(node) {
  if (node?.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (
    node?.type === "TemplateLiteral" &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
}

export function extractPackageImports(
  source,
  packageName,
  fileName = "source.tsx",
) {
  const { ast, scopeManager, visitorKeys } = tseslint.parser.parseForESLint(
    source,
    {
      ecmaVersion: "latest",
      filePath: fileName,
      jsDocParsingMode: "none",
      sourceType: "module",
    },
  );
  const unresolvedIdentifiers = new Set(
    scopeManager.globalScope.through.map((reference) => reference.identifier),
  );
  const imports = [];

  function collect(node) {
    const specifier = staticModuleSpecifier(node);
    if (specifier === undefined) {
      throw new ContractError(
        `Especificador de módulo não estático não pode ser auditado em ${fileName}.`,
      );
    }
    if (specifier === packageName || specifier?.startsWith(`${packageName}/`)) {
      imports.push(specifier);
    }
  }

  function visit(node) {
    if (
      node.type === "ImportDeclaration" ||
      node.type === "ExportAllDeclaration"
    ) {
      collect(node.source);
    } else if (node.type === "ExportNamedDeclaration" && node.source) {
      collect(node.source);
    } else if (node.type === "ImportExpression") {
      collect(node.source);
    } else if (node.type === "TSImportType") {
      collect(node.source);
    } else if (node.type === "TSExternalModuleReference") {
      collect(node.expression);
    } else if (node.type === "CallExpression") {
      const isRequire =
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        unresolvedIdentifiers.has(node.callee);
      const isRequireResolve =
        node.callee.type === "MemberExpression" &&
        node.callee.computed === false &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "require" &&
        unresolvedIdentifiers.has(node.callee.object) &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "resolve";
      if (isRequire || isRequireResolve) {
        collect(node.arguments[0]);
      }
    }

    for (const key of visitorKeys[node.type] ?? []) {
      const children = Array.isArray(node[key]) ? node[key] : [node[key]];
      for (const child of children) {
        if (child) {
          visit(child);
        }
      }
    }
  }

  visit(ast);
  return imports;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function loadFragment(repositoryRoot, descriptor) {
  const bytes = await readFile(path.join(repositoryRoot, descriptor.path));
  assert(
    sha256(bytes) === descriptor.sha256,
    `Fragmento jurídico ${descriptor.path} divergiu do hash canônico ${descriptor.sha256}.`,
  );
  return normalizeFragment(bytes.toString("utf8"));
}

export async function loadState(repositoryRoot = REPOSITORY_ROOT) {
  const roots = [];
  for (const root of POLICY.packageRoots) {
    const manifest = await readJson(path.join(repositoryRoot, root.manifest));
    const lock = await readJson(path.join(repositoryRoot, root.lock));
    const installed = {};
    const names = new Set(
      POLICY.relations.flatMap((relation) =>
        Object.keys(manifest[relation] ?? {}),
      ),
    );
    for (const name of names) {
      installed[name] = await readJson(
        path.join(
          repositoryRoot,
          root.installRoot,
          "node_modules",
          ...name.split("/"),
          "package.json",
        ),
      );
    }
    roots.push({
      manifestPath: root.manifest,
      lockPath: root.lock,
      installRoot: root.installRoot,
      manifest,
      lock,
      installed,
    });
  }

  const frontendRoot = POLICY.packageRoots.find(
    (root) => root.installRoot === "astrologo-frontend",
  );
  assert(frontendRoot, "A política não define o root astrologo-frontend.");
  const wasmBytes = await readFile(
    path.join(
      repositoryRoot,
      frontendRoot.installRoot,
      POLICY.swiss.wasmRelativePath,
    ),
  );
  const cartographyRoot = path.join(repositoryRoot, frontendRoot.installRoot);

  return {
    repositoryRoot,
    trackedFiles: trackedPackageMetadata(repositoryRoot),
    roots,
    wasmBytes,
    cartography: {
      readme: await readFile(
        path.join(cartographyRoot, POLICY.cartography.readmeRelativePath),
        "utf8",
      ),
      assetBytes: await readFile(
        path.join(cartographyRoot, POLICY.cartography.assetRelativePath),
      ),
      imports: await trackedPackageImports(
        repositoryRoot,
        POLICY.cartography.package,
      ),
    },
    fragments: {
      astronomy: await loadFragment(repositoryRoot, POLICY.fragments.astronomy),
      launderMit: await loadFragment(
        repositoryRoot,
        POLICY.fragments.launderMit,
      ),
      wranglerMit: await loadFragment(
        repositoryRoot,
        POLICY.fragments.wranglerMit,
      ),
      wranglerApache: await loadFragment(
        repositoryRoot,
        POLICY.fragments.wranglerApache,
      ),
      swissNotice: await loadFragment(
        repositoryRoot,
        POLICY.fragments.swissNotice,
      ),
      swissSourceOffer: await loadFragment(
        repositoryRoot,
        POLICY.fragments.swissSourceOffer,
      ),
    },
  };
}

function expectedRegistryUrl(name, version) {
  const tarballName = name.includes("/")
    ? name.slice(name.lastIndexOf("/") + 1)
    : name;
  return `https://registry.npmjs.org/${name}/-/${tarballName}-${version}.tgz`;
}

export function validateState(state) {
  const expectedTracked = POLICY.packageRoots
    .flatMap((root) => [root.manifest, root.lock])
    .sort();
  assert(
    JSON.stringify(state.trackedFiles) === JSON.stringify(expectedTracked),
    `Roots npm rastreados inesperados. Esperado: ${expectedTracked.join(", ")}. Encontrado: ${state.trackedFiles.join(", ")}.`,
  );

  const rows = [];
  for (const rootPolicy of POLICY.packageRoots) {
    const root = state.roots.find(
      (candidate) => candidate.manifestPath === rootPolicy.manifest,
    );
    assert(root, `Estado ausente para ${rootPolicy.manifest}.`);
    assert(
      root.lock?.lockfileVersion >= 2,
      `${rootPolicy.lock} deve usar package-lock v2 ou superior.`,
    );
    assert(
      root.lock?.packages?.[""],
      `${rootPolicy.lock} não contém o registro packages[""].`,
    );
    assert(
      root.lock.packages[""].name === root.manifest.name,
      `${rootPolicy.lock} não corresponde a ${rootPolicy.manifest}.`,
    );

    for (const relation of POLICY.rejectedRelations) {
      const value = root.manifest[relation];
      const hasEntries = Array.isArray(value)
        ? value.length > 0
        : value && Object.keys(value).length > 0;
      assert(
        !hasEntries,
        `${rootPolicy.manifest} usa ${relation}; a política exige classificação jurídica explícita antes do uso.`,
      );
    }

    for (const relation of POLICY.relations) {
      const declared = root.manifest[relation] ?? {};
      assert(
        declared && typeof declared === "object" && !Array.isArray(declared),
        `${rootPolicy.manifest} contém ${relation} inválido.`,
      );
      for (const [name, declaredVersion] of Object.entries(declared).sort(
        ([left], [right]) => left.localeCompare(right),
      )) {
        assert(
          typeof declaredVersion === "string" &&
            REGISTRY_VERSION.test(declaredVersion),
          `${rootPolicy.manifest}: ${name} usa origem ou especificação não homologada (${String(declaredVersion)}).`,
        );
        const lockedRootVersion = root.lock.packages[""][relation]?.[name];
        assert(
          lockedRootVersion === declaredVersion,
          `${rootPolicy.lock}: ${relation}.${name} (${String(lockedRootVersion)}) diverge do manifesto (${declaredVersion}).`,
        );

        const lockKey = `node_modules/${name}`;
        const locked = root.lock.packages[lockKey];
        const installed = root.installed[name];
        assert(locked, `${rootPolicy.lock} não contém ${lockKey}.`);
        assert(
          installed,
          `${rootPolicy.installRoot}/node_modules não contém ${name}; execute npm ci nos dois roots.`,
        );
        assert(
          installed.name === name,
          `${name}: package.json instalado declara name=${String(installed.name)}.`,
        );
        assert(
          locked.name === undefined || locked.name === name,
          `${rootPolicy.lock}: ${lockKey} declara name=${String(locked.name)}.`,
        );
        assert(
          typeof locked.version === "string" &&
            installed.version === locked.version,
          `${name}: versão instalada ${String(installed.version)} diverge do lock ${String(locked.version)}.`,
        );
        assert(
          semver.satisfies(locked.version, declaredVersion),
          `${name}: versão resolvida ${locked.version} não satisfaz a especificação declarada ${declaredVersion}.`,
        );
        assert(
          typeof locked.license === "string" &&
            locked.license.length > 0 &&
            installed.license === locked.license,
          `${name}: licença instalada ${String(installed.license)} diverge do lock ${String(locked.license)}.`,
        );
        assert(
          locked.resolved === expectedRegistryUrl(name, locked.version),
          `${name}: resolved deve apontar ao tarball oficial exato do npm Registry.`,
        );
        assert(
          typeof locked.integrity === "string" &&
            locked.integrity.startsWith("sha512-"),
          `${name}: package-lock deve conter integridade SHA-512.`,
        );

        rows.push({
          manifest: rootPolicy.manifest,
          component: name,
          relation,
          declaredVersion,
          resolvedVersion: locked.version,
          license: locked.license,
          origin: locked.resolved,
          integrity: locked.integrity,
        });
      }
    }
  }

  const swiss = rows.find(
    (row) =>
      row.manifest === "astrologo-frontend/package.json" &&
      row.relation === "devDependencies" &&
      row.component === POLICY.swiss.package,
  );
  assert(
    swiss,
    `${POLICY.swiss.package} deve permanecer classificado no frontend.`,
  );
  assert(
    swiss.resolvedVersion === POLICY.swiss.wrapperVersion,
    "Versão do wrapper Swiss divergiu da política jurídica.",
  );
  assert(
    swiss.integrity === POLICY.swiss.wrapperIntegrity,
    "SRI do wrapper Swiss divergiu da política jurídica.",
  );
  assert(
    state.wasmBytes.byteLength === POLICY.swiss.wasmSize,
    "Tamanho do Swiss Ephemeris WASM divergiu.",
  );
  assert(
    sha256(state.wasmBytes) === POLICY.swiss.wasmSha256,
    "SHA-256 do Swiss Ephemeris WASM divergiu.",
  );
  assert(
    sha512(state.wasmBytes) === POLICY.swiss.wasmSha512,
    "SHA-512 do Swiss Ephemeris WASM divergiu.",
  );
  assert(
    /^[0-9a-f]{40}$/.test(POLICY.swiss.wrapperGitHead) &&
      /^[0-9a-f]{40}$/.test(POLICY.swiss.upstreamRevision),
    "Revisões Swiss devem ser commits Git completos.",
  );
  assert(
    !/(?:[a-z][a-z0-9+.-]*:\/\/|(?:^|\s)git@|github\.com|\/tree\/|\b[0-9a-f]{7,40}\b|\bv?\d+\.\d+\.\d+\b)/i.test(
      state.fragments.swissSourceOffer,
    ),
    "O fragmento da oferta Swiss não pode conter URLs, versões ou revisões; esses identificadores derivam da política jurídica.",
  );

  const cartography = rows.find(
    (row) =>
      row.manifest === "astrologo-frontend/package.json" &&
      row.relation === "dependencies" &&
      row.component === POLICY.cartography.package,
  );
  assert(
    cartography?.resolvedVersion === POLICY.cartography.version,
    "Versão do world-atlas divergiu da política de proveniência cartográfica.",
  );
  assert(
    cartography.license === POLICY.cartography.license &&
      cartography.integrity === POLICY.cartography.integrity,
    "Licença ou SRI do world-atlas divergiu da política de proveniência cartográfica.",
  );
  for (const component of POLICY.cartography.runtimePackages) {
    assert(
      rows.some(
        (row) =>
          row.manifest === "astrologo-frontend/package.json" &&
          row.relation === "dependencies" &&
          row.component === component,
      ),
      `${component} deve permanecer classificado como dependência cartográfica do frontend.`,
    );
  }
  assert(
    Buffer.byteLength(state.cartography.readme, "utf8") ===
      POLICY.cartography.readmeSize &&
      sha256(state.cartography.readme) === POLICY.cartography.readmeSha256,
    "README do world-atlas divergiu da evidência de proveniência auditada.",
  );
  assert(
    state.cartography.assetBytes.byteLength === POLICY.cartography.assetSize &&
      sha256(state.cartography.assetBytes) === POLICY.cartography.assetSha256,
    `Asset ${POLICY.cartography.asset} divergiu da evidência cartográfica auditada.`,
  );
  assert(
    state.cartography.readme.includes(
      `version ${POLICY.cartography.datasetVersion} as TopoJSON`,
    ),
    "README do world-atlas não comprova a versão Natural Earth declarada.",
  );
  const assetSectionStart = state.cartography.readme.indexOf(
    `<a href="#${POLICY.cartography.asset}"`,
  );
  const nextAssetSection = state.cartography.readme.indexOf(
    '\n<a href="#',
    assetSectionStart + 1,
  );
  const assetSection = state.cartography.readme.slice(
    assetSectionStart,
    nextAssetSection === -1 ? undefined : nextAssetSection,
  );
  assert(
    assetSectionStart !== -1 && assetSection.includes(POLICY.cartography.scale),
    `README do world-atlas não vincula ${POLICY.cartography.asset} à escala ${POLICY.cartography.scale}.`,
  );
  assert(
    JSON.stringify(state.cartography.imports) ===
      JSON.stringify(POLICY.cartography.imports),
    `Imports ${POLICY.cartography.package} divergiram da lista cartográfica auditada. Esperado: ${JSON.stringify(POLICY.cartography.imports)}. Encontrado: ${JSON.stringify(state.cartography.imports)}.`,
  );

  const astronomy = rows.find(
    (row) =>
      row.manifest === "astrologo-frontend/package.json" &&
      row.component === POLICY.astronomy.package,
  );
  assert(
    astronomy?.resolvedVersion === POLICY.astronomy.version &&
      astronomy.license === POLICY.astronomy.license,
    "Astronomy Engine divergiu do aviso MIT canônico.",
  );
  return rows;
}

export function escapeMarkdownCell(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

export function renderThirdparty(rows) {
  const header = [
    "# Third-Party Components",
    "",
    "Este arquivo é gerado por `npm run generate:thirdparty`. Não o edite manualmente.",
    "",
    "A tabela deriva exclusivamente dos manifestos npm rastreados, dos respectivos `package-lock.json` e dos `package.json` instalados por `npm ci`. O Vite oficial gera os textos integrais do bundle do navegador em `/legal/BUNDLED-LICENSES.md`; o Wrangler oficial produz o metafile que alimenta o relatório fail-closed do bundle Cloudflare Pages Functions em `/legal/FUNCTIONS-BUNDLED-LICENSES.md`. O inventário direto permanece neste documento e as exceções permanecem no NOTICE canônico.",
    "",
    `## Dependências diretas (${rows.length} relações)`,
    "",
    "| Manifesto | Componente | Relação | Versão declarada | Versão resolvida | Licença do artefato | Origem |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  const table = rows.map(
    (row) =>
      `| ${[
        row.manifest,
        row.component,
        row.relation,
        row.declaredVersion,
        row.resolvedVersion,
        row.license,
        row.origin,
      ]
        .map(escapeMarkdownCell)
        .join(" | ")} |`,
  );
  const appendix = [
    "",
    "## Textos das licenças dos bundles publicados",
    "",
    "O build oficial do Vite publica `legal/BUNDLED-LICENSES.md`, gerado a partir dos módulos efetivamente incluídos no bundle do navegador. O build oficial do Wrangler publica um metafile integral, validado contra o `package-lock.json`, os pacotes instalados e as licenças correspondentes para gerar `legal/FUNCTIONS-BUNDLED-LICENSES.md`. Ambos complementam — e não substituem — este inventário, o NOTICE, a GNU AGPL e a oferta de Corresponding Source.",
    "",
    "## Cartografia e Natural Earth",
    "",
    `A cartografia usa ${POLICY.cartography.runtimePackages.map((component) => `\`${component}\``).join(", ")}. O asset efetivamente importado \`${POLICY.cartography.package}/${POLICY.cartography.asset}\`, proveniente de \`${POLICY.cartography.package}@${POLICY.cartography.version}\`, deriva de ${POLICY.cartography.dataset} ${POLICY.cartography.datasetVersion}, escala ${POLICY.cartography.scale}. O pacote resolvido, seu README de proveniência e os bytes do asset são vinculados por versão, tamanho e SHA-256 pela política jurídica. Os dados ${POLICY.cartography.dataset} são de domínio público segundo os termos oficiais: ${POLICY.cartography.termsUrl}. “${POLICY.cartography.dataset}” identifica apenas a proveniência e não constitui endosso.`,
    "",
    "## Astronomy Engine",
    "",
    `O cálculo astronômico usa Astronomy Engine ${POLICY.astronomy.version} sob ${POLICY.astronomy.license}. O aviso integral canônico e sua fonte oficial (${POLICY.astronomy.sourceRepository}/blob/v${POLICY.astronomy.version}/${POLICY.astronomy.licensePath}) constam do NOTICE.`,
    "",
    "## Swiss Ephemeris e WebAssembly",
    "",
    `O wrapper npm \`${POLICY.swiss.package}@${POLICY.swiss.wrapperVersion}\` está vinculado ao SRI \`${POLICY.swiss.wrapperIntegrity}\`, ao commit \`${POLICY.swiss.wrapperGitHead}\` e ao SHA-256 de tarball auditado \`${POLICY.swiss.wrapperTarballSha256}\`.`,
    "",
    `O WASM exportado por \`${POLICY.swiss.wasmExport}\` incorpora Swiss Ephemeris ${POLICY.swiss.upstreamVersion}, revisão \`${POLICY.swiss.upstreamRevision}\`, com ${POLICY.swiss.wasmSize} bytes, SHA-256 \`${POLICY.swiss.wasmSha256}\` e SHA-512 \`${POLICY.swiss.wasmSha512}\`. O projeto escolhe a opção GNU AGPL v3 da licença dual. O aviso especial e a oferta de Corresponding Source são reproduzidos integralmente no NOTICE.`,
    "",
  ];
  return [...header, ...table, ...appendix].join("\n");
}

function renderSwissSourceOffer(fragment) {
  return [
    fragment,
    "",
    `Projeto: ${POLICY.project.sourceRepository}`,
    `Wrapper: ${POLICY.swiss.wrapperSourceRepository}/tree/${POLICY.swiss.wrapperGitHead}`,
    `Swiss Ephemeris: ${POLICY.swiss.upstreamSourceRepository}/tree/${POLICY.swiss.upstreamRevision}`,
  ].join("\n");
}

export function renderNotice(fragments) {
  return [
    "Copyright © 2026 LCV Ideas & Software",
    "",
    "AVISOS DE TERCEIROS (THIRD-PARTY NOTICES)",
    "-----------------------------------------",
    "Esta distribuição incorpora componentes sob MIT, ISC, Apache-2.0, MPL-2.0 e GNU AGPL v3. O inventário exato está em THIRDPARTY.md; o bundle do navegador publica os textos integrais aplicáveis em legal/BUNDLED-LICENSES.md, e o bundle Cloudflare Pages Functions publica seu inventário efetivo e textos integrais em legal/FUNCTIONS-BUNDLED-LICENSES.md.",
    "",
    `ASTRONOMY ENGINE ${POLICY.astronomy.version} — ${POLICY.astronomy.license}`,
    "-----------------------------",
    fragments.astronomy,
    "",
    "SWISS EPHEMERIS — ARTEFATO VERIFICADO",
    "---------------------------------------",
    `Wrapper: ${POLICY.swiss.package}@${POLICY.swiss.wrapperVersion}`,
    `Wrapper gitHead: ${POLICY.swiss.wrapperGitHead}`,
    `Wrapper SRI: ${POLICY.swiss.wrapperIntegrity}`,
    `Wrapper tarball SHA-256: ${POLICY.swiss.wrapperTarballSha256}`,
    `Swiss Ephemeris: ${POLICY.swiss.upstreamVersion} (${POLICY.swiss.upstreamRevision})`,
    `WASM: ${POLICY.swiss.wasmSize} bytes`,
    `WASM SHA-256: ${POLICY.swiss.wasmSha256}`,
    `WASM SHA-512: ${POLICY.swiss.wasmSha512}`,
    "",
    "AVISO ESPECIAL DA SWISS EPHEMERIS — REPRODUÇÃO INTEGRAL",
    "-------------------------------------------------------",
    fragments.swissNotice,
    "",
    "OFERTA DE CÓDIGO-FONTE — GNU AGPL v3, SEÇÕES 6 E 13",
    "---------------------------------------------------",
    renderSwissSourceOffer(fragments.swissSourceOffer),
    "",
  ].join("\n");
}

export function renderDocuments(state) {
  const rows = validateState(state);
  return {
    rows,
    thirdparty: renderThirdparty(rows),
    notice: renderNotice(state.fragments),
  };
}

export function assertExactOutput(actual, expected, file) {
  assert(
    actual === expected,
    `${file} divergiu da saída canônica; execute npm run generate:thirdparty.`,
  );
}

export async function applyContract({
  repositoryRoot = REPOSITORY_ROOT,
  write = false,
} = {}) {
  const state = await loadState(repositoryRoot);
  const documents = renderDocuments(state);
  for (const file of POLICY.outputs.thirdparty) {
    const target = path.join(repositoryRoot, file);
    if (write) await writeFile(target, documents.thirdparty, "utf8");
    else
      assertExactOutput(
        await readFile(target, "utf8"),
        documents.thirdparty,
        file,
      );
  }
  for (const file of POLICY.outputs.notice) {
    const target = path.join(repositoryRoot, file);
    if (write) await writeFile(target, documents.notice, "utf8");
    else
      assertExactOutput(await readFile(target, "utf8"), documents.notice, file);
  }
  return documents;
}

async function main() {
  const args = process.argv.slice(2);
  assert(
    args.length <= 1 &&
      (args.length === 0 ||
        args[0] === "--check" ||
        args[0] === "--write" ||
        args[0] === "--check-upstream"),
    "Uso: verify-thirdparty.mjs [--check|--write|--check-upstream]",
  );
  const write = args[0] === "--write";
  const result = await applyContract({ write });
  if (args[0] === "--check-upstream") await verifyUpstream();
  console.log(
    `${write ? "Gerados" : "Verificados"} THIRDPARTY/NOTICE (${result.rows.length} relações diretas)${args[0] === "--check-upstream" ? " e proveniência oficial upstream" : ""}.`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
