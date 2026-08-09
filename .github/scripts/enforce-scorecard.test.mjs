import assert from "node:assert/strict";
import test from "node:test";

import { isApprovedFinding, unapprovedFindings } from "./enforce-scorecard.mjs";

const TOKEN_MESSAGE = `score is 5: topLevel permissions set to 'write-all'
Remediation tip: Visit [https://app.stepsecurity.io/secureworkflow](https://app.stepsecurity.io/secureworkflow/github.com/LCV-Ideas-Software/astrologo-app/codeql.yml/main?enable=permissions).
Tick the 'Restrict permissions for GITHUB_TOKEN'
Untick other options
NOTE: If you want to resolve multiple issues at once, you can visit [https://app.stepsecurity.io/securerepo](https://app.stepsecurity.io/securerepo) instead.
Click Remediation section below for further remediation help`;
const TOKEN_PULL_REQUEST_MESSAGE = `score is 5: topLevel permissions set to 'write-all'
Remediation tip: Visit [https://app.stepsecurity.io/secureworkflow](https://app.stepsecurity.io/secureworkflow/file://./codeql.yml/unknown?enable=permissions).
Tick the 'Restrict permissions for GITHUB_TOKEN'
Untick other options
NOTE: If you want to resolve multiple issues at once, you can visit [https://app.stepsecurity.io/securerepo](https://app.stepsecurity.io/securerepo) instead.
Click Remediation section below for further remediation help`;
const PINNED_MESSAGE =
  "score is 8: npmCommand not pinned by hash\nClick Remediation section below to solve this issue";
const BRANCH_PROTECTION_MESSAGE = `score is 3: branch protection is not maximal on development and all release branches:
Warn: 'stale review dismissal' is disabled on branch 'main'
Warn: branch 'main' does not require approvers
Warn: codeowners review is not required on branch 'main'
Warn: 'last push approval' is disabled on branch 'main'
Warn: no status checks found to merge onto branch 'main'
Click Remediation section below to solve this issue`;
const CII_BEST_PRACTICES_MESSAGE =
  "score is 0: no effort to earn an OpenSSF best practices badge detected\nClick Remediation section below to solve this issue";

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

function repositoryPolicyFinding(ruleId, message) {
  return {
    ruleId,
    message: { text: message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: "no file associated with this alert",
            uriBaseId: "%SRCROOT%",
          },
          region: { startLine: 1 },
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
const exactPullRequestTokenFinding = finding("TokenPermissionsID", {
  path: ".github/workflows/codeql.yml",
  snippet: "write-all",
  message: TOKEN_PULL_REQUEST_MESSAGE,
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
const exactBranchProtectionFinding = repositoryPolicyFinding(
  "BranchProtectionID",
  BRANCH_PROTECTION_MESSAGE,
);
const exactCodeReviewFinding = repositoryPolicyFinding(
  "CodeReviewID",
  "score is 0: Found 0/18 approved changesets -- score normalized to 0\nClick Remediation section below to solve this issue",
);
const exactCiiBestPracticesFinding = repositoryPolicyFinding(
  "CIIBestPracticesID",
  CII_BEST_PRACTICES_MESSAGE,
);

test("accepts an empty result set", () => {
  assert.deepEqual(unapprovedFindings(sarif([])), []);
});

test("accepts only the exact write-all and Wrangler policy signatures", () => {
  assert.deepEqual(
    unapprovedFindings(
      sarif([
        exactTokenFinding,
        exactPullRequestTokenFinding,
        exactWranglerFinding,
        exactWranglerReconcileFinding,
      ]),
    ),
    [],
  );
});

test("accepts only the intentional repository-policy signatures", () => {
  assert.deepEqual(
    unapprovedFindings(
      sarif([
        exactBranchProtectionFinding,
        exactCodeReviewFinding,
        exactCiiBestPracticesFinding,
      ]),
    ),
    [],
  );

  for (const denominator of [1, 18, 30]) {
    assert.equal(
      isApprovedFinding(
        repositoryPolicyFinding(
          "CodeReviewID",
          `score is 0: Found 0/${denominator} approved changesets -- score normalized to 0\nClick Remediation section below to solve this issue`,
        ),
      ),
      true,
    );
  }
});

test("rejects every non-policy Scorecard result, including binary artifacts", () => {
  const ruleIds = [
    "FuzzingID",
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

test("fails closed when a repository-policy signature drifts", () => {
  const changedLocation = structuredClone(exactBranchProtectionFinding);
  changedLocation.locations[0].physicalLocation.artifactLocation.uri =
    ".github/workflows/scorecard.yml";
  const changedLine = structuredClone(exactCodeReviewFinding);
  changedLine.locations[0].physicalLocation.region.startLine = 2;
  const changedBase = structuredClone(exactCiiBestPracticesFinding);
  changedBase.locations[0].physicalLocation.artifactLocation.uriBaseId =
    "%OTHERROOT%";
  const extraLocation = structuredClone(exactBranchProtectionFinding);
  extraLocation.locations.push(structuredClone(extraLocation.locations[0]));
  const extraLocationField = structuredClone(exactCodeReviewFinding);
  extraLocationField.locations[0].analysisTarget = { uri: "ignored" };
  const extraArtifactField = structuredClone(exactBranchProtectionFinding);
  extraArtifactField.locations[0].physicalLocation.artifactLocation.index = 0;
  const extraRegionField = structuredClone(exactCiiBestPracticesFinding);
  extraRegionField.locations[0].physicalLocation.region.endLine = 1;

  for (const changed of [
    repositoryPolicyFinding(
      "BranchProtectionID",
      `${BRANCH_PROTECTION_MESSAGE}\nWarn: an additional protection regressed`,
    ),
    repositoryPolicyFinding(
      "BranchProtectionID",
      BRANCH_PROTECTION_MESSAGE.replace(
        "Warn: no status checks found to merge onto branch 'main'\n",
        "",
      ),
    ),
    repositoryPolicyFinding(
      "CodeReviewID",
      "score is 0: Found 1/18 approved changesets -- score normalized to 0\nClick Remediation section below to solve this issue",
    ),
    repositoryPolicyFinding(
      "CodeReviewID",
      "score is 0: Found 0/0 approved changesets -- score normalized to 0\nClick Remediation section below to solve this issue",
    ),
    repositoryPolicyFinding(
      "CodeReviewID",
      "score is 0: Found 0/018 approved changesets -- score normalized to 0\nClick Remediation section below to solve this issue",
    ),
    repositoryPolicyFinding(
      "CIIBestPracticesID",
      `${CII_BEST_PRACTICES_MESSAGE} altered`,
    ),
    changedLocation,
    changedLine,
    changedBase,
    extraLocation,
    extraLocationField,
    extraArtifactField,
    extraRegionField,
  ]) {
    assert.equal(isApprovedFinding(changed), false);
  }
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
  for (const malformedRun of [null, undefined, false, 0, "run", []]) {
    assert.throws(
      () => unapprovedFindings({ runs: [malformedRun] }),
      /run must be an object/,
    );
  }
  assert.throws(
    () => unapprovedFindings({ runs: [{ results: "not-an-array" }] }),
    /results value must be an array/,
  );
});
