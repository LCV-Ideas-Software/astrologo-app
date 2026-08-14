import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import test from "node:test";

import {
  FINAL_DEPENDENCY_REVIEW,
  FINAL_DEPENDENCY_REVIEW_OID,
  FINAL_TRUSTED_DEPENDENCY_REVIEW,
  FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  MAX_DEPENDENCY_CHANGES,
  assertCandidateTree,
  assertDependencyReviewComplete,
  assertReviewedNpmLocks,
  assertReviewedPackageScripts,
  assertTrustedControlPlaneRotation,
  assertTrustedRootRotation,
  gitBlobOid,
  gitHubEventOpenFlags,
  readGitHubEventPayload,
  resolvePostReviewExpected,
  verifyCompletedDependencyReview,
  verifyCandidate,
} from "./trusted-dependency-review.mjs";

const SHA = {
  base: "a".repeat(40),
  head: "b".repeat(40),
  baseTree: "c".repeat(40),
  headTree: "d".repeat(40),
  trustedScanner: "2".repeat(40),
  trustedScannerTest: "9".repeat(40),
  zizmorConfig: "3".repeat(40),
};

const LEAST_PRIVILEGE_ROLLOUT_TRANSITIONS = [
  [
    ".github/workflows/auto-release.yml",
    "39db89235217063969c76bbe106d0846aa2dce9a",
    "f064e69ef2491910c40dc315ed90c5ec2f45a1e6",
  ],
  [
    ".github/workflows/codeql.yml",
    "f2c32a0ee1358a4d3f1daaa8f00cbd33d376e736",
    "d2854fc8ef19a3b17e9217cafff7219b21d08562",
  ],
  [
    ".github/workflows/dependency-review.yml",
    "29b6fda3a9d0b9ded896c3bc8269c2c56c79af17",
    FINAL_DEPENDENCY_REVIEW_OID,
  ],
  [
    ".github/workflows/native-auto-merge.yml",
    "d92de828539ecf6f8fa677db1ef13047aa56dff0",
    FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  ],
  [
    ".github/workflows/deploy.yml",
    "897e51646cd05bbdf0d0cb42986b5287d5ee26d8",
    "67b9ba2b8030510c7feee7c0aebe7940080197ba",
  ],
  [
    ".github/workflows/format-public.yml",
    "6b200f54d4801159b27ec6f4aad8358b477e1850",
    null,
  ],
  [
    ".github/workflows/pages.yml",
    "8545d61d05d9f1a514231889838105c2def4dbcc",
    "6ceefed8094a53dadc1fe9697ee2dddd5f3d2cba",
  ],
  [
    ".github/workflows/scorecard.yml",
    "0116f3585d3d753ab32fc015df609cc18b287b6a",
    "26140662208170c82f5b35cd4529d62f23cf70ae",
  ],
  [
    ".github/workflows/zizmor.yml",
    "c163e87b4faa65fec369a65eea1ca7957a25a9ed",
    "63df6af729c3ec830df340eb5ccea00e564b575d",
  ],
  [
    ".github/scripts/enforce-scorecard.mjs",
    "e2d311ad7b5bc4d4bcfa0cdbfe413e2df9a65981",
    "0f28396de09b0ae2603d225a585a28b1a303d5be",
  ],
  [
    ".github/scripts/enforce-scorecard.test.mjs",
    "85cf9e39ab0f242f0efb8a09907cabe028c79c33",
    "e86879d9d0076b2c62f9bc3acbb4ffe9ca1fc67d",
  ],
  [
    ".github/scripts/scorecard-workflow.test.mjs",
    "5237744f213ad3908851a96101e042bce898ca9a",
    "d3e564b9f2002d9322699e3dfa3f1ebbcd625037",
  ],
  [
    ".github/zizmor.yml",
    "b549f4da9b712d5661a87d4c879e05a72944cb01",
    "7deaad4b3a84d0a5e245a14fc57939ed1b7b1d0a",
  ],
  [
    "astrologo-frontend/package.json",
    "1f48f649e1abe611694868b428e43a381d4a8dc1",
    "8b41aa07b784b2c3cb43042193d5bfac84421e32",
  ],
  [
    "astrologo-frontend/package-lock.json",
    "9bf3fde4d00b0955af4a664240880120355962e8",
    "f6dbac039578cbae573923cdb17bccb401880444",
  ],
];
const LEAST_PRIVILEGE_ROLLOUT_BY_PATH = new Map(
  LEAST_PRIVILEGE_ROLLOUT_TRANSITIONS.map(([path, beforeOid, afterOid]) => [
    path,
    { beforeOid, afterOid },
  ]),
);
const TRACKED_EXECUTABLE_GUARD =
  "astrologo-frontend/scripts/check-tracked-executables.mjs";
const POLICY_CONFIG_PATHS = [
  ".gitattributes",
  ".gitignore",
  ".npmrc",
  ".prettierignore",
  "eslint.config.js",
  "tsconfig.base.json",
  "astrologo-frontend/.npmrc",
  "astrologo-frontend/.gitignore",
  "astrologo-frontend/biome.json",
  "astrologo-frontend/eslint.config.js",
  TRACKED_EXECUTABLE_GUARD,
  "astrologo-frontend/scripts/prepare-swiss-wasm.mjs",
  "astrologo-frontend/tsconfig.app.json",
  "astrologo-frontend/tsconfig.functions.json",
  "astrologo-frontend/tsconfig.json",
  "astrologo-frontend/tsconfig.node.json",
  "astrologo-frontend/vite.config.ts",
  "astrologo-frontend/wrangler.json",
];
const CONTROL_PLANE_BLOBS = [
  [".github/CODEOWNERS", "8ebff01bd7c8b9b7fe3cb0b2d814aa79dd8f811c"],
  [".github/dependabot.yml", "df72283925054803f971ec549b4ccd202601eb89"],
];
const ROOT_PACKAGE = {
  scripts: { "format:public:check": 'prettier --check "**/index.html"' },
};
const FRONTEND_PACKAGE = {
  name: "astrologo-frontend",
  version: "2.25.5",
  description:
    "Astrólogo — gerador de mapas astrais e análises esotéricas via integração Gemini AI. React 19 + Vite 8 sobre Cloudflare Pages com D1 backing store.",
  license: "AGPL-3.0-or-later",
  author: "LCV Ideas & Software",
  repository: {
    type: "git",
    url: "git+https://github.com/LCV-Ideas-Software/astrologo-app.git",
  },
  homepage: "https://github.com/LCV-Ideas-Software/astrologo-app#readme",
  bugs: {
    url: "https://github.com/LCV-Ideas-Software/astrologo-app/issues",
  },
  type: "module",
  engines: {
    node: ">=22",
  },
  scripts: {
    "prepare:swiss-wasm": "node scripts/prepare-swiss-wasm.mjs",
    dev: "npm run prepare:swiss-wasm && vite",
    build: "npm run prepare:swiss-wasm && tsc -b && vite build",
    "build:functions":
      "npm run prepare:swiss-wasm && wrangler pages functions build --outdir=.wrangler/functions-build-check",
    lint: "eslint .",
    biome: "biome check .",
    "biome:write": "biome check --write .",
    "security:tracked-executables":
      "node scripts/check-tracked-executables.mjs",
    test: "npm run prepare:swiss-wasm && vitest run",
    preview: "vite preview",
    format: "biome format --write src",
  },
  dependencies: {
    "@js-temporal/polyfill": "0.5.1",
    "@tailwindcss/vite": "^4.3.3",
    "astronomy-engine": "2.1.19",
    "d3-geo": "3.1.1",
    dompurify: "^3.4.13",
    "lucide-react": "^1.31.0",
    react: "^19.2.8",
    "react-dom": "^19.2.8",
    "sanitize-html": "^2.17.6",
    tailwindcss: "^4.3.3",
    "topojson-client": "3.1.0",
    "world-atlas": "2.0.2",
  },
  devDependencies: {
    "@biomejs/biome": "^2.5.7",
    "@eslint/js": "^10.0.1",
    "@fusionstrings/swiss-eph": "0.1.1",
    "@types/d3-geo": "3.1.1",
    "@types/node": "^26.2.0",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@types/sanitize-html": "^2.16.1",
    "@types/topojson-client": "3.1.5",
    "@vitejs/plugin-react": "^6.0.5",
    eslint: "^10.8.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.3",
    "fast-check": "4.9.0",
    globals: "^17.9.0",
    typescript: "~6.0.3",
    "typescript-eslint": "^8.66.0",
    vite: "^8.2.1",
    vitest: "^4.1.10",
    wrangler: "^4.120.0",
  },
  overrides: {
    picomatch: "4.0.5",
    "@fusionstrings/swiss-eph": {
      undici: "6.28.0",
    },
    miniflare: {
      undici: "7.29.0",
    },
    vite: "$vite",
    protobufjs: "7.6.5",
    "@babel/core": "7.29.6",
    sharp: "0.35.3",
  },
};
const DEPENDENCY_CHANGES = [
  {
    change_type: "added",
    manifest: "package-lock.json",
    ecosystem: "npm",
    name: "example-package",
    version: "2.0.0",
    package_url: "pkg:npm/example-package@2.0.0",
    license: "MIT",
    source_repository_url: "https://github.com/example/example-package",
    scope: "development",
    vulnerabilities: [
      {
        severity: "high",
        advisory_ghsa_id: "GHSA-xxxx-yyyy-zzzz",
        advisory_summary: "Reviewed test advisory",
        advisory_url: "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz",
      },
    ],
  },
  {
    change_type: "removed",
    manifest: "package-lock.json",
    ecosystem: "npm",
    name: "example-package",
    version: "1.0.0",
    package_url: "pkg:npm/example-package@1.0.0",
    license: "MIT",
    source_repository_url: "https://github.com/example/example-package",
    scope: "development",
    vulnerabilities: [],
  },
];

function sri(byte) {
  return `sha512-${Buffer.alloc(64, byte).toString("base64")}`;
}

function registryDescriptor(name, version, byte, extra = {}) {
  const basename = name.includes("/") ? name.split("/")[1] : name;
  return {
    version,
    resolved: `https://registry.npmjs.org/${name}/-/${basename}-${version}.tgz`,
    integrity: sri(byte),
    ...extra,
  };
}

function reviewedLockFixtures() {
  const rootPackage = {};
  const frontendPackage = { name: "frontend-test", version: "1.0.0" };
  const rootBase = {
    name: "root-test",
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {},
      "node_modules/example-package": registryDescriptor(
        "example-package",
        "1.0.0",
        1,
        { dev: true },
      ),
    },
  };
  const rootHead = structuredClone(rootBase);
  rootHead.packages["node_modules/example-package"] = registryDescriptor(
    "example-package",
    "2.0.0",
    2,
    { dev: true },
  );
  const frontendLock = {
    name: "frontend-test",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: { "": structuredClone(frontendPackage) },
  };
  const values = {
    rootPackage: formattedJsonBlob(rootPackage),
    frontendPackage: formattedJsonBlob(frontendPackage),
    rootBase: formattedJsonBlob(rootBase),
    rootHead: formattedJsonBlob(rootHead),
    frontendLock: formattedJsonBlob(frontendLock),
  };
  const tree = (rootLock) => ({
    sha: "e".repeat(40),
    truncated: false,
    tree: [
      blob("package.json", values.rootPackage.oid),
      blob("package-lock.json", rootLock.oid),
      blob("astrologo-frontend/package.json", values.frontendPackage.oid),
      blob("astrologo-frontend/package-lock.json", values.frontendLock.oid),
    ],
  });
  return {
    baseTree: tree(values.rootBase),
    headTree: tree(values.rootHead),
    values,
  };
}

function directManifestChanges(
  manifest,
  {
    baseVersion = "^4.120.0",
    headVersion = "4.123.0",
    baseScope = "development",
    headScope = baseScope,
  } = {},
) {
  const added = dependencyChange("added", "wrangler", headVersion);
  added.manifest = manifest;
  added.scope = headScope;
  added.license = "MIT OR Apache-2.0";
  added.source_repository_url = "https://github.com/cloudflare/workers-sdk";
  const removed = dependencyChange("removed", "wrangler", baseVersion);
  removed.manifest = manifest;
  removed.scope = baseScope;
  removed.package_url = "pkg:npm/wrangler";
  removed.license = null;
  return [added, removed];
}

function reviewedDirectManifestFixtures(
  packagePath,
  {
    baseSection = "devDependencies",
    headSection = baseSection,
    baseVersion = "^4.120.0",
    headVersion = "4.123.0",
  } = {},
) {
  const rootStable = { name: "root-test", version: "1.0.0" };
  const frontendStable = { name: "frontend-test", version: "1.0.0" };
  const withWrangler = (value, section, version) => ({
    ...structuredClone(value),
    [section]: { wrangler: version },
  });
  const rootBase =
    packagePath === "package.json"
      ? withWrangler(rootStable, baseSection, baseVersion)
      : rootStable;
  const rootHead =
    packagePath === "package.json"
      ? withWrangler(rootStable, headSection, headVersion)
      : rootStable;
  const frontendBase =
    packagePath === "astrologo-frontend/package.json"
      ? withWrangler(frontendStable, baseSection, baseVersion)
      : frontendStable;
  const frontendHead =
    packagePath === "astrologo-frontend/package.json"
      ? withWrangler(frontendStable, headSection, headVersion)
      : frontendStable;
  const placementBySection = {
    dependencies: {},
    devDependencies: { dev: true },
    optionalDependencies: { optional: true },
    peerDependencies: { peer: true },
  };
  const lock = (packageJson, section) => ({
    name: packageJson.name,
    version: packageJson.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": structuredClone(packageJson),
      ...(section === undefined
        ? {}
        : {
            "node_modules/wrangler": registryDescriptor(
              "wrangler",
              "4.123.0",
              8,
              placementBySection[section],
            ),
          }),
    },
  });
  const values = {
    rootBasePackage: formattedJsonBlob(rootBase),
    rootHeadPackage: formattedJsonBlob(rootHead),
    rootBaseLock: formattedJsonBlob(
      lock(rootBase, packagePath === "package.json" ? baseSection : undefined),
    ),
    rootHeadLock: formattedJsonBlob(
      lock(rootHead, packagePath === "package.json" ? headSection : undefined),
    ),
    frontendBasePackage: formattedJsonBlob(frontendBase),
    frontendHeadPackage: formattedJsonBlob(frontendHead),
    frontendBaseLock: formattedJsonBlob(
      lock(
        frontendBase,
        packagePath === "astrologo-frontend/package.json"
          ? baseSection
          : undefined,
      ),
    ),
    frontendHeadLock: formattedJsonBlob(
      lock(
        frontendHead,
        packagePath === "astrologo-frontend/package.json"
          ? headSection
          : undefined,
      ),
    ),
  };
  const tree = (phase) => ({
    sha: phase === "base" ? SHA.baseTree : SHA.headTree,
    truncated: false,
    tree: [
      blob(
        "package.json",
        values[`${phase === "base" ? "rootBase" : "rootHead"}Package`].oid,
      ),
      blob(
        "package-lock.json",
        values[`${phase === "base" ? "rootBase" : "rootHead"}Lock`].oid,
      ),
      blob(
        "astrologo-frontend/package.json",
        values[`${phase === "base" ? "frontendBase" : "frontendHead"}Package`]
          .oid,
      ),
      blob(
        "astrologo-frontend/package-lock.json",
        values[`${phase === "base" ? "frontendBase" : "frontendHead"}Lock`].oid,
      ),
    ],
  });
  return { baseTree: tree("base"), headTree: tree("head"), values };
}

function reviewedLockCase(basePackages, headPackages) {
  const rootPackage = {};
  const frontendPackage = { name: "frontend-test", version: "1.0.0" };
  const lock = (packages) => ({
    name: "root-test",
    lockfileVersion: 3,
    requires: true,
    packages: { "": {}, ...structuredClone(packages) },
  });
  const frontendLock = {
    name: "frontend-test",
    version: "1.0.0",
    lockfileVersion: 3,
    requires: true,
    packages: { "": structuredClone(frontendPackage) },
  };
  const values = {
    rootPackage: formattedJsonBlob(rootPackage),
    frontendPackage: formattedJsonBlob(frontendPackage),
    rootBase: formattedJsonBlob(lock(basePackages)),
    rootHead: formattedJsonBlob(lock(headPackages)),
    frontendLock: formattedJsonBlob(frontendLock),
  };
  const tree = (rootLock) => ({
    sha: "e".repeat(40),
    truncated: false,
    tree: [
      blob("package.json", values.rootPackage.oid),
      blob("package-lock.json", rootLock.oid),
      blob("astrologo-frontend/package.json", values.frontendPackage.oid),
      blob("astrologo-frontend/package-lock.json", values.frontendLock.oid),
    ],
  });
  return {
    baseTree: tree(values.rootBase),
    headTree: tree(values.rootHead),
    values,
  };
}

function dependencyChange(changeType, name, version) {
  return {
    change_type: changeType,
    manifest: "package-lock.json",
    ecosystem: "npm",
    name,
    version,
    package_url: `pkg:npm/${name}@${version}`,
    license: "MIT",
    source_repository_url: null,
    scope: "development",
    vulnerabilities: [],
  };
}

function blob(path, sha, mode = "100644") {
  return { path, mode, type: "blob", sha };
}

function gitBlob(contents) {
  const bytes = Buffer.from(JSON.stringify(contents), "utf8");
  return gitBlobBytes(bytes);
}

function formattedJsonBlob(contents) {
  return gitBlobBytes(
    Buffer.from(`${JSON.stringify(contents, null, 2)}\n`, "utf8"),
  );
}

function gitBlobBytes(bytes) {
  const oid = gitBlobOid(bytes);
  return {
    oid,
    response: {
      sha: oid,
      encoding: "base64",
      content: bytes.toString("base64"),
    },
    bytes,
  };
}

function dependencyResponse(
  changes,
  { warning = "", includeWarning = true, link, status = 200 } = {},
) {
  const headers = { "content-type": "application/json" };
  if (includeWarning) {
    headers["x-github-dependency-graph-snapshot-warnings"] = warning;
  }
  if (link !== undefined) headers.link = link;
  return new Response(JSON.stringify(changes), { status, headers });
}

function dependencyReviewRun(
  responses,
  dependencyChanges = DEPENDENCY_CHANGES,
  expectedPages,
) {
  const queue = [...responses];
  const { expected } = expectedPullRequest();
  const pages = [];
  return assertDependencyReviewComplete({
    token: "test-token",
    targetRepository: expected.targetRepository,
    baseSha: expected.baseSha,
    headSha: expected.headSha,
    dependencyChanges:
      typeof dependencyChanges === "string"
        ? dependencyChanges
        : JSON.stringify(dependencyChanges),
    fetchImplementation: async (url, options) => {
      const endpoint = new URL(url);
      assert.equal(endpoint.origin, "https://api.github.com");
      assert.equal(
        endpoint.pathname,
        `/repos/${expected.targetRepository}/dependency-graph/compare/${expected.baseSha}...${expected.headSha}`,
      );
      assert.deepEqual(
        [...endpoint.searchParams.entries()].sort(),
        [
          ["page", endpoint.searchParams.get("page")],
          ["per_page", "5"],
        ].sort(),
      );
      const page = Number.parseInt(endpoint.searchParams.get("page"), 10);
      assert.equal(Number.isSafeInteger(page) && page > 0, true);
      pages.push(page);
      assert.deepEqual(options, {
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer test-token",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
      });
      const response = queue.shift();
      assert.notEqual(response, undefined, "unexpected dependency API request");
      return response;
    },
  }).then(() => {
    assert.equal(queue.length, 0);
    if (expectedPages !== undefined) assert.deepEqual(pages, expectedPages);
  });
}

function normalizedWorkflow(source) {
  return source.replaceAll("\r\n", "\n");
}

function workflowStep(source, name) {
  const workflow = normalizedWorkflow(source);
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);
  assert.equal(
    workflow.indexOf(marker, start + marker.length),
    -1,
    `duplicate workflow step: ${name}`,
  );
  const next = workflow.indexOf("      - name: ", start + marker.length);
  return {
    block: workflow.slice(start, next === -1 ? undefined : next),
    start,
    end: next === -1 ? workflow.length : next,
  };
}

function assertDependencyCarrierContract(
  source,
  {
    checkoutName,
    inspectName,
    reviewName,
    baseExpression,
    headExpression,
    permissionsBlock,
    preamble,
  },
) {
  const workflow = normalizedWorkflow(source);
  const jobsMarker = "jobs:\n";
  const jobsStart = workflow.indexOf(jobsMarker);
  assert.notEqual(jobsStart, -1, "dependency carrier must define jobs");
  assert.equal(
    workflow.slice(0, jobsStart + jobsMarker.length),
    preamble,
    "dependency carrier preamble must remain exact",
  );
  const jobs = workflow.slice(jobsStart + jobsMarker.length);
  assert.deepEqual(
    jobs.split("\n").filter((line) => /^ {2}\S/.test(line)),
    ["  dependency_review:"],
    "the carrier must expose exactly one job",
  );
  const completeName = "Require a complete stable dependency comparison";
  assert.deepEqual(
    [...workflow.matchAll(/^      - name: (.+)$/gm)].map((match) => match[1]),
    [
      checkoutName,
      ...(inspectName === undefined ? [] : [inspectName]),
      reviewName,
      completeName,
    ],
    "dependency carrier steps must remain exact and ordered",
  );

  const checkout = workflowStep(workflow, checkoutName);
  const jobStart = workflow.indexOf("  dependency_review:\n");
  assert.notEqual(jobStart, -1);
  assert.equal(
    workflow.slice(jobStart, checkout.start).trimEnd(),
    `  dependency_review:\n    name: Dependency Review\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n${permissionsBlock}\n    steps:`,
  );
  assert.equal(
    checkout.block.trimEnd(),
    `      - name: ${checkoutName}\n        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1\n        with:\n          ref: ${baseExpression}\n          persist-credentials: false\n          fetch-depth: 1`,
  );

  if (inspectName !== undefined) {
    const inspect = workflowStep(workflow, inspectName);
    assert.equal(
      inspect.block.trimEnd(),
      `      - name: ${inspectName}\n        env:\n          GITHUB_TOKEN: \${{ github.token }}\n          TARGET_REPOSITORY: \${{ github.repository }}\n          PULL_NUMBER: \${{ github.event.pull_request.number }}\n          BASE_SHA: ${baseExpression}\n          HEAD_REPOSITORY: \${{ github.event.pull_request.head.repo.full_name }}\n          HEAD_SHA: ${headExpression}\n        run: node .github/scripts/trusted-dependency-review.mjs`,
    );
  }

  const review = workflowStep(workflow, reviewName);
  assert.equal(
    review.block.trimEnd(),
    `      - name: ${reviewName}\n        id: dependency-review\n        uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0\n        with:\n          base-ref: ${baseExpression}\n          head-ref: ${headExpression}\n          fail-on-severity: low\n          fail-on-scopes: runtime, development, unknown\n          retry-on-snapshot-warnings: true\n          retry-on-snapshot-warnings-timeout: 3600`,
  );

  const complete = workflowStep(workflow, completeName);
  assert.equal(
    review.end,
    complete.start,
    "the stable comparison must run immediately after dependency review",
  );
  const pullNumberBinding =
    inspectName === undefined
      ? ""
      : `          PULL_NUMBER: \${{ github.event.pull_request.number }}\n`;
  const headRepositoryBinding =
    inspectName === undefined
      ? ""
      : `          HEAD_REPOSITORY: \${{ github.event.pull_request.head.repo.full_name }}\n`;
  assert.equal(
    complete.block.trimEnd(),
    `      - name: ${completeName}\n        env:\n          GITHUB_TOKEN: \${{ github.token }}\n          TARGET_REPOSITORY: \${{ github.repository }}\n${pullNumberBinding}          BASE_SHA: ${baseExpression}\n${headRepositoryBinding}          HEAD_SHA: ${headExpression}\n          DEPENDENCY_CHANGES: \${{ steps.dependency-review.outputs.dependency-changes }}\n        run: >-\n          node .github/scripts/trusted-dependency-review.mjs\n          --dependency-review-output`,
  );
}

function mutateOnce(source, before, after) {
  assert.equal(
    source.split(before).length - 1,
    1,
    `mutation anchor must occur exactly once: ${before}`,
  );
  return source.replace(before, after);
}

function mutateStep(source, name, before, after) {
  const workflow = normalizedWorkflow(source);
  const step = workflowStep(workflow, name);
  const mutated = mutateOnce(step.block, before, after);
  return workflow.slice(0, step.start) + mutated + workflow.slice(step.end);
}

function assertDependencyCarrierMutations(source, contract) {
  const completeName = "Require a complete stable dependency comparison";
  const mutations = [
    () =>
      mutateOnce(source, "    timeout-minutes: 10", "    timeout-minutes: 120"),
    () =>
      mutateOnce(
        source,
        "    timeout-minutes: 10",
        "    timeout-minutes: 10\n    if: ${{ false }}",
      ),
    () =>
      mutateOnce(
        source,
        "    timeout-minutes: 10",
        "    timeout-minutes: 10\n    continue-on-error: true",
      ),
    () =>
      mutateOnce(
        source,
        "  dependency_review:",
        '  "shadow":\n    name: Dependency Review\n    runs-on: ubuntu-latest\n    steps: []\n  dependency_review:',
      ),
    () =>
      mutateOnce(
        source,
        "jobs:\n",
        "defaults:\n  run:\n    shell: bash {0} || true\n\njobs:\n",
      ),
    () =>
      mutateOnce(
        source,
        "jobs:\n",
        'env:\n  NODE_OPTIONS: "--import=data:text/javascript,throw new Error(1)"\n\njobs:\n',
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "        id: dependency-review",
        "        id: dependency-review-bypass",
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
        `actions/dependency-review-action@${"f".repeat(40)}`,
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "          retry-on-snapshot-warnings: true",
        "          retry-on-snapshot-warnings: false",
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "          retry-on-snapshot-warnings-timeout: 3600",
        "          retry-on-snapshot-warnings-timeout: 600",
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        `          base-ref: ${contract.baseExpression}`,
        `          base-ref: ${contract.headExpression}`,
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        `          head-ref: ${contract.headExpression}`,
        `          head-ref: ${contract.baseExpression}`,
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "          fail-on-severity: low",
        "          fail-on-severity: high",
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "          fail-on-scopes: runtime, development, unknown",
        "          fail-on-scopes: runtime",
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "          retry-on-snapshot-warnings: true",
        "          warn-only: true\n          retry-on-snapshot-warnings: true",
      ),
    () =>
      mutateStep(
        source,
        contract.reviewName,
        "          retry-on-snapshot-warnings: true",
        "          license-check: false\n          vulnerability-check: false\n          retry-on-snapshot-warnings: true",
      ),
    () =>
      mutateStep(
        source,
        contract.checkoutName,
        `          ref: ${contract.baseExpression}`,
        `          ref: ${contract.headExpression}`,
      ),
    () =>
      mutateStep(
        source,
        completeName,
        "          GITHUB_TOKEN: ${{ github.token }}",
        "          GITHUB_TOKEN: untrusted",
      ),
    () =>
      mutateStep(
        source,
        completeName,
        "          TARGET_REPOSITORY: ${{ github.repository }}",
        "          TARGET_REPOSITORY: attacker/repository",
      ),
    () =>
      mutateStep(
        source,
        completeName,
        `          BASE_SHA: ${contract.baseExpression}`,
        `          BASE_SHA: ${contract.headExpression}`,
      ),
    () =>
      mutateStep(
        source,
        completeName,
        `          HEAD_SHA: ${contract.headExpression}`,
        `          HEAD_SHA: ${contract.baseExpression}`,
      ),
    () =>
      mutateStep(
        source,
        completeName,
        "          DEPENDENCY_CHANGES: ${{ steps.dependency-review.outputs.dependency-changes }}",
        "          DEPENDENCY_CHANGES: ${{ steps.unreviewed.outputs.dependency-changes }}",
      ),
    () =>
      mutateStep(
        source,
        completeName,
        "          --dependency-review-output",
        "          --dependency-review-output || true",
      ),
    () =>
      mutateStep(
        source,
        completeName,
        `      - name: ${completeName}`,
        `      - name: ${completeName}\n        if: \${{ false }}`,
      ),
    () =>
      mutateStep(
        source,
        completeName,
        `      - name: ${completeName}`,
        `      - name: ${completeName}\n        continue-on-error: true`,
      ),
    () =>
      mutateOnce(
        source,
        `      - name: ${completeName}`,
        "      - name: Unreviewed intermediate step\n        run: true\n\n      - name: Require a complete stable dependency comparison",
      ),
    () =>
      mutateOnce(
        source,
        `      - name: ${contract.reviewName}`,
        `      - name: Extra candidate checkout\n        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n        with:\n          ref: ${contract.headExpression}\n\n      - name: ${contract.reviewName}`,
      ),
  ];
  for (const mutation of mutations) {
    const mutated = mutation();
    assert.throws(() => assertDependencyCarrierContract(mutated, contract));
  }
}

const ROOT_PACKAGE_BLOB = gitBlob(ROOT_PACKAGE);
const FRONTEND_PACKAGE_AFTER = structuredClone(FRONTEND_PACKAGE);
FRONTEND_PACKAGE_AFTER.devDependencies.wrangler = "4.123.0";
const FRONTEND_PACKAGE_BEFORE_BLOB = formattedJsonBlob(FRONTEND_PACKAGE);
const FRONTEND_PACKAGE_AFTER_BLOB = formattedJsonBlob(FRONTEND_PACKAGE_AFTER);
assert.equal(
  FRONTEND_PACKAGE_BEFORE_BLOB.oid,
  LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get("astrologo-frontend/package.json")
    .beforeOid,
);
assert.equal(
  FRONTEND_PACKAGE_AFTER_BLOB.oid,
  LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get("astrologo-frontend/package.json")
    .afterOid,
);

function rolloutEntries(state) {
  return LEAST_PRIVILEGE_ROLLOUT_TRANSITIONS.flatMap(
    ([path, beforeOid, afterOid]) => {
      const oid = state === "before" ? beforeOid : afterOid;
      return oid === null ? [] : [blob(path, oid)];
    },
  );
}

function fixtures() {
  const shared = [
    blob(".github/scripts/trusted-dependency-review.mjs", SHA.trustedScanner),
    blob(
      ".github/scripts/trusted-dependency-review.test.mjs",
      SHA.trustedScannerTest,
    ),
    ...POLICY_CONFIG_PATHS.map((path, index) =>
      blob(path, `${((index % 6) + 10).toString(16)}`.repeat(40)),
    ),
    blob("package.json", ROOT_PACKAGE_BLOB.oid),
    ...CONTROL_PLANE_BLOBS.map(([path, oid]) => blob(path, oid)),
  ];
  const baseTree = {
    sha: SHA.baseTree,
    truncated: false,
    tree: [...structuredClone(shared), ...rolloutEntries("before")],
  };
  const headTree = {
    sha: SHA.headTree,
    truncated: false,
    tree: [...structuredClone(shared), ...rolloutEntries("after")],
  };
  return { baseTree, headTree };
}

function settledFixtures() {
  const fixture = fixtures();
  fixture.baseTree = structuredClone(fixture.headTree);
  fixture.baseTree.sha = SHA.baseTree;
  return fixture;
}

function preRolloutFixtures() {
  const fixture = fixtures();
  fixture.headTree = structuredClone(fixture.baseTree);
  fixture.headTree.sha = SHA.headTree;
  return fixture;
}

function expectedPullRequest(
  headRepository = "LCV-Ideas-Software/astrologo-app",
) {
  const expected = {
    targetRepository: "LCV-Ideas-Software/astrologo-app",
    pullNumber: 291,
    baseSha: SHA.base,
    headRepository,
    headSha: SHA.head,
  };
  const pull = {
    number: expected.pullNumber,
    state: "open",
    base: {
      repo: {
        id: 1_182_022_862,
        full_name: expected.targetRepository,
      },
      ref: "main",
      sha: expected.baseSha,
    },
    head: {
      repo: {
        id:
          headRepository === "LCV-Ideas-Software/astrologo-app"
            ? 1_182_022_862
            : 2_000_000_000,
        full_name: expected.headRepository,
      },
      sha: expected.headSha,
    },
  };
  return { expected, pull };
}

function pullRequestEventPayload(
  headRepository = "LCV-Ideas-Software/astrologo-app",
) {
  const { pull } = expectedPullRequest(headRepository);
  return {
    action: "synchronize",
    number: pull.number,
    repository: {
      id: 1_182_022_862,
      full_name: "LCV-Ideas-Software/astrologo-app",
    },
    pull_request: {
      ...pull,
      base: {
        ...pull.base,
        repo: {
          id: 1_182_022_862,
          full_name: "LCV-Ideas-Software/astrologo-app",
        },
      },
      head: {
        ...pull.head,
        repo: {
          id:
            headRepository === "LCV-Ideas-Software/astrologo-app"
              ? 1_182_022_862
              : 2_000_000_000,
          full_name: headRepository,
        },
      },
    },
  };
}

function postReviewEnvironment(expected, overrides = {}) {
  return {
    GITHUB_EVENT_NAME: "pull_request_target",
    GITHUB_SHA: expected.baseSha,
    GITHUB_REF: "refs/heads/main",
    GITHUB_BASE_REF: "main",
    GITHUB_REPOSITORY: expected.targetRepository,
    GITHUB_REPOSITORY_ID: "1182022862",
    ...overrides,
  };
}

function mainRef(sha = SHA.base) {
  return { ref: "refs/heads/main", object: { type: "commit", sha } };
}

function validRotation() {
  const { baseTree, headTree } = settledFixtures();
  for (const [index, path] of [
    ".github/workflows/native-auto-merge.yml",
    ".github/scripts/trusted-dependency-review.mjs",
    ".github/scripts/trusted-dependency-review.test.mjs",
  ].entries()) {
    headTree.tree.find((entry) => entry.path === path).sha =
      `${index + 6}`.repeat(40);
  }
  const actor = {
    login: "lcv-leo",
    id: 268063598,
    node_id: "U_kgDOD_pTbg",
    type: "User",
  };
  const identity = { name: "LCV-Ideas-Software", email: "lcv@lcv.dev" };
  const commit = {
    sha: SHA.head,
    parents: [{ sha: SHA.base }],
    author: structuredClone(actor),
    committer: structuredClone(actor),
    commit: {
      tree: { sha: SHA.headTree },
      message:
        "chore(ci): rotate trusted dependency review root\n\nTrusted-Dependency-Review-Root-Rotation: astrologo-app/v1",
      author: structuredClone(identity),
      committer: structuredClone(identity),
      verification: {
        verified: true,
        reason: "valid",
        signature:
          "-----BEGIN PGP SIGNATURE-----\ntrusted\n-----END PGP SIGNATURE-----",
        payload: "tree candidate\nparent base\n",
        verified_at: "2026-08-13T12:00:00Z",
      },
    },
  };
  return { baseTree, headTree, commit };
}

function validControlPlaneRotation(paths = [".github/CODEOWNERS"]) {
  const { baseTree, headTree } = settledFixtures();
  for (const [index, path] of paths.entries()) {
    headTree.tree.find((entry) => entry.path === path).sha =
      `${index + 6}`.repeat(40);
  }
  const actor = {
    login: "lcv-leo",
    id: 268063598,
    node_id: "U_kgDOD_pTbg",
    type: "User",
  };
  const identity = { name: "LCV-Ideas-Software", email: "lcv@lcv.dev" };
  return {
    baseTree,
    headTree,
    commit: {
      sha: SHA.head,
      parents: [{ sha: SHA.base }],
      author: structuredClone(actor),
      committer: structuredClone(actor),
      commit: {
        tree: { sha: SHA.headTree },
        message:
          "chore(ci): rotate trusted control plane\n\nTrusted-Control-Plane-Rotation: astrologo-app/v1",
        author: structuredClone(identity),
        committer: structuredClone(identity),
        verification: {
          verified: true,
          reason: "valid",
          signature:
            "-----BEGIN PGP SIGNATURE-----\ntrusted\n-----END PGP SIGNATURE-----",
          payload: "tree candidate\nparent base\n",
          verified_at: "2026-08-13T12:00:00Z",
        },
      },
    },
  };
}

function normalApiResponses({ pull, baseTree, headTree }) {
  const baseFrontendOid = baseTree.tree.find(
    (entry) => entry.path === "astrologo-frontend/package.json",
  ).sha;
  const headFrontendOid = headTree.tree.find(
    (entry) => entry.path === "astrologo-frontend/package.json",
  ).sha;
  return [
    pull,
    mainRef(),
    { sha: SHA.base, tree: { sha: SHA.baseTree } },
    { sha: SHA.head, tree: { sha: SHA.headTree } },
    baseTree,
    headTree,
    ROOT_PACKAGE_BLOB.response,
    ROOT_PACKAGE_BLOB.response,
    packageBlobResponse(`/git/blobs/${baseFrontendOid}`),
    packageBlobResponse(`/git/blobs/${headFrontendOid}`),
    pull,
    mainRef(),
  ];
}

function packageBlobResponse(path) {
  if (path.endsWith(`/git/blobs/${ROOT_PACKAGE_BLOB.oid}`)) {
    return ROOT_PACKAGE_BLOB.response;
  }
  for (const value of [
    FRONTEND_PACKAGE_BEFORE_BLOB,
    FRONTEND_PACKAGE_AFTER_BLOB,
  ]) {
    if (path.endsWith(`/git/blobs/${value.oid}`)) return value.response;
  }
  return undefined;
}

function mutateHead(mutator) {
  const fixture = fixtures();
  mutator(fixture.headTree.tree, fixture);
  return fixture;
}

test("Git blob OIDs preserve exact bytes through the native Git implementation", () => {
  for (const [bytes, oid] of [
    [Buffer.alloc(0), "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"],
    [Buffer.from("abc", "utf8"), "f2ba8f84ab5c1bce84a7b441cb1959cfc7093b7f"],
    [
      Buffer.from([0, 255, 10, 13, 128]),
      "f8954e10bf6f369a02d0da43befdd00802f45fab",
    ],
    [
      Buffer.from("astrológico\n", "utf8"),
      "b1c77cc0233a0ad9fb4888c08e83eae397a1a002",
    ],
  ]) {
    assert.equal(gitBlobOid(bytes), oid);
  }
});

test("post-review verification remains compatible with the exact BEFORE carrier", async () => {
  const { expected, pull } = expectedPullRequest();
  const paths = [];
  const actual = await resolvePostReviewExpected({
    environment: postReviewEnvironment(expected),
    targetRepository: expected.targetRepository,
    baseSha: expected.baseSha,
    headSha: expected.headSha,
    loadPullRequestEvent: async () => pullRequestEventPayload(),
    api: async (path) => {
      paths.push(path);
      return [pull];
    },
  });
  assert.deepEqual(actual, expected);
  assert.deepEqual(paths, [
    `/repos/${expected.targetRepository}/pulls?state=open&base=main&per_page=100&page=1`,
  ]);
});

test("pull request discovery is fixed-path, bounded, unique and API-derived", async () => {
  const { expected, pull } = expectedPullRequest();
  const unrelatedPage = Array.from({ length: 100 }, (_, index) => ({
    ...structuredClone(pull),
    number: 1_000 + index,
  }));
  const argumentsFor = (api) => ({
    environment: postReviewEnvironment(expected),
    targetRepository: expected.targetRepository,
    baseSha: expected.baseSha,
    headSha: expected.headSha,
    loadPullRequestEvent: async () => pullRequestEventPayload(),
    api,
  });
  const paths = [];
  const pages = [unrelatedPage, [pull]];
  const actual = await resolvePostReviewExpected(
    argumentsFor(async (path) => {
      paths.push(path);
      return pages.shift();
    }),
  );
  assert.deepEqual(actual, expected);
  assert.deepEqual(paths, [
    `/repos/${expected.targetRepository}/pulls?state=open&base=main&per_page=100&page=1`,
    `/repos/${expected.targetRepository}/pulls?state=open&base=main&per_page=100&page=2`,
  ]);

  for (const responses of [
    [[]],
    [[pull, structuredClone(pull)]],
    [[...unrelatedPage, structuredClone(pull)]],
    Array.from({ length: 10 }, () => unrelatedPage),
  ]) {
    let page = 0;
    await assert.rejects(
      resolvePostReviewExpected(
        argumentsFor(async () => responses[page++] ?? []),
      ),
    );
  }

  const apiMutations = [
    (candidate) => (candidate.number = 292),
    (candidate) => (candidate.state = "closed"),
    (candidate) => (candidate.base.repo.id = 1),
    (candidate) => (candidate.base.repo.full_name = "attacker/repository"),
    (candidate) => (candidate.base.ref = "release"),
    (candidate) => (candidate.base.sha = "f".repeat(40)),
    (candidate) => (candidate.head.repo.id = 1),
    (candidate) => (candidate.head.repo.full_name = "attacker/repository"),
    (candidate) => (candidate.head.sha = "f".repeat(40)),
  ];
  for (const mutate of apiMutations) {
    const drifted = structuredClone(pull);
    mutate(drifted);
    await assert.rejects(
      resolvePostReviewExpected(argumentsFor(async () => [drifted])),
    );
  }
});

test("the post-review orchestrator forwards the stable comparison into tree and lock verification", async () => {
  const { expected, pull } = expectedPullRequest();
  const comparison = [dependencyChange("added", "example-package", "2.0.0")];
  const order = [];
  await verifyCompletedDependencyReview({
    environment: postReviewEnvironment(expected),
    token: "test-token",
    targetRepository: expected.targetRepository,
    baseSha: expected.baseSha,
    headSha: expected.headSha,
    dependencyChanges: JSON.stringify(comparison),
    api: async (path) => {
      assert.equal(
        path,
        `/repos/${expected.targetRepository}/pulls?state=open&base=main&per_page=100&page=1`,
      );
      return [pull];
    },
    loadPullRequestEvent: async () => {
      order.push("event");
      return pullRequestEventPayload();
    },
    completeReviewImplementation: async (input) => {
      order.push("comparison");
      assert.equal(input.dependencyChanges, JSON.stringify(comparison));
      return comparison;
    },
    verifyCandidateImplementation: async (input) => {
      order.push("candidate");
      assert.deepEqual(input.expected, expected);
      assert.equal(input.comparison, comparison);
    },
  });
  assert.deepEqual(order, ["event", "comparison", "candidate"]);
});

test("post-review bindings preserve forks, the final carrier and merge groups", async () => {
  for (const headRepository of [
    "LCV-Ideas-Software/astrologo-app",
    "step-security-bot/LCV-Ideas-Software_astrologo-app",
  ]) {
    const { expected, pull } = expectedPullRequest(headRepository);
    const baseArguments = {
      targetRepository: expected.targetRepository,
      baseSha: expected.baseSha,
      headSha: expected.headSha,
      loadPullRequestEvent: async () => pullRequestEventPayload(headRepository),
      api: async () => [pull],
    };
    assert.deepEqual(
      await resolvePostReviewExpected({
        ...baseArguments,
        environment: postReviewEnvironment(expected),
      }),
      expected,
    );
    assert.deepEqual(
      await resolvePostReviewExpected({
        ...baseArguments,
        environment: postReviewEnvironment(expected, {
          PULL_NUMBER: String(expected.pullNumber),
          HEAD_REPOSITORY: headRepository,
        }),
      }),
      expected,
    );
  }

  const { expected } = expectedPullRequest();
  const mergeGroupRef = `refs/heads/gh-readonly-queue/main/pr-${expected.pullNumber}-${expected.baseSha}`;
  let eventReads = 0;
  assert.deepEqual(
    await resolvePostReviewExpected({
      environment: postReviewEnvironment(expected, {
        GITHUB_EVENT_NAME: "merge_group",
        GITHUB_SHA: expected.headSha,
        GITHUB_REF: mergeGroupRef,
        GITHUB_BASE_REF: undefined,
      }),
      targetRepository: expected.targetRepository,
      baseSha: expected.baseSha,
      headSha: expected.headSha,
      loadPullRequestEvent: async () => {
        eventReads += 1;
        throw new Error("merge groups must not read a pull request payload");
      },
    }),
    {
      targetRepository: expected.targetRepository,
      baseSha: expected.baseSha,
      headRepository: expected.targetRepository,
      headSha: expected.headSha,
      mergeGroupRef,
    },
  );
  assert.equal(eventReads, 0);
});

test("post-review event and explicit binding mutations fail closed", async () => {
  const { expected } = expectedPullRequest();
  const baseArguments = {
    targetRepository: expected.targetRepository,
    baseSha: expected.baseSha,
    headSha: expected.headSha,
  };
  for (const environmentMutation of [
    { PULL_NUMBER: "291" },
    { HEAD_REPOSITORY: expected.headRepository },
    { GITHUB_SHA: "f".repeat(40) },
    { GITHUB_REF: "refs/heads/attacker" },
    { GITHUB_BASE_REF: "release" },
    { GITHUB_REPOSITORY: "attacker/repository" },
    { GITHUB_REPOSITORY_ID: "1" },
    { PULL_NUMBER: "292", HEAD_REPOSITORY: expected.headRepository },
    { PULL_NUMBER: "291", HEAD_REPOSITORY: "attacker/repository" },
  ]) {
    await assert.rejects(
      resolvePostReviewExpected({
        ...baseArguments,
        environment: postReviewEnvironment(expected, environmentMutation),
        loadPullRequestEvent: async () => pullRequestEventPayload(),
      }),
    );
  }

  const payloadMutations = [
    (payload) => (payload.action = "closed"),
    (payload) => (payload.repository.id = 1),
    (payload) => (payload.repository.full_name = "attacker/repository"),
    (payload) => (payload.number = 0),
    (payload) => (payload.pull_request.number = 292),
    (payload) => (payload.pull_request.state = "closed"),
    (payload) => (payload.pull_request.base.repo.id = 1),
    (payload) =>
      (payload.pull_request.base.repo.full_name = "attacker/repository"),
    (payload) => (payload.pull_request.base.ref = "release"),
    (payload) => (payload.pull_request.base.sha = "f".repeat(40)),
    (payload) => (payload.pull_request.head.repo = null),
    (payload) => (payload.pull_request.head.repo.id = 0),
    (payload) =>
      (payload.pull_request.head.repo.full_name = "attacker repository"),
    (payload) => (payload.pull_request.head.sha = "f".repeat(40)),
  ];
  for (const mutate of payloadMutations) {
    const payload = pullRequestEventPayload();
    mutate(payload);
    await assert.rejects(
      resolvePostReviewExpected({
        ...baseArguments,
        environment: postReviewEnvironment(expected),
        loadPullRequestEvent: async () => payload,
      }),
    );
  }

  for (const partial of [
    { PULL_NUMBER: "291" },
    { HEAD_REPOSITORY: expected.headRepository },
  ]) {
    await assert.rejects(
      resolvePostReviewExpected({
        ...baseArguments,
        environment: postReviewEnvironment(expected, {
          GITHUB_EVENT_NAME: "merge_group",
          GITHUB_SHA: expected.headSha,
          GITHUB_REF: `refs/heads/gh-readonly-queue/main/pr-291-${expected.baseSha}`,
          GITHUB_BASE_REF: undefined,
          ...partial,
        }),
        loadPullRequestEvent: async () => {
          throw new Error("merge groups must not read a PR event");
        },
      }),
    );
  }
});

test("the GitHub event payload stays bounded inside the runner temp directory", async () => {
  const payloadBytes = Buffer.from(
    JSON.stringify(pullRequestEventPayload()),
    "utf8",
  );
  const runnerTemp = resolvePath("runner-temp");
  const eventPath = resolvePath(runnerTemp, "_github_workflow", "event.json");
  const resolvedEventPath = resolvePath(runnerTemp, "resolved", "event.json");
  const environment = { GITHUB_EVENT_PATH: eventPath, RUNNER_TEMP: runnerTemp };
  const openFlags = gitHubEventOpenFlags();
  assert.equal(
    gitHubEventOpenFlags({ O_RDONLY: 0, O_NOFOLLOW: 0x20_000 }, "linux"),
    0x20_000,
  );
  assert.throws(() => gitHubEventOpenFlags({ O_RDONLY: 0 }, "linux"));
  let closes = 0;
  const openedPayload = ({
    bytes = payloadBytes,
    isFile = true,
    size = bytes.length,
  } = {}) => ({
    stat: async () => ({ isFile: () => isFile, size }),
    readFile: async () => bytes,
    close: async () => {
      closes += 1;
    },
  });
  const filesystem = {
    realpathImplementation: async (path) =>
      path === eventPath ? resolvedEventPath : path,
    openFlags,
    openImplementation: async (path, flags) => {
      assert.equal(path, resolvedEventPath);
      assert.equal(flags, openFlags);
      return openedPayload();
    },
  };
  assert.deepEqual(
    await readGitHubEventPayload(environment, filesystem),
    pullRequestEventPayload(),
  );
  assert.equal(closes, 1);
  await assert.rejects(
    readGitHubEventPayload(
      {
        GITHUB_EVENT_PATH: resolvePath(runnerTemp, "..", "event.json"),
        RUNNER_TEMP: runnerTemp,
      },
      filesystem,
    ),
    /inside RUNNER_TEMP/,
  );
  await assert.rejects(
    readGitHubEventPayload(environment, {
      ...filesystem,
      openImplementation: async () => openedPayload({ isFile: false }),
    }),
    /regular file/,
  );
  await assert.rejects(
    readGitHubEventPayload(environment, {
      ...filesystem,
      openImplementation: async () =>
        openedPayload({ size: 25 * 1024 * 1024 + 1 }),
    }),
    /too large/,
  );
  await assert.rejects(
    readGitHubEventPayload(environment, {
      ...filesystem,
      openImplementation: async () =>
        openedPayload({
          bytes: Buffer.alloc(25 * 1024 * 1024 + 1, 0x20),
          size: 1,
        }),
    }),
    /too large/,
  );
  for (const invalid of [Buffer.from("{"), Buffer.from("[]")]) {
    await assert.rejects(
      readGitHubEventPayload(environment, {
        ...filesystem,
        openImplementation: async () => openedPayload({ bytes: invalid }),
      }),
    );
  }
});

test("the exact least-privilege rollout and both stable phases are accepted", () => {
  assert.doesNotThrow(() => assertCandidateTree(preRolloutFixtures()));
  assert.doesNotThrow(() => assertCandidateTree(fixtures()));
  assert.doesNotThrow(() => assertCandidateTree(settledFixtures()));
});

test("partial, mixed and downgraded least-privilege states fail closed", () => {
  const partial = fixtures();
  const partialPath = ".github/workflows/scorecard.yml";
  partial.headTree.tree.find((entry) => entry.path === partialPath).sha =
    LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(partialPath).beforeOid;
  assert.throws(() => assertCandidateTree(partial));

  const mixed = fixtures();
  const mixedPath = ".github/workflows/pages.yml";
  mixed.baseTree.tree.find((entry) => entry.path === mixedPath).sha =
    LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(mixedPath).afterOid;
  assert.throws(() => assertCandidateTree(mixed));

  for (const [
    path,
    beforeOid,
    afterOid,
  ] of LEAST_PRIVILEGE_ROLLOUT_TRANSITIONS) {
    if (beforeOid === null || afterOid === null) continue;
    const downgrade = settledFixtures();
    downgrade.headTree.tree.find((entry) => entry.path === path).sha =
      beforeOid;
    assert.throws(() => assertCandidateTree(downgrade), undefined, path);
  }
});

test("the atomic transition rejects every unrelated changed leaf", () => {
  for (const path of ["README.md", "src/unrelated.ts"]) {
    const candidate = fixtures();
    candidate.headTree.tree.push(blob(path, "f".repeat(40)));
    assert.throws(() => assertCandidateTree(candidate), /changed-path set/);
  }
});

test("the settled state permits ordinary code and documentation changes", () => {
  for (const path of ["README.md", "src/example.ts"]) {
    const candidate = settledFixtures();
    candidate.headTree.tree.push(blob(path, "f".repeat(40)));
    assert.doesNotThrow(() => assertCandidateTree(candidate));
  }

  const workflowDrift = settledFixtures();
  workflowDrift.headTree.tree.find(
    (entry) => entry.path === ".github/workflows/scorecard.yml",
  ).sha = "f".repeat(40);
  assert.throws(() => assertCandidateTree(workflowDrift));

  const configDrift = settledFixtures();
  configDrift.headTree.tree.push(blob(".prettierrc", "f".repeat(40)));
  assert.throws(() => assertCandidateTree(configDrift));
});

test("trusted control-plane slots remain canonical and immutable", () => {
  const aliases = [
    "CODEOWNERS",
    "docs/CODEOWNERS",
    ".github/dependabot.yaml",
    ".GITHUB/CODEOWNERS",
    ".github/DEPENDABOT.yml",
  ];
  for (const factory of [preRolloutFixtures, settledFixtures]) {
    for (const [path] of CONTROL_PLANE_BLOBS) {
      const modified = factory();
      modified.headTree.tree.find((entry) => entry.path === path).sha =
        "f".repeat(40);
      assert.throws(() => assertCandidateTree(modified), undefined, path);

      const removed = factory();
      removed.headTree.tree = removed.headTree.tree.filter(
        (entry) => entry.path !== path,
      );
      assert.throws(() => assertCandidateTree(removed), undefined, path);
    }
    for (const path of aliases) {
      const shadowed = factory();
      shadowed.headTree.tree.push(blob(path, "f".repeat(40)));
      assert.throws(() => assertCandidateTree(shadowed), undefined, path);
    }
  }
});

test("a signed control-plane-only commit can rotate canonical ownership data", () => {
  const { expected } = expectedPullRequest();
  for (const paths of [
    [".github/CODEOWNERS"],
    [".github/dependabot.yml"],
    [".github/CODEOWNERS", ".github/dependabot.yml"],
  ]) {
    const rotation = validControlPlaneRotation(paths);
    assert.doesNotThrow(() =>
      assertTrustedControlPlaneRotation({
        ...rotation,
        expected,
        expectedHeadTreeSha: SHA.headTree,
      }),
    );
    assert.doesNotThrow(() =>
      assertCandidateTree({
        baseTree: rotation.baseTree,
        headTree: rotation.headTree,
        allowTrustedControlPlaneRotation: true,
      }),
    );
  }

  const unrelated = validControlPlaneRotation();
  unrelated.headTree.tree.push(blob("README.md", "f".repeat(40)));
  assert.throws(() =>
    assertTrustedControlPlaneRotation({
      ...unrelated,
      expected,
      expectedHeadTreeSha: SHA.headTree,
    }),
  );
  const unsigned = validControlPlaneRotation();
  unsigned.commit.commit.verification.verified = false;
  assert.throws(() =>
    assertTrustedControlPlaneRotation({
      ...unsigned,
      expected,
      expectedHeadTreeSha: SHA.headTree,
    }),
  );
});

test("the settled state permits dependency-only manifest and lockfile updates", async () => {
  const candidate = settledFixtures();
  const futurePackage = structuredClone(FRONTEND_PACKAGE_AFTER);
  futurePackage.dependencies.dompurify = "^3.4.14";
  const futurePackageBlob = formattedJsonBlob(futurePackage);
  candidate.headTree.tree.find(
    (entry) => entry.path === "astrologo-frontend/package.json",
  ).sha = futurePackageBlob.oid;
  candidate.headTree.tree.find(
    (entry) => entry.path === "astrologo-frontend/package-lock.json",
  ).sha = "f".repeat(40);

  assert.doesNotThrow(() => assertCandidateTree(candidate));
  const { expected } = expectedPullRequest();
  const responses = new Map([
    [ROOT_PACKAGE_BLOB.oid, ROOT_PACKAGE_BLOB.response],
    [FRONTEND_PACKAGE_AFTER_BLOB.oid, FRONTEND_PACKAGE_AFTER_BLOB.response],
    [futurePackageBlob.oid, futurePackageBlob.response],
  ]);
  await assert.doesNotReject(
    assertReviewedPackageScripts({
      expected,
      baseTree: candidate.baseTree,
      headTree: candidate.headTree,
      api: async (path) => {
        const response = responses.get(path.split("/").at(-1));
        assert.notEqual(response, undefined);
        return structuredClone(response);
      },
    }),
  );

  futurePackage.scripts.preinstall = "node unreviewed.mjs";
  const unsafePackageBlob = formattedJsonBlob(futurePackage);
  candidate.headTree.tree.find(
    (entry) => entry.path === "astrologo-frontend/package.json",
  ).sha = unsafePackageBlob.oid;
  responses.set(unsafePackageBlob.oid, unsafePackageBlob.response);
  await assert.rejects(
    assertReviewedPackageScripts({
      expected,
      baseTree: candidate.baseTree,
      headTree: candidate.headTree,
      api: async (path) => {
        const response = responses.get(path.split("/").at(-1));
        assert.notEqual(response, undefined);
        return structuredClone(response);
      },
    }),
  );
});

test("the trusted carrier, scanner and policy cannot be changed by the candidate", () => {
  for (const path of [
    ".github/workflows/native-auto-merge.yml",
    ".github/scripts/trusted-dependency-review.mjs",
    ".github/scripts/trusted-dependency-review.test.mjs",
    ".github/zizmor.yml",
  ]) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => {
          const entry = entries.find((candidate) => candidate.path === path);
          entry.sha =
            entry.sha === "f".repeat(40) ? "0".repeat(40) : "f".repeat(40);
        }),
      ),
    );
  }
});

test("every finalized operational workflow remains its reviewed blob", () => {
  for (const [path, , afterOid] of LEAST_PRIVILEGE_ROLLOUT_TRANSITIONS) {
    if (!path.startsWith(".github/workflows/") || afterOid === null) continue;
    assert.throws(() =>
      assertCandidateTree(
        (() => {
          const candidate = settledFixtures();
          const entries = candidate.headTree.tree;
          entries.find((entry) => entry.path === path).sha = "f".repeat(40);
          return candidate;
        })(),
      ),
    );
  }
});

test("candidate code cannot weaken the package, config or executable guards", () => {
  for (const path of POLICY_CONFIG_PATHS) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => {
          const entry = entries.find((candidate) => candidate.path === path);
          entry.sha =
            entry.sha === "f".repeat(40) ? "0".repeat(40) : "f".repeat(40);
        }),
      ),
    );
  }
});

test("package dispatch remains bound to the trusted scripts", async () => {
  const { expected } = expectedPullRequest();
  const run = async ({
    root = ROOT_PACKAGE,
    frontend = FRONTEND_PACKAGE,
  } = {}) => {
    const fixture = fixtures();
    const candidateRoot = gitBlob(root);
    const candidateFrontend = gitBlob(frontend);
    fixture.headTree.tree.find((entry) => entry.path === "package.json").sha =
      candidateRoot.oid;
    fixture.headTree.tree.find(
      (entry) => entry.path === "astrologo-frontend/package.json",
    ).sha = candidateFrontend.oid;
    const responses = new Map([
      [ROOT_PACKAGE_BLOB.oid, ROOT_PACKAGE_BLOB.response],
      [FRONTEND_PACKAGE_BEFORE_BLOB.oid, FRONTEND_PACKAGE_BEFORE_BLOB.response],
      [candidateRoot.oid, candidateRoot.response],
      [candidateFrontend.oid, candidateFrontend.response],
    ]);
    await assertReviewedPackageScripts({
      expected,
      baseTree: fixture.baseTree,
      headTree: fixture.headTree,
      api: async (path) => {
        const oid = path.split("/").at(-1);
        const response = responses.get(oid);
        assert.notEqual(response, undefined, `unexpected blob ${oid}`);
        return structuredClone(response);
      },
    });
  };
  await assert.doesNotReject(run());
  await assert.doesNotReject(
    run({
      registryFields: {
        bundleDependencies: false,
        bundledDependencies: false,
      },
    }),
  );

  await assert.rejects(
    run({
      frontend: {
        ...FRONTEND_PACKAGE,
        postcss: { plugins: ["attacker-controlled-plugin"] },
      },
    }),
  );
  await assert.rejects(
    run({
      root: {
        ...ROOT_PACKAGE,
        scripts: {
          ...ROOT_PACKAGE.scripts,
          preformat: "true",
        },
      },
    }),
  );
  for (const [name, command] of [
    ["pretest", "node attacker-controlled-pretest.mjs"],
    ["postbuild", "node attacker-controlled-postbuild.mjs"],
    ["preprepare:swiss-wasm", "node attacker-controlled-preprepare.mjs"],
  ]) {
    await assert.rejects(
      run({
        frontend: {
          ...FRONTEND_PACKAGE,
          scripts: { ...FRONTEND_PACKAGE.scripts, [name]: command },
        },
      }),
    );
  }
  await assert.rejects(
    run({
      frontend: {
        ...FRONTEND_PACKAGE,
        scripts: {
          ...FRONTEND_PACKAGE.scripts,
          "prepare:swiss-wasm": "true",
        },
      },
    }),
  );
  await assert.rejects(
    run({
      root: {
        ...ROOT_PACKAGE,
        prettier: { requirePragma: true },
      },
    }),
  );
});

test("malformed or unverified package blobs fail closed", async () => {
  const fixture = fixtures();
  const { expected } = expectedPullRequest();
  for (const mutation of [
    { encoding: "utf-8" },
    { sha: "f".repeat(40) },
    { content: Buffer.from("{", "utf8").toString("base64") },
  ]) {
    await assert.rejects(
      assertReviewedPackageScripts({
        expected,
        baseTree: fixture.baseTree,
        headTree: fixture.headTree,
        api: async (path) => {
          const response = path.endsWith(ROOT_PACKAGE_BLOB.oid)
            ? ROOT_PACKAGE_BLOB.response
            : packageBlobResponse(path);
          assert.notEqual(response, undefined);
          return { ...structuredClone(response), ...mutation };
        },
      }),
    );
  }
  await assert.rejects(
    assertReviewedPackageScripts({
      expected,
      baseTree: fixture.baseTree,
      headTree: fixture.headTree,
      api: async (path) => {
        const response = path.endsWith(ROOT_PACKAGE_BLOB.oid)
          ? ROOT_PACKAGE_BLOB.response
          : packageBlobResponse(path);
        assert.notEqual(response, undefined);
        return path.endsWith(ROOT_PACKAGE_BLOB.oid)
          ? {
              ...structuredClone(response),
              content: Buffer.alloc(128 * 1024 + 1).toString("base64"),
            }
          : structuredClone(response);
      },
    }),
    /is too large/,
  );
});

test("npm lock changes match Dependency Review and official registry metadata", async () => {
  const fixture = reviewedLockFixtures();
  const { expected } = expectedPullRequest();
  const responses = new Map(
    Object.values(fixture.values).map((value) => [value.oid, value.response]),
  );
  const run = ({
    baseTree = fixture.baseTree,
    headTree = fixture.headTree,
    comparison = DEPENDENCY_CHANGES,
    registryIntegrity = sri(2),
    registryFields = {},
    registryContentType = "application/json",
  } = {}) =>
    assertReviewedNpmLocks({
      expected,
      baseTree,
      headTree,
      comparison,
      api: async (path) => {
        const response = responses.get(path.split("/").at(-1));
        assert.notEqual(response, undefined, `unexpected lock blob ${path}`);
        return structuredClone(response);
      },
      fetchImplementation: async (url, options) => {
        assert.equal(url, "https://registry.npmjs.org/example-package/2.0.0");
        assert.equal(options.cache, "no-store");
        assert.deepEqual(options.headers, {
          Accept: "application/json",
          "Accept-Encoding": "identity",
        });
        assert.equal(options.redirect, "error");
        assert.equal(options.signal instanceof AbortSignal, true);
        const response = new Response(
          JSON.stringify({
            name: "example-package",
            version: "2.0.0",
            _hasShrinkwrap: false,
            dist: {
              tarball:
                "https://registry.npmjs.org/example-package/-/example-package-2.0.0.tgz",
              integrity: registryIntegrity,
            },
            ...registryFields,
          }),
          {
            status: 200,
            headers: { "content-type": registryContentType },
          },
        );
        Object.defineProperty(response, "url", { value: url });
        return response;
      },
    });

  await assert.doesNotReject(run());
  await assert.rejects(run({ comparison: [] }), /additions must match/);
  await assert.rejects(
    run({ registryIntegrity: sri(9) }),
    /descriptor drifted from npm registry/,
  );
  await assert.rejects(
    run({ registryFields: { dependencies: { payload: "1.0.0" } } }),
    /descriptor drifted from npm registry/,
  );
  await assert.rejects(
    run({ registryFields: { bundleDependencies: ["payload"] } }),
    /registry bundleDependencies require tarball inspection/,
  );
  await assert.rejects(
    run({ registryFields: { _hasShrinkwrap: undefined } }),
    /shrinkwrap provenance must be explicitly false/,
  );
  await assert.rejects(
    run({ registryFields: { _hasShrinkwrap: true } }),
    /shrinkwrap provenance must be explicitly false/,
  );
  await assert.rejects(
    run({ registryContentType: "text/plain" }),
    /must return JSON/,
  );
  await assert.rejects(
    run({ registryFields: { oversized: "x".repeat(256 * 1024) } }),
    /response is too large/,
  );
  await assert.rejects(
    run({
      comparison: [
        ...DEPENDENCY_CHANGES,
        {
          ...dependencyChange("added", "unreviewed", "1.0.0"),
          manifest: "nested/package-lock.json",
        },
      ],
    }),
    /unreviewed manifest/,
  );

  const tampered = structuredClone(fixture.values.rootBase.response);
  const parsed = JSON.parse(fixture.values.rootBase.bytes.toString("utf8"));
  parsed.packages["node_modules/example-package"].resolved =
    "https://attacker.invalid/example-package-1.0.0.tgz";
  parsed.packages["node_modules/example-package"].integrity = sri(9);
  const tamperedBlob = formattedJsonBlob(parsed);
  responses.set(tamperedBlob.oid, tamperedBlob.response);
  const stableHead = structuredClone(fixture.baseTree);
  stableHead.sha = SHA.headTree;
  stableHead.tree.find((entry) => entry.path === "package-lock.json").sha =
    tamperedBlob.oid;
  await assert.rejects(
    run({ headTree: stableHead, comparison: [] }),
    /canonical npm registry tarball|descriptor drifted/,
  );
  assert.notDeepEqual(tampered, tamperedBlob.response);
});

test("direct npm manifests match exact dependency section deltas in both projects", async () => {
  const { expected } = expectedPullRequest();
  const run = ({
    manifest,
    fixtureOptions,
    comparison = directManifestChanges(manifest),
  }) => {
    const fixture = reviewedDirectManifestFixtures(manifest, fixtureOptions);
    const responses = new Map(
      Object.values(fixture.values).map((value) => [value.oid, value.response]),
    );
    return assertReviewedNpmLocks({
      expected,
      baseTree: fixture.baseTree,
      headTree: fixture.headTree,
      comparison,
      api: async (path) => {
        const response = responses.get(path.split("/").at(-1));
        assert.notEqual(response, undefined, `unexpected npm blob ${path}`);
        return structuredClone(response);
      },
      fetchImplementation: async () =>
        assert.fail("stable lock entries must not query the npm registry"),
    });
  };

  for (const manifest of ["package.json", "astrologo-frontend/package.json"]) {
    await assert.doesNotReject(run({ manifest }));
  }

  const manifest = "astrologo-frontend/package.json";
  for (const [section, scope] of [
    ["dependencies", "runtime"],
    ["devDependencies", "development"],
    ["optionalDependencies", "runtime"],
    ["peerDependencies", "runtime"],
  ]) {
    await assert.doesNotReject(
      run({
        manifest,
        fixtureOptions: { baseSection: section, headSection: section },
        comparison: directManifestChanges(manifest, {
          baseScope: scope,
          headScope: scope,
        }),
      }),
    );
  }
  await assert.rejects(
    run({
      manifest,
      fixtureOptions: {
        baseSection: "dependencies",
        headSection: "optionalDependencies",
        baseVersion: "4.123.0",
        headVersion: "4.123.0",
      },
      comparison: [],
    }),
    /section changes require a trusted lockfile rotation/,
  );
  await assert.rejects(
    run({
      manifest,
      fixtureOptions: {
        baseSection: "dependencies",
        headSection: "optionalDependencies",
        baseVersion: "^4.120.0",
        headVersion: "4.123.0",
      },
      comparison: directManifestChanges(manifest, {
        baseScope: "runtime",
        headScope: "runtime",
      }),
    }),
    /section changes require a trusted lockfile rotation/,
  );
  await assert.rejects(
    run({
      manifest,
      fixtureOptions: {
        baseSection: "devDependencies",
        headSection: "dependencies",
        baseVersion: "4.123.0",
        headVersion: "4.123.0",
      },
      comparison: directManifestChanges(manifest, {
        baseVersion: "4.123.0",
        headVersion: "4.123.0",
        baseScope: "development",
        headScope: "runtime",
      }),
    }),
    /section changes require a trusted lockfile rotation/,
  );

  const valid = directManifestChanges(manifest);
  await assert.rejects(
    run({ manifest, comparison: valid.slice(0, 1) }),
    /direct dependency changes must match package.json/,
  );
  const divergent = structuredClone(valid);
  divergent[0].scope = "runtime";
  await assert.rejects(
    run({ manifest, comparison: divergent }),
    /direct dependency changes must match package.json/,
  );
  await assert.rejects(
    run({
      manifest,
      comparison: [
        ...valid,
        {
          ...dependencyChange("added", "unreviewed-extra", "1.0.0"),
          manifest,
        },
      ],
    }),
    /direct dependency changes must match package.json/,
  );
});

test("npm lock topology, bundled payloads and every occurrence fail closed", async () => {
  const { expected } = expectedPullRequest();
  const run = ({ fixture, comparison, registry = new Map() }) => {
    const responses = new Map(
      Object.values(fixture.values).map((value) => [value.oid, value.response]),
    );
    return assertReviewedNpmLocks({
      expected,
      baseTree: fixture.baseTree,
      headTree: fixture.headTree,
      comparison,
      api: async (path) => {
        const response = responses.get(path.split("/").at(-1));
        assert.notEqual(response, undefined, `unexpected lock blob ${path}`);
        return structuredClone(response);
      },
      fetchImplementation: async (url) => {
        const metadata = registry.get(url);
        assert.notEqual(
          metadata,
          undefined,
          `unexpected registry request ${url}`,
        );
        const response = new Response(JSON.stringify(metadata), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
        Object.defineProperty(response, "url", { value: url });
        return response;
      },
    });
  };

  const one = registryDescriptor("example-package", "1.0.0", 1);
  const two = registryDescriptor("example-package", "2.0.0", 2);
  const consumer = registryDescriptor("consumer", "1.0.0", 3, {
    dependencies: { "example-package": "2.0.0" },
  });
  const topologyBase = {
    "node_modules/example-package": one,
    "node_modules/consumer": consumer,
    "node_modules/consumer/node_modules/example-package": two,
  };
  const topologyHead = {
    "node_modules/example-package": two,
    "node_modules/consumer": consumer,
    "node_modules/consumer/node_modules/example-package": one,
  };
  await assert.rejects(
    run({
      fixture: reviewedLockCase(topologyBase, topologyHead),
      comparison: [],
    }),
    /topology|descriptor drifted/,
  );

  const carrier = registryDescriptor("carrier", "1.0.0", 4, {
    bundleDependencies: ["payload"],
  });
  const bundledFixture = reviewedLockCase(
    {},
    {
      "node_modules/carrier": carrier,
      "node_modules/carrier/node_modules/payload": {
        version: "9.9.9",
        inBundle: true,
      },
    },
  );
  await assert.rejects(
    run({
      fixture: bundledFixture,
      comparison: [
        dependencyChange("added", "carrier", "1.0.0"),
        dependencyChange("added", "payload", "9.9.9"),
      ],
      registry: new Map([
        [
          "https://registry.npmjs.org/carrier/1.0.0",
          {
            name: "carrier",
            version: "1.0.0",
            bundleDependencies: ["different-payload"],
            dist: {
              tarball: "https://registry.npmjs.org/carrier/-/carrier-1.0.0.tgz",
              integrity: sri(4),
            },
          },
        ],
      ]),
    }),
    /bundled|bundleDependencies/,
  );

  const exampleRegistry = new Map([
    [
      "https://registry.npmjs.org/example-package/2.0.0",
      {
        name: "example-package",
        version: "2.0.0",
        _hasShrinkwrap: false,
        dist: {
          tarball:
            "https://registry.npmjs.org/example-package/-/example-package-2.0.0.tgz",
          integrity: sri(2),
        },
      },
    ],
  ]);
  await assert.rejects(
    run({
      fixture: reviewedLockCase({}, { "node_modules/example-package": two }),
      comparison: [dependencyChange("added", "example-package", "2.0.0")],
      registry: exampleRegistry,
    }),
    /replace the same installed path/,
  );
  await assert.rejects(
    run({
      fixture: reviewedLockCase(
        {
          "node_modules/example-package": {
            ...one,
            dev: true,
          },
        },
        {
          "node_modules/example-package": {
            ...two,
            dev: true,
            optional: true,
          },
        },
      ),
      comparison: [
        dependencyChange("added", "example-package", "2.0.0"),
        dependencyChange("removed", "example-package", "1.0.0"),
      ],
      registry: exampleRegistry,
    }),
    /preserve the optional placement flag/,
  );

  const duplicateConsumer = registryDescriptor("consumer", "1.0.0", 3, {
    dependencies: { "example-package": "*" },
  });
  const duplicateFixture = reviewedLockCase(
    {
      "node_modules/consumer": duplicateConsumer,
      "node_modules/example-package": one,
      "node_modules/consumer/node_modules/example-package": one,
    },
    {
      "node_modules/consumer": duplicateConsumer,
      "node_modules/example-package": two,
      "node_modules/consumer/node_modules/example-package": {
        ...two,
        integrity: sri(9),
      },
    },
  );
  await assert.rejects(
    run({
      fixture: duplicateFixture,
      comparison: [
        dependencyChange("added", "example-package", "2.0.0"),
        dependencyChange("removed", "example-package", "1.0.0"),
      ],
      registry: exampleRegistry,
    }),
    /descriptor drifted from npm registry/,
  );
});

test("dependency review output matches two complete warning-free reads", async () => {
  const next = `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2>; rel="next", <https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2>; rel="last"`;
  await assert.doesNotReject(
    dependencyReviewRun(
      [
        dependencyResponse([DEPENDENCY_CHANGES[0]], { link: next }),
        dependencyResponse([DEPENDENCY_CHANGES[1]]),
        dependencyResponse([DEPENDENCY_CHANGES[1]], { link: next }),
        dependencyResponse([DEPENDENCY_CHANGES[0]]),
      ],
      [...DEPENDENCY_CHANGES].reverse(),
      [1, 2, 1, 2],
    ),
  );
  await assert.doesNotReject(
    dependencyReviewRun(
      [dependencyResponse([]), dependencyResponse([])],
      [],
      [1, 1],
    ),
  );
  const defaultedFromApi = structuredClone(DEPENDENCY_CHANGES);
  const defaultedFromAction = structuredClone(DEPENDENCY_CHANGES);
  delete defaultedFromApi[0].vulnerabilities[0].severity;
  defaultedFromAction[0].vulnerabilities[0].severity = "low";
  await assert.doesNotReject(
    dependencyReviewRun(
      [
        dependencyResponse(defaultedFromApi),
        dependencyResponse(defaultedFromApi),
      ],
      defaultedFromAction,
      [1, 1],
    ),
  );
});

test("dependency pagination accepts the live 2/18/2 response shape", async () => {
  const changes = Array.from({ length: 22 }, (_, index) =>
    dependencyChange("added", `example-package-${index}`, "1.0.0"),
  );
  const comparisonUrl = `https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5`;
  const firstLink = `<${comparisonUrl}&page=2>; rel="next", <${comparisonUrl}&page=3>; rel="last"`;
  const middleLink = `<${comparisonUrl}&page=1>; rel="first", <${comparisonUrl}&page=1>; rel="prev", <${comparisonUrl}&page=3>; rel="next", <${comparisonUrl}&page=3>; rel="last"`;
  const pages = [changes.slice(0, 2), changes.slice(2, 20), changes.slice(20)];
  await assert.doesNotReject(
    dependencyReviewRun(
      [...pages, ...pages].map((page, index) =>
        dependencyResponse(page, {
          link:
            index % pages.length === 0
              ? firstLink
              : index % pages.length === 1
                ? middleLink
                : undefined,
        }),
      ),
      [...changes].reverse(),
      [1, 2, 3, 1, 2, 3],
    ),
  );
});

test("dependency comparison rejects total change overflow", async () => {
  const overflow = Array.from(
    { length: MAX_DEPENDENCY_CHANGES + 1 },
    () => DEPENDENCY_CHANGES[0],
  );
  await assert.rejects(
    dependencyReviewRun([dependencyResponse(overflow)], []),
    /dependency comparison exceeded the reviewed total change limit/,
  );
});

test("dependency review action output rejects total change overflow", async () => {
  const overflow = Array.from(
    { length: MAX_DEPENDENCY_CHANGES + 1 },
    () => DEPENDENCY_CHANGES[0],
  );
  await assert.rejects(
    dependencyReviewRun([], overflow),
    /dependency review action output exceeded the reviewed total change limit/,
  );
});

test("dependency snapshot warnings, drift and malformed output fail closed", async () => {
  const next = `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2>; rel="next"`;
  const cleanReads = () => [
    dependencyResponse(DEPENDENCY_CHANGES),
    dependencyResponse(DEPENDENCY_CHANGES),
  ];
  for (const run of [
    () =>
      dependencyReviewRun([
        dependencyResponse([], { warning: "c25hcHNob3Qgd2FybmluZw==" }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], { link: next }),
        dependencyResponse([], { warning: "c25hcHNob3Qgd2FybmluZw==" }),
      ]),
    () =>
      dependencyReviewRun([dependencyResponse([], { includeWarning: false })]),
    () => dependencyReviewRun([dependencyResponse([], { status: 500 })]),
    () => dependencyReviewRun([dependencyResponse({}, { link: undefined })]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=3>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://example.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repos/another/repository/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], { link: "not-a-pagination-link" }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=9>; rel="last"`,
        }),
      ]),
    () => dependencyReviewRun(cleanReads(), [DEPENDENCY_CHANGES[0]]),
    () =>
      dependencyReviewRun(cleanReads(), [
        ...DEPENDENCY_CHANGES,
        DEPENDENCY_CHANGES[0],
      ]),
    () => dependencyReviewRun(cleanReads(), "{"),
    () => dependencyReviewRun(cleanReads(), ""),
    () => {
      const invalid = structuredClone(DEPENDENCY_CHANGES);
      invalid[0].vulnerabilities[0].severity = null;
      return dependencyReviewRun(cleanReads(), invalid);
    },
    () => {
      const invalid = structuredClone(DEPENDENCY_CHANGES);
      invalid[0].vulnerabilities = null;
      return dependencyReviewRun(cleanReads(), invalid);
    },
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `garbage, <https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=5&page=2&unexpected=1>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([DEPENDENCY_CHANGES[0]]),
        dependencyResponse([DEPENDENCY_CHANGES[1]]),
      ]),
  ]) {
    await assert.rejects(run());
  }
});

test("the merge-group carrier must match its pre-reviewed exact blob", () => {
  assert.throws(() =>
    assertCandidateTree(
      mutateHead((entries) => {
        entries.find(
          (entry) => entry.path === ".github/workflows/dependency-review.yml",
        ).sha = "f".repeat(40);
      }),
    ),
  );
});

test("carrier rollout OIDs are derived from their exact reviewed templates", () => {
  assert.equal(
    LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(
      ".github/workflows/dependency-review.yml",
    ).afterOid,
    FINAL_DEPENDENCY_REVIEW_OID,
  );
  assert.equal(
    LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(
      ".github/workflows/native-auto-merge.yml",
    ).afterOid,
    FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  );
  assert.equal(
    gitBlobOid(Buffer.from(FINAL_TRUSTED_DEPENDENCY_REVIEW, "utf8")),
    FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  );
});

test("new workflows and local actions cannot expand the executable inventory", () => {
  for (const path of [
    ".github/workflows/merge.yml",
    ".github/workflows/merge.YAML",
    "action.yml",
    "ops/action.yaml",
  ]) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => entries.push(blob(path, "f".repeat(40)))),
      ),
    );
  }
});

test("new policy configuration files cannot shadow the reviewed config", () => {
  for (const path of [
    ".editorconfig",
    "nested/.GITATTRIBUTES",
    ".prettierrc",
    "astrologo-frontend/.postcssrc.cjs",
    "astrologo-frontend/postcss.config.mjs",
    "prettier.config.mjs",
    "astrologo-frontend/vitest.config.ts",
    "astrologo-frontend/wrangler.toml",
  ]) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => entries.push(blob(path, "f".repeat(40)))),
      ),
    );
  }
});

test("retired files cannot be restored outside the workflow inventory", () => {
  for (const path of [
    ".github/scripts/native-auto-merge-workflows.regression.mjs",
    ".github/scripts/dependency-review-workflow.regression.mjs",
  ]) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => entries.push(blob(path, "f".repeat(40)))),
      ),
    );
  }
});

test("truncated trees, unsafe paths, symlinks and submodules fail closed", () => {
  const truncated = fixtures();
  truncated.headTree.truncated = true;
  assert.throws(() => assertCandidateTree(truncated));

  assert.throws(() =>
    assertCandidateTree(
      mutateHead((entries) => {
        entries.find(
          (entry) => entry.path === ".github/workflows/dependency-review.yml",
        ).path += "\nignored.yml";
      }),
    ),
  );

  for (const mode of ["120000", "160000"]) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => {
          entries.find(
            (entry) => entry.path === ".github/workflows/dependency-review.yml",
          ).mode = mode;
        }),
      ),
    );
  }

  for (const [mode, type] of [
    ["120000", "blob"],
    ["160000", "commit"],
  ]) {
    for (const treeName of ["baseTree", "headTree"]) {
      const candidate = fixtures();
      candidate[treeName].tree.push({
        path: `arbitrary-${mode}`,
        mode,
        type,
        sha: "f".repeat(40),
      });
      assert.throws(() => assertCandidateTree(candidate));
    }
  }

  for (const [mode, type] of [
    ["100644", "tree"],
    ["160000", "tree"],
    ["040000", "blob"],
  ]) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => {
          entries.push({
            path: "nested",
            mode,
            type,
            sha: "f".repeat(40),
          });
        }),
      ),
    );
  }
});

test("a signed direct root-only commit can rotate the trusted root", () => {
  const rotation = validRotation();
  const { expected } = expectedPullRequest();
  assert.doesNotThrow(() =>
    assertTrustedRootRotation({
      ...rotation,
      expected,
      expectedHeadTreeSha: SHA.headTree,
    }),
  );
  assert.doesNotThrow(() =>
    assertCandidateTree({
      baseTree: rotation.baseTree,
      headTree: rotation.headTree,
      allowTrustedRootRotation: true,
    }),
  );

  const scannerOnly = validRotation();
  scannerOnly.headTree.tree.find(
    (entry) => entry.path === ".github/workflows/native-auto-merge.yml",
  ).sha = LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(
    ".github/workflows/native-auto-merge.yml",
  ).afterOid;
  assert.doesNotThrow(() =>
    assertTrustedRootRotation({
      ...scannerOnly,
      expected,
      expectedHeadTreeSha: SHA.headTree,
    }),
  );
});

test("trusted-root identity, provenance and intent mutations fail closed", () => {
  const { expected } = expectedPullRequest();
  const mutations = [
    (value) => (value.expected.headRepository = "attacker/fork"),
    (value) => (value.commit.sha = "f".repeat(40)),
    (value) => (value.commit.commit.tree.sha = "f".repeat(40)),
    (value) => (value.commit.parents = []),
    (value) => value.commit.parents.push({ sha: "f".repeat(40) }),
    (value) => (value.commit.parents[0].sha = "f".repeat(40)),
    (value) => (value.commit.author.login = "attacker"),
    (value) => (value.commit.committer.login = "web-flow"),
    (value) => (value.commit.author.id = 1),
    (value) => (value.commit.committer.node_id = "U_attacker"),
    (value) => (value.commit.author.type = "Bot"),
    (value) => (value.commit.commit.author.name = "Attacker"),
    (value) => (value.commit.commit.committer.email = "attacker@example.com"),
    (value) => (value.commit.commit.verification.verified = false),
    (value) => (value.commit.commit.verification.reason = "unsigned"),
    (value) => (value.commit.commit.verification.signature = ""),
    (value) => (value.commit.commit.verification.payload = ""),
    (value) => (value.commit.commit.verification.verified_at = "not-a-date"),
    (value) => (value.commit.commit.message = "chore: rotate without intent"),
  ];
  for (const mutate of mutations) {
    const rotation = validRotation();
    const value = { ...rotation, expected: structuredClone(expected) };
    mutate(value);
    assert.throws(() =>
      assertTrustedRootRotation({
        ...value,
        expectedHeadTreeSha: SHA.headTree,
      }),
    );
  }
});

test("trusted-root rotation changes scanner and test, with an optional carrier", () => {
  const { expected } = expectedPullRequest();
  const mutations = [
    (value) => {
      value.headTree = structuredClone(value.baseTree);
      value.headTree.sha = SHA.headTree;
    },
    (value) => {
      value.headTree.tree.find(
        (entry) =>
          entry.path === ".github/scripts/trusted-dependency-review.test.mjs",
      ).sha = SHA.trustedScannerTest;
    },
    (value) => {
      value.headTree.tree.find(
        (entry) =>
          entry.path === ".github/scripts/trusted-dependency-review.mjs",
      ).sha = SHA.trustedScanner;
    },
    (value) => value.headTree.tree.push(blob("README.md", "f".repeat(40))),
    (value) => {
      value.headTree.tree.find(
        (entry) =>
          entry.path === ".github/scripts/trusted-dependency-review.mjs",
      ).mode = "100755";
    },
    (value) => {
      const entry = value.headTree.tree.find(
        (candidate) =>
          candidate.path === ".github/workflows/native-auto-merge.yml",
      );
      entry.mode = "120000";
      entry.type = "blob";
    },
    (value) => {
      value.headTree.tree = value.headTree.tree.filter(
        (entry) =>
          entry.path !== ".github/scripts/trusted-dependency-review.mjs",
      );
    },
  ];
  for (const mutate of mutations) {
    const rotation = validRotation();
    mutate(rotation);
    assert.throws(() =>
      assertTrustedRootRotation({
        ...rotation,
        expected,
        expectedHeadTreeSha: SHA.headTree,
      }),
    );
  }
});

test("the pull request binding is checked before and after tree inspection", async () => {
  const { baseTree, headTree } = fixtures();
  const { expected, pull } = expectedPullRequest();
  const responses = normalApiResponses({ pull, baseTree, headTree });
  const paths = [];
  await verifyCandidate({
    expected,
    api: async (path) => {
      paths.push(path);
      const response = responses.shift();
      assert.notEqual(response, undefined, `unexpected API request ${path}`);
      return structuredClone(response);
    },
  });
  assert.deepEqual(paths, [
    "/repos/LCV-Ideas-Software/astrologo-app/pulls/291",
    "/repos/LCV-Ideas-Software/astrologo-app/git/ref/heads/main",
    `/repos/LCV-Ideas-Software/astrologo-app/git/commits/${SHA.base}`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/commits/${SHA.head}`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/trees/${SHA.baseTree}?recursive=1`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/trees/${SHA.headTree}?recursive=1`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/blobs/${ROOT_PACKAGE_BLOB.oid}`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/blobs/${ROOT_PACKAGE_BLOB.oid}`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/blobs/${FRONTEND_PACKAGE_BEFORE_BLOB.oid}`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/blobs/${FRONTEND_PACKAGE_AFTER_BLOB.oid}`,
    "/repos/LCV-Ideas-Software/astrologo-app/pulls/291",
    "/repos/LCV-Ideas-Software/astrologo-app/git/ref/heads/main",
  ]);
  assert.equal(responses.length, 0);
});

test("verifyCandidate always carries a supplied comparison through both lockfiles", async () => {
  const { expected, pull } = expectedPullRequest();
  const projectPaths = [
    "package.json",
    "package-lock.json",
    "astrologo-frontend/package.json",
    "astrologo-frontend/package-lock.json",
  ];
  const projectBytes = new Map(
    await Promise.all(
      projectPaths.map(async (path) => [
        path,
        await readFile(resolvePath(path)),
      ]),
    ),
  );
  const frontendPackageTransition = LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(
    "astrologo-frontend/package.json",
  );
  const checkedInFrontendPackageOid = gitBlobOid(
    projectBytes.get("astrologo-frontend/package.json"),
  );
  const { baseTree, headTree } =
    checkedInFrontendPackageOid === frontendPackageTransition.beforeOid
      ? preRolloutFixtures()
      : settledFixtures();
  const projectBlobs = new Map();
  const lockOids = new Set();
  for (const path of projectPaths) {
    const bytes = projectBytes.get(path);
    const oid = gitBlobOid(bytes);
    for (const tree of [baseTree, headTree]) {
      const entry = tree.tree.find((candidate) => candidate.path === path);
      if (entry === undefined) {
        tree.tree.push(blob(path, oid));
      } else {
        entry.sha = oid;
      }
    }
    projectBlobs.set(oid, {
      sha: oid,
      encoding: "base64",
      content: bytes.toString("base64"),
    });
    if (path.endsWith("package-lock.json")) lockOids.add(oid);
  }
  const lockRequests = [];
  await verifyCandidate({
    expected,
    comparison: [],
    fetchImplementation: async () =>
      assert.fail("stable lockfiles must not query the npm registry"),
    api: async (path) => {
      if (path.endsWith("/pulls/291")) return structuredClone(pull);
      if (path.endsWith("/git/ref/heads/main")) return mainRef();
      if (path.endsWith(`/git/commits/${SHA.base}`)) {
        return { sha: SHA.base, tree: { sha: SHA.baseTree } };
      }
      if (path.endsWith(`/git/commits/${SHA.head}`)) {
        return { sha: SHA.head, tree: { sha: SHA.headTree } };
      }
      if (path.endsWith(`/git/trees/${SHA.baseTree}?recursive=1`)) {
        return structuredClone(baseTree);
      }
      if (path.endsWith(`/git/trees/${SHA.headTree}?recursive=1`)) {
        return structuredClone(headTree);
      }
      const oid = path.split("/").at(-1);
      const projectResponse = projectBlobs.get(oid);
      assert.notEqual(
        projectResponse,
        undefined,
        `unexpected API request ${path}`,
      );
      if (lockOids.has(oid)) lockRequests.push(path);
      return structuredClone(projectResponse);
    },
  });
  assert.deepEqual(
    lockRequests.map((path) => path.split("/").at(-1)).sort(),
    [...lockOids, ...lockOids].sort(),
  );
});

test("github.sha must equal the live pull request base before inspection", async () => {
  const { expected, pull } = expectedPullRequest();
  pull.base.sha = "f".repeat(40);
  await assert.rejects(
    verifyCandidate({
      expected,
      api: async (path) => {
        assert.equal(path, "/repos/LCV-Ideas-Software/astrologo-app/pulls/291");
        return structuredClone(pull);
      },
    }),
    /github\.sha must equal the pull request base SHA/,
  );
});

test("a head race between the two pull request reads fails closed", async () => {
  const { baseTree, headTree } = fixtures();
  const { expected } = expectedPullRequest();
  let pullReads = 0;
  await assert.rejects(
    verifyCandidate({
      expected,
      api: async (path) => {
        if (path.endsWith("/pulls/291")) {
          pullReads += 1;
          return {
            number: 291,
            state: "open",
            base: {
              repo: { full_name: expected.targetRepository },
              ref: "main",
              sha: SHA.base,
            },
            head: {
              repo: { full_name: expected.headRepository },
              sha: pullReads === 1 ? SHA.head : "e".repeat(40),
            },
          };
        }
        if (path.endsWith("/git/ref/heads/main")) {
          return mainRef();
        }
        if (path.includes(`/git/commits/${SHA.base}`)) {
          return { sha: SHA.base, tree: { sha: SHA.baseTree } };
        }
        if (path.includes(`/git/commits/${SHA.head}`)) {
          return { sha: SHA.head, tree: { sha: SHA.headTree } };
        }
        const packageResponse = packageBlobResponse(path);
        if (packageResponse) {
          return packageResponse;
        }
        return path.includes(SHA.baseTree) ? baseTree : headTree;
      },
    }),
    /head SHA drifted/,
  );
});

test("tree response drift and a moving main ref fail closed", async () => {
  const { baseTree, headTree } = fixtures();
  const { expected, pull } = expectedPullRequest();

  const wrongTree = normalApiResponses({ pull, baseTree, headTree });
  wrongTree[4] = { ...baseTree, sha: "f".repeat(40) };
  await assert.rejects(
    verifyCandidate({
      expected,
      api: async () => structuredClone(wrongTree.shift()),
    }),
    /base tree response drifted/,
  );

  const movingMain = normalApiResponses({ pull, baseTree, headTree });
  movingMain[11] = mainRef("f".repeat(40));
  await assert.rejects(
    verifyCandidate({
      expected,
      api: async () => structuredClone(movingMain.shift()),
    }),
    /github\.sha must remain the current main commit/,
  );
});

test("root rotation is authorized end to end only through the signed REST commit", async () => {
  const rotation = validRotation();
  const { expected, pull } = expectedPullRequest();
  const responses = [
    pull,
    mainRef(),
    { sha: SHA.base, tree: { sha: SHA.baseTree } },
    { sha: SHA.head, tree: { sha: SHA.headTree } },
    rotation.baseTree,
    rotation.headTree,
    rotation.commit,
    ROOT_PACKAGE_BLOB.response,
    ROOT_PACKAGE_BLOB.response,
    FRONTEND_PACKAGE_AFTER_BLOB.response,
    FRONTEND_PACKAGE_AFTER_BLOB.response,
    pull,
    mainRef(),
  ];
  const paths = [];
  await verifyCandidate({
    expected,
    api: async (path) => {
      paths.push(path);
      return structuredClone(responses.shift());
    },
  });
  assert.equal(
    paths.includes(
      `/repos/LCV-Ideas-Software/astrologo-app/commits/${SHA.head}`,
    ),
    true,
  );

  const unsigned = validRotation();
  unsigned.commit.commit.verification.verified = false;
  const rejected = [
    pull,
    mainRef(),
    { sha: SHA.base, tree: { sha: SHA.baseTree } },
    { sha: SHA.head, tree: { sha: SHA.headTree } },
    unsigned.baseTree,
    unsigned.headTree,
    unsigned.commit,
  ];
  await assert.rejects(
    verifyCandidate({
      expected,
      api: async () => structuredClone(rejected.shift()),
    }),
  );
});

async function runMergeGroupRotation({ kind = "root", mutate } = {}) {
  const rotation =
    kind === "root" ? validRotation() : validControlPlaneRotation();
  const { expected: pullExpected, pull } = expectedPullRequest();
  const mergeGroupHeadSha = "0".repeat(40);
  const expected = {
    targetRepository: pullExpected.targetRepository,
    baseSha: pullExpected.baseSha,
    headRepository: pullExpected.targetRepository,
    headSha: mergeGroupHeadSha,
    mergeGroupRef: `refs/heads/gh-readonly-queue/main/pr-${pullExpected.pullNumber}-${pullExpected.baseSha}`,
  };
  const syntheticCommit = {
    sha: mergeGroupHeadSha,
    tree: { sha: SHA.headTree },
    parents: [{ sha: SHA.base }],
  };
  const actor = {
    login: "lcv-leo",
    id: 268063598,
    node_id: "U_kgDOD_pTbg",
    type: "User",
  };
  const webFlow = {
    login: "web-flow",
    id: 19864447,
    node_id: "MDQ6VXNlcjE5ODY0NDQ3",
    type: "User",
  };
  const syntheticRestCommit = {
    sha: mergeGroupHeadSha,
    parents: [{ sha: SHA.base }],
    author: actor,
    committer: webFlow,
    commit: {
      tree: { sha: SHA.headTree },
      verification: {
        verified: true,
        reason: "valid",
        signature:
          "-----BEGIN PGP SIGNATURE-----\nmerge queue\n-----END PGP SIGNATURE-----",
        payload: "tree candidate\nparent base\n",
        verified_at: "2026-08-13T12:05:00Z",
      },
    },
  };
  const scenario = {
    expected,
    pullBefore: structuredClone(pull),
    pullAfter: structuredClone(pull),
    mainBefore: mainRef(),
    mainAfter: mainRef(),
    rotation,
    syntheticCommit,
    syntheticRestCommit,
  };
  if (mutate !== undefined) mutate(scenario);
  const pulls = [scenario.pullBefore, scenario.pullAfter];
  const mains = [scenario.mainBefore, scenario.mainAfter];
  const paths = [];
  await verifyCandidate({
    expected: scenario.expected,
    api: async (path) => {
      paths.push(path);
      if (path.endsWith("/git/ref/heads/main")) {
        return structuredClone(mains.shift());
      }
      if (path.endsWith(`/git/commits/${SHA.base}`)) {
        return { sha: SHA.base, tree: { sha: SHA.baseTree } };
      }
      if (path.endsWith(`/git/commits/${mergeGroupHeadSha}`)) {
        return structuredClone(scenario.syntheticCommit);
      }
      if (path.endsWith(`/git/trees/${SHA.baseTree}?recursive=1`)) {
        return structuredClone(scenario.rotation.baseTree);
      }
      if (path.endsWith(`/git/trees/${SHA.headTree}?recursive=1`)) {
        return structuredClone(scenario.rotation.headTree);
      }
      if (path.endsWith(`/pulls/${pullExpected.pullNumber}`)) {
        return structuredClone(pulls.shift());
      }
      if (path.endsWith(`/commits/${pullExpected.headSha}`)) {
        return structuredClone(scenario.rotation.commit);
      }
      if (path.endsWith(`/commits/${mergeGroupHeadSha}`)) {
        return structuredClone(scenario.syntheticRestCommit);
      }
      const packageResponse = packageBlobResponse(path);
      assert.notEqual(
        packageResponse,
        undefined,
        `unexpected API request ${path}`,
      );
      return structuredClone(packageResponse);
    },
  });
  assert.equal(pulls.length, 0);
  assert.equal(mains.length, 0);
  return { paths, mergeGroupHeadSha };
}

test("signed trusted rotations remain admissible through their exact merge group", async () => {
  for (const kind of ["root", "control-plane"]) {
    const { paths, mergeGroupHeadSha } = await runMergeGroupRotation({ kind });
    assert.equal(
      paths.includes(
        `/repos/LCV-Ideas-Software/astrologo-app/commits/${mergeGroupHeadSha}`,
      ),
      true,
    );
  }
});

test("merge-group rotation provenance and race mutations fail closed", async () => {
  const mutations = [
    (value) => (value.expected.mergeGroupRef = "refs/heads/main"),
    (value) =>
      (value.expected.mergeGroupRef = `refs/heads/gh-readonly-queue/main/pr-291-${"f".repeat(40)}`),
    (value) => (value.pullBefore.state = "closed"),
    (value) => (value.pullBefore.base.sha = "f".repeat(40)),
    (value) => (value.pullBefore.head.repo.full_name = "attacker/fork"),
    (value) => (value.pullAfter.head.sha = "f".repeat(40)),
    (value) => (value.mainAfter.object.sha = "f".repeat(40)),
    (value) => (value.rotation.commit.parents = []),
    (value) => (value.rotation.commit.commit.verification.verified = false),
    (value) => (value.rotation.commit.commit.tree.sha = "f".repeat(40)),
    (value) => (value.syntheticCommit.parents = []),
    (value) => (value.syntheticRestCommit.parents[0].sha = "f".repeat(40)),
    (value) => (value.syntheticRestCommit.author.id = 1),
    (value) => (value.syntheticRestCommit.committer.login = "attacker"),
    (value) => (value.syntheticRestCommit.commit.verification.verified = false),
    (value) => (value.syntheticRestCommit.commit.tree.sha = "f".repeat(40)),
  ];
  for (const mutate of mutations) {
    await assert.rejects(runMergeGroupRotation({ mutate }));
  }
});

test("the trusted workflow never checks out or executes candidate content", async () => {
  const workflow = await readFile(
    new URL("../workflows/native-auto-merge.yml", import.meta.url),
    "utf8",
  );
  const finalWorkflow = FINAL_TRUSTED_DEPENDENCY_REVIEW;
  assert.equal(
    gitBlobOid(Buffer.from(finalWorkflow, "utf8")),
    FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  );
  const checkedInCarrierOid = gitBlobOid(Buffer.from(workflow, "utf8"));
  const carrierTransition = LEAST_PRIVILEGE_ROLLOUT_BY_PATH.get(
    ".github/workflows/native-auto-merge.yml",
  );
  assert.equal(
    [carrierTransition.beforeOid, carrierTransition.afterOid].includes(
      checkedInCarrierOid,
    ),
    true,
    "the checked-in trusted carrier must remain an exact reviewed BEFORE or AFTER blob",
  );
  assert.doesNotMatch(
    workflow,
    /--dependency-review-output[\s\S]*PULL_NUMBER:/,
  );
  assert.match(finalWorkflow, /pull_request_target:/);
  assert.doesNotMatch(finalWorkflow, /^\s+pull_request:|^\s+merge_group:/m);
  const finalCheckout = finalWorkflow.slice(
    finalWorkflow.indexOf("      - name: Check out the trusted base revision"),
    finalWorkflow.indexOf(
      "      - name: Inspect the candidate as immutable Git data",
    ),
  );
  assert.match(finalCheckout, /ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(
    finalCheckout,
    /allow-unsafe-pr-checkout|pull_request\.head/,
  );
  assert.match(
    finalWorkflow,
    /permissions:\n\s+contents: read # Read the trusted base and immutable Git objects\.\n\s+pull-requests: read # Re-read the bound pull request/,
  );
  assert.match(
    finalWorkflow,
    /pull_request_target: # zizmor: ignore\[dangerous-triggers\] Base-only scanner treats the candidate solely as immutable Git data\./,
  );
  assert.match(finalWorkflow, /\n\s+- edited\n/);
  assert.match(
    finalWorkflow,
    /group: trusted-dependency-review-\$\{\{ github\.repository \}\}-\$\{\{ github\.event\.pull_request\.number \}\}/,
  );
  assert.doesNotMatch(
    finalWorkflow.slice(
      finalWorkflow.indexOf("concurrency:"),
      finalWorkflow.indexOf("jobs:"),
    ),
    /head\.sha/,
  );
  assert.doesNotMatch(
    finalWorkflow,
    /environment:|secrets\.|actions\/cache|download-artifact/,
  );
  assert.match(
    finalWorkflow,
    /node \.github\/scripts\/trusted-dependency-review\.mjs/,
  );
  assert.match(
    finalWorkflow,
    /actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/,
  );
  assert.match(finalWorkflow, /base-ref: \$\{\{ github\.sha \}\}/);
  assert.match(
    finalWorkflow,
    /head-ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(
    finalWorkflow,
    /PULL_NUMBER: \$\{\{ github\.event\.pull_request\.number \}\}[\s\S]*HEAD_REPOSITORY: \$\{\{ github\.event\.pull_request\.head\.repo\.full_name \}\}[\s\S]*--dependency-review-output/,
  );
  const pullRequestContract = {
    checkoutName: "Check out the trusted base revision",
    inspectName: "Inspect the candidate as immutable Git data",
    reviewName: "Review pull request dependencies",
    baseExpression: "${{ github.sha }}",
    headExpression: "${{ github.event.pull_request.head.sha }}",
    permissionsBlock:
      "    permissions:\n      contents: read # Read the trusted base and immutable Git objects.\n      pull-requests: read # Re-read the bound pull request before and after Git tree inspection.",
    preamble: `name: Trusted Dependency Review

on:
  pull_request_target: # zizmor: ignore[dangerous-triggers] Base-only scanner treats the candidate solely as immutable Git data.
    branches:
      - main
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review
      - edited

permissions: {}

concurrency:
  group: trusted-dependency-review-\${{ github.repository }}-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
`,
  };
  const mergeGroupContract = {
    checkoutName: "Check out the trusted merge-group base",
    reviewName: "Review merge-group dependencies",
    baseExpression: "${{ github.event.merge_group.base_sha }}",
    headExpression: "${{ github.event.merge_group.head_sha }}",
    permissionsBlock: "    permissions:\n      contents: read",
    preamble: `name: Dependency Review
on:
  merge_group:
    types:
      - checks_requested

permissions: {}

concurrency:
  group: dependency-review-\${{ github.event.merge_group.head_sha }}
  cancel-in-progress: true

jobs:
`,
  };
  assertDependencyCarrierContract(finalWorkflow, pullRequestContract);
  assertDependencyCarrierMutations(finalWorkflow, pullRequestContract);
  assertDependencyCarrierContract(FINAL_DEPENDENCY_REVIEW, mergeGroupContract);
  assertDependencyCarrierMutations(FINAL_DEPENDENCY_REVIEW, mergeGroupContract);
});
