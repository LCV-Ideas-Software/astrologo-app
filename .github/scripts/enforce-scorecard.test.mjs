import assert from "node:assert/strict";
import test from "node:test";

import { isApprovedFinding, unapprovedFindings } from "./enforce-scorecard.mjs";

const TOKEN_MESSAGE = `score is 5: topLevel permissions set to 'write-all'
Remediation tip: Visit [https://app.stepsecurity.io/secureworkflow](https://app.stepsecurity.io/secureworkflow/github.com/LCV-Ideas-Software/astrologo-app/codeql.yml/main?enable=permissions).
Tick the 'Restrict permissions for GITHUB_TOKEN'
Untick other options
NOTE: If you want to resolve multiple issues at once, you can visit [https://app.stepsecurity.io/securerepo](https://app.stepsecurity.io/securerepo) instead.
Click Remediation section below for further remediation help`;
const PINNED_MESSAGE =
  "score is 8: npmCommand not pinned by hash\nClick Remediation section below to solve this issue";

function finding(ruleId, { path, snippet, message } = {}) {
  return {
    ruleId,
    message: { text: message ?? "finding" },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: path ?? "no file associated with this alert",
          },
          region: { startLine: 1, snippet: { text: snippet ?? "" } },
        },
      },
    ],
  };
}

function sarif(results) {
  return { version: "2.1.0", runs: [{ results }] };
}

const exactTokenFinding = finding("TokenPermissionsID", {
  path: ".github/workflows/codeql.yml",
  snippet: "write-all",
  message: TOKEN_MESSAGE,
});
const exactWranglerFinding = finding("PinnedDependenciesID", {
  path: ".github/workflows/deploy.yml",
  snippet:
    'npm install --prefix "$wrangler_prefix" --save-exact --ignore-scripts --no-audit --no-fund wrangler@latest',
  message: PINNED_MESSAGE,
});
const exactWranglerReconcileFinding = finding("PinnedDependenciesID", {
  path: ".github/workflows/deploy.yml",
  snippet:
    'npm install --prefix "$wrangler_prefix" --ignore-scripts --no-audit --no-fund',
  message: PINNED_MESSAGE,
});

test("accepts an empty result set", () => {
  assert.deepEqual(unapprovedFindings(sarif([])), []);
});

test("accepts only the exact write-all and Wrangler policy signatures", () => {
  assert.deepEqual(
    unapprovedFindings(
      sarif([
        exactTokenFinding,
        exactWranglerFinding,
        exactWranglerReconcileFinding,
      ]),
    ),
    [],
  );
});

test("rejects every non-policy Scorecard result, including binary artifacts", () => {
  const ruleIds = [
    "BranchProtectionID",
    "FuzzingID",
    "CodeReviewID",
    "CIIBestPracticesID",
    "BinaryArtifactsID",
    "VulnerabilitiesID",
  ];
  assert.deepEqual(
    unapprovedFindings(sarif(ruleIds.map((ruleId) => finding(ruleId)))).map(
      ({ ruleId }) => ruleId,
    ),
    ruleIds,
  );
});

test("fails closed when any write-all signature field changes", () => {
  for (const changed of [
    { ...exactTokenFinding, ruleId: "OtherRule" },
    finding("TokenPermissionsID", {
      path: ".github/workflows/codeql.yml",
      snippet: "contents: write",
      message: TOKEN_MESSAGE,
    }),
    finding("TokenPermissionsID", {
      path: "scripts/codeql.yml",
      snippet: "write-all",
      message: TOKEN_MESSAGE,
    }),
    finding("TokenPermissionsID", {
      path: ".github/workflows/codeql.yml",
      snippet: "write-all",
      message: `${TOKEN_MESSAGE} altered`,
    }),
  ]) {
    assert.equal(isApprovedFinding(changed), false);
  }
});

test("fails closed when any Wrangler signature field changes", () => {
  for (const changed of [
    finding("PinnedDependenciesID", {
      path: ".github/workflows/other.yml",
      snippet:
        exactWranglerFinding.locations[0].physicalLocation.region.snippet.text,
      message: PINNED_MESSAGE,
    }),
    finding("PinnedDependenciesID", {
      path: ".github/workflows/deploy.yml",
      snippet: "npm install wrangler@latest",
      message: PINNED_MESSAGE,
    }),
    finding("PinnedDependenciesID", {
      path: ".github/workflows/deploy.yml",
      snippet:
        exactWranglerFinding.locations[0].physicalLocation.region.snippet.text,
      message: `${PINNED_MESSAGE} altered`,
    }),
  ]) {
    assert.equal(isApprovedFinding(changed), false);
  }
});

test("rejects malformed or empty SARIF documents", () => {
  assert.throws(() => unapprovedFindings({}), /runs array/);
  assert.throws(() => unapprovedFindings({ runs: [] }), /at least one run/);
  assert.throws(
    () => unapprovedFindings({ runs: [{ results: "not-an-array" }] }),
    /results value must be an array/,
  );
});
