import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { POLICY } from "./legal/thirdparty-policy.mjs";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const REGISTRY_VERSION =
  /^(?:[~^]?)(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContractError";
  }
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha512 = (bytes) => createHash("sha512").update(bytes).digest("hex");
const normalizeFragment = (value) =>
  value.replaceAll("\r\n", "\n").replace(/\n+$/, "");

function assert(condition, message) {
  if (!condition) throw new ContractError(message);
}

function trackedPackageMetadata(repositoryRoot) {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  assert(
    result.status === 0,
    `git ls-files falhou: ${result.stderr?.trim() || `status ${result.status}`}`,
  );
  return result.stdout
    .split("\0")
    .filter(Boolean)
    .filter((file) =>
      /(?:^|\/)(?:package(?:-lock)?\.json|npm-shrinkwrap\.json)$/.test(file),
    )
    .sort();
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

  return {
    repositoryRoot,
    trackedFiles: trackedPackageMetadata(repositoryRoot),
    roots,
    wasmBytes,
    fragments: {
      astronomy: await loadFragment(repositoryRoot, POLICY.fragments.astronomy),
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

  const astronomy = rows.find(
    (row) =>
      row.manifest === "astrologo-frontend/package.json" &&
      row.component === "astronomy-engine",
  );
  assert(
    astronomy?.resolvedVersion === "2.1.19" && astronomy.license === "MIT",
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
    "A tabela deriva exclusivamente dos manifestos npm rastreados, dos respectivos `package-lock.json` e dos `package.json` instalados por `npm ci`. Os textos integrais das licenças do bundle do navegador são gerados pelo Vite em `/legal/BUNDLED-LICENSES.md`; o bundle separado das Cloudflare Functions não é coberto por esse artefato. O inventário direto permanece neste documento e as exceções permanecem no NOTICE canônico.",
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
    "## Textos das licenças do bundle do navegador",
    "",
    "O build oficial do Vite publica `legal/BUNDLED-LICENSES.md`, gerado a partir dos módulos efetivamente incluídos no bundle do navegador. Ele não cobre o bundle separado das Cloudflare Functions. Esse artefato complementa — e não substitui — este inventário, o NOTICE, a GNU AGPL e a oferta de Corresponding Source.",
    "",
    "## Cartografia e Natural Earth",
    "",
    "A cartografia usa `d3-geo`, `topojson-client` e `world-atlas`. O mapa-base deriva de Natural Earth 4.1.0, escala 1:110m. Os dados Natural Earth são de domínio público segundo os termos oficiais: https://www.naturalearthdata.com/about/terms-of-use/. “Natural Earth” identifica apenas a proveniência e não constitui endosso.",
    "",
    "## Astronomy Engine",
    "",
    `O cálculo astronômico usa Astronomy Engine 2.1.19 sob MIT. O aviso integral canônico e sua fonte oficial (${POLICY.fragments.astronomy.source}) constam do NOTICE.`,
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

export function renderNotice(fragments) {
  return [
    "Copyright © 2026 LCV Ideas & Software",
    "",
    "AVISOS DE TERCEIROS (THIRD-PARTY NOTICES)",
    "-----------------------------------------",
    "Esta distribuição incorpora componentes sob MIT, ISC, Apache-2.0, MPL-2.0 e GNU AGPL v3. O inventário exato está em THIRDPARTY.md; o bundle do navegador publica os textos integrais aplicáveis em legal/BUNDLED-LICENSES.md. Esse artefato não cobre o bundle separado das Cloudflare Functions.",
    "",
    "ASTRONOMY ENGINE 2.1.19 — MIT",
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
    fragments.swissSourceOffer,
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
      (args.length === 0 || args[0] === "--check" || args[0] === "--write"),
    "Uso: verify-thirdparty.mjs [--check|--write]",
  );
  const write = args[0] === "--write";
  const result = await applyContract({ write });
  console.log(
    `${write ? "Gerados" : "Verificados"} THIRDPARTY/NOTICE (${result.rows.length} relações diretas).`,
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
