import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const API_VERSION = "2022-11-28";
const SNAPSHOT_WARNINGS_HEADER = "x-github-dependency-graph-snapshot-warnings";
const DEPENDENCY_PAGE_SIZE = 100;
const MAX_DEPENDENCY_PAGES = 1_000;
const EXPECTED_TARGET_REPOSITORY = "LCV-Ideas-Software/astrologo-app";
const EXPECTED_TARGET_REPOSITORY_ID = 1_182_022_862;
const EXPECTED_BASE_REF = "main";
const TRUSTED_WORKFLOW = ".github/workflows/native-auto-merge.yml";
const TRUSTED_SCANNER = ".github/scripts/trusted-dependency-review.mjs";
const TRUSTED_SCANNER_TEST =
  ".github/scripts/trusted-dependency-review.test.mjs";
const DEPENDENCY_REVIEW_WORKFLOW = ".github/workflows/dependency-review.yml";
const ZIZMOR_WORKFLOW = ".github/workflows/zizmor.yml";
const ZIZMOR_CONFIG = ".github/zizmor.yml";
const TRUSTED_ROOT_PATHS = new Set([
  TRUSTED_WORKFLOW,
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
const TRUSTED_ROOT_IDENTITY = {
  name: "LCV-Ideas-Software",
  email: "lcv@lcv.dev",
};
const TRUSTED_ROOT_ROTATION_TRAILER =
  "Trusted-Dependency-Review-Root-Rotation: astrologo-app/v1";

const UNCHANGED_OPERATIONAL_WORKFLOWS = new Set([
  ".github/workflows/auto-release.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/format-public.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/scorecard.yml",
]);

const EXPECTED_OPERATIONAL_PATHS = [
  ...UNCHANGED_OPERATIONAL_WORKFLOWS,
  DEPENDENCY_REVIEW_WORKFLOW,
  TRUSTED_WORKFLOW,
  ZIZMOR_WORKFLOW,
].sort();

const REMOVED_PATHS = new Set([
  ".github/scripts/native-auto-merge-workflows.regression.mjs",
  ".github/scripts/dependency-review-workflow.regression.mjs",
]);

const MONOTONIC_BLOB_TRANSITIONS = new Map([
  [
    ".github/scripts/enforce-scorecard.mjs",
    [
      "d794e5370b97704dee02fa24dbd6ff17ecf0ad17",
      "e2d311ad7b5bc4d4bcfa0cdbfe413e2df9a65981",
    ],
  ],
  [
    ".github/scripts/enforce-scorecard.test.mjs",
    [
      "3f897f03e3bdeab601b2769f1b8360c4db3542ed",
      "85cf9e39ab0f242f0efb8a09907cabe028c79c33",
    ],
  ],
  [
    ".github/scripts/scorecard-workflow.test.mjs",
    [
      "5237744f213ad3908851a96101e042bce898ca9a",
      "779cc032fa525bf1d553e447e19e97c9191c65a9",
    ],
  ],
]);

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
const REVIEWED_PACKAGE_EMBEDDED_CONFIG_KEYS = [
  "biome",
  "eslintConfig",
  "postcss",
  "prettier",
  "ts-node",
  "vitest",
];
const CONFIG_PATH_PATTERNS = [
  /(?:^|\/)(?:\.editorconfig|\.gitattributes|\.npmrc|\.postcssrc(?:\.[^/]*)?|\.prettierignore|\.prettierrc(?:\.[^/]*)?|biome\.jsonc?|eslint\.config\.[^/]+|postcss\.config\.[^/]+|prettier\.config\.[^/]+|tsconfig(?:\.[^/]+)?\.json|vite\.config\.[^/]+|vitest\.config\.[^/]+|vitest\.workspace\.[^/]+|wrangler\.(?:jsonc?|toml))$/i,
];

function isPolicyConfigPath(path) {
  return CONFIG_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

const FINAL_DEPENDENCY_REVIEW = `name: Dependency Review
on:
  merge_group:
    types:
      - checks_requested

permissions: write-all

concurrency:
  group: dependency-review-\${{ github.event.merge_group.head_sha }}
  cancel-in-progress: true

jobs:
  dependency_review:
    name: Dependency Review
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions: write-all
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

const FINAL_DEPENDENCY_REVIEW_OID = gitBlobOid(
  Buffer.from(FINAL_DEPENDENCY_REVIEW, "utf8"),
);

const ZIZMOR_V2_0_WORKFLOW_OID = "c163e87b4faa65fec369a65eea1ca7957a25a9ed";
// Signed zizmor/v2.3.0 -> 67ecbebba92a6973f889114d4b0d64596519a94f.
const ZIZMOR_V2_3_WORKFLOW_OID = "8bdabab383e57df7e5189e7157e27c00df43779f";
const REVIEWED_ZIZMOR_WORKFLOW_OIDS = new Set([
  ZIZMOR_V2_0_WORKFLOW_OID,
  ZIZMOR_V2_3_WORKFLOW_OID,
]);

function requiredEnvironment(name, pattern) {
  const value = process.env[name];
  assert.notEqual(value, undefined, `${name} must be set`);
  assert.match(value, pattern, `${name} has an invalid format`);
  return value;
}

function gitBlobOid(contents) {
  const header = Buffer.from(`blob ${contents.length}\0`, "utf8");
  return createHash("sha1").update(header).update(contents).digest("hex");
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
  return [...TRUSTED_ROOT_PATHS].some(
    (path) => base.get(path)?.sha !== head.get(path)?.sha,
  );
}

function hasTrustedRootChange(baseTree, headTree) {
  return trustedRootChanged(
    exactTreeEntries(baseTree, "base"),
    exactTreeEntries(headTree, "candidate"),
  );
}

function assertMonotonicBlobTransition(base, head, path, transition) {
  const trustedOid = regularBlob(base, path, "base").sha;
  const candidateOid = regularBlob(head, path, "candidate").sha;
  const [previousOid, nextOid] = transition;
  assert.equal(
    (trustedOid === previousOid &&
      (candidateOid === previousOid || candidateOid === nextOid)) ||
      (trustedOid === nextOid && candidateOid === nextOid),
    true,
    `${path} must preserve or advance through its reviewed transition`,
  );
}

async function readJsonBlob({ api, repository, entry, path, label }) {
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
    gitBlobOid(contents),
    entry.sha,
    `${label} ${path} blob OID drifted`,
  );
  assert.equal(
    contents.length <= 128 * 1024,
    true,
    `${label} ${path} is too large`,
  );
  return JSON.parse(contents.toString("utf8"));
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
    const [basePackage, headPackage] = await Promise.all([
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

export function assertTrustedRootRotation({
  commit,
  expected,
  baseTree,
  headTree,
  expectedHeadTreeSha,
}) {
  assert.equal(
    expected.headRepository,
    expected.targetRepository,
    "trusted-root rotation must originate in the protected repository",
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
    "trusted-root rotation must be one commit directly on the reviewed base",
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
    (commit.commit?.message ?? "")
      .split(/\r?\n/)
      .includes(TRUSTED_ROOT_ROTATION_TRAILER),
    true,
    "trusted-root rotation must carry the reviewed intent trailer",
  );

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

function assertBaseRef(ref, expectedBaseSha) {
  assert.equal(ref.ref, "refs/heads/main", "main ref lookup drifted");
  assert.deepEqual(
    { type: ref.object?.type, sha: ref.object?.sha },
    { type: "commit", sha: expectedBaseSha },
    "main must remain anchored to the reviewed pull request base",
  );
}

export function assertCandidateTree({
  baseTree,
  headTree,
  allowTrustedRootRotation = false,
}) {
  const base = exactTreeEntries(baseTree, "base");
  const head = exactTreeEntries(headTree, "candidate");

  const operationalPaths = [...head.keys()].filter(isOperationalYaml).sort();
  assert.deepEqual(
    operationalPaths,
    EXPECTED_OPERATIONAL_PATHS,
    "candidate operational workflow/action inventory must remain exact",
  );
  assert.deepEqual(
    [...head.keys()].filter(isPolicyConfigPath).sort(),
    [...base.keys()].filter(isPolicyConfigPath).sort(),
    "candidate policy configuration inventory must remain exact",
  );

  for (const path of REMOVED_PATHS) {
    assert.equal(head.has(path), false, `${path} must remain retired`);
  }

  for (const path of [ZIZMOR_CONFIG]) {
    const trusted = regularBlob(base, path, "base");
    const candidate = regularBlob(head, path, "candidate");
    assert.equal(
      candidate.sha,
      trusted.sha,
      `${path} must match the trusted base`,
    );
  }

  for (const path of TRUSTED_ROOT_PATHS) {
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

  for (const path of UNCHANGED_OPERATIONAL_WORKFLOWS) {
    const trusted = regularBlob(base, path, "base");
    const candidate = regularBlob(head, path, "candidate");
    assert.equal(candidate.sha, trusted.sha, `${path} is outside this rollout`);
  }

  for (const [path, transition] of MONOTONIC_BLOB_TRANSITIONS) {
    assertMonotonicBlobTransition(base, head, path, transition);
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

  assert.equal(
    regularBlob(head, DEPENDENCY_REVIEW_WORKFLOW, "candidate").sha,
    FINAL_DEPENDENCY_REVIEW_OID,
    `${DEPENDENCY_REVIEW_WORKFLOW} must match the pre-reviewed merge-group carrier`,
  );

  const trustedZizmorOid = regularBlob(base, ZIZMOR_WORKFLOW, "base").sha;
  const candidateZizmorOid = regularBlob(
    head,
    ZIZMOR_WORKFLOW,
    "candidate",
  ).sha;
  assert.equal(
    REVIEWED_ZIZMOR_WORKFLOW_OIDS.has(trustedZizmorOid) &&
      (candidateZizmorOid === trustedZizmorOid ||
        (trustedZizmorOid === ZIZMOR_V2_0_WORKFLOW_OID &&
          candidateZizmorOid === ZIZMOR_V2_3_WORKFLOW_OID)),
    true,
    `${ZIZMOR_WORKFLOW} must preserve or advance to its reviewed signed component release`,
  );
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
  assert.equal(pr.base?.sha, expected.baseSha, "pull request base SHA drifted");
  assert.equal(pr.head?.repo?.full_name, expected.headRepository);
  assert.equal(pr.head?.sha, expected.headSha, "pull request head SHA drifted");
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

export async function verifyCandidate({ api, expected }) {
  const pullPath = `/repos/${expected.targetRepository}/pulls/${expected.pullNumber}`;
  const mainRefPath = `/repos/${expected.targetRepository}/git/ref/heads/main`;
  const before = await api(pullPath);
  assertPullRequest(before, expected);
  assertBaseRef(await api(mainRefPath), expected.baseSha);

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
  if (allowTrustedRootRotation) {
    assert.equal(
      expected.headRepository,
      expected.targetRepository,
      "trusted-root rotation cannot originate from a fork",
    );
    const rotationCommit = await api(
      `/repos/${expected.targetRepository}/commits/${expected.headSha}`,
    );
    assertTrustedRootRotation({
      commit: rotationCommit,
      expected,
      baseTree,
      headTree,
      expectedHeadTreeSha: headCommit.tree.sha,
    });
  }
  assertCandidateTree({
    baseTree,
    headTree,
    allowTrustedRootRotation,
  });
  await assertReviewedPackageScripts({
    api,
    expected,
    baseTree,
    headTree,
  });
  const after = await api(pullPath);
  assertPullRequest(after, expected);
  assertBaseRef(await api(mainRefPath), expected.baseSha);
}

async function main() {
  const token = requiredEnvironment("GITHUB_TOKEN", /^\S+$/);
  const targetRepository = requiredEnvironment(
    "TARGET_REPOSITORY",
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
  );
  const baseSha = requiredEnvironment("BASE_SHA", /^[0-9a-f]{40}$/);
  const headSha = requiredEnvironment("HEAD_SHA", /^[0-9a-f]{40}$/);
  assert.equal(
    targetRepository,
    EXPECTED_TARGET_REPOSITORY,
    "trusted scanner is bound to its reviewed repository",
  );

  if (process.argv[2] === "--dependency-review-output") {
    await assertDependencyReviewComplete({
      token,
      targetRepository,
      baseSha,
      headSha,
      dependencyChanges: requiredEnvironment("DEPENDENCY_CHANGES", /^.*$/s),
    });
    return;
  }

  const expected = {
    targetRepository,
    pullNumber: Number.parseInt(
      requiredEnvironment("PULL_NUMBER", /^[1-9][0-9]*$/),
      10,
    ),
    baseSha,
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
  await verifyCandidate({ api: apiClient(token), expected });
  console.log(
    `Trusted candidate tree verified for exact head ${expected.headSha}.`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  await main();
}

export { FINAL_DEPENDENCY_REVIEW, FINAL_DEPENDENCY_REVIEW_OID, gitBlobOid };
