import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { POLICY } from "./legal/thirdparty-policy.mjs";
import {
  assertExactOutput,
  escapeMarkdownCell,
  loadState,
  renderDocuments,
  validateState,
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
