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
  canonicalNotice,
  publicNotice,
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
  readFile(new URL("../NOTICE", import.meta.url), "utf8"),
  readFile(
    new URL("../astrologo-frontend/public/legal/NOTICE.txt", import.meta.url),
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
  candidateTrackedPackageFiles = trackedPackageFiles,
  candidateNotice = canonicalNotice,
  candidatePublicNotice = candidateNotice,
) {
  return verifyThirdParty({
    packageSets: candidatePackageSets,
    trackedPackageFiles: candidateTrackedPackageFiles,
    canonical: markdown,
    publicCopy: publicMarkdown,
    canonicalNotice: candidateNotice,
    publicNotice: candidatePublicNotice,
  });
}

function withViteManifestSpec(
  manifestSpec,
  markdownSpec,
  { syncLockSpec = true } = {},
) {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.devDependencies.vite = manifestSpec;
  if (syncLockSpec) {
    frontend.lockfile.packages[""].devDependencies.vite = manifestSpec;
  }
  const viteRow = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "vite",
    relation: "devDependencies",
  });
  assert.ok(viteRow);
  const candidate = canonical.replace(
    viteRow,
    replaceRowCell(viteRow, 3, markdownSpec),
  );
  return { candidate, candidatePackageSets };
}

function withReactSource({ requested, resolved }) {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  frontend.manifest.dependencies.react = requested;
  frontend.lockfile.packages[""].dependencies.react = requested;
  frontend.lockfile.packages["node_modules/react"].resolved = resolved;
  const reactRow = directRowLine(canonical, {
    component: "astrologo-frontend/package.json",
    name: "react",
    relation: "dependencies",
  });
  assert.ok(reactRow);
  const candidate = canonical.replace(
    reactRow,
    replaceRowCell(replaceRowCell(reactRow, 3, requested), 6, resolved),
  );
  return { candidate, candidatePackageSets };
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
    /resolved version does not satisfy requested registry spec .* vite/u,
  );
});

test("rejects a manifest range that is incompatible with locked metadata", () => {
  const viteVersion = packageSet(packageSets, "astrologo-frontend/package.json")
    .lockfile.packages["node_modules/vite"].version;
  const incompatibleRange = `^${Number(viteVersion.split(".")[0]) + 1}.0.0`;
  const { candidate, candidatePackageSets } = withViteManifestSpec(
    incompatibleRange,
    incompatibleRange,
    { syncLockSpec: false },
  );
  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /locked manifest spec mismatch .* vite/u,
  );
});

test("rejects a resolved version outside the synchronized requested range", () => {
  const viteVersion = packageSet(packageSets, "astrologo-frontend/package.json")
    .lockfile.packages["node_modules/vite"].version;
  const incompatibleRange = `^${Number(viteVersion.split(".")[0]) + 1}.0.0`;
  const { candidate, candidatePackageSets } = withViteManifestSpec(
    incompatibleRange,
    incompatibleRange,
  );
  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /resolved version does not satisfy requested registry spec .* vite/u,
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
  frontend.lockfile.packages[""].dependencies.react = aliasSpec;
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
    replaceRowCell(replaceRowCell(reactRow, 3, aliasSpec), 4, "MIT"),
    6,
    "https://registry.npmjs.org/preact/-/preact-10.28.0.tgz",
  );
  const candidate = canonical.replace(reactRow, aliasRow);

  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /npm package aliases are not supported.*react resolves to preact/u,
  );
});

test("accepts an integrity-pinned package from a custom registry", () => {
  const requested = packageSet(packageSets, "astrologo-frontend/package.json")
    .manifest.dependencies.react;
  const { candidate, candidatePackageSets } = withReactSource({
    requested,
    resolved: "https://registry.example.test/npm/react/-/react-19.2.8.tgz",
  });
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("accepts an exact HTTPS tarball dependency", () => {
  const tarball = "https://artifacts.example.test/react-19.2.8.tgz";
  const { candidate, candidatePackageSets } = withReactSource({
    requested: tarball,
    resolved: tarball,
  });
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("accepts a Git dependency locked to a commit in the same repository", () => {
  const { candidate, candidatePackageSets } = withReactSource({
    requested: "git+https://github.com/facebook/react.git#v19.2.8",
    resolved:
      "git+https://github.com/facebook/react.git#0123456789abcdef0123456789abcdef01234567",
  });
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("rejects a Git lock resolved from another repository", () => {
  const { candidate, candidatePackageSets } = withReactSource({
    requested: "git+https://github.com/facebook/react.git#v19.2.8",
    resolved:
      "git+https://github.com/example/other.git#0123456789abcdef0123456789abcdef01234567",
  });
  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /locked Git source mismatch .* react/u,
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
  frontend.lockfile.packages[""].optionalDependencies = {
    "optional-test": "1.0.0",
  };
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
  frontend.lockfile.packages[""].peerDependencies = {
    "peer-test": "^1.0.0",
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
  frontend.lockfile.packages[""].peerDependencies = {
    "optional-peer-test": "^1.0.0",
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
  frontend.lockfile.packages[""].peerDependencies = {
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
    "\n<!-- direct-dependencies:end -->",
    `\n${peerRow}\n<!-- direct-dependencies:end -->`,
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
  frontend.lockfile.packages[""].optionalDependencies = {
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
      "\n<!-- direct-dependencies:end -->",
      `\n${optionalRow}\n<!-- direct-dependencies:end -->`,
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
    "\n<!-- direct-dependencies:end -->",
    "\n| astrologo-frontend/package.json | invented-package | dependencies | 1.0.0 | MIT | Não | https://example.invalid/invented.tgz |\n<!-- direct-dependencies:end -->",
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
    /direct-dependency section must contain one contiguous renderable table/u,
  );
});

test("rejects a direct-dependency table hidden in an HTML comment", () => {
  const hidden = canonical
    .replace(
      "<!-- direct-dependencies:start -->",
      "<!--\n<!-- direct-dependencies:start -->",
    )
    .replace(
      "<!-- direct-dependencies:end -->",
      "<!-- direct-dependencies:end -->\n-->",
    );

  assert.match(
    errorsFor(hidden).join("\n"),
    /direct-dependency section must contain one contiguous renderable table/u,
  );
});

test("rejects a direct-dependency table hidden in a fenced code block", () => {
  const hidden = canonical
    .replace(
      "<!-- direct-dependencies:start -->",
      "```markdown\n<!-- direct-dependencies:start -->",
    )
    .replace(
      "<!-- direct-dependencies:end -->",
      "<!-- direct-dependencies:end -->\n```",
    );

  assert.match(
    errorsFor(hidden).join("\n"),
    /direct-dependency section must contain one contiguous renderable table/u,
  );
});

test("rejects legal tables wrapped in raw HTML containers", () => {
  for (const [opening, closing] of [
    ["<div hidden>", "</div>"],
    ["<details>", "</details>"],
    ['<section aria-hidden="true">', "</section>"],
  ]) {
    const hidden = canonical
      .replace(
        "<!-- direct-dependencies:start -->",
        `${opening}\n<!-- direct-dependencies:start -->`,
      )
      .replace(
        "<!-- direct-dependencies:end -->",
        `<!-- direct-dependencies:end -->\n${closing}`,
      );
    assert.match(
      errorsFor(hidden).join("\n"),
      /direct-dependency section must contain one contiguous renderable table/u,
    );
  }
});

test("treats a slash on a non-void raw HTML tag as an open container", () => {
  const hidden = canonical
    .replace(
      "<!-- direct-dependencies:start -->",
      "<div hidden />\n<!-- direct-dependencies:start -->",
    )
    .replace(
      "<!-- direct-dependencies:end -->",
      "<!-- direct-dependencies:end -->\n</div>",
    );
  assert.match(
    errorsFor(hidden).join("\n"),
    /direct-dependency section must contain one contiguous renderable table/u,
  );
});

test("accepts a void HTML element before a legal table marker", () => {
  const visible = canonical.replace(
    "<!-- direct-dependencies:start -->",
    "<br />\n<!-- direct-dependencies:start -->",
  );
  assert.deepEqual(errorsFor(visible, visible), []);
});

test("decodes escaped pipes in direct dependency cells", () => {
  const { candidate, candidatePackageSets } = withViteManifestSpec(
    "^8 || ^9",
    String.raw`^8 \|\| ^9`,
  );
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("decodes named and numeric pipe entities in direct dependency cells", () => {
  const { candidate, candidatePackageSets } = withViteManifestSpec(
    "^8 || ^9",
    "^8 &vert;&#x7c; ^9",
  );
  assert.deepEqual(errorsFor(candidate, candidate, candidatePackageSets), []);
});

test("decodes escaped backslashes without losing table boundaries", () => {
  const { candidate } = withViteManifestSpec(
    "file:..\\fixture",
    String.raw`file:..\\fixture`,
  );
  const vite = parseDirectDependencies(candidate).find(
    (row) =>
      row.component === "astrologo-frontend/package.json" &&
      row.name === "vite" &&
      row.relation === "devDependencies",
  );
  assert.equal(vite?.version, "file:..\\fixture");
});

test("tokenizes escaped pipes inside inline code spans", () => {
  const { candidate } = withViteManifestSpec(
    "unused-by-parser-fixture",
    String.raw`\`^8 \|\| ^9\``,
  );
  const vite = parseDirectDependencies(candidate).find(
    (row) =>
      row.component === "astrologo-frontend/package.json" &&
      row.name === "vite" &&
      row.relation === "devDependencies",
  );
  assert.equal(vite?.version, "`^8 || ^9`");
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

test("rejects a separator placed before the direct-table header", () => {
  const lines = canonical.split(/\r?\n/u);
  const headerIndex = lines.findIndex(
    (line) => line.includes("Manifesto") && line.includes("Licença Original"),
  );
  assert.ok(headerIndex >= 0);
  const separatorIndex = headerIndex + 1;
  assert.match(lines[separatorIndex], /^\|(?:\s*:?-+:?\s*\|)+$/u);
  [lines[headerIndex], lines[separatorIndex]] = [
    lines[separatorIndex],
    lines[headerIndex],
  ];
  const candidate = lines.join("\n");

  assert.match(
    errorsFor(candidate).join("\n"),
    /direct-dependency separator must immediately follow the header/u,
  );
});

test("rejects a blank line inside the bounded direct table", () => {
  const lines = canonical.split(/\r?\n/u);
  const headerIndex = lines.findIndex(
    (line) => line.includes("Manifesto") && line.includes("Licença Original"),
  );
  assert.ok(headerIndex >= 0);
  lines.splice(headerIndex + 2, 0, "");

  assert.match(
    errorsFor(lines.join("\n")).join("\n"),
    /direct-dependency section must contain one contiguous renderable table/u,
  );
});

test("rejects a duplicate direct-table header", () => {
  const header = canonical
    .split(/\r?\n/u)
    .find(
      (line) => line.includes("Manifesto") && line.includes("Licença Original"),
    );
  assert.ok(header);
  const candidate = canonical.replace(
    "\n<!-- direct-dependencies:end -->",
    `\n${header}\n<!-- direct-dependencies:end -->`,
  );

  assert.match(
    errorsFor(candidate).join("\n"),
    /direct-dependency table contains a duplicate structural row/u,
  );
});

test("rejects a duplicate direct-table separator", () => {
  const lines = canonical.split(/\r?\n/u);
  const headerIndex = lines.findIndex(
    (line) => line.includes("Manifesto") && line.includes("Licença Original"),
  );
  assert.ok(headerIndex >= 0);
  const separator = lines[headerIndex + 1];
  assert.match(separator, /^\|(?:\s*:?-+:?\s*\|)+$/u);
  const candidate = canonical.replace(
    "\n<!-- direct-dependencies:end -->",
    `\n${separator}\n<!-- direct-dependencies:end -->`,
  );

  assert.match(
    errorsFor(candidate).join("\n"),
    /direct-dependency table contains a duplicate structural row/u,
  );
});

test("rejects a direct-table separator with the wrong width", () => {
  const lines = canonical.split(/\r?\n/u);
  const headerIndex = lines.findIndex(
    (line) => line.includes("Manifesto") && line.includes("Licença Original"),
  );
  assert.ok(headerIndex >= 0);
  const separator = lines[headerIndex + 1];
  const cells = separator
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  cells.pop();
  const candidate = canonical.replace(separator, `| ${cells.join(" | ")} |`);

  assert.match(
    errorsFor(candidate).join("\n"),
    /direct-dependency separator must immediately follow the header/u,
  );
});

test("rejects a direct table without data rows", () => {
  const lines = canonical.split(/\r?\n/u);
  const headerIndex = lines.findIndex(
    (line) => line.includes("Manifesto") && line.includes("Licença Original"),
  );
  const endIndex = lines.findIndex(
    (line) => line === "<!-- direct-dependencies:end -->",
  );
  assert.ok(headerIndex >= 0 && endIndex > headerIndex + 1);
  lines.splice(headerIndex + 2, endIndex - (headerIndex + 2));

  assert.match(
    errorsFor(lines.join("\n")).join("\n"),
    /direct-dependency table must contain at least one data row/u,
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

test("rejects aliases in retained dependency resolution", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const parent = frontend.lockfile.packages["node_modules/d3-geo"];
  const retained = frontend.lockfile.packages["node_modules/d3-array"];
  assert.ok(parent?.dependencies?.["d3-array"] && retained?.version);
  parent.dependencies["d3-array"] = `npm:other-package@${retained.version}`;
  retained.name = "other-package";
  retained.resolved = `https://registry.npmjs.org/other-package/-/other-package-${retained.version}.tgz`;

  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /npm package aliases are not supported.*retained dependency.*d3-array resolves to other-package/u,
  );
});

test("rejects an unrelated source for a retained package identity", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const retained = frontend.lockfile.packages["node_modules/d3-array"];
  assert.ok(retained?.version && retained.resolved);
  retained.resolved = `https://registry.npmjs.org/other-package/-/other-package-${retained.version}.tgz`;

  assert.match(
    errorsFor(canonical, publicCopy, candidatePackageSets).join("\n"),
    /public registry identity mismatch.*retained dependency.*d3-array/u,
  );
});

test("binds a retained license notice to the resolved package version", () => {
  const candidatePackageSets = structuredClone(packageSets);
  const frontend = packageSet(
    candidatePackageSets,
    "astrologo-frontend/package.json",
  );
  const retained = frontend.lockfile.packages["node_modules/d3-array"];
  assert.ok(retained?.version && retained.resolved);
  const nextVersion = "3.2.5";
  retained.version = nextVersion;
  retained.resolved = `https://registry.npmjs.org/d3-array/-/d3-array-${nextVersion}.tgz`;
  const row = canonical
    .split(/\r?\n/u)
    .find((line) => line.includes("d3-array (dependência transitiva"));
  assert.ok(row);
  const updatedRow = replaceRowCell(
    replaceRowCell(row, 1, nextVersion),
    4,
    `https://github.com/d3/d3-array/tree/v${nextVersion}`,
  );
  const candidate = canonical.replace(row, updatedRow);

  assert.match(
    errorsFor(candidate, candidate, candidatePackageSets).join("\n"),
    /license-notice version mismatch for d3-array/u,
  );
});

test("rejects a changed retained license notice body", () => {
  const candidate = canonical.replace(
    "Copyright 2010-2023 Mike Bostock",
    "Copyright fixture-stale Mike Bostock",
  );
  assert.match(
    errorsFor(candidate, candidate).join("\n"),
    /license-notice content mismatch for d3-array/u,
  );
});

test("rejects an unclassified additional license notice", () => {
  const candidate = canonical.replace(
    "<!-- license-notice:jsbi:end -->",
    "<!-- license-notice:jsbi:end -->\n\n### future-package 1.0.0 — MIT",
  );
  assert.match(
    errorsFor(candidate, candidate).join("\n"),
    /license-notice heading count mismatch/u,
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

test("does not exempt tracked package metadata by directory name", () => {
  for (const directory of ["build", "dist", "node_modules"]) {
    const candidateTrackedFiles = [
      ...trackedPackageFiles,
      `${directory}/package.json`,
      `${directory}/package-lock.json`,
    ];
    const errors = errorsFor(
      canonical,
      publicCopy,
      packageSets,
      candidateTrackedFiles,
    );
    assert.match(
      errors.join("\n"),
      new RegExp(
        `unclassified tracked package metadata: ${directory}/package\\.json`,
        "u",
      ),
    );
  }
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

test("rejects divergence between distributed NOTICE copies", () => {
  assert.match(
    errorsFor(
      canonical,
      publicCopy,
      packageSets,
      trackedPackageFiles,
      canonicalNotice,
      `${publicNotice}\n`,
    ).join("\n"),
    /NOTICE and astrologo-frontend\/public\/legal\/NOTICE\.txt differ/u,
  );
});

test("preserves the complete audited Swiss Ephemeris notice block", () => {
  const startToken =
    "/* Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.  All rights reserved.";
  const start = canonicalNotice.indexOf(startToken);
  const end = canonicalNotice.indexOf("*/", start);
  assert.ok(start >= 0 && end > start);
  const truncated = `${canonicalNotice.slice(0, start)}${canonicalNotice.slice(end + 2)}`;
  assert.match(
    errorsFor(
      canonical,
      publicCopy,
      packageSets,
      trackedPackageFiles,
      truncated,
      truncated,
    ).join("\n"),
    /Swiss Ephemeris special NOTICE block is missing/u,
  );
});

test("preserves the complete Corresponding Source offer", () => {
  const heading = "OFERTA DE CÓDIGO-FONTE — GNU AGPL v3, SEÇÕES 6 E 13";
  assert.ok(canonicalNotice.includes(heading));
  const truncated = canonicalNotice.replace(heading, "OFERTA");
  assert.match(
    errorsFor(
      canonical,
      publicCopy,
      packageSets,
      trackedPackageFiles,
      truncated,
      truncated,
    ).join("\n"),
    /Swiss Ephemeris source-offer section is missing/u,
  );
});

test("binds versioned THIRDPARTY prose to the audited Swiss records", () => {
  const narrativeStart = canonical.indexOf("<!-- audited-files:end -->");
  assert.ok(narrativeStart >= 0);
  const narrative = canonical.slice(narrativeStart);
  const mutateNarrative = (value, replacement) =>
    `${canonical.slice(0, narrativeStart)}${canonical.slice(narrativeStart).replace(value, replacement)}`;
  const metadata = [
    narrative.match(/@fusionstrings\/swiss-eph@[0-9.]+/u)?.[0],
    narrative.match(/retorna `[^`]+`/u)?.[0],
    narrative.match(
      /https:\/\/github\.com\/fusionstrings\/swiss-eph\/tree\/\w+/u,
    )?.[0],
    narrative.match(
      /https:\/\/github\.com\/aloistr\/swisseph\/tree\/\w+/u,
    )?.[0],
  ];
  for (const value of metadata) {
    assert.ok(value);
    const stale = mutateNarrative(value, `${value}-stale`);
    assert.match(
      errorsFor(stale, stale).join("\n"),
      /THIRDPARTY narrative metadata mismatch/u,
      value,
    );
  }
});

test("binds every duplicated NOTICE datum to the audited inventory", () => {
  const astronomy = packageSet(packageSets, "astrologo-frontend/package.json")
    .lockfile.packages["node_modules/astronomy-engine"];
  assert.ok(astronomy?.version);
  const replaceLastCharacter = (value) =>
    `${value.slice(0, -1)}${value.endsWith("0") ? "1" : "0"}`;
  const metadata = [
    `astronomy-engine ${astronomy.version}`,
    canonicalNotice.match(/^SHA-256: (\S+)$/mu)?.[1],
    canonicalNotice.match(/^SHA-512: (\S+)$/mu)?.[1],
    canonicalNotice.match(/^Tamanho: (\d+) bytes$/mu)?.[1],
    canonicalNotice.match(
      /^Versão retornada por swe_version\(\): (\S+)$/mu,
    )?.[1],
    canonicalNotice.match(
      /https:\/\/github\.com\/fusionstrings\/swiss-eph\/tree\/(\w+)/u,
    )?.[1],
    canonicalNotice.match(
      /https:\/\/github\.com\/aloistr\/swisseph\/tree\/(\w+)/u,
    )?.[1],
  ];
  for (const value of metadata) {
    assert.ok(value);
    const staleNotice = canonicalNotice.replace(
      value,
      replaceLastCharacter(value),
    );
    assert.match(
      errorsFor(
        canonical,
        publicCopy,
        packageSets,
        trackedPackageFiles,
        staleNotice,
        staleNotice,
      ).join("\n"),
      /NOTICE audited metadata mismatch/u,
    );
  }
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
