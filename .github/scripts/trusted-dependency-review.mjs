import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { constants as fileConstants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, sep as pathSeparator } from "node:path";
import { pathToFileURL } from "node:url";

const API_VERSION = "2022-11-28";
const SNAPSHOT_WARNINGS_HEADER = "x-github-dependency-graph-snapshot-warnings";
const DEPENDENCY_PAGE_SIZE = 5;
const MAX_DEPENDENCY_PAGES = 1_000;
const MAX_PACKAGE_JSON_BYTES = 128 * 1024;
const MAX_PACKAGE_LOCK_BYTES = 1024 * 1024;
const MAX_REGISTRY_METADATA_BYTES = 256 * 1024;
const MAX_REGISTRY_REQUESTS = 64;
const REGISTRY_REQUEST_TIMEOUT_MS = 10_000;
const REGISTRY_GLOBAL_TIMEOUT_MS = 60_000;
const MAX_GITHUB_EVENT_BYTES = 25 * 1024 * 1024;
const MAX_OPEN_PULL_REQUEST_PAGES = 10;
const NPM_REGISTRY_ORIGIN = "https://registry.npmjs.org";
const EXPECTED_TARGET_REPOSITORY = "LCV-Ideas-Software/astrologo-app";
const EXPECTED_TARGET_REPOSITORY_ID = 1_182_022_862;
const EXPECTED_BASE_REF = "main";
const PULL_REQUEST_TARGET_ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
  "edited",
]);
const TRUSTED_WORKFLOW = ".github/workflows/native-auto-merge.yml";
const TRUSTED_SCANNER = ".github/scripts/trusted-dependency-review.mjs";
const TRUSTED_SCANNER_TEST =
  ".github/scripts/trusted-dependency-review.test.mjs";
const TRUSTED_ROOT_PATHS = new Set([
  TRUSTED_WORKFLOW,
  TRUSTED_SCANNER,
  TRUSTED_SCANNER_TEST,
]);
const TRUSTED_SCANNER_ROOT_PATHS = new Set([
  TRUSTED_SCANNER,
  TRUSTED_SCANNER_TEST,
]);
const TRUSTED_ROOT_ROTATION_PATH_SETS = [
  [TRUSTED_SCANNER, TRUSTED_SCANNER_TEST].sort(),
  [...TRUSTED_ROOT_PATHS].sort(),
];
const TRUSTED_ROOT_OWNER = "lcv-leo";
const TRUSTED_ROOT_OWNER_ID = 268063598;
const TRUSTED_ROOT_OWNER_NODE_ID = "U_kgDOD_pTbg";
const MERGE_QUEUE_COMMITTER = "web-flow";
const MERGE_QUEUE_COMMITTER_ID = 19_864_447;
const MERGE_QUEUE_COMMITTER_NODE_ID = "MDQ6VXNlcjE5ODY0NDQ3";
const TRUSTED_ROOT_IDENTITY = {
  name: "LCV-Ideas-Software",
  email: "lcv@lcv.dev",
};
const TRUSTED_ROOT_ROTATION_TRAILER =
  "Trusted-Dependency-Review-Root-Rotation: astrologo-app/v1";
const TRUSTED_CONTROL_PLANE_ROTATION_TRAILER =
  "Trusted-Control-Plane-Rotation: astrologo-app/v1";
const TRUSTED_CONTROL_PLANE_PATHS = [
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
];
const TRUSTED_CONTROL_PLANE_PATH_SET = new Set(TRUSTED_CONTROL_PLANE_PATHS);
const TRUSTED_CONTROL_PLANE_ALIASES = new Set([
  ".github/codeowners",
  "codeowners",
  "docs/codeowners",
  ".github/dependabot.yml",
  ".github/dependabot.yaml",
]);

const EXPECTED_OPERATIONAL_PATHS_BEFORE = [
  ".github/workflows/auto-release.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/format-public.yml",
  ".github/workflows/native-auto-merge.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/scorecard.yml",
  ".github/workflows/zizmor.yml",
].sort();
const EXPECTED_OPERATIONAL_PATHS_AFTER =
  EXPECTED_OPERATIONAL_PATHS_BEFORE.filter(
    (path) => path !== ".github/workflows/format-public.yml",
  );

const REMOVED_PATHS = new Set([
  ".github/scripts/native-auto-merge-workflows.regression.mjs",
  ".github/scripts/dependency-review-workflow.regression.mjs",
]);

const LEAST_PRIVILEGE_ROLLOUT = [
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
    "634374ca88f3dcad7079b5d439adbf7b67e26efa",
  ],
  [
    TRUSTED_WORKFLOW,
    "d92de828539ecf6f8fa677db1ef13047aa56dff0",
    "3d7f90c43a01264b630befc169fdb76c3dd728a9",
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
    "949fbdd1794f812729500b5f4fcb849cfb3d7266",
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
    "45d6d0b21cc896ba3c25a36790bcff3f36bf17ad",
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
].map(([path, beforeOid, afterOid]) => ({ path, beforeOid, afterOid }));
const UNCHANGED_POLICY_BLOBS = new Set([
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
  "astrologo-frontend/scripts/check-tracked-executables.mjs",
  "astrologo-frontend/scripts/prepare-swiss-wasm.mjs",
  "astrologo-frontend/tsconfig.app.json",
  "astrologo-frontend/tsconfig.functions.json",
  "astrologo-frontend/tsconfig.json",
  "astrologo-frontend/tsconfig.node.json",
  "astrologo-frontend/vite.config.ts",
  "astrologo-frontend/wrangler.json",
]);

const REVIEWED_PACKAGE_PATHS = [
  "package.json",
  "astrologo-frontend/package.json",
];
const REVIEWED_NPM_PROJECTS = [
  { manifest: "package-lock.json", packagePath: "package.json" },
  {
    manifest: "astrologo-frontend/package-lock.json",
    packagePath: "astrologo-frontend/package.json",
  },
];
const REVIEWED_PACKAGE_EMBEDDED_CONFIG_KEYS = [
  "biome",
  "eslintConfig",
  "postcss",
  "prettier",
  "ts-node",
  "vitest",
];
const CONFIG_PATH_PATTERNS = [
  /(?:^|\/)(?:\.editorconfig|\.gitattributes|\.npmrc|\.postcssrc(?:\.[^/]*)?|\.prettierignore|\.prettierrc(?:\.[^/]*)?|biome\.jsonc?|eslint\.config\.[^/]+|npm-shrinkwrap\.json|postcss\.config\.[^/]+|prettier\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|vite\.config\.[^/]+|vitest\.config\.[^/]+|vitest\.workspace\.[^/]+|wrangler\.(?:jsonc?|toml))$/i,
];

function isPolicyConfigPath(path) {
  return CONFIG_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

const FINAL_DEPENDENCY_REVIEW = `name: Dependency Review
on:
  merge_group:
    types:
      - checks_requested

permissions: {}

concurrency:
  group: dependency-review-\${{ github.event.merge_group.head_sha }}
  cancel-in-progress: true

jobs:
  dependency_review:
    name: Dependency Review
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Check out the trusted merge-group base
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: \${{ github.event.merge_group.base_sha }}
          persist-credentials: false
          fetch-depth: 1

      - name: Review merge-group dependencies
        id: dependency-review
        uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
        with:
          base-ref: \${{ github.event.merge_group.base_sha }}
          head-ref: \${{ github.event.merge_group.head_sha }}
          fail-on-severity: low
          fail-on-scopes: runtime, development, unknown
          retry-on-snapshot-warnings: true
          retry-on-snapshot-warnings-timeout: 3600

      - name: Require a complete stable dependency comparison
        env:
          GITHUB_TOKEN: \${{ github.token }}
          TARGET_REPOSITORY: \${{ github.repository }}
          BASE_SHA: \${{ github.event.merge_group.base_sha }}
          HEAD_SHA: \${{ github.event.merge_group.head_sha }}
          DEPENDENCY_CHANGES: \${{ steps.dependency-review.outputs.dependency-changes }}
        run: >-
          node .github/scripts/trusted-dependency-review.mjs
          --dependency-review-output
`;

const FINAL_TRUSTED_DEPENDENCY_REVIEW = `name: Trusted Dependency Review

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
  dependency_review:
    name: Dependency Review
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read # Read the trusted base and immutable Git objects.
      pull-requests: read # Re-read the bound pull request before and after Git tree inspection.
    steps:
      - name: Check out the trusted base revision
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
          fetch-depth: 1

      - name: Inspect the candidate as immutable Git data
        env:
          GITHUB_TOKEN: \${{ github.token }}
          TARGET_REPOSITORY: \${{ github.repository }}
          PULL_NUMBER: \${{ github.event.pull_request.number }}
          BASE_SHA: \${{ github.sha }}
          HEAD_REPOSITORY: \${{ github.event.pull_request.head.repo.full_name }}
          HEAD_SHA: \${{ github.event.pull_request.head.sha }}
        run: node .github/scripts/trusted-dependency-review.mjs

      - name: Review pull request dependencies
        id: dependency-review
        uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
        with:
          base-ref: \${{ github.sha }}
          head-ref: \${{ github.event.pull_request.head.sha }}
          fail-on-severity: low
          fail-on-scopes: runtime, development, unknown
          retry-on-snapshot-warnings: true
          retry-on-snapshot-warnings-timeout: 3600

      - name: Require a complete stable dependency comparison
        env:
          GITHUB_TOKEN: \${{ github.token }}
          TARGET_REPOSITORY: \${{ github.repository }}
          PULL_NUMBER: \${{ github.event.pull_request.number }}
          BASE_SHA: \${{ github.sha }}
          HEAD_REPOSITORY: \${{ github.event.pull_request.head.repo.full_name }}
          HEAD_SHA: \${{ github.event.pull_request.head.sha }}
          DEPENDENCY_CHANGES: \${{ steps.dependency-review.outputs.dependency-changes }}
        run: >-
          node .github/scripts/trusted-dependency-review.mjs
          --dependency-review-output
`;

const FINAL_DEPENDENCY_REVIEW_OID = gitBlobOid(
  Buffer.from(FINAL_DEPENDENCY_REVIEW, "utf8"),
);
const FINAL_TRUSTED_DEPENDENCY_REVIEW_OID = gitBlobOid(
  Buffer.from(FINAL_TRUSTED_DEPENDENCY_REVIEW, "utf8"),
);
assert.equal(
  LEAST_PRIVILEGE_ROLLOUT.find(
    ({ path }) => path === ".github/workflows/dependency-review.yml",
  )?.afterOid,
  FINAL_DEPENDENCY_REVIEW_OID,
  "reviewed dependency carrier bytes must match the authorized AFTER blob",
);
assert.equal(
  LEAST_PRIVILEGE_ROLLOUT.find(({ path }) => path === TRUSTED_WORKFLOW)
    ?.afterOid,
  FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  "reviewed trusted carrier bytes must match the authorized AFTER blob",
);

function requiredEnvironment(name, pattern, environment = process.env) {
  const value = environment[name];
  assert.notEqual(value, undefined, `${name} must be set`);
  assert.match(value, pattern, `${name} has an invalid format`);
  return value;
}

function gitBlobOid(contents) {
  assert.equal(Buffer.isBuffer(contents), true, "Git blob input must be bytes");
  const oid = execFileSync("git", ["hash-object", "--stdin"], {
    encoding: "utf8",
    input: contents,
    maxBuffer: 1024,
    windowsHide: true,
  }).trim();
  assert.match(
    oid,
    /^[0-9a-f]{40}$/,
    "git hash-object returned an invalid OID",
  );
  return oid;
}

function isOperationalYaml(path) {
  const lower = path.toLowerCase();
  return (
    (lower.startsWith(".github/workflows/") &&
      (lower.endsWith(".yml") || lower.endsWith(".yaml"))) ||
    lower === "action.yml" ||
    lower === "action.yaml" ||
    lower.endsWith("/action.yml") ||
    lower.endsWith("/action.yaml")
  );
}

function exactTreeEntries(tree, label) {
  assert.equal(tree.truncated, false, `${label} tree must not be truncated`);
  assert.ok(Array.isArray(tree.tree), `${label} tree entries must be present`);
  const entries = new Map();
  for (const entry of tree.tree) {
    assert.equal(typeof entry.path, "string", `${label} path must be text`);
    assert.doesNotMatch(entry.path, /[\0\r\n]/, `${label} path is unsafe`);
    assert.match(
      entry.sha ?? "",
      /^[0-9a-f]{40}$/,
      `${label} entry must have a Git object OID`,
    );
    assert.match(
      entry.mode ?? "",
      /^(?:040000|100644|100755)$/,
      `${label} entry must have a reviewed Git mode`,
    );
    assert.match(
      entry.type ?? "",
      /^(?:blob|tree)$/,
      `${label} entry must have a reviewed Git object type`,
    );
    assert.equal(
      (entry.type === "tree" && entry.mode === "040000") ||
        (entry.type === "blob" && ["100644", "100755"].includes(entry.mode)),
      true,
      `${label} entry must have a coherent Git mode and object type`,
    );
    assert.equal(
      entries.has(entry.path),
      false,
      `${label} paths must be unique`,
    );
    entries.set(entry.path, {
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
    });
  }
  return entries;
}

function regularBlob(entries, path, label) {
  const entry = entries.get(path);
  assert.notEqual(entry, undefined, `${label} must contain ${path}`);
  assert.deepEqual(
    { mode: entry.mode, type: entry.type },
    { mode: "100644", type: "blob" },
    `${path} must remain a regular Git blob`,
  );
  assert.match(entry.sha, /^[0-9a-f]{40}$/, `${path} must have a Git blob OID`);
  return entry;
}

function changedLeafPaths(base, head) {
  const paths = new Set([...base.keys(), ...head.keys()]);
  return [...paths]
    .filter((path) => {
      const trusted = base.get(path);
      const candidate = head.get(path);
      if (trusted?.type === "tree" && candidate?.type === "tree") {
        return false;
      }
      return (
        trusted?.mode !== candidate?.mode ||
        trusted?.type !== candidate?.type ||
        trusted?.sha !== candidate?.sha
      );
    })
    .sort();
}

function trustedRootChanged(base, head) {
  return [...TRUSTED_SCANNER_ROOT_PATHS].some(
    (path) => base.get(path)?.sha !== head.get(path)?.sha,
  );
}

function hasTrustedRootChange(baseTree, headTree) {
  return trustedRootChanged(
    exactTreeEntries(baseTree, "base"),
    exactTreeEntries(headTree, "candidate"),
  );
}

function isTrustedControlPlaneSlot(path) {
  return TRUSTED_CONTROL_PLANE_ALIASES.has(path.toLowerCase());
}

function assertTrustedControlPlaneInventory(entries, label) {
  const paths = [...entries.keys()].filter(isTrustedControlPlaneSlot).sort();
  assert.deepEqual(
    paths,
    TRUSTED_CONTROL_PLANE_PATHS,
    `${label} trusted control-plane inventory must remain canonical`,
  );
  for (const path of TRUSTED_CONTROL_PLANE_PATHS) {
    regularBlob(entries, path, label);
  }
}

function trustedControlPlaneChanged(base, head) {
  return TRUSTED_CONTROL_PLANE_PATHS.some(
    (path) => base.get(path)?.sha !== head.get(path)?.sha,
  );
}

function hasTrustedControlPlaneChange(baseTree, headTree) {
  return trustedControlPlaneChanged(
    exactTreeEntries(baseTree, "base"),
    exactTreeEntries(headTree, "candidate"),
  );
}

function rolloutBlobOid(entries, path, label) {
  if (!entries.has(path)) return null;
  return regularBlob(entries, path, label).sha;
}

/**
 * Enforce one complete, immutable BEFORE -> AFTER rollout as a single phase.
 * The caller must supply the full reviewed map with exact Git blob OIDs only
 * after every AFTER artifact is frozen; null represents a reviewed absence.
 */
export function assertAtomicBlobRollout({
  baseTree,
  headTree,
  transitions,
  settledMutablePaths = [],
}) {
  assert.equal(
    Array.isArray(transitions),
    true,
    "rollout transitions must exist",
  );
  assert.notEqual(
    transitions.length,
    0,
    "rollout transitions must not be empty",
  );

  const base = exactTreeEntries(baseTree, "rollout base");
  const head = exactTreeEntries(headTree, "rollout candidate");
  const paths = new Set();
  const phases = new Map();
  const mutablePaths = new Set(settledMutablePaths);

  for (const transition of transitions) {
    assert.equal(
      transition !== null &&
        typeof transition === "object" &&
        !Array.isArray(transition),
      true,
      "each rollout transition must be an object",
    );
    assert.deepEqual(
      Object.keys(transition).sort(),
      ["afterOid", "beforeOid", "path"],
      "rollout transition fields must remain exact",
    );
    assert.match(
      transition.path,
      /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\\\0\r\n]+$/,
      "rollout path is unsafe",
    );
    assert.equal(
      paths.has(transition.path),
      false,
      "rollout paths must be unique",
    );
    paths.add(transition.path);

    for (const [name, oid] of [
      ["beforeOid", transition.beforeOid],
      ["afterOid", transition.afterOid],
    ]) {
      assert.equal(
        oid === null || (typeof oid === "string" && /^[0-9a-f]{40}$/.test(oid)),
        true,
        `${transition.path} ${name} must be an exact Git blob OID or null`,
      );
    }
    assert.notEqual(
      transition.beforeOid,
      transition.afterOid,
      `${transition.path} rollout must change state`,
    );

    const baseOid = rolloutBlobOid(base, transition.path, "rollout base");
    const headOid = rolloutBlobOid(head, transition.path, "rollout candidate");
    if (baseOid === transition.beforeOid && headOid === transition.beforeOid) {
      phases.set(transition.path, "before");
    } else if (
      baseOid === transition.beforeOid &&
      headOid === transition.afterOid
    ) {
      phases.set(transition.path, "transition");
    } else if (
      baseOid === transition.afterOid &&
      headOid === transition.afterOid
    ) {
      phases.set(transition.path, "after");
    } else {
      if (
        mutablePaths.has(transition.path) &&
        baseOid !== null &&
        headOid !== null
      ) {
        phases.set(transition.path, "settled-mutable");
        continue;
      }
      assert.fail(
        `${transition.path} must remain BEFORE, advance BEFORE -> AFTER, or remain AFTER`,
      );
    }
  }

  assert.equal(
    [...mutablePaths].every((path) => paths.has(path)),
    true,
    "settled mutable paths must belong to the reviewed rollout",
  );
  const immutablePhases = [...phases.entries()]
    .filter(([path]) => !mutablePaths.has(path))
    .map(([, phase]) => phase);
  assert.notEqual(
    immutablePhases.length,
    0,
    "rollout must retain at least one immutable reviewed path",
  );
  assert.equal(
    new Set(immutablePhases).size,
    1,
    "reviewed rollout paths must advance atomically in one phase",
  );
  const phase = immutablePhases[0];
  for (const path of mutablePaths) {
    const mutablePhase = phases.get(path);
    const transition = transitions.find((candidate) => candidate.path === path);
    if (phase === "after") {
      assert.notEqual(
        rolloutBlobOid(base, path, "rollout base"),
        transition.beforeOid,
        `${path} must not downgrade to its pre-rollout blob`,
      );
      assert.notEqual(
        rolloutBlobOid(head, path, "rollout candidate"),
        transition.beforeOid,
        `${path} must not downgrade to its pre-rollout blob`,
      );
    }
    assert.equal(
      phase === "after" || mutablePhase === phase,
      true,
      `${path} must participate in the atomic rollout before the settled phase`,
    );
  }
  if (phase === "transition") {
    assert.deepEqual(
      changedLeafPaths(base, head),
      [...paths].sort(),
      "least-privilege rollout changed-path set must be exact",
    );
  }
  return phase;
}

async function readJsonBlob({
  api,
  repository,
  entry,
  path,
  label,
  maximumBytes = MAX_PACKAGE_JSON_BYTES,
}) {
  const response = await api(`/repos/${repository}/git/blobs/${entry.sha}`);
  assert.equal(response.sha, entry.sha, `${label} ${path} blob lookup drifted`);
  assert.equal(response.encoding, "base64", `${label} ${path} must be base64`);
  assert.equal(
    typeof response.content,
    "string",
    `${label} ${path} is missing`,
  );
  const contents = Buffer.from(response.content.replaceAll("\n", ""), "base64");
  assert.equal(
    contents.length <= maximumBytes,
    true,
    `${label} ${path} is too large`,
  );
  assert.equal(
    gitBlobOid(contents),
    entry.sha,
    `${label} ${path} blob OID drifted`,
  );
  return { json: JSON.parse(contents.toString("utf8")), bytes: contents };
}

export async function assertReviewedPackageScripts({
  api,
  expected,
  baseTree,
  headTree,
}) {
  const base = exactTreeEntries(baseTree, "base");
  const head = exactTreeEntries(headTree, "candidate");
  for (const path of REVIEWED_PACKAGE_PATHS) {
    const baseEntry = regularBlob(base, path, "base");
    const headEntry = regularBlob(head, path, "candidate");
    const [basePackageBlob, headPackageBlob] = await Promise.all([
      readJsonBlob({
        api,
        repository: expected.targetRepository,
        entry: baseEntry,
        path,
        label: "base",
      }),
      readJsonBlob({
        api,
        repository: expected.headRepository,
        entry: headEntry,
        path,
        label: "candidate",
      }),
    ]);
    const basePackage = basePackageBlob.json;
    const headPackage = headPackageBlob.json;
    assert.deepEqual(
      headPackage.scripts,
      basePackage.scripts,
      `${path} scripts must match the trusted base exactly`,
    );
    for (const key of REVIEWED_PACKAGE_EMBEDDED_CONFIG_KEYS) {
      assert.deepEqual(
        headPackage[key],
        basePackage[key],
        `${path} embedded ${key} configuration must match the trusted base`,
      );
    }
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactObjectKeys(value, allowed, label) {
  assert.equal(isPlainObject(value), true, `${label} must be an object`);
  assert.equal(
    Object.keys(value).every((key) => allowed.has(key)),
    true,
    `${label} has unexpected fields`,
  );
}

const NPM_PACKAGE_NAME_SOURCE =
  "(?:@[a-z0-9][a-z0-9._~-]*/)?[a-z0-9][a-z0-9._~-]*";
const NPM_INSTALL_PATH = new RegExp(
  `^node_modules/${NPM_PACKAGE_NAME_SOURCE}(?:/node_modules/${NPM_PACKAGE_NAME_SOURCE})*$`,
);
const NPM_PACKAGE_NAME = new RegExp(`^${NPM_PACKAGE_NAME_SOURCE}$`);

function npmPackageNameFromPath(path) {
  assert.match(
    path,
    NPM_INSTALL_PATH,
    `${path} must be an exact npm installation path`,
  );
  const match = path.match(
    /(?:^|\/)node_modules\/((?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*)$/,
  );
  assert.notEqual(match, null, `${path} must identify an npm package`);
  assert.match(match[1], NPM_PACKAGE_NAME);
  return match[1];
}

function assertCanonicalIntegrity(value, label) {
  assert.match(
    value ?? "",
    /^sha512-[A-Za-z0-9+/]+={0,2}$/,
    `${label} must use sha512 SRI`,
  );
  const encoded = value.slice("sha512-".length);
  const digest = Buffer.from(encoded, "base64");
  assert.equal(digest.length, 64, `${label} sha512 digest must be 64 bytes`);
  assert.equal(
    digest.toString("base64"),
    encoded,
    `${label} SRI must be canonical base64`,
  );
}

function canonicalRegistryTarball(name, version) {
  const basename = name.includes("/") ? name.split("/")[1] : name;
  return `${NPM_REGISTRY_ORIGIN}/${name}/-/${basename}-${version}.tgz`;
}

function canonicalDescriptor(descriptor) {
  if (Array.isArray(descriptor)) {
    return `[${descriptor.map(canonicalDescriptor).join(",")}]`;
  }
  if (isPlainObject(descriptor)) {
    return `{${Object.keys(descriptor)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalDescriptor(descriptor[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(descriptor);
}

const LOCK_DESCRIPTOR_KEYS = new Set([
  "bin",
  "bundleDependencies",
  "cpu",
  "dependencies",
  "dev",
  "devOptional",
  "engines",
  "funding",
  "hasInstallScript",
  "hasShrinkwrap",
  "inBundle",
  "integrity",
  "libc",
  "license",
  "optional",
  "optionalDependencies",
  "os",
  "peer",
  "peerDependencies",
  "peerDependenciesMeta",
  "resolved",
  "version",
  "workspaces",
]);

function assertRootLockDescriptor(lock, packageJson, label) {
  const root = lock.packages[""];
  assert.equal(isPlainObject(root), true, `${label} root package must exist`);
  const projection = {};
  for (const key of [
    "name",
    "version",
    "license",
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "engines",
    "workspaces",
  ]) {
    if (packageJson[key] !== undefined) projection[key] = packageJson[key];
  }
  assert.deepEqual(
    root,
    projection,
    `${label} root package must match package.json`,
  );
  if (packageJson.name !== undefined) assert.equal(lock.name, packageJson.name);
  if (packageJson.version !== undefined)
    assert.equal(lock.version, packageJson.version);
}

function packageEntries(lock, label) {
  assertExactObjectKeys(
    lock,
    new Set(["name", "version", "lockfileVersion", "requires", "packages"]),
    label,
  );
  assert.equal(lock.lockfileVersion, 3, `${label} must use lockfileVersion 3`);
  assert.equal(
    lock.requires,
    true,
    `${label} must require dependency metadata`,
  );
  assert.equal(
    isPlainObject(lock.packages),
    true,
    `${label} packages must be an object`,
  );
  const identities = new Map();
  const byPath = new Map();
  for (const [path, descriptor] of Object.entries(lock.packages)) {
    assert.equal(typeof path, "string");
    assert.doesNotMatch(path, /[\\\0\r\n]/, `${label} package path is unsafe`);
    if (path === "") continue;
    assertExactObjectKeys(descriptor, LOCK_DESCRIPTOR_KEYS, `${label}:${path}`);
    assert.equal(
      descriptor.link,
      undefined,
      `${label}:${path} links are forbidden`,
    );
    for (const key of [
      "dev",
      "devOptional",
      "hasInstallScript",
      "hasShrinkwrap",
      "inBundle",
      "optional",
      "peer",
    ]) {
      assert.equal(
        descriptor[key] === undefined || descriptor[key] === true,
        true,
        `${label}:${path} ${key} must be true or absent`,
      );
    }
    const name = npmPackageNameFromPath(path);
    const parentMarker = path.lastIndexOf("/node_modules/");
    if (parentMarker > 0) {
      const parentPath = path.slice(0, parentMarker);
      assert.equal(
        isPlainObject(lock.packages[parentPath]),
        true,
        `${label}:${path} installed parent must exist`,
      );
    }
    assert.match(
      descriptor.version ?? "",
      /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
      `${label}:${path} version must be exact SemVer`,
    );
    if (descriptor.inBundle === true) {
      assert.equal(
        descriptor.resolved,
        undefined,
        `${label}:${path} bundled source must be inherited`,
      );
      assert.equal(
        descriptor.integrity,
        undefined,
        `${label}:${path} bundled integrity must be inherited`,
      );
      const marker = "/node_modules/";
      const parentEnd = path.lastIndexOf(marker);
      assert.equal(
        parentEnd > 0,
        true,
        `${label}:${path} bundled package needs a parent`,
      );
      const parentPath = path.slice(0, parentEnd);
      const parent = lock.packages[parentPath];
      assert.equal(
        isPlainObject(parent),
        true,
        `${label}:${path} bundled parent must exist`,
      );
      assert.equal(
        Array.isArray(parent.bundleDependencies),
        true,
        `${label}:${path} bundled parent must list dependencies`,
      );
      assert.equal(
        parent.bundleDependencies.includes(name),
        true,
        `${label}:${path} must be authorized by its bundled parent`,
      );
      assert.equal(
        typeof parent.resolved,
        "string",
        `${label}:${path} bundled parent source is missing`,
      );
      assertCanonicalIntegrity(
        parent.integrity,
        `${label}:${path} bundled parent integrity`,
      );
    } else {
      assert.equal(
        descriptor.inBundle,
        undefined,
        `${label}:${path} inBundle must be true or absent`,
      );
      assert.equal(
        descriptor.resolved,
        canonicalRegistryTarball(name, descriptor.version),
        `${label}:${path} must resolve from the canonical npm registry tarball`,
      );
      assertCanonicalIntegrity(
        descriptor.integrity,
        `${label}:${path} integrity`,
      );
    }
    const identity = `${name}\0${descriptor.version}`;
    const record = { path, name, descriptor: structuredClone(descriptor) };
    const list = identities.get(identity) ?? [];
    list.push(record);
    identities.set(identity, list);
    byPath.set(path, record);
  }
  for (const list of identities.values()) {
    list.sort(({ path: left }, { path: right }) => left.localeCompare(right));
  }
  return { identities, byPath };
}

function comparisonIdentity(change, manifest, changeType) {
  return change.ecosystem === "npm" &&
    change.manifest === manifest &&
    change.change_type === changeType
    ? `${change.name}\0${change.version}`
    : null;
}

function identityDelta(left, right) {
  const delta = [];
  for (const identity of left.keys())
    if (!right.has(identity)) delta.push(identity);
  return delta.sort();
}

function canonicalPathBoundRecords(records) {
  return records.map(({ path, descriptor }) =>
    canonicalDescriptor({ path, descriptor }),
  );
}

const PLACEMENT_FLAGS = ["dev", "devOptional", "optional", "peer"];

function assertReplacementRecord({ current, replacement, label, manifest }) {
  for (const descriptor of [current.descriptor, replacement?.descriptor]) {
    if (descriptor === undefined) continue;
    assert.equal(
      descriptor.inBundle,
      undefined,
      `${manifest} bundled package changes require tarball inspection`,
    );
    assert.equal(
      descriptor.bundleDependencies,
      undefined,
      `${manifest} bundleDependencies changes require tarball inspection`,
    );
  }
  assert.notEqual(
    replacement,
    undefined,
    `${manifest} ${label} must replace the same installed path`,
  );
  assert.equal(
    replacement.name,
    current.name,
    `${manifest} ${label} must preserve the installed package name`,
  );
  for (const flag of PLACEMENT_FLAGS) {
    assert.equal(
      replacement.descriptor[flag] === true,
      current.descriptor[flag] === true,
      `${manifest} ${label} must preserve the ${flag} placement flag`,
    );
  }
}

function normalizedRegistryField(value) {
  if (value === undefined || value === null || value === false)
    return undefined;
  if (Array.isArray(value) && value.length === 0) return undefined;
  if (isPlainObject(value) && Object.keys(value).length === 0) return undefined;
  return structuredClone(value);
}

function normalizedRegistryBin(value, name) {
  if (typeof value === "string") {
    return { [name.split("/").at(-1)]: value };
  }
  return normalizedRegistryField(value);
}

function normalizedRegistryFunding(value) {
  return typeof value === "string"
    ? { url: value }
    : normalizedRegistryField(value);
}

function registryDescriptor(metadata, placement) {
  const descriptor = {
    version: metadata.version,
    resolved: metadata.dist.tarball,
    integrity: metadata.dist.integrity,
  };
  const fields = {
    license:
      isPlainObject(metadata.license) &&
      typeof metadata.license.type === "string"
        ? metadata.license.type
        : metadata.license,
    bin: normalizedRegistryBin(metadata.bin, metadata.name),
    dependencies: metadata.dependencies,
    optionalDependencies: metadata.optionalDependencies,
    peerDependencies: metadata.peerDependencies,
    peerDependenciesMeta: metadata.peerDependenciesMeta,
    engines: metadata.engines,
    os: metadata.os,
    cpu: metadata.cpu,
    libc: metadata.libc,
    funding: normalizedRegistryFunding(metadata.funding),
    workspaces: metadata.workspaces,
  };
  for (const [key, value] of Object.entries(fields)) {
    const normalized = normalizedRegistryField(value);
    if (normalized !== undefined) descriptor[key] = normalized;
  }
  const hasInstallScript =
    metadata.hasInstallScript === true ||
    ["preinstall", "install", "postinstall"].some(
      (name) =>
        typeof metadata.scripts?.[name] === "string" &&
        metadata.scripts[name] !== "",
    );
  if (hasInstallScript) descriptor.hasInstallScript = true;
  for (const flag of PLACEMENT_FLAGS) {
    if (placement[flag] === true) descriptor[flag] = true;
  }
  return descriptor;
}

async function readBoundedJsonResponse(response, label) {
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/json(?:\s*;|$)/i,
    `${label} must return JSON`,
  );
  const length = response.headers.get("content-length");
  if (length !== null) {
    assert.match(length, /^(?:0|[1-9][0-9]*)$/);
    assert.equal(
      Number.parseInt(length, 10) <= MAX_REGISTRY_METADATA_BYTES,
      true,
      `${label} response is too large`,
    );
  }
  assert.notEqual(response.body, null, `${label} response body is missing`);
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    assert.equal(
      bytes <= MAX_REGISTRY_METADATA_BYTES,
      true,
      `${label} response is too large`,
    );
    chunks.push(value);
  }
  const contents = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const text = new TextDecoder("utf-8", { fatal: true }).decode(contents);
  return JSON.parse(text);
}

async function readRegistryVersion({
  fetchImplementation,
  name,
  version,
  deadlineSignal,
}) {
  const packagePath = name
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const versionPath = encodeURIComponent(version);
  const endpoint = `${NPM_REGISTRY_ORIGIN}/${packagePath}/${versionPath}`;
  const response = await fetchImplementation(endpoint, {
    cache: "no-store",
    headers: { Accept: "application/json", "Accept-Encoding": "identity" },
    redirect: "error",
    signal: AbortSignal.any([
      deadlineSignal,
      AbortSignal.timeout(REGISTRY_REQUEST_TIMEOUT_MS),
    ]),
  });
  assert.equal(
    response.status,
    200,
    `npm registry metadata failed for ${name}@${version}`,
  );
  assert.equal(
    response.url,
    endpoint,
    `npm registry metadata redirected for ${name}@${version}`,
  );
  const metadata = await readBoundedJsonResponse(
    response,
    `npm registry metadata for ${name}@${version}`,
  );
  assert.equal(isPlainObject(metadata), true);
  assert.equal(metadata.name, name);
  assert.equal(metadata.version, version);
  assert.equal(isPlainObject(metadata.dist), true);
  for (const field of ["bundleDependencies", "bundledDependencies"]) {
    const bundleSetting = metadata[field];
    assert.equal(
      bundleSetting === undefined ||
        bundleSetting === false ||
        (Array.isArray(bundleSetting) && bundleSetting.length === 0),
      true,
      `${name}@${version} registry bundleDependencies require tarball inspection`,
    );
  }
  assert.equal(
    metadata._hasShrinkwrap,
    false,
    `${name}@${version} shrinkwrap provenance must be explicitly false`,
  );
  assert.equal(
    metadata.dist.tarball,
    canonicalRegistryTarball(name, version),
    `${name}@${version} registry tarball is non-canonical`,
  );
  assertCanonicalIntegrity(
    metadata.dist.integrity,
    `${name}@${version} registry integrity`,
  );
  return metadata;
}

export async function assertReviewedNpmLocks({
  api,
  expected,
  baseTree,
  headTree,
  comparison,
  fetchImplementation = fetch,
}) {
  const base = exactTreeEntries(baseTree, "base");
  const head = exactTreeEntries(headTree, "candidate");
  const normalizedComparison = comparison.map((value, index) =>
    normalizeDependencyChange(
      typeof value === "string" ? JSON.parse(value) : value,
      `lock comparison[${index}]`,
    ),
  );
  const reviewedManifests = new Set(
    REVIEWED_NPM_PROJECTS.map(({ manifest }) => manifest),
  );
  for (const change of normalizedComparison) {
    if (change.ecosystem === "npm") {
      assert.equal(
        reviewedManifests.has(change.manifest),
        true,
        `npm comparison referenced unreviewed manifest ${change.manifest}`,
      );
    }
  }
  const registryDeadline = AbortSignal.timeout(REGISTRY_GLOBAL_TIMEOUT_MS);
  let registryRequests = 0;
  for (const { manifest, packagePath } of REVIEWED_NPM_PROJECTS) {
    const [baseLockBlob, headLockBlob, basePackageBlob, headPackageBlob] =
      await Promise.all([
        readJsonBlob({
          api,
          repository: expected.targetRepository,
          entry: regularBlob(base, manifest, "base"),
          path: manifest,
          label: "base",
          maximumBytes: MAX_PACKAGE_LOCK_BYTES,
        }),
        readJsonBlob({
          api,
          repository: expected.headRepository,
          entry: regularBlob(head, manifest, "candidate"),
          path: manifest,
          label: "candidate",
          maximumBytes: MAX_PACKAGE_LOCK_BYTES,
        }),
        readJsonBlob({
          api,
          repository: expected.targetRepository,
          entry: regularBlob(base, packagePath, "base"),
          path: packagePath,
          label: "base",
        }),
        readJsonBlob({
          api,
          repository: expected.headRepository,
          entry: regularBlob(head, packagePath, "candidate"),
          path: packagePath,
          label: "candidate",
        }),
      ]);
    for (const [label, value] of [
      ["base", baseLockBlob],
      ["candidate", headLockBlob],
    ]) {
      assert.equal(
        value.bytes.toString("utf8"),
        `${JSON.stringify(value.json, null, 2)}\n`,
        `${label} ${manifest} must use canonical JSON bytes`,
      );
    }
    assertRootLockDescriptor(
      baseLockBlob.json,
      basePackageBlob.json,
      `base ${manifest}`,
    );
    assertRootLockDescriptor(
      headLockBlob.json,
      headPackageBlob.json,
      `candidate ${manifest}`,
    );
    const baseEntries = packageEntries(baseLockBlob.json, `base ${manifest}`);
    const headEntries = packageEntries(
      headLockBlob.json,
      `candidate ${manifest}`,
    );
    for (const identity of [...baseEntries.identities.keys()].filter((key) =>
      headEntries.identities.has(key),
    )) {
      assert.deepEqual(
        canonicalPathBoundRecords(headEntries.identities.get(identity)),
        canonicalPathBoundRecords(baseEntries.identities.get(identity)),
        `${manifest} topology or descriptor drifted for unchanged ${identity.replace("\0", "@")}`,
      );
    }
    const added = identityDelta(headEntries.identities, baseEntries.identities);
    const removed = identityDelta(
      baseEntries.identities,
      headEntries.identities,
    );
    const comparisonAdded = normalizedComparison
      .map((change) => comparisonIdentity(change, manifest, "added"))
      .filter(Boolean)
      .sort();
    const comparisonRemoved = normalizedComparison
      .map((change) => comparisonIdentity(change, manifest, "removed"))
      .filter(Boolean)
      .sort();
    assert.deepEqual(
      added,
      comparisonAdded,
      `${manifest} additions must match Dependency Review`,
    );
    assert.deepEqual(
      removed,
      comparisonRemoved,
      `${manifest} removals must match Dependency Review`,
    );
    for (const identity of removed) {
      for (const current of baseEntries.identities.get(identity)) {
        assertReplacementRecord({
          current,
          replacement: headEntries.byPath.get(current.path),
          label: `removal at ${current.path}`,
          manifest,
        });
      }
    }
    for (const identity of added) {
      const [name, version] = identity.split("\0");
      const records = headEntries.identities.get(identity);
      assert.equal(records.length >= 1, true);
      for (const current of records) {
        assertReplacementRecord({
          current,
          replacement: baseEntries.byPath.get(current.path),
          label: `addition at ${current.path}`,
          manifest,
        });
      }
      registryRequests += 1;
      assert.equal(
        registryRequests <= MAX_REGISTRY_REQUESTS,
        true,
        "npm registry request limit exceeded",
      );
      const metadata = await readRegistryVersion({
        fetchImplementation,
        name,
        version,
        deadlineSignal: registryDeadline,
      });
      for (const { path, descriptor } of records) {
        assert.deepEqual(
          descriptor,
          registryDescriptor(metadata, descriptor),
          `${manifest}:${path} descriptor drifted from npm registry`,
        );
      }
    }
  }
}

function assertAuthorizedRotationCommit({
  commit,
  expected,
  expectedHeadTreeSha,
  trailer,
  label,
}) {
  assert.equal(
    expected.headRepository,
    expected.targetRepository,
    `${label} must originate in the protected repository`,
  );
  assert.equal(commit.sha, expected.headSha, "rotation commit lookup drifted");
  assert.equal(
    commit.commit?.tree?.sha,
    expectedHeadTreeSha,
    "rotation commit tree drifted from the inspected candidate tree",
  );
  assert.deepEqual(
    commit.parents?.map((parent) => parent.sha),
    [expected.baseSha],
    `${label} must be one commit directly on the reviewed base`,
  );
  assert.equal(commit.author?.login, TRUSTED_ROOT_OWNER);
  assert.equal(commit.committer?.login, TRUSTED_ROOT_OWNER);
  for (const actor of [commit.author, commit.committer]) {
    assert.equal(actor?.id, TRUSTED_ROOT_OWNER_ID);
    assert.equal(actor?.node_id, TRUSTED_ROOT_OWNER_NODE_ID);
    assert.equal(actor?.type, "User");
  }
  assert.equal(commit.commit?.author?.name, TRUSTED_ROOT_IDENTITY.name);
  assert.equal(commit.commit?.author?.email, TRUSTED_ROOT_IDENTITY.email);
  assert.equal(commit.commit?.committer?.name, TRUSTED_ROOT_IDENTITY.name);
  assert.equal(commit.commit?.committer?.email, TRUSTED_ROOT_IDENTITY.email);
  assert.equal(commit.commit?.verification?.verified, true);
  assert.equal(commit.commit?.verification?.reason, "valid");
  assert.match(commit.commit?.verification?.signature ?? "", /\S/);
  assert.match(commit.commit?.verification?.payload ?? "", /\S/);
  assert.match(
    commit.commit?.verification?.verified_at ?? "",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  );
  assert.equal(
    (commit.commit?.message ?? "").split(/\r?\n/).includes(trailer),
    true,
    `${label} must carry the reviewed intent trailer`,
  );
}

export function assertTrustedRootRotation({
  commit,
  expected,
  baseTree,
  headTree,
  expectedHeadTreeSha,
}) {
  assertAuthorizedRotationCommit({
    commit,
    expected,
    expectedHeadTreeSha,
    trailer: TRUSTED_ROOT_ROTATION_TRAILER,
    label: "trusted-root rotation",
  });

  const base = exactTreeEntries(baseTree, "base");
  const head = exactTreeEntries(headTree, "candidate");
  const changedPaths = changedLeafPaths(base, head);
  assert.notEqual(
    changedPaths.length,
    0,
    "trusted-root rotation must change root data",
  );
  assert.equal(
    TRUSTED_ROOT_ROTATION_PATH_SETS.some(
      (reviewedPaths) =>
        reviewedPaths.length === changedPaths.length &&
        reviewedPaths.every((path, index) => path === changedPaths[index]),
    ),
    true,
    "trusted-root rotation must atomically replace scanner and test, optionally with its carrier",
  );
  for (const path of TRUSTED_ROOT_PATHS) {
    regularBlob(head, path, "candidate");
  }
}

export function assertTrustedControlPlaneRotation({
  commit,
  expected,
  baseTree,
  headTree,
  expectedHeadTreeSha,
}) {
  assertAuthorizedRotationCommit({
    commit,
    expected,
    expectedHeadTreeSha,
    trailer: TRUSTED_CONTROL_PLANE_ROTATION_TRAILER,
    label: "trusted control-plane rotation",
  });
  const base = exactTreeEntries(baseTree, "base");
  const head = exactTreeEntries(headTree, "candidate");
  assertTrustedControlPlaneInventory(base, "base");
  assertTrustedControlPlaneInventory(head, "candidate");
  const changedPaths = changedLeafPaths(base, head);
  assert.equal(
    changedPaths.length >= 1 &&
      changedPaths.length <= TRUSTED_CONTROL_PLANE_PATHS.length &&
      changedPaths.every((path) => TRUSTED_CONTROL_PLANE_PATH_SET.has(path)),
    true,
    "trusted control-plane rotation must change only canonical control-plane files",
  );
}

function assertBaseRef(ref, expectedBaseSha) {
  assert.equal(ref.ref, "refs/heads/main", "main ref lookup drifted");
  assert.deepEqual(
    { type: ref.object?.type, sha: ref.object?.sha },
    { type: "commit", sha: expectedBaseSha },
    "github.sha must remain the current main commit",
  );
}

export function assertCandidateTree({
  baseTree,
  headTree,
  allowTrustedRootRotation = false,
  allowTrustedControlPlaneRotation = false,
}) {
  const base = exactTreeEntries(baseTree, "base");
  const head = exactTreeEntries(headTree, "candidate");
  assertTrustedControlPlaneInventory(base, "base");
  assertTrustedControlPlaneInventory(head, "candidate");
  const rolloutTransitions = allowTrustedRootRotation
    ? LEAST_PRIVILEGE_ROLLOUT.filter(({ path }) => path !== TRUSTED_WORKFLOW)
    : LEAST_PRIVILEGE_ROLLOUT;
  const rolloutPhase = assertAtomicBlobRollout({
    baseTree,
    headTree,
    transitions: rolloutTransitions,
    settledMutablePaths: [
      "astrologo-frontend/package.json",
      "astrologo-frontend/package-lock.json",
    ],
  });

  const operationalPaths = [...head.keys()].filter(isOperationalYaml).sort();
  assert.deepEqual(
    operationalPaths,
    rolloutPhase === "before"
      ? EXPECTED_OPERATIONAL_PATHS_BEFORE
      : EXPECTED_OPERATIONAL_PATHS_AFTER,
    "candidate operational workflow/action inventory must remain exact",
  );
  const basePolicyPaths = [...base.keys()].filter(isPolicyConfigPath).sort();
  const headPolicyPaths = [...head.keys()].filter(isPolicyConfigPath).sort();
  assert.deepEqual(
    headPolicyPaths,
    basePolicyPaths,
    "candidate policy configuration inventory must remain exact",
  );

  for (const path of REMOVED_PATHS) {
    assert.equal(head.has(path), false, `${path} must remain retired`);
  }

  for (const path of TRUSTED_SCANNER_ROOT_PATHS) {
    const trusted = regularBlob(base, path, "base");
    const candidate = regularBlob(head, path, "candidate");
    if (!allowTrustedRootRotation) {
      assert.equal(
        candidate.sha,
        trusted.sha,
        `${path} must match the trusted base`,
      );
    }
  }

  if (!allowTrustedControlPlaneRotation) {
    for (const path of TRUSTED_CONTROL_PLANE_PATHS) {
      assert.equal(
        regularBlob(head, path, "candidate").sha,
        regularBlob(base, path, "base").sha,
        `${path} must match the trusted base`,
      );
    }
  }

  for (const path of UNCHANGED_POLICY_BLOBS) {
    const trusted = regularBlob(base, path, "base");
    const candidate = regularBlob(head, path, "candidate");
    assert.equal(
      candidate.sha,
      trusted.sha,
      `${path} must match the trusted base`,
    );
  }
}

function assertPullRequest(pr, expected) {
  assert.equal(pr.number, expected.pullNumber, "pull request number drifted");
  assert.equal(pr.state, "open", "pull request must remain open");
  assert.equal(pr.base?.repo?.full_name, expected.targetRepository);
  assert.equal(
    pr.base?.ref,
    EXPECTED_BASE_REF,
    "pull request must target main",
  );
  assert.equal(
    pr.base?.sha,
    expected.baseSha,
    "github.sha must equal the pull request base SHA",
  );
  assert.equal(pr.head?.repo?.full_name, expected.headRepository);
  assert.equal(pr.head?.sha, expected.headSha, "pull request head SHA drifted");
}

function parseMergeGroupRef(ref, expectedBaseSha) {
  assert.equal(typeof ref, "string", "merge-group ref must be text");
  const match =
    /^refs\/heads\/gh-readonly-queue\/main\/pr-([1-9][0-9]*)-([0-9a-f]{40})$/.exec(
      ref,
    );
  assert.notEqual(match, null, "merge-group ref must identify one queued PR");
  const pullNumber = Number.parseInt(match[1], 10);
  assert.equal(
    Number.isSafeInteger(pullNumber),
    true,
    "merge-group pull number must be a safe integer",
  );
  assert.equal(
    match[2],
    expectedBaseSha,
    "merge-group ref must remain bound to the reviewed base",
  );
  return { pullNumber };
}

function assertMergeGroupSyntheticCommit({
  commit,
  expected,
  expectedHeadTreeSha,
}) {
  assert.equal(
    commit.sha,
    expected.headSha,
    "merge-group commit lookup drifted",
  );
  assert.equal(
    commit.commit?.tree?.sha,
    expectedHeadTreeSha,
    "merge-group commit tree drifted from the inspected synthetic tree",
  );
  assert.deepEqual(
    commit.parents?.map((parent) => parent.sha),
    [expected.baseSha],
    "a trusted rotation merge group must contain only the reviewed PR",
  );
  assert.deepEqual(
    {
      login: commit.author?.login,
      id: commit.author?.id,
      node_id: commit.author?.node_id,
      type: commit.author?.type,
    },
    {
      login: TRUSTED_ROOT_OWNER,
      id: TRUSTED_ROOT_OWNER_ID,
      node_id: TRUSTED_ROOT_OWNER_NODE_ID,
      type: "User",
    },
    "merge-group author must remain the trusted rotation owner",
  );
  assert.deepEqual(
    {
      login: commit.committer?.login,
      id: commit.committer?.id,
      node_id: commit.committer?.node_id,
      type: commit.committer?.type,
    },
    {
      login: MERGE_QUEUE_COMMITTER,
      id: MERGE_QUEUE_COMMITTER_ID,
      node_id: MERGE_QUEUE_COMMITTER_NODE_ID,
      type: "User",
    },
    "merge-group commit must be created by GitHub's web-flow identity",
  );
  assert.equal(commit.commit?.verification?.verified, true);
  assert.equal(commit.commit?.verification?.reason, "valid");
  assert.match(commit.commit?.verification?.signature ?? "", /\S/);
  assert.match(commit.commit?.verification?.payload ?? "", /\S/);
  assert.match(
    commit.commit?.verification?.verified_at ?? "",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  );
}

function hasOnlyKeys(object, allowedKeys, requiredKeys = allowedKeys) {
  const keys = Object.keys(object);
  return (
    keys.every((key) => allowedKeys.has(key)) &&
    [...requiredKeys].every((key) => keys.includes(key))
  );
}

function normalizeDependencyChange(change, label) {
  assert.equal(
    change !== null && typeof change === "object" && !Array.isArray(change),
    true,
    `${label} dependency change must be an object`,
  );
  const allowedKeys = new Set([
    "change_type",
    "manifest",
    "ecosystem",
    "name",
    "version",
    "package_url",
    "license",
    "source_repository_url",
    "scope",
    "vulnerabilities",
  ]);
  assert.equal(
    Object.keys(change).every((key) => allowedKeys.has(key)),
    true,
    `${label} dependency change has unexpected fields`,
  );
  assert.match(change.change_type ?? "", /^(?:added|removed)$/);
  for (const key of [
    "manifest",
    "ecosystem",
    "name",
    "version",
    "package_url",
  ]) {
    assert.equal(typeof change[key], "string", `${label} ${key} must be text`);
  }
  assert.equal(
    change.license === null || typeof change.license === "string",
    true,
    `${label} license must be text or null`,
  );
  assert.equal(
    change.source_repository_url === null ||
      typeof change.source_repository_url === "string",
    true,
    `${label} source repository must be text or null`,
  );
  if (change.scope !== undefined) {
    assert.match(change.scope, /^(?:unknown|runtime|development)$/);
  }

  const vulnerabilities =
    change.vulnerabilities === undefined ? [] : change.vulnerabilities;
  assert.equal(
    Array.isArray(vulnerabilities),
    true,
    `${label} vulnerabilities must be an array`,
  );
  const normalizedVulnerabilities = vulnerabilities.map(
    (vulnerability, index) => {
      const vulnerabilityLabel = `${label} vulnerability ${index}`;
      assert.equal(
        vulnerability !== null &&
          typeof vulnerability === "object" &&
          !Array.isArray(vulnerability),
        true,
        `${vulnerabilityLabel} must be an object`,
      );
      assert.equal(
        hasOnlyKeys(
          vulnerability,
          new Set([
            "severity",
            "advisory_ghsa_id",
            "advisory_summary",
            "advisory_url",
          ]),
          new Set(["advisory_ghsa_id", "advisory_summary", "advisory_url"]),
        ),
        true,
        `${vulnerabilityLabel} fields must remain exact`,
      );
      const severity =
        vulnerability.severity === undefined ? "low" : vulnerability.severity;
      assert.match(severity, /^(?:critical|high|moderate|low)$/);
      for (const key of [
        "advisory_ghsa_id",
        "advisory_summary",
        "advisory_url",
      ]) {
        assert.equal(
          typeof vulnerability[key],
          "string",
          `${vulnerabilityLabel} ${key} must be text`,
        );
      }
      return {
        severity,
        advisory_ghsa_id: vulnerability.advisory_ghsa_id,
        advisory_summary: vulnerability.advisory_summary,
        advisory_url: vulnerability.advisory_url,
      };
    },
  );

  const normalized = {
    change_type: change.change_type,
    manifest: change.manifest,
    ecosystem: change.ecosystem,
    name: change.name,
    version: change.version,
    package_url: change.package_url,
    license: change.license,
    source_repository_url: change.source_repository_url,
  };
  if (change.scope !== undefined) normalized.scope = change.scope;
  normalized.vulnerabilities = normalizedVulnerabilities;
  return normalized;
}

function canonicalDependencyChanges(changes, label) {
  assert.equal(Array.isArray(changes), true, `${label} must be an array`);
  return changes
    .map((change, index) =>
      JSON.stringify(normalizeDependencyChange(change, `${label}[${index}]`)),
    )
    .sort();
}

function hasNextDependencyPage(link, page, targetRepository, baseSha, headSha) {
  if (link === null) return false;
  assert.equal(typeof link, "string", "dependency pagination link is invalid");
  const relations = new Map();
  for (const segment of link.split(",")) {
    const match = segment.trim().match(/^<([^<>]+)>;\s*rel="([^"]+)"$/);
    assert.notEqual(match, null, "dependency pagination link is malformed");
    assert.match(match[2], /^(?:first|prev|next|last)$/);
    assert.equal(
      relations.has(match[2]),
      false,
      "dependency pagination relations must be unique",
    );
    relations.set(match[2], match[1]);
  }
  assert.notEqual(relations.size, 0, "dependency pagination link is malformed");
  const comparisonSuffix = `/dependency-graph/compare/${baseSha}...${headSha}`;
  const relationPages = new Map();
  for (const [relation, value] of relations) {
    const relationUrl = new URL(value);
    assert.equal(relationUrl.origin, "https://api.github.com");
    assert.equal(relationUrl.username, "");
    assert.equal(relationUrl.password, "");
    assert.equal(relationUrl.hash, "");
    assert.equal(
      new Set([
        `/repos/${targetRepository}${comparisonSuffix}`,
        `/repositories/${EXPECTED_TARGET_REPOSITORY_ID}${comparisonSuffix}`,
      ]).has(relationUrl.pathname),
      true,
      "dependency pagination escaped the exact comparison",
    );
    const query = [...relationUrl.searchParams.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    );
    assert.deepEqual(query, [
      ["page", relationUrl.searchParams.get("page")],
      ["per_page", String(DEPENDENCY_PAGE_SIZE)],
    ]);
    const relationPageText = relationUrl.searchParams.get("page") ?? "";
    assert.match(relationPageText, /^[1-9][0-9]*$/);
    const relationPage = Number.parseInt(relationPageText, 10);
    assert.equal(Number.isSafeInteger(relationPage), true);
    relationPages.set(relation, relationPage);
  }
  if (relationPages.has("first")) assert.equal(relationPages.get("first"), 1);
  if (relationPages.has("prev")) {
    assert.equal(page > 1, true);
    assert.equal(relationPages.get("prev"), page - 1);
  }
  if (relationPages.has("next")) {
    assert.equal(relationPages.get("next"), page + 1);
  }
  if (relationPages.has("last")) {
    assert.equal(relationPages.get("last") >= page, true);
    assert.equal(
      relationPages.get("last") > page,
      relationPages.has("next"),
      "dependency pagination last/next relations are inconsistent",
    );
  }
  return relations.has("next");
}

async function readDependencyComparison({
  fetchImplementation = fetch,
  token,
  targetRepository,
  baseSha,
  headSha,
}) {
  assert.match(
    targetRepository,
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    "snapshot repository has an invalid format",
  );
  assert.match(baseSha, /^[0-9a-f]{40}$/, "snapshot base SHA is invalid");
  assert.match(headSha, /^[0-9a-f]{40}$/, "snapshot head SHA is invalid");
  assert.match(token, /^\S+$/, "snapshot token must be set");
  const changes = [];
  for (let page = 1; page <= MAX_DEPENDENCY_PAGES; page += 1) {
    const endpoint = `https://api.github.com/repos/${targetRepository}/dependency-graph/compare/${baseSha}...${headSha}?per_page=${DEPENDENCY_PAGE_SIZE}&page=${page}`;
    const response = await fetchImplementation(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": API_VERSION,
      },
      redirect: "error",
    });
    assert.equal(
      response.status,
      200,
      `dependency graph comparison failed with HTTP ${response.status}`,
    );
    assert.equal(
      response.headers.has(SNAPSHOT_WARNINGS_HEADER),
      true,
      "dependency graph comparison omitted its snapshot warning header",
    );
    const warning = response.headers.get(SNAPSHOT_WARNINGS_HEADER);
    assert.equal(typeof warning, "string");
    assert.equal(
      warning,
      "",
      `dependency graph snapshot warnings remain for exact head ${headSha}`,
    );
    const pageChanges = await response.json();
    assert.equal(
      Array.isArray(pageChanges),
      true,
      "dependency comparison page must be an array",
    );
    assert.equal(
      pageChanges.length <= DEPENDENCY_PAGE_SIZE,
      true,
      "dependency comparison page exceeded the reviewed page size",
    );
    changes.push(
      ...pageChanges.map((change, index) =>
        normalizeDependencyChange(change, `comparison page ${page}[${index}]`),
      ),
    );
    if (
      !hasNextDependencyPage(
        response.headers.get("link"),
        page,
        targetRepository,
        baseSha,
        headSha,
      )
    ) {
      return canonicalDependencyChanges(changes, "dependency comparison");
    }
  }
  assert.fail("dependency comparison exceeded the reviewed pagination limit");
}

export async function assertDependencyReviewComplete({
  fetchImplementation = fetch,
  token,
  targetRepository,
  baseSha,
  headSha,
  dependencyChanges,
}) {
  assert.equal(
    typeof dependencyChanges,
    "string",
    "dependency review output must be text",
  );
  const actionChanges = canonicalDependencyChanges(
    JSON.parse(dependencyChanges),
    "dependency review action output",
  );
  const first = await readDependencyComparison({
    fetchImplementation,
    token,
    targetRepository,
    baseSha,
    headSha,
  });
  const second = await readDependencyComparison({
    fetchImplementation,
    token,
    targetRepository,
    baseSha,
    headSha,
  });
  assert.deepEqual(
    second,
    first,
    "dependency comparison changed between two complete clean reads",
  );
  assert.deepEqual(
    actionChanges,
    first,
    "dependency review action output must equal the complete clean comparison",
  );
  console.log(
    `Dependency review output matches two complete clean reads for exact head ${headSha}.`,
  );
  return first;
}

function apiClient(token, fetchImplementation = fetch) {
  return async function api(path) {
    const response = await fetchImplementation(
      `https://api.github.com${path}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": API_VERSION,
        },
      },
    );
    assert.equal(
      response.ok,
      true,
      `GitHub API ${path} failed with HTTP ${response.status}`,
    );
    return response.json();
  };
}

export async function verifyCandidate({
  api,
  expected,
  comparison,
  fetchImplementation = fetch,
}) {
  const mainRefPath = `/repos/${expected.targetRepository}/git/ref/heads/main`;
  const isPullRequest = expected.pullNumber !== undefined;
  const isMergeGroup = expected.mergeGroupRef !== undefined;
  assert.equal(
    Number(isPullRequest) + Number(isMergeGroup),
    1,
    "candidate verification must bind exactly one GitHub event kind",
  );
  const mergeGroup = isMergeGroup
    ? parseMergeGroupRef(expected.mergeGroupRef, expected.baseSha)
    : undefined;
  const pullNumber = isPullRequest
    ? expected.pullNumber
    : mergeGroup.pullNumber;
  const pullPath = `/repos/${expected.targetRepository}/pulls/${pullNumber}`;
  if (isPullRequest) {
    const before = await api(pullPath);
    assertPullRequest(before, expected);
    assertBaseRef(await api(mainRefPath), expected.baseSha);
  } else {
    assertBaseRef(await api(mainRefPath), expected.baseSha);
  }

  const [baseCommit, headCommit] = await Promise.all([
    api(`/repos/${expected.targetRepository}/git/commits/${expected.baseSha}`),
    api(`/repos/${expected.headRepository}/git/commits/${expected.headSha}`),
  ]);
  assert.equal(baseCommit.sha, expected.baseSha, "base commit lookup drifted");
  assert.equal(headCommit.sha, expected.headSha, "head commit lookup drifted");
  assert.match(baseCommit.tree?.sha ?? "", /^[0-9a-f]{40}$/);
  assert.match(headCommit.tree?.sha ?? "", /^[0-9a-f]{40}$/);

  const [baseTree, headTree] = await Promise.all([
    api(
      `/repos/${expected.targetRepository}/git/trees/${baseCommit.tree.sha}?recursive=1`,
    ),
    api(
      `/repos/${expected.headRepository}/git/trees/${headCommit.tree.sha}?recursive=1`,
    ),
  ]);
  assert.equal(
    baseTree.sha,
    baseCommit.tree.sha,
    "base tree response drifted from the requested object",
  );
  assert.equal(
    headTree.sha,
    headCommit.tree.sha,
    "candidate tree response drifted from the requested object",
  );

  const allowTrustedRootRotation = hasTrustedRootChange(baseTree, headTree);
  const allowTrustedControlPlaneRotation = hasTrustedControlPlaneChange(
    baseTree,
    headTree,
  );
  assert.equal(
    allowTrustedRootRotation && allowTrustedControlPlaneRotation,
    false,
    "trusted executable and control-plane rotations must remain separate",
  );
  let mergeGroupPullExpected;
  if (allowTrustedRootRotation || allowTrustedControlPlaneRotation) {
    assert.equal(
      expected.headRepository,
      expected.targetRepository,
      "trusted rotation cannot originate from a fork",
    );
    let rotationExpected = expected;
    let rotationCommit;
    if (isMergeGroup) {
      assert.deepEqual(
        headCommit.parents?.map((parent) => parent.sha),
        [expected.baseSha],
        "a trusted rotation merge-group object must have the reviewed base as its only parent",
      );
      const queuedPull = await api(pullPath);
      assert.match(
        queuedPull.head?.sha ?? "",
        /^[0-9a-f]{40}$/,
        "queued pull request head SHA is invalid",
      );
      mergeGroupPullExpected = {
        targetRepository: expected.targetRepository,
        pullNumber,
        baseSha: expected.baseSha,
        headRepository: expected.targetRepository,
        headSha: queuedPull.head.sha,
      };
      assertPullRequest(queuedPull, mergeGroupPullExpected);
      rotationExpected = mergeGroupPullExpected;
      [rotationCommit] = await Promise.all([
        api(
          `/repos/${expected.targetRepository}/commits/${rotationExpected.headSha}`,
        ),
        api(
          `/repos/${expected.targetRepository}/commits/${expected.headSha}`,
        ).then((commit) =>
          assertMergeGroupSyntheticCommit({
            commit,
            expected,
            expectedHeadTreeSha: headCommit.tree.sha,
          }),
        ),
      ]);
    } else {
      rotationCommit = await api(
        `/repos/${expected.targetRepository}/commits/${expected.headSha}`,
      );
    }
    const rotation = {
      commit: rotationCommit,
      expected: rotationExpected,
      baseTree,
      headTree,
      expectedHeadTreeSha: headCommit.tree.sha,
    };
    if (allowTrustedRootRotation) {
      assertTrustedRootRotation(rotation);
    } else {
      assertTrustedControlPlaneRotation(rotation);
    }
  }
  assertCandidateTree({
    baseTree,
    headTree,
    allowTrustedRootRotation,
    allowTrustedControlPlaneRotation,
  });
  await assertReviewedPackageScripts({
    api,
    expected,
    baseTree,
    headTree,
  });
  if (comparison !== undefined) {
    await assertReviewedNpmLocks({
      api,
      expected,
      baseTree,
      headTree,
      comparison,
      fetchImplementation,
    });
  }
  if (isPullRequest) {
    const after = await api(pullPath);
    assertPullRequest(after, expected);
    assertBaseRef(await api(mainRefPath), expected.baseSha);
  } else {
    if (mergeGroupPullExpected !== undefined) {
      assertPullRequest(await api(pullPath), mergeGroupPullExpected);
    }
    assertBaseRef(await api(mainRefPath), expected.baseSha);
  }
}

export function gitHubEventOpenFlags(
  constantsImplementation = fileConstants,
  platform = process.platform,
) {
  assert.equal(
    Number.isSafeInteger(constantsImplementation.O_RDONLY),
    true,
    "O_RDONLY must be available",
  );
  if (platform !== "win32") {
    assert.equal(
      Number.isSafeInteger(constantsImplementation.O_NOFOLLOW),
      true,
      "O_NOFOLLOW must be available on the trusted runner",
    );
  }
  return (
    constantsImplementation.O_RDONLY | (constantsImplementation.O_NOFOLLOW ?? 0)
  );
}

export async function readGitHubEventPayload(
  environment,
  {
    openImplementation = open,
    openFlags = gitHubEventOpenFlags(),
    realpathImplementation = realpath,
  } = {},
) {
  const eventPath = requiredEnvironment(
    "GITHUB_EVENT_PATH",
    /^[^\0\r\n]+$/,
    environment,
  );
  const runnerTemp = requiredEnvironment(
    "RUNNER_TEMP",
    /^[^\0\r\n]+$/,
    environment,
  );
  assert.equal(
    isAbsolute(eventPath),
    true,
    "GITHUB_EVENT_PATH must be absolute",
  );
  assert.equal(isAbsolute(runnerTemp), true, "RUNNER_TEMP must be absolute");
  const [resolvedEventPath, resolvedRunnerTemp] = await Promise.all([
    realpathImplementation(eventPath),
    realpathImplementation(runnerTemp),
  ]);
  const eventRelativePath = relative(resolvedRunnerTemp, resolvedEventPath);
  assert.equal(
    eventRelativePath !== "" &&
      eventRelativePath !== ".." &&
      !eventRelativePath.startsWith(`..${pathSeparator}`) &&
      !isAbsolute(eventRelativePath),
    true,
    "GITHUB_EVENT_PATH must remain inside RUNNER_TEMP",
  );
  const eventHandle = await openImplementation(resolvedEventPath, openFlags);
  try {
    const eventStat = await eventHandle.stat();
    assert.equal(
      eventStat.isFile(),
      true,
      "GITHUB_EVENT_PATH must be a regular file",
    );
    assert.equal(
      Number.isSafeInteger(eventStat.size) &&
        eventStat.size >= 0 &&
        eventStat.size <= MAX_GITHUB_EVENT_BYTES,
      true,
      "GitHub event payload is too large",
    );
    const contents = await eventHandle.readFile();
    assert.equal(Buffer.isBuffer(contents), true, "GitHub event must be bytes");
    assert.equal(
      contents.length <= MAX_GITHUB_EVENT_BYTES,
      true,
      "GitHub event payload is too large",
    );
    const payload = JSON.parse(contents.toString("utf8"));
    assert.equal(
      isPlainObject(payload),
      true,
      "GitHub event must be an object",
    );
    return payload;
  } finally {
    await eventHandle.close();
  }
}

function pullRequestBindingFromEvent({
  payload,
  targetRepository,
  baseSha,
  headSha,
}) {
  assert.equal(isPlainObject(payload), true, "GitHub event must be an object");
  assert.equal(
    PULL_REQUEST_TARGET_ACTIONS.has(payload.action),
    true,
    "pull_request_target action is not reviewed",
  );
  assert.equal(isPlainObject(payload.repository), true);
  assert.equal(payload.repository.id, EXPECTED_TARGET_REPOSITORY_ID);
  assert.equal(payload.repository.full_name, targetRepository);
  assert.equal(isPlainObject(payload.pull_request), true);
  const pull = payload.pull_request;
  assert.equal(
    Number.isSafeInteger(payload.number) && payload.number > 0,
    true,
    "GitHub event pull request number is invalid",
  );
  assert.equal(pull.number, payload.number, "GitHub event PR number drifted");
  assert.equal(pull.state, "open", "GitHub event PR must be open");
  assert.equal(isPlainObject(pull.base), true);
  assert.equal(isPlainObject(pull.base.repo), true);
  assert.equal(pull.base.repo.id, EXPECTED_TARGET_REPOSITORY_ID);
  assert.equal(pull.base.repo.full_name, targetRepository);
  assert.equal(pull.base.ref, EXPECTED_BASE_REF);
  assert.equal(pull.base.sha, baseSha, "GitHub event base SHA drifted");
  assert.equal(isPlainObject(pull.head), true);
  assert.equal(isPlainObject(pull.head.repo), true);
  assert.equal(
    Number.isSafeInteger(pull.head.repo.id) && pull.head.repo.id > 0,
    true,
    "GitHub event head repository ID is invalid",
  );
  assert.match(
    pull.head.repo.full_name ?? "",
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    "GitHub event head repository is invalid",
  );
  assert.equal(pull.head.sha, headSha, "GitHub event head SHA drifted");
  return {
    pullNumber: payload.number,
    headRepository: pull.head.repo.full_name,
    headRepositoryId: pull.head.repo.id,
  };
}

async function pullRequestBindingFromApi({
  api,
  eventBinding,
  targetRepository,
  baseSha,
  headSha,
}) {
  assert.equal(typeof api, "function", "GitHub API client must be available");
  const matches = [];
  let complete = false;
  for (let page = 1; page <= MAX_OPEN_PULL_REQUEST_PAGES; page += 1) {
    const pulls = await api(
      `/repos/${EXPECTED_TARGET_REPOSITORY}/pulls?state=open&base=main&per_page=100&page=${page}`,
    );
    assert.equal(
      Array.isArray(pulls),
      true,
      "open pull requests must be an array",
    );
    assert.equal(
      pulls.length <= 100,
      true,
      "open pull request page exceeded the reviewed size",
    );
    for (const pull of pulls) {
      assert.equal(
        isPlainObject(pull),
        true,
        "open pull request entries must be objects",
      );
      if (
        pull.number === eventBinding.pullNumber &&
        pull.head?.repo?.full_name === eventBinding.headRepository &&
        pull.head?.repo?.id === eventBinding.headRepositoryId &&
        pull.head?.sha === headSha &&
        pull.base?.repo?.full_name === targetRepository &&
        pull.base?.repo?.id === EXPECTED_TARGET_REPOSITORY_ID &&
        pull.base?.ref === EXPECTED_BASE_REF &&
        pull.base?.sha === baseSha &&
        pull.state === "open"
      ) {
        matches.push(pull);
      }
    }
    if (pulls.length < 100) {
      complete = true;
      break;
    }
  }
  assert.equal(
    complete,
    true,
    "open pull request discovery exceeded the reviewed pagination limit",
  );
  assert.equal(
    matches.length,
    1,
    "GitHub event must identify exactly one live open pull request",
  );
  const match = matches[0];
  const expected = {
    targetRepository: match.base.repo.full_name,
    pullNumber: match.number,
    baseSha: match.base.sha,
    headRepository: match.head.repo.full_name,
    headSha: match.head.sha,
  };
  assertPullRequest(match, expected);
  return expected;
}

export async function resolvePostReviewExpected({
  environment,
  targetRepository,
  baseSha,
  headSha,
  api,
  loadPullRequestEvent = () => readGitHubEventPayload(environment),
}) {
  const eventName = requiredEnvironment(
    "GITHUB_EVENT_NAME",
    /^(?:pull_request_target|merge_group)$/,
    environment,
  );
  assert.equal(
    requiredEnvironment(
      "GITHUB_REPOSITORY",
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
      environment,
    ),
    targetRepository,
    "GITHUB_REPOSITORY drifted",
  );
  assert.equal(
    requiredEnvironment("GITHUB_REPOSITORY_ID", /^[1-9][0-9]*$/, environment),
    String(EXPECTED_TARGET_REPOSITORY_ID),
    "GITHUB_REPOSITORY_ID drifted",
  );
  const hasPullNumber = environment.PULL_NUMBER !== undefined;
  const hasHeadRepository = environment.HEAD_REPOSITORY !== undefined;
  assert.equal(
    hasPullNumber,
    hasHeadRepository,
    "PULL_NUMBER and HEAD_REPOSITORY must be provided together",
  );
  if (eventName === "pull_request_target") {
    assert.equal(
      requiredEnvironment("GITHUB_SHA", /^[0-9a-f]{40}$/, environment),
      baseSha,
      "pull_request_target must execute the exact trusted base",
    );
    assert.equal(
      requiredEnvironment("GITHUB_REF", /^refs\/heads\/main$/, environment),
      "refs/heads/main",
    );
    assert.equal(
      requiredEnvironment("GITHUB_BASE_REF", /^main$/, environment),
      EXPECTED_BASE_REF,
    );
    const eventBinding = pullRequestBindingFromEvent({
      payload: await loadPullRequestEvent(),
      targetRepository,
      baseSha,
      headSha,
    });
    if (hasPullNumber) {
      const explicitPullNumber = Number.parseInt(
        requiredEnvironment("PULL_NUMBER", /^[1-9][0-9]*$/, environment),
        10,
      );
      assert.equal(Number.isSafeInteger(explicitPullNumber), true);
      assert.equal(
        explicitPullNumber,
        eventBinding.pullNumber,
        "PULL_NUMBER drifted from the GitHub event",
      );
      assert.equal(
        requiredEnvironment(
          "HEAD_REPOSITORY",
          /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
          environment,
        ),
        eventBinding.headRepository,
        "HEAD_REPOSITORY drifted from the GitHub event",
      );
    }
    return pullRequestBindingFromApi({
      api,
      eventBinding,
      targetRepository,
      baseSha,
      headSha,
    });
  }

  assert.equal(hasPullNumber, false, "merge_group cannot carry PULL_NUMBER");
  assert.equal(
    hasHeadRepository,
    false,
    "merge_group cannot carry HEAD_REPOSITORY",
  );
  assert.equal(
    requiredEnvironment("GITHUB_SHA", /^[0-9a-f]{40}$/, environment),
    headSha,
    "merge_group must inspect its exact synthetic head",
  );
  return {
    targetRepository,
    baseSha,
    headRepository: targetRepository,
    headSha,
    mergeGroupRef: requiredEnvironment(
      "GITHUB_REF",
      /^refs\/heads\/gh-readonly-queue\/main\/pr-[1-9][0-9]*-[0-9a-f]{40}$/,
      environment,
    ),
  };
}

export async function verifyCompletedDependencyReview({
  environment,
  token,
  targetRepository,
  baseSha,
  headSha,
  dependencyChanges,
  api,
  fetchImplementation = fetch,
  loadPullRequestEvent,
  completeReviewImplementation = assertDependencyReviewComplete,
  verifyCandidateImplementation = verifyCandidate,
}) {
  const expected = await resolvePostReviewExpected({
    environment,
    targetRepository,
    baseSha,
    headSha,
    api,
    ...(loadPullRequestEvent === undefined ? {} : { loadPullRequestEvent }),
  });
  const comparison = await completeReviewImplementation({
    fetchImplementation,
    token,
    targetRepository,
    baseSha,
    headSha,
    dependencyChanges,
  });
  await verifyCandidateImplementation({
    api,
    expected,
    comparison,
    fetchImplementation,
  });
  return { expected, comparison };
}

async function main() {
  const token = requiredEnvironment("GITHUB_TOKEN", /^\S+$/);
  const targetRepository = requiredEnvironment(
    "TARGET_REPOSITORY",
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  );
  // The carrier binds BASE_SHA to github.sha. Live PR and main reads below
  // prove that the checked-out workflow revision is still the exact base.
  const workflowSha = requiredEnvironment("BASE_SHA", /^[0-9a-f]{40}$/);
  const headSha = requiredEnvironment("HEAD_SHA", /^[0-9a-f]{40}$/);
  const eventName = requiredEnvironment(
    "GITHUB_EVENT_NAME",
    /^(?:pull_request_target|merge_group)$/,
  );
  assert.equal(
    targetRepository,
    EXPECTED_TARGET_REPOSITORY,
    "trusted scanner is bound to its reviewed repository",
  );
  const api = apiClient(token);

  if (process.argv[2] === "--dependency-review-output") {
    await verifyCompletedDependencyReview({
      environment: process.env,
      token,
      targetRepository,
      baseSha: workflowSha,
      headSha,
      dependencyChanges: requiredEnvironment("DEPENDENCY_CHANGES", /^.*$/s),
      api,
    });
    return;
  }

  const expected = {
    targetRepository,
    pullNumber: Number.parseInt(
      requiredEnvironment("PULL_NUMBER", /^[1-9][0-9]*$/),
      10,
    ),
    baseSha: workflowSha,
    headRepository: requiredEnvironment(
      "HEAD_REPOSITORY",
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    ),
    headSha,
  };
  assert.equal(
    Number.isSafeInteger(expected.pullNumber),
    true,
    "PULL_NUMBER must be a safe integer",
  );
  assert.equal(eventName, "pull_request_target");
  assert.equal(
    requiredEnvironment("GITHUB_SHA", /^[0-9a-f]{40}$/),
    workflowSha,
    "pull_request_target must execute the exact trusted base",
  );
  await verifyCandidate({ api, expected });
  console.log(
    `Trusted candidate tree verified for exact head ${expected.headSha}.`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  await main();
}

export {
  FINAL_DEPENDENCY_REVIEW,
  FINAL_DEPENDENCY_REVIEW_OID,
  FINAL_TRUSTED_DEPENDENCY_REVIEW,
  FINAL_TRUSTED_DEPENDENCY_REVIEW_OID,
  gitBlobOid,
};
