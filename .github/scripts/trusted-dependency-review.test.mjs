import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  FINAL_DEPENDENCY_REVIEW,
  FINAL_DEPENDENCY_REVIEW_OID,
  assertCandidateTree,
  assertDependencyReviewComplete,
  assertReviewedPackageScripts,
  assertTrustedRootRotation,
  gitBlobOid,
  verifyCandidate,
} from "./trusted-dependency-review.mjs";

const SHA = {
  base: "a".repeat(40),
  head: "b".repeat(40),
  baseTree: "c".repeat(40),
  headTree: "d".repeat(40),
  trustedWorkflow: "1".repeat(40),
  trustedScanner: "2".repeat(40),
  trustedScannerTest: "9".repeat(40),
  zizmorConfig: "3".repeat(40),
};

const SCORECARD_TRANSITIONS = [
  [
    ".github/scripts/enforce-scorecard.mjs",
    "d794e5370b97704dee02fa24dbd6ff17ecf0ad17",
    "e2d311ad7b5bc4d4bcfa0cdbfe413e2df9a65981",
  ],
  [
    ".github/scripts/enforce-scorecard.test.mjs",
    "3f897f03e3bdeab601b2769f1b8360c4db3542ed",
    "85cf9e39ab0f242f0efb8a09907cabe028c79c33",
  ],
  [
    ".github/scripts/scorecard-workflow.test.mjs",
    "5237744f213ad3908851a96101e042bce898ca9a",
    "779cc032fa525bf1d553e447e19e97c9191c65a9",
  ],
];

const UNCHANGED_WORKFLOWS = [
  ".github/workflows/auto-release.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/format-public.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/scorecard.yml",
];
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
const ROOT_PACKAGE = {
  scripts: { "format:public:check": 'prettier --check "**/index.html"' },
};
const FRONTEND_PACKAGE = {
  scripts: {
    biome: "biome check .",
    build: "npm run prepare:swiss-wasm && tsc -b && vite build",
    "build:functions":
      "npm run prepare:swiss-wasm && wrangler pages functions build --outdir=.wrangler/functions-build-check",
    lint: "eslint .",
    "prepare:swiss-wasm": "node scripts/prepare-swiss-wasm.mjs",
    test: "npm run prepare:swiss-wasm && vitest run",
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

function blob(path, sha, mode = "100644") {
  return { path, mode, type: "blob", sha };
}

function gitBlob(contents) {
  const bytes = Buffer.from(JSON.stringify(contents), "utf8");
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
          ["per_page", "100"],
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
  assert.equal(
    complete.block.trimEnd(),
    `      - name: ${completeName}\n        env:\n          GITHUB_TOKEN: \${{ github.token }}\n          TARGET_REPOSITORY: \${{ github.repository }}\n          BASE_SHA: ${baseExpression}\n          HEAD_SHA: ${headExpression}\n          DEPENDENCY_CHANGES: \${{ steps.dependency-review.outputs.dependency-changes }}\n        run: >-\n          node .github/scripts/trusted-dependency-review.mjs\n          --dependency-review-output`,
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
const FRONTEND_PACKAGE_BLOB = gitBlob(FRONTEND_PACKAGE);

function fixtures(zizmorOid = "c163e87b4faa65fec369a65eea1ca7957a25a9ed") {
  const unchanged = UNCHANGED_WORKFLOWS.map((path, index) =>
    blob(path, `${index + 4}`.repeat(40)),
  );
  const shared = [
    blob(".github/workflows/native-auto-merge.yml", SHA.trustedWorkflow),
    blob(".github/scripts/trusted-dependency-review.mjs", SHA.trustedScanner),
    blob(
      ".github/scripts/trusted-dependency-review.test.mjs",
      SHA.trustedScannerTest,
    ),
    blob(".github/zizmor.yml", SHA.zizmorConfig),
    ...POLICY_CONFIG_PATHS.map((path, index) =>
      blob(path, `${((index % 6) + 10).toString(16)}`.repeat(40)),
    ),
    blob("package.json", ROOT_PACKAGE_BLOB.oid),
    blob("astrologo-frontend/package.json", FRONTEND_PACKAGE_BLOB.oid),
  ];
  const scorecardBase = SCORECARD_TRANSITIONS.map(([path, oldOid]) =>
    blob(path, oldOid),
  );
  const scorecardHead = SCORECARD_TRANSITIONS.map(([, , nextOid], index) =>
    blob(SCORECARD_TRANSITIONS[index][0], nextOid),
  );
  const baseTree = {
    sha: SHA.baseTree,
    truncated: false,
    tree: [
      ...structuredClone(unchanged),
      ...structuredClone(shared),
      ...scorecardBase,
      blob(".github/workflows/dependency-review.yml", "e".repeat(40)),
      blob(
        ".github/workflows/zizmor.yml",
        "c163e87b4faa65fec369a65eea1ca7957a25a9ed",
      ),
      blob(
        ".github/scripts/native-auto-merge-workflows.regression.mjs",
        "0".repeat(40),
      ),
    ],
  };
  const headTree = {
    sha: SHA.headTree,
    truncated: false,
    tree: [
      ...structuredClone(unchanged),
      ...structuredClone(shared),
      ...scorecardHead,
      blob(
        ".github/workflows/dependency-review.yml",
        FINAL_DEPENDENCY_REVIEW_OID,
      ),
      blob(".github/workflows/zizmor.yml", zizmorOid),
    ],
  };
  return { baseTree, headTree };
}

function settledFixtures() {
  const fixture = fixtures();
  fixture.baseTree = structuredClone(fixture.headTree);
  fixture.baseTree.sha = SHA.baseTree;
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
      repo: { full_name: expected.targetRepository },
      ref: "main",
      sha: expected.baseSha,
    },
    head: {
      repo: { full_name: expected.headRepository },
      sha: expected.headSha,
    },
  };
  return { expected, pull };
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

function normalApiResponses({ pull, baseTree, headTree }) {
  return [
    pull,
    mainRef(),
    { sha: SHA.base, tree: { sha: SHA.baseTree } },
    { sha: SHA.head, tree: { sha: SHA.headTree } },
    baseTree,
    headTree,
    ROOT_PACKAGE_BLOB.response,
    ROOT_PACKAGE_BLOB.response,
    FRONTEND_PACKAGE_BLOB.response,
    FRONTEND_PACKAGE_BLOB.response,
    pull,
    mainRef(),
  ];
}

function packageBlobResponse(path) {
  if (path.endsWith(`/git/blobs/${ROOT_PACKAGE_BLOB.oid}`)) {
    return ROOT_PACKAGE_BLOB.response;
  }
  if (path.endsWith(`/git/blobs/${FRONTEND_PACKAGE_BLOB.oid}`)) {
    return FRONTEND_PACKAGE_BLOB.response;
  }
  return undefined;
}

function mutateHead(mutator) {
  const fixture = fixtures();
  mutator(fixture.headTree.tree, fixture);
  return fixture;
}

test("the final retired-controller tree is accepted as immutable data", () => {
  assert.doesNotThrow(() => assertCandidateTree(fixtures()));
  assert.doesNotThrow(() =>
    assertCandidateTree(fixtures("8bdabab383e57df7e5189e7157e27c00df43779f")),
  );
});

test("only the two reviewed Zizmor release blobs are accepted", () => {
  assert.throws(() => assertCandidateTree(fixtures("f".repeat(40))));
  const rollback = fixtures("c163e87b4faa65fec369a65eea1ca7957a25a9ed");
  rollback.baseTree.tree.find(
    (entry) => entry.path === ".github/workflows/zizmor.yml",
  ).sha = "8bdabab383e57df7e5189e7157e27c00df43779f";
  assert.throws(() => assertCandidateTree(rollback));
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

test("Scorecard enforcement advances once and cannot drift or downgrade", () => {
  assert.doesNotThrow(() => assertCandidateTree(fixtures()));
  assert.doesNotThrow(() => assertCandidateTree(settledFixtures()));
  for (const [path, oldOid] of SCORECARD_TRANSITIONS) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => {
          entries.find((entry) => entry.path === path).sha = "f".repeat(40);
        }),
      ),
    );
    const downgrade = settledFixtures();
    downgrade.headTree.tree.find((entry) => entry.path === path).sha = oldOid;
    assert.throws(() => assertCandidateTree(downgrade));
  }
});

test("every unrelated operational workflow remains the trusted base blob", () => {
  for (const path of UNCHANGED_WORKFLOWS) {
    assert.throws(() =>
      assertCandidateTree(
        mutateHead((entries) => {
          entries.find((entry) => entry.path === path).sha = "f".repeat(40);
        }),
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
      [FRONTEND_PACKAGE_BLOB.oid, FRONTEND_PACKAGE_BLOB.response],
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
            : FRONTEND_PACKAGE_BLOB.response;
          return { ...structuredClone(response), ...mutation };
        },
      }),
    );
  }
});

test("dependency review output matches two complete warning-free reads", async () => {
  const next = `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2>; rel="next", <https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2>; rel="last"`;
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

test("dependency snapshot warnings, drift and malformed output fail closed", async () => {
  const next = `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2>; rel="next"`;
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
        dependencyResponse(
          Array.from({ length: 101 }, () => DEPENDENCY_CHANGES[0]),
        ),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=3>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://example.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repos/another/repository/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], { link: "not-a-pagination-link" }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=9>; rel="last"`,
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
          link: `garbage, <https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2>; rel="next"`,
        }),
      ]),
    () =>
      dependencyReviewRun([
        dependencyResponse([], {
          link: `<https://api.github.com/repositories/1182022862/dependency-graph/compare/${SHA.base}...${SHA.head}?per_page=100&page=2&unexpected=1>; rel="next"`,
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
  ).sha = SHA.trustedWorkflow;
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
    `/repos/LCV-Ideas-Software/astrologo-app/git/blobs/${FRONTEND_PACKAGE_BLOB.oid}`,
    `/repos/LCV-Ideas-Software/astrologo-app/git/blobs/${FRONTEND_PACKAGE_BLOB.oid}`,
    "/repos/LCV-Ideas-Software/astrologo-app/pulls/291",
    "/repos/LCV-Ideas-Software/astrologo-app/git/ref/heads/main",
  ]);
  assert.equal(responses.length, 0);
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
    /main must remain anchored/,
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
    FRONTEND_PACKAGE_BLOB.response,
    FRONTEND_PACKAGE_BLOB.response,
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

test("the trusted workflow never checks out or executes candidate content", async () => {
  const workflow = await readFile(
    new URL("../workflows/native-auto-merge.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /^\s+pull_request:|^\s+merge_group:/m);
  const checkout = workflow.slice(
    workflow.indexOf("      - name: Check out the trusted base revision"),
    workflow.indexOf(
      "      - name: Inspect the candidate as immutable Git data",
    ),
  );
  assert.match(
    checkout,
    /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/,
  );
  assert.doesNotMatch(checkout, /allow-unsafe-pr-checkout|pull_request\.head/);
  assert.match(
    workflow,
    /permissions:\n\s+contents: read\n\s+pull-requests: read # Re-read the bound pull request/,
  );
  assert.match(workflow, /\n\s+- edited\n/);
  assert.match(
    workflow,
    /group: trusted-dependency-review-\$\{\{ github\.repository \}\}-\$\{\{ github\.event\.pull_request\.number \}\}/,
  );
  assert.doesNotMatch(
    workflow.slice(workflow.indexOf("concurrency:"), workflow.indexOf("jobs:")),
    /head\.sha/,
  );
  assert.doesNotMatch(
    workflow,
    /environment:|secrets\.|actions\/cache|download-artifact/,
  );
  assert.match(
    workflow,
    /node \.github\/scripts\/trusted-dependency-review\.mjs/,
  );
  assert.match(
    workflow,
    /actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/,
  );
  assert.match(
    workflow,
    /base-ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/,
  );
  assert.match(
    workflow,
    /head-ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  const pullRequestContract = {
    checkoutName: "Check out the trusted base revision",
    inspectName: "Inspect the candidate as immutable Git data",
    reviewName: "Review pull request dependencies",
    baseExpression: "${{ github.event.pull_request.base.sha }}",
    headExpression: "${{ github.event.pull_request.head.sha }}",
    permissionsBlock:
      "    permissions:\n      contents: read\n      pull-requests: read # Re-read the bound pull request before and after Git tree inspection.",
    preamble: `name: Trusted Dependency Review

on:
  pull_request_target:
    branches:
      - main
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review
      - edited

permissions: write-all

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
    permissionsBlock: "    permissions: write-all",
    preamble: `name: Dependency Review
on:
  merge_group:
    types:
      - checks_requested

permissions: write-all

concurrency:
  group: dependency-review-\${{ github.event.merge_group.head_sha }}
  cancel-in-progress: true

jobs:
`,
  };
  assertDependencyCarrierContract(workflow, pullRequestContract);
  assertDependencyCarrierMutations(workflow, pullRequestContract);
  assertDependencyCarrierContract(FINAL_DEPENDENCY_REVIEW, mergeGroupContract);
  assertDependencyCarrierMutations(FINAL_DEPENDENCY_REVIEW, mergeGroupContract);
});
