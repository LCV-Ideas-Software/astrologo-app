import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  inspectFunctionsBundle,
  packageLicenseTexts,
  resolveInstalledPackage,
  validateExternalImports,
} from "./generate-functions-licenses.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const frontendRoot = path.join(repositoryRoot, "astrologo-frontend");
const metafilePath = path.join(
  frontendRoot,
  ".wrangler/functions-build-check/bundle-meta.json",
);

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

test("metafile Wrangler classifica integralmente inputs e pacotes do bundle Functions", async () => {
  const inventory = await inspectFunctionsBundle({ metafilePath });
  const packageNames = new Set(
    inventory.packages.map((record) => record.manifest.name),
  );

  assert(inventory.inputs.length > 0);
  assert(packageNames.has("sanitize-html"));
  assert(packageNames.has("@js-temporal/polyfill"));
  assert(packageNames.has("wrangler"));
  assert.equal(inventory.externals.length, 1);
});

test("import externo diferente do WASM Swiss fixado falha fechado", async () => {
  const metafile = await readJson(metafilePath);
  const output = Object.values(metafile.outputs)[0];
  output.imports = [
    {
      path: "third-party-unreviewed",
      kind: "import-statement",
      external: true,
    },
  ];

  await assert.rejects(
    validateExternalImports(metafile),
    /Import externo não homologado/,
  );
});

test("input npm sem chave exata no lock e pacote sem fallback exato falham fechado", async () => {
  const lock = await readJson(path.join(frontendRoot, "package-lock.json"));
  delete lock.packages["node_modules/sanitize-html"];
  await assert.rejects(
    resolveInstalledPackage(
      path.join(frontendRoot, "node_modules/sanitize-html/index.js"),
      lock,
    ),
    /não corresponde inequivocamente/,
  );

  await assert.rejects(
    packageLicenseTexts({
      root: path.join(frontendRoot, "node_modules/launder"),
      manifest: { name: "launder", version: "0.0.0", license: "MIT" },
    }),
    /sem LICENSE\/NOTICE e sem fallback jurídico exato/,
  );
});
