import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { POLICY } from "./legal/thirdparty-policy.mjs";
import {
  assertExactOutput,
  escapeMarkdownCell,
  extractPackageImports,
  loadState,
  renderDocuments,
  validateState,
  validateUpstreamEvidence,
} from "./verify-thirdparty.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const canonicalState = await loadState(repositoryRoot);
const expectedRelations = canonicalState.roots.reduce(
  (total, root) =>
    total +
    POLICY.relations.reduce(
      (rootTotal, relation) =>
        rootTotal + Object.keys(root.manifest[relation] ?? {}).length,
      0,
    ),
  0,
);

test("inventário de imports cobre ESM, dynamic import e CommonJS", () => {
  const packageName = "sample-package";
  const source = [
    'import packageRoot from "sample-package";',
    'import value from "sample-package/static";',
    "import 'sample-package/side-effect';",
    "await import(`sample-package/dynamic`);",
    "require('sample-package/commonjs');",
    'require.resolve("sample-package/resolved");',
  ].join("\n");
  assert.deepEqual(extractPackageImports(source, packageName), [
    "sample-package",
    "sample-package/static",
    "sample-package/side-effect",
    "sample-package/dynamic",
    "sample-package/commonjs",
    "sample-package/resolved",
  ]);
});

function cloneState() {
  return structuredClone(canonicalState);
}

function rootFor(state, manifestPath) {
  return state.roots.find((root) => root.manifestPath === manifestPath);
}

function expectContractFailure(mutate, pattern) {
  const state = cloneState();
  mutate(state);
  assert.throws(() => validateState(state), pattern);
}

function canonicalUpstreamEvidence() {
  return {
    worldAtlas: {
      metadata: {
        version: POLICY.cartography.version,
        license: POLICY.cartography.license,
        dist: {
          integrity: POLICY.cartography.integrity,
          tarball: `https://registry.npmjs.org/world-atlas/-/world-atlas-${POLICY.cartography.version}.tgz`,
        },
        gitHead: POLICY.cartography.gitHead,
        repository: {
          url: `git+${POLICY.cartography.sourceRepository}.git`,
        },
      },
      readmeBytes: Buffer.from(canonicalState.cartography.readme, "utf8"),
      tarballIntegrity: POLICY.cartography.integrity,
    },
    swiss: {
      metadata: {
        version: POLICY.swiss.wrapperVersion,
        license: POLICY.swiss.license,
        dist: {
          integrity: POLICY.swiss.wrapperIntegrity,
          tarball: `https://registry.npmjs.org/@fusionstrings/swiss-eph/-/swiss-eph-${POLICY.swiss.wrapperVersion}.tgz`,
        },
        gitHead: POLICY.swiss.wrapperGitHead,
        repository: {
          url: `git+${POLICY.swiss.wrapperSourceRepository}.git`,
        },
      },
      tree: {
        truncated: false,
        tree: [
          {
            path: "vendor/swisseph",
            mode: "160000",
            type: "commit",
            sha: POLICY.swiss.upstreamRevision,
          },
        ],
      },
      tarballIntegrity: POLICY.swiss.wrapperIntegrity,
      tarballSha256: POLICY.swiss.wrapperTarballSha256,
    },
  };
}

function expectUpstreamFailure(mutate, pattern) {
  const evidence = canonicalUpstreamEvidence();
  mutate(evidence);
  assert.throws(() => validateUpstreamEvidence(evidence), pattern);
}

test("estado canônico produz todas as relações e duas cópias byte a byte", async () => {
  const documents = renderDocuments(canonicalState);
  assert.equal(documents.rows.length, expectedRelations);
  assert.match(
    documents.thirdparty,
    new RegExp(`Dependências diretas \\(${expectedRelations} relações\\)`),
  );
  assert.match(
    documents.thirdparty,
    /dompurify \| dependencies \| \^3\.4\.14 \| 3\.4\.14 \| \(MPL-2\.0 OR Apache-2\.0\)/,
  );
  assert.match(
    documents.thirdparty,
    /lucide-react \| dependencies \| \^1\.33\.0 \| 1\.33\.0 \| ISC/,
  );
  assert.match(
    documents.thirdparty,
    /@vitejs\/plugin-react \| devDependencies \| \^6\.1\.0 \| 6\.1\.0 \| MIT/,
  );
  assert.match(
    documents.thirdparty,
    /vite \| devDependencies \| \^8\.2\.2 \| 8\.2\.2 \| MIT/,
  );
  assert.match(
    documents.thirdparty,
    new RegExp(
      `${POLICY.cartography.package}@${POLICY.cartography.version}.*${POLICY.cartography.dataset} ${POLICY.cartography.datasetVersion}.*${POLICY.cartography.scale}`,
    ),
  );
  assert.ok(
    documents.notice.includes(
      `${POLICY.swiss.wrapperSourceRepository}/tree/${POLICY.swiss.wrapperGitHead}`,
    ),
  );
  assert.ok(
    documents.notice.includes(
      `${POLICY.swiss.upstreamSourceRepository}/tree/${POLICY.swiss.upstreamRevision}`,
    ),
  );
  for (const file of POLICY.outputs.thirdparty) {
    assertExactOutput(
      await readFile(path.join(repositoryRoot, file), "utf8"),
      documents.thirdparty,
      file,
    );
  }
  for (const file of POLICY.outputs.notice) {
    assertExactOutput(
      await readFile(path.join(repositoryRoot, file), "utf8"),
      documents.notice,
      file,
    );
  }
});

test("descoberta fail-closed rejeita qualquer terceiro root, inclusive sob build/dist", () => {
  expectContractFailure(
    (state) => state.trackedFiles.push("build/tool/package.json"),
    /Roots npm rastreados inesperados/,
  );
});

test("relações não classificadas optional, peer e bundle falham fechadas", () => {
  for (const relation of [
    "optionalDependencies",
    "peerDependencies",
    "bundledDependencies",
    "bundleDependencies",
  ]) {
    expectContractFailure((state) => {
      rootFor(state, "package.json").manifest[relation] = relation.startsWith(
        "bundle",
      )
        ? ["prettier"]
        : { prettier: "^3.9.6" };
    }, new RegExp(relation));
  }
});

test("dependência ausente, especificação stale e origem customizada falham", () => {
  expectContractFailure((state) => {
    delete rootFor(state, "package.json").lock.packages[
      "node_modules/prettier"
    ];
  }, /não contém node_modules\/prettier/);

  expectContractFailure((state) => {
    rootFor(state, "package.json").lock.packages[""].devDependencies.prettier =
      "^3.8.0";
  }, /diverge do manifesto/);

  expectContractFailure((state) => {
    rootFor(state, "package.json").manifest.devDependencies.prettier =
      "npm:prettier@3.9.6";
  }, /origem ou especificação não homologada/);

  expectContractFailure((state) => {
    rootFor(state, "package.json").lock.packages[
      "node_modules/prettier"
    ].resolved = "https://registry.example/prettier.tgz";
  }, /tarball oficial exato/);
});

test("identidade, versão e licença devem coincidir entre instalação e lock", () => {
  expectContractFailure((state) => {
    rootFor(state, "package.json").installed.prettier.name = "impostor";
  }, /package.json instalado declara name/);
  expectContractFailure((state) => {
    rootFor(state, "package.json").installed.prettier.version = "0.0.0";
  }, /versão instalada/);
  expectContractFailure((state) => {
    rootFor(state, "package.json").installed.prettier.license = "GPL-3.0";
  }, /licença instalada/);
});

test("binding Swiss valida SRI, tamanho e bytes SHA-256/SHA-512", () => {
  expectContractFailure((state) => {
    const frontend = rootFor(state, "astrologo-frontend/package.json");
    frontend.lock.packages["node_modules/@fusionstrings/swiss-eph"].integrity =
      "sha512-inválido";
  }, /SRI do wrapper Swiss/);
  expectContractFailure((state) => {
    state.wasmBytes[0] ^= 0xff;
  }, /SHA-256 do Swiss Ephemeris WASM/);
  expectContractFailure((state) => {
    state.fragments.swissSourceOffer +=
      "\nhttps://example.invalid/tree/0000000000000000000000000000000000000000";
  }, /não pode conter URLs, versões ou revisões/);
});

test("proveniência cartográfica vincula pacote, README, asset e import real", () => {
  expectContractFailure((state) => {
    const frontend = rootFor(state, "astrologo-frontend/package.json");
    frontend.manifest.dependencies[POLICY.cartography.package] = "2.0.3";
    frontend.lock.packages[""].dependencies[POLICY.cartography.package] =
      "2.0.3";
    const locked =
      frontend.lock.packages[`node_modules/${POLICY.cartography.package}`];
    locked.version = "2.0.3";
    locked.resolved =
      "https://registry.npmjs.org/world-atlas/-/world-atlas-2.0.3.tgz";
    frontend.installed[POLICY.cartography.package].version = "2.0.3";
  }, /política de proveniência cartográfica/);
  expectContractFailure((state) => {
    state.cartography.readme = state.cartography.readme.replace(
      `version ${POLICY.cartography.datasetVersion} as TopoJSON`,
      "versão não auditada",
    );
  }, /README do world-atlas divergiu/);
  expectContractFailure((state) => {
    state.cartography.assetBytes[0] ^= 0xff;
  }, /Asset countries-110m\.json divergiu/);
  expectContractFailure((state) => {
    state.cartography.imports.push({
      source: "astrologo-frontend/src/components/SecondMap.tsx",
      specifier: `${POLICY.cartography.package}/countries-50m.json`,
    });
  }, /Imports world-atlas divergiram/);
  expectContractFailure((state) => {
    state.cartography.imports[0].specifier = `${POLICY.cartography.package}/countries-50m.json`;
  }, /Imports world-atlas divergiram/);
});

test("proveniência oficial vincula npm, commits GitHub e gitlink Swiss", () => {
  assert.doesNotThrow(() =>
    validateUpstreamEvidence(canonicalUpstreamEvidence()),
  );
  expectUpstreamFailure((evidence) => {
    evidence.worldAtlas.metadata.gitHead = "0".repeat(40);
  }, /Metadados npm do world-atlas/);
  expectUpstreamFailure((evidence) => {
    evidence.worldAtlas.metadata.dist.integrity = "sha512-divergente";
  }, /Metadados npm do world-atlas/);
  expectUpstreamFailure((evidence) => {
    evidence.worldAtlas.readmeBytes[0] ^= 0xff;
  }, /README no commit GitHub/);
  expectUpstreamFailure((evidence) => {
    evidence.worldAtlas.tarballIntegrity = "sha512-divergente";
  }, /Tarball oficial do world-atlas/);
  expectUpstreamFailure((evidence) => {
    evidence.swiss.metadata.gitHead = "0".repeat(40);
  }, /Metadados npm do wrapper Swiss/);
  expectUpstreamFailure((evidence) => {
    evidence.swiss.tarballSha256 = "0".repeat(64);
  }, /Tarball oficial do wrapper Swiss/);
  expectUpstreamFailure((evidence) => {
    evidence.swiss.tree.tree[0].sha = "0".repeat(40);
  }, /Gitlink vendor\/swisseph/);
  expectUpstreamFailure((evidence) => {
    evidence.swiss.tree.truncated = true;
  }, /árvore GitHub do wrapper Swiss foi truncada/i);
});

test("igualdade integral rejeita linha duplicada, conteúdo envolvente e metadado NOTICE stale", () => {
  const documents = renderDocuments(canonicalState);
  const firstDataRow = documents.thirdparty
    .split("\n")
    .find((line) => line.startsWith("| package.json"));
  assert.ok(firstDataRow);
  const mutations = [
    "",
    `${documents.thirdparty}\n${firstDataRow}`,
    `<details>\n${documents.thirdparty}\n</details>`,
    `${documents.thirdparty}\nconteúdo arbitrário`,
  ];
  for (const mutation of mutations) {
    assert.throws(
      () => assertExactOutput(mutation, documents.thirdparty, "THIRDPARTY.md"),
      /saída canônica/,
    );
  }
  assert.throws(
    () =>
      assertExactOutput(
        documents.notice.replace("Wrapper gitHead:", "Wrapper gitHead stale:"),
        documents.notice,
        "NOTICE",
      ),
    /saída canônica/,
  );
});

test("escape Markdown preserva pipes e barras sem parser reverso", () => {
  assert.equal(escapeMarkdownCell("A\\B|C\nD"), "A\\\\B\\|C D");
});
