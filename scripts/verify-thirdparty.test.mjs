import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseDirectDependencies,
  verifyThirdParty,
} from "./verify-thirdparty.mjs";

const [
  rootManifestText,
  rootLockfileText,
  frontendManifestText,
  frontendLockfileText,
  canonical,
  publicCopy,
] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../package-lock.json", import.meta.url), "utf8"),
  readFile(
    new URL("../astrologo-frontend/package.json", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../astrologo-frontend/package-lock.json", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../THIRDPARTY.md", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../astrologo-frontend/public/legal/THIRDPARTY.md",
      import.meta.url,
    ),
    "utf8",
  ),
]);
const packageSets = [
  {
    component: "package.json",
    manifest: JSON.parse(rootManifestText),
    lockfile: JSON.parse(rootLockfileText),
  },
  {
    component: "astrologo-frontend/package.json",
    manifest: JSON.parse(frontendManifestText),
    lockfile: JSON.parse(frontendLockfileText),
  },
];
const trackedPackageFiles = [
  "package.json",
  "package-lock.json",
  "astrologo-frontend/package.json",
  "astrologo-frontend/package-lock.json",
];

function packageSet(sets, component) {
  const match = sets.find((candidate) => candidate.component === component);
  assert.ok(match);
  return match;
}

function directRowLine(markdown, { component, name, relation }) {
  return markdown.split(/\r?\n/u).find((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    return cells[0] === component && cells[1] === name && cells[2] === relation;
  });
}

function replaceRowCell(line, index, value) {
  const cells = line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  cells[index] = value;
  return `| ${cells.join(" | ")} |`;
}

function errorsFor(
  markdown,
  publicMarkdown = markdown,
  candidatePackageSets = packageSets,
) {
  return verifyThirdParty({
    packageSets: candidatePackageSets,
    trackedPackageFiles,
    canonical: markdown,
    publicCopy: publicMarkdown,
  });
}

test("accepts the current complete inventory", () => {
  assert.deepEqual(errorsFor(canonical, publicCopy), []);
});

test("rejects a stale direct version", () => {
  const vite = parseDirectDependencies(canonical).find(
    (row) =>
      row.component === "astrologo-frontend/package.json" &&
      row.name === "vite" &&
      row.relation === "devDependencies",
  );
  assert.ok(vite);
  const viteRow = directRowLine(canonical, vite);
  assert.ok(viteRow);
  const stale = canonical.replace(
    viteRow,
    replaceRowCell(viteRow, 3, `${vite.version}-stale`),
  );
  assert.match(errorsFor(stale).join("\n"), /version mismatch for vite/u);
});

test("rejects a lockfile-only resolved update", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const record = frontend.lockfile.packages["node_modules/vite"];
  assert.ok(record?.version && record.resolved);
  const current = record.version;
  const candidate = `${current}-fixture`;
  record.version = candidate;
  record.resolved = record.resolved.replace(current, candidate);
  assert.notEqual(
    record.resolved,
    packageSet(packageSets, "astrologo-frontend/package.json").lockfile
      .packages["node_modules/vite"].resolved,
  );
  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /resolved source mismatch for vite/u,
  );
});

test("rejects an inaccurate direct license", () => {
  const react = parseDirectDependencies(canonical).find(
    (row) =>
      row.component === "astrologo-frontend/package.json" &&
      row.name === "react" &&
      row.relation === "dependencies",
  );
  assert.ok(react);
  const reactRow = directRowLine(canonical, react);
  assert.ok(reactRow);
  const wrongLicense = canonical.replace(
    reactRow,
    replaceRowCell(reactRow, 4, "fixture-invalid-license"),
  );
  assert.match(
    errorsFor(wrongLicense).join("\n"),
    /license mismatch for react/u,
  );
});

test("rejects npm aliases that obscure the locked package identity", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const aliasSpec = "npm:preact@10.28.0";
  frontend.manifest.dependencies.react = aliasSpec;
  frontend.lockfile.packages["node_modules/react"] = {
    name: "preact",
    version: "10.28.0",
    resolved: "https://registry.npmjs.org/preact/-/preact-10.28.0.tgz",
    license: "MIT",
  };
  const reactRow = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "react",
    relation: "dependencies",
  });
  assert.ok(reactRow);
  const aliasRow = replaceRowCell(
    replaceRowCell(
      replaceRowCell(reactRow, 3, aliasSpec),
      4,
      "MIT",
    ),
    6,
    "https://registry.npmjs.org/preact/-/preact-10.28.0.tgz",
  );
  const candidate = canonical.replace(reactRow, aliasRow);

  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /npm package aliases are not supported.*react resolves to preact/u,
  );
});

test("rejects a changed upstream license behind a legal display override", () => {
  const candidatePackageSets = structuredClone(packageSets);
  packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  ).lockfile.packages["node_modules/d3-geo"].license = "MIT";
  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /upstream license changed for d3-geo/u,
  );
});

test("rejects an inaccurate modification disclosure", () => {
  const react = parseDirectDependencies(canonical).find(
    (row) =>
      row.component === "astrologo-frontend/package.json" &&
      row.name === "react" &&
      row.relation === "dependencies",
  );
  assert.ok(react);
  const reactRow = directRowLine(canonical, react);
  assert.ok(reactRow);
  const inaccurate = canonical.replace(
    reactRow,
    replaceRowCell(reactRow, 5, "Sim"),
  );
  assert.match(
    errorsFor(inaccurate).join("\n"),
    /modification disclosure mismatch for react/u,
  );
});

test("includes optional dependencies in the direct inventory", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.optionalDependencies = { "optional-test": "1.0.0" };
  frontend.lockfile.packages["node_modules/optional-test"] = {
    version: "1.0.0",
    resolved:
      "https://registry.npmjs.org/optional-test/-/optional-test-1.0.0.tgz",
    license: "MIT",
  };
  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /missing direct dependency: .* optionalDependencies optional-test/u,
  );
});

test("includes installed optional peer dependencies in the direct inventory", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.peerDependencies = { "peer-test": "^1.0.0" };
  frontend.manifest.peerDependenciesMeta = {
    "peer-test": { optional: true },
  };
  frontend.lockfile.packages["node_modules/peer-test"] = {
    version: "1.0.0",
    resolved: "https://registry.npmjs.org/peer-test/-/peer-test-1.0.0.tgz",
    license: "MIT",
  };
  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /missing direct dependency: .* peerDependencies peer-test/u,
  );
});

test("omits an optional peer dependency that is not installed", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.peerDependencies = { "optional-peer-test": "^1.0.0" };
  frontend.manifest.peerDependenciesMeta = {
    "optional-peer-test": { optional: true },
  };
  assert.deepEqual(errorsFor(canonical, publicCopy, candidatePackageSets), []);
});

test("accepts the same package as both development and peer dependency", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.peerDependencies = {
    vite: frontend.manifest.devDependencies.vite,
  };
  const viteRow = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "vite",
    relation: "devDependencies",
  });
  assert.ok(viteRow);
  const peerRow = replaceRowCell(viteRow, 2, "peerDependencies");
  const candidate = canonical.replace(
    "<!-- direct-dependencies:end -->",
    `${peerRow}\n\n<!-- direct-dependencies:end -->`,
  );
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("optionalDependencies overrides the same dependencies entry", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.optionalDependencies = {
    react: frontend.manifest.dependencies.react,
  };
  const reactRow = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "react",
    relation: "dependencies",
  });
  assert.ok(reactRow);
  const optionalRow = replaceRowCell(reactRow, 2, "optionalDependencies");
  const candidate = canonical
    .replace(`${reactRow}\n`, "")
    .replace(
      "<!-- direct-dependencies:end -->",
      `${optionalRow}\n\n<!-- direct-dependencies:end -->`,
    );
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("rejects a missing direct dependency", () => {
  const row = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "lucide-react",
    relation: "dependencies",
  });
  assert.ok(row);
  const missing = canonical.replace(`${row}\n`, "");
  assert.match(
    errorsFor(missing).join("\n"),
    /missing direct dependency: .* lucide-react/u,
  );
});

test("rejects a duplicate direct dependency", () => {
  const row = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "react",
    relation: "dependencies",
  });
  assert.ok(row);
  const duplicate = canonical.replace(row, `${row}\n${row}`);
  assert.match(
    errorsFor(duplicate).join("\n"),
    /duplicate direct-dependency row: .* dependencies react/u,
  );
});

test("rejects an extra direct dependency", () => {
  const extra = canonical.replace(
    "<!-- direct-dependencies:end -->",
    "| astrologo-frontend/package.json | invented-package | dependencies | 1.0.0 | MIT | Não | https://example.invalid/invented.tgz |\n\n<!-- direct-dependencies:end -->",
  );
  assert.match(
    errorsFor(extra).join("\n"),
    /extra direct dependency: .* dependencies invented-package/u,
  );
});

test("validates direct rows in a later table inside the bounded section", () => {
  const extra = canonical.replace(
    "<!-- direct-dependencies:end -->",
    "## Continuação inválida\n\n| astrologo-frontend/package.json | late-table-package | dependencies | 1.0.0 | MIT | Não | https://example.invalid/late-table-package-1.0.0.tgz |\n\n<!-- direct-dependencies:end -->",
  );
  assert.match(
    errorsFor(extra).join("\n"),
    /extra direct dependency: .* late-table-package/u,
  );
});

test("rejects a reordered direct-table header", () => {
  const header = canonical
    .split(/\r?\n/u)
    .find(
      (line) => line.includes("Manifesto") && line.includes("Licença Original"),
    );
  assert.ok(header);
  const reorderedHeader = replaceRowCell(
    replaceRowCell(header, 4, "Modificado?"),
    5,
    "Licença Original",
  );
  const candidate = canonical.replace(header, reorderedHeader);
  assert.match(
    errorsFor(candidate).join("\n"),
    /direct-dependency table header does not match the schema/u,
  );
});

test("rejects a stale retained transitive component", () => {
  const jsbi = canonical
    .split(/\r?\n/u)
    .find((line) => line.includes("jsbi (dependência transitiva"));
  assert.ok(jsbi);
  const candidate = canonical.replace(jsbi, replaceRowCell(jsbi, 1, "0.0.0"));
  assert.match(
    errorsFor(candidate).join("\n"),
    /retained-component row .* mismatch/u,
  );
});

test("resolves a retained dependency through its documented parent", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const parentPath = "node_modules/@js-temporal/polyfill";
  const nestedPath = `${parentPath}/node_modules/jsbi`;
  const topLevel = frontend.lockfile.packages["node_modules/jsbi"];
  assert.ok(topLevel?.version && topLevel.license && topLevel.integrity);
  frontend.lockfile.packages[parentPath].dependencies.jsbi = "5.0.0";
  frontend.lockfile.packages[nestedPath] = {
    ...structuredClone(topLevel),
    version: "5.0.0",
    resolved: "https://registry.npmjs.org/jsbi/-/jsbi-5.0.0.tgz",
    integrity: "sha512-nested-jsbi-fixture",
  };

  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /retained-component row .* mismatch/u,
  );
});

test("rejects stale audited artifact metadata", () => {
  const jsbi = canonical
    .split(/\r?\n/u)
    .find((line) => line.includes("jsbi@4.3.2"));
  assert.ok(jsbi);
  const candidate = canonical.replace(
    jsbi,
    replaceRowCell(jsbi, 3, "`fixture-invalid-sha256`"),
  );
  assert.match(
    errorsFor(candidate).join("\n"),
    /audited-tarball row .* mismatch/u,
  );
});

test("binds audited hashes to the exact lockfile integrity", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const record = frontend.lockfile.packages["node_modules/astronomy-engine"];
  assert.ok(record?.integrity);
  const changedIntegrity = "sha512-different-tarball-fixture";
  record.integrity = changedIntegrity;
  const auditedRow = canonical
    .split(/\r?\n/u)
    .find((line) => line.includes("astronomy-engine@2.1.19"));
  assert.ok(auditedRow);
  const candidate = canonical.replace(
    auditedRow,
    replaceRowCell(auditedRow, 2, `\`${changedIntegrity}\``),
  );

  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /audited package integrity mismatch for astronomy-engine/u,
  );
});

test("rejects deletion of the retained legal inventory", () => {
  const end = "<!-- direct-dependencies:end -->";
  const candidate = canonical.slice(0, canonical.indexOf(end) + end.length);
  assert.match(
    errorsFor(candidate).join("\n"),
    /expected exactly one retained-component section/u,
  );
});

test("rejects a newly tracked package manifest until it is classified", () => {
  const candidateTrackedFiles = [
    ...trackedPackageFiles,
    "future/package.json",
    "future/package-lock.json",
  ];
  const errors = verifyThirdParty({
    packageSets,
    trackedPackageFiles: candidateTrackedFiles,
    canonical,
    publicCopy,
  });
  assert.match(
    errors.join("\n"),
    /unclassified tracked package metadata: future\/package\.json/u,
  );
  assert.match(
    errors.join("\n"),
    /unclassified tracked package metadata: future\/package-lock\.json/u,
  );
});

test("rejects npm shrinkwrap until its effective resolutions are classified", () => {
  const errors = verifyThirdParty({
    packageSets,
    trackedPackageFiles: [...trackedPackageFiles, "npm-shrinkwrap.json"],
    canonical,
    publicCopy,
  });
  assert.match(
    errors.join("\n"),
    /unclassified tracked package metadata: npm-shrinkwrap\.json/u,
  );
});

test("rejects divergence between distributed copies", () => {
  assert.match(
    errorsFor(canonical, `${publicCopy}\n`).join("\n"),
    /THIRDPARTY\.md.*differ/u,
  );
});

test("rejects a missing direct-dependency section", () => {
  const unbounded = canonical
    .replace("<!-- direct-dependencies:start -->", "")
    .replace("<!-- direct-dependencies:end -->", "");
  assert.match(
    errorsFor(unbounded).join("\n"),
    /expected exactly one direct-dependency section/u,
  );
});

test("rejects a malformed direct-dependency row", () => {
  const row = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "react",
    relation: "dependencies",
  });
  assert.ok(row);
  const malformed = canonical.replace(
    row,
    "| astrologo-frontend/package.json | react | dependencies | version | MIT |",
  );
  assert.match(
    errorsFor(malformed).join("\n"),
    /malformed direct-dependency row/u,
  );
});
