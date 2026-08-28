/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { builtinModules } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { POLICY } from "./legal/thirdparty-policy.mjs";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const FRONTEND_ROOT = path.join(REPOSITORY_ROOT, "astrologo-frontend");
const FUNCTIONS_ROOT = path.join(FRONTEND_ROOT, "functions");
const NODE_MODULES_ROOT = path.join(FRONTEND_ROOT, "node_modules");
const DISABLED_PREFIX = "(disabled):";
const LICENSE_FILE = /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i;
const NODE_BUILTINS = new Set(
  builtinModules.flatMap((name) => [name, name.replace(/^node:/, "")]),
);

export class FunctionsLicenseError extends Error {
  constructor(message) {
    super(message);
    this.name = "FunctionsLicenseError";
  }
}

function assert(condition, message) {
  if (!condition) throw new FunctionsLicenseError(message);
}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha512 = (bytes) => createHash("sha512").update(bytes).digest("hex");
const toPosix = (value) => value.replaceAll(path.sep, "/");
const normalizeText = (value) =>
  value.replaceAll("\r\n", "\n").replace(/\n+$/, "");

function isInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function existingFile(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

export async function resolveInstalledPackage(inputFile, lock) {
  let current = path.dirname(inputFile);
  while (isInside(current, NODE_MODULES_ROOT)) {
    const manifestPath = path.join(current, "package.json");
    if (await existingFile(manifestPath)) {
      const manifest = await readJson(manifestPath);
      const lockKey = toPosix(path.relative(FRONTEND_ROOT, current));
      const locked = lock.packages?.[lockKey];
      if (
        typeof manifest.name === "string" &&
        typeof manifest.version === "string" &&
        locked
      ) {
        assert(
          locked.version === manifest.version,
          `${manifest.name}: versão instalada ${manifest.version} diverge do lock ${String(locked.version)}.`,
        );
        assert(
          locked.name === undefined || locked.name === manifest.name,
          `${lockKey}: name do lock diverge de ${manifest.name}.`,
        );
        assert(
          typeof manifest.license === "string" &&
            manifest.license.length > 0 &&
            manifest.license === locked.license,
          `${manifest.name}@${manifest.version}: licença ausente ou divergente entre pacote instalado e package-lock.`,
        );
        assert(
          typeof locked.resolved === "string" &&
            locked.resolved.startsWith("https://registry.npmjs.org/") &&
            typeof locked.integrity === "string" &&
            locked.integrity.startsWith("sha512-"),
          `${manifest.name}@${manifest.version}: package-lock não prova tarball npm oficial com integridade SHA-512.`,
        );
        return { root: current, manifest, locked, lockKey };
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new FunctionsLicenseError(
    `Input npm ${toPosix(path.relative(FRONTEND_ROOT, inputFile))} não corresponde inequivocamente a pacote instalado e chave exata do package-lock.`,
  );
}

async function loadPinnedFragment(fragmentName) {
  const descriptor = POLICY.fragments[fragmentName];
  assert(descriptor, `Fragmento jurídico desconhecido: ${fragmentName}.`);
  const bytes = await readFile(path.join(REPOSITORY_ROOT, descriptor.path));
  assert(
    sha256(bytes) === descriptor.sha256,
    `Fragmento jurídico ${descriptor.path} divergiu do hash canônico.`,
  );
  return {
    name: path.basename(descriptor.path),
    text: normalizeText(bytes.toString("utf8")),
  };
}

export async function packageLicenseTexts(packageRecord) {
  const entries = await readdir(packageRecord.root, { withFileTypes: true });
  const licenseFiles = entries
    .filter((entry) => entry.isFile() && LICENSE_FILE.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  if (licenseFiles.length > 0) {
    return {
      source: `tarball npm oficial (${licenseFiles.join(", ")})`,
      rationale: undefined,
      texts: await Promise.all(
        licenseFiles.map(async (name) => ({
          name,
          text: normalizeText(
            await readFile(path.join(packageRecord.root, name), "utf8"),
          ),
        })),
      ),
    };
  }

  const fallback =
    POLICY.functionsBundle.licenseFallbacks[packageRecord.manifest.name];
  assert(
    fallback &&
      fallback.version === packageRecord.manifest.version &&
      fallback.license === packageRecord.manifest.license,
    `${packageRecord.manifest.name}@${packageRecord.manifest.version}: tarball sem LICENSE/NOTICE e sem fallback jurídico exato.`,
  );
  if (fallback.author) {
    assert(
      packageRecord.manifest.author === fallback.author &&
        packageRecord.manifest.repository?.url === fallback.repository,
      `${packageRecord.manifest.name}@${packageRecord.manifest.version}: autoria ou repositório diverge da exceção jurídica pinada.`,
    );
  }
  return {
    source: fallback.source,
    rationale: fallback.rationale,
    texts: await Promise.all(
      fallback.fragments.map((fragment) => loadPinnedFragment(fragment)),
    ),
  };
}

function canonicalInputPath(rawInput, absoluteInput) {
  const disabled = rawInput.startsWith(DISABLED_PREFIX);
  const prefix = disabled ? DISABLED_PREFIX : "";
  if (isInside(absoluteInput, NODE_MODULES_ROOT)) {
    return `${prefix}${toPosix(path.relative(FRONTEND_ROOT, absoluteInput))}`;
  }
  if (isInside(absoluteInput, path.join(FRONTEND_ROOT, ".wrangler", "tmp"))) {
    return `${prefix}.wrangler/tmp/[wrangler-generated]/functionsRoutes.mjs`;
  }
  return `${prefix}${toPosix(path.relative(FRONTEND_ROOT, absoluteInput))}`;
}

export async function validateExternalImports(metafile) {
  const externals = [];
  const outputs = [];
  for (const [outputName, output] of Object.entries(metafile.outputs)) {
    const outputFile = path.resolve(FUNCTIONS_ROOT, outputName);
    assert(
      await existingFile(outputFile),
      `Output Wrangler declarado no metafile não existe: ${outputName}.`,
    );
    assert(
      isInside(
        outputFile,
        path.dirname(
          path.join(REPOSITORY_ROOT, POLICY.functionsBundle.metafile),
        ),
      ) && outputFile.endsWith(".js"),
      `Output Wrangler inesperado no metafile: ${outputName}.`,
    );
    const outputBytes = await readFile(outputFile);
    outputs.push({
      name: path.basename(outputFile),
      bytes: outputBytes.byteLength,
      sha256: sha256(outputBytes),
    });
    for (const imported of output.imports ?? []) {
      assert(
        imported.external === true,
        `Import interno inesperado no output ${outputName}: ${imported.path}.`,
      );
      assert(
        imported.kind === "import-statement" &&
          /^\.\/[0-9a-f]{40}-swiss_eph\.wasm$/.test(imported.path),
        `Import externo não homologado no bundle Functions: ${imported.path}.`,
      );
      const artifact = path.resolve(path.dirname(outputFile), imported.path);
      assert(
        isInside(artifact, path.dirname(outputFile)) &&
          (await existingFile(artifact)),
        `Artefato externo declarado não existe junto ao output: ${imported.path}.`,
      );
      const bytes = await readFile(artifact);
      assert(
        bytes.byteLength === POLICY.swiss.wasmSize &&
          sha256(bytes) === POLICY.swiss.wasmSha256 &&
          sha512(bytes) === POLICY.swiss.wasmSha512,
        `Artefato externo ${imported.path} diverge do Swiss Ephemeris WASM homologado.`,
      );
      externals.push({
        name: path.basename(artifact),
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      });
    }
  }
  assert(
    externals.length === 1,
    `Bundle Functions deve conter exatamente o Swiss Ephemeris WASM externo homologado; encontrado(s): ${externals.length}.`,
  );
  return {
    externals,
    outputs: outputs.sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function inspectFunctionsBundle({
  metafilePath = path.join(REPOSITORY_ROOT, POLICY.functionsBundle.metafile),
} = {}) {
  const metafile = await readJson(metafilePath);
  assert(
    metafile &&
      typeof metafile.outputs === "object" &&
      Object.keys(metafile.outputs).length > 0,
    "Metafile oficial do Wrangler não contém outputs.",
  );
  const lock = await readJson(path.join(FRONTEND_ROOT, "package-lock.json"));
  assert(
    lock.lockfileVersion >= 2 && lock.packages,
    "package-lock do frontend inválido.",
  );

  const { externals, outputs } = await validateExternalImports(metafile);
  const packages = new Map();
  const inputs = new Map();
  const builtins = new Set();
  let firstPartyInputCount = 0;
  let generatedInputCount = 0;

  for (const [outputName, output] of Object.entries(metafile.outputs).sort()) {
    for (const [rawInput, details] of Object.entries(
      output.inputs ?? {},
    ).sort()) {
      assert(
        Number.isFinite(details.bytesInOutput) && details.bytesInOutput >= 0,
        `bytesInOutput inválido para ${rawInput}.`,
      );
      if (details.bytesInOutput === 0) continue;

      const disabled = rawInput.startsWith(DISABLED_PREFIX);
      const sourceInput = disabled
        ? rawInput.slice(DISABLED_PREFIX.length)
        : rawInput;
      const absoluteInput = path.resolve(FUNCTIONS_ROOT, sourceInput);
      let classification;
      let packageName = "—";

      if (isInside(absoluteInput, NODE_MODULES_ROOT)) {
        const resolved = await resolveInstalledPackage(absoluteInput, lock);
        packageName = resolved.manifest.name;
        classification = disabled ? "npm (stub oficial)" : "npm";
        let record = packages.get(resolved.lockKey);
        if (!record) {
          record = {
            ...resolved,
            bytesInOutput: 0,
            inputCount: 0,
            licenses: await packageLicenseTexts(resolved),
          };
          packages.set(resolved.lockKey, record);
        }
        record.bytesInOutput += details.bytesInOutput;
        record.inputCount += 1;
      } else if (
        disabled &&
        NODE_BUILTINS.has(sourceInput.replace(/^node:/, ""))
      ) {
        classification = "Node.js builtin (stub oficial)";
        builtins.add(sourceInput.replace(/^node:/, ""));
      } else if (
        isInside(absoluteInput, path.join(FRONTEND_ROOT, ".wrangler", "tmp")) &&
        /[\\/]pages-[A-Za-z0-9]+[\\/]functionsRoutes-[0-9.]+\.mjs$/.test(
          absoluteInput,
        )
      ) {
        classification = "Wrangler gerado";
        generatedInputCount += 1;
      } else if (
        isInside(absoluteInput, FRONTEND_ROOT) &&
        (await existingFile(absoluteInput))
      ) {
        classification = "primeira parte";
        firstPartyInputCount += 1;
      } else {
        throw new FunctionsLicenseError(
          `Input efetivo do bundle não foi classificado de forma homologada: ${rawInput}.`,
        );
      }

      const canonical =
        disabled && NODE_BUILTINS.has(sourceInput.replace(/^node:/, ""))
          ? `${DISABLED_PREFIX}node:${sourceInput.replace(/^node:/, "")}`
          : canonicalInputPath(rawInput, absoluteInput);
      const key = `${path.basename(outputName)}\0${canonical}\0${classification}\0${packageName}`;
      const prior = inputs.get(key);
      inputs.set(key, {
        output: path.basename(outputName),
        input: canonical,
        classification,
        packageName,
        bytesInOutput: (prior?.bytesInOutput ?? 0) + details.bytesInOutput,
      });
    }
  }

  assert(inputs.size > 0, "Metafile Wrangler não contém inputs efetivos.");
  return {
    externals,
    outputs,
    packages: [...packages.values()].sort((left, right) =>
      `${left.manifest.name}\0${left.manifest.version}\0${left.lockKey}`.localeCompare(
        `${right.manifest.name}\0${right.manifest.version}\0${right.lockKey}`,
      ),
    ),
    inputs: [...inputs.values()].sort((left, right) =>
      `${left.output}\0${left.input}`.localeCompare(
        `${right.output}\0${right.input}`,
      ),
    ),
    builtins: [...builtins].sort(),
    firstPartyInputCount,
    generatedInputCount,
  };
}

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderFunctionsLicenseReport(inventory) {
  const packageTable = inventory.packages.map(
    (record) =>
      `| ${[
        `${record.manifest.name}@${record.manifest.version}`,
        record.manifest.license,
        record.inputCount,
        record.locked.resolved,
        record.locked.integrity,
      ]
        .map(markdownCell)
        .join(" | ")} |`,
  );
  const inputTable = inventory.inputs.map(
    (record) =>
      `| ${[
        record.output,
        record.input,
        record.classification,
        record.packageName,
      ]
        .map(markdownCell)
        .join(" | ")} |`,
  );
  const fullTexts = inventory.packages.flatMap((record) => {
    const provenance = [
      `- Licença declarada: \`${record.manifest.license}\``,
      `- Origem do texto: ${record.licenses.source}`,
      ...(record.licenses.rationale
        ? [`- Justificativa do fallback pinado: ${record.licenses.rationale}`]
        : []),
    ];
    const texts = record.licenses.texts.flatMap((license) => {
      assert(
        license.text.length > 0 && !license.text.includes("```"),
        `${record.manifest.name}: texto jurídico vazio ou incompatível com o relatório Markdown.`,
      );
      return [`#### ${license.name}`, "", "```text", license.text, "```", ""];
    });
    return [
      `### ${record.manifest.name}@${record.manifest.version}`,
      "",
      ...provenance,
      "",
      ...texts,
    ];
  });

  return [
    "# Cloudflare Pages Functions — Third-Party Licenses",
    "",
    "Este arquivo é gerado no build pelo Wrangler oficial com `pages functions build --metafile` e por uma camada mínima de validação Node.js. Não o edite manualmente.",
    "",
    "## Proveniência do bundle",
    "",
    `- Inputs efetivos inventariados: ${inventory.inputs.length}`,
    `- Pacotes npm efetivamente incorporados: ${inventory.packages.length}`,
    `- Inputs de primeira parte: ${inventory.firstPartyInputCount}`,
    `- Inputs gerados pelo Wrangler: ${inventory.generatedInputCount}`,
    `- Builtins Node.js substituídos por stubs oficiais: ${inventory.builtins.length > 0 ? inventory.builtins.map((name) => `\`${name}\``).join(", ") : "nenhum"}`,
    `- Artefato externo homologado: \`${inventory.externals[0].name}\` (${inventory.externals[0].bytes} bytes; SHA-256 \`${inventory.externals[0].sha256}\`)`,
    `- Output(s) JavaScript: ${inventory.outputs.map((output) => `\`${output.name}\` (${output.bytes} bytes; SHA-256 \`${output.sha256}\`)`).join(", ")}`,
    "- Escopo do hash de output: build de validação imediatamente anterior ao deploy; `wrangler pages deploy` recompila as Functions e ainda não expõe `--metafile` para provar igualdade byte a byte do artefato publicado.",
    "",
    "## Pacotes npm efetivamente incorporados",
    "",
    "| Pacote | Licença | Inputs efetivos | Tarball oficial | SRI do lock |",
    "| --- | --- | ---: | --- | --- |",
    ...packageTable,
    "",
    "## Inventário determinístico de inputs efetivos",
    "",
    "| Output | Input efetivo (`bytesInOutput > 0`) | Classificação | Pacote |",
    "| --- | --- | --- | --- |",
    ...inputTable,
    "",
    "## Textos integrais das licenças",
    "",
    ...fullTexts,
  ].join("\n");
}

export async function generateFunctionsLicenseReport({
  metafilePath = path.join(REPOSITORY_ROOT, POLICY.functionsBundle.metafile),
  reportPath = path.join(REPOSITORY_ROOT, POLICY.functionsBundle.report),
} = {}) {
  const inventory = await inspectFunctionsBundle({ metafilePath });
  const report = renderFunctionsLicenseReport(inventory);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report, "utf8");
  return { inventory, report, reportPath };
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length <= 1, "Uso: generate-functions-licenses.mjs [metafile].");
  const result = await generateFunctionsLicenseReport({
    metafilePath: args[0]
      ? path.resolve(process.cwd(), args[0])
      : path.join(REPOSITORY_ROOT, POLICY.functionsBundle.metafile),
  });
  console.log(
    `Publicado ${toPosix(path.relative(REPOSITORY_ROOT, result.reportPath))}: ${result.inventory.inputs.length} inputs efetivos, ${result.inventory.packages.length} pacotes npm e 1 artefato externo homologado.`,
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
