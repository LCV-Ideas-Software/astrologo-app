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
Warn: 'up-to-date branches' is disabled on branch 'main'
Click Remediation section below to solve this issue`;
const CII_BEST_PRACTICES_MESSAGE =
  "score is 0: no effort to earn an OpenSSF best practices badge detected\nClick Remediation section below to solve this issue";
const TRUSTED_BASE_CHECKOUT_MESSAGE = `score is 0: untrusted code checkout '\${{ github.event.pull_request.base.sha }}'
Remediation tip: Avoid the dangerous workflow patterns.
See [this post](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/) for information on avoiding untrusted code checkouts.
Click Remediation section below for further remediation help`;
const TRUSTED_BASE_CHECKOUT_LOCATION_MESSAGE = `untrusted code checkout '\${{ github.event.pull_request.base.sha }}'
Remediation tip: Avoid the dangerous workflow patterns.
See [this post](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/) for information on avoiding untrusted code checkouts.`;

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

function repositoryPolicyFinding(ruleId, message, ruleIndex = 0) {
  return {
    ruleId,
    ruleIndex,
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

function trustedBaseCheckoutFinding() {
  return {
    ruleId: "DangerousWorkflowID",
    ruleIndex: 3,
    message: { text: TRUSTED_BASE_CHECKOUT_MESSAGE },
    locations: [
      {
        physicalLocation: {
          region: {
            startLine: 29,
            endLine: 29,
            snippet: { text: "${{ github.event.pull_request.base.sha }}" },
          },
          artifactLocation: {
            uri: ".github/workflows/native-auto-merge.yml",
            uriBaseId: "%SRCROOT%",
          },
        },
        message: { text: TRUSTED_BASE_CHECKOUT_LOCATION_MESSAGE },
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

test("accepts only the exact trusted-base checkout false positive", () => {
  const exact = trustedBaseCheckoutFinding();
  assert.equal(isApprovedFinding(exact), true);
  const reorderedRules = structuredClone(exact);
  reorderedRules.ruleIndex = 4;
  assert.equal(isApprovedFinding(reorderedRules), true);

  const mutations = [
    (result) => (result.ruleIndex = -1),
    (result) => (result.ruleIndex = 0.5),
    (result) => (result.ruleIndex = Number.MAX_SAFE_INTEGER + 1),
    (result) => delete result.ruleIndex,
    (result) =>
      (result.message.text = result.message.text.replace(
        "base.sha",
        "head.sha",
      )),
    (result) =>
      (result.locations[0].physicalLocation.artifactLocation.uri =
        ".github/workflows/dependency-review.yml"),
    (result) => (result.locations[0].physicalLocation.region.startLine = 30),
    (result) => (result.locations[0].physicalLocation.region.endLine = 30),
    (result) =>
      (result.locations[0].physicalLocation.region.snippet.text =
        "${{ github.event.pull_request.head.sha }}"),
    (result) =>
      (result.locations[0].message.text = `${result.locations[0].message.text} altered`),
    (result) => (result.locations[0].physicalLocation.region.extra = true),
    (result) => result.locations.push(structuredClone(result.locations[0])),
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(exact);
    mutate(changed);
    assert.equal(isApprovedFinding(changed), false);
  }
});

test("rejects every non-policy Scorecard result, including binary artifacts", () => {
  const ruleIds = ["FuzzingID", "BinaryArtifactsID", "VulnerabilitiesID"];
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
  const extraResultField = structuredClone(exactBranchProtectionFinding);
  extraResultField.level = "warning";
  const extraResultSuppressions = structuredClone(exactCodeReviewFinding);
  extraResultSuppressions.suppressions = [{ kind: "inSource" }];
  const extraMessageField = structuredClone(exactCiiBestPracticesFinding);
  extraMessageField.message.markdown = "unexpected";
  const missingRuleIndex = structuredClone(exactBranchProtectionFinding);
  delete missingRuleIndex.ruleIndex;
  const negativeRuleIndex = structuredClone(exactCodeReviewFinding);
  negativeRuleIndex.ruleIndex = -1;
  const nonIntegerRuleIndex = structuredClone(exactCiiBestPracticesFinding);
  nonIntegerRuleIndex.ruleIndex = 0.5;
  const unsafeRuleIndex = structuredClone(exactBranchProtectionFinding);
  unsafeRuleIndex.ruleIndex = Number.MAX_SAFE_INTEGER + 1;

  for (const changed of [
    repositoryPolicyFinding(
      "BranchProtectionID",
      `${BRANCH_PROTECTION_MESSAGE}\nWarn: an additional protection regressed`,
    ),
    repositoryPolicyFinding(
      "BranchProtectionID",
      BRANCH_PROTECTION_MESSAGE.replace(
        "Warn: 'up-to-date branches' is disabled on branch 'main'\n",
        "",
      ),
    ),
    repositoryPolicyFinding(
      "BranchProtectionID",
      BRANCH_PROTECTION_MESSAGE.replace(
        "Warn: 'up-to-date branches' is disabled on branch 'main'",
        "Warn: no status checks found to merge onto branch 'main'",
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
    extraResultField,
    extraResultSuppressions,
    extraMessageField,
    missingRuleIndex,
    negativeRuleIndex,
    nonIntegerRuleIndex,
    unsafeRuleIndex,
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
