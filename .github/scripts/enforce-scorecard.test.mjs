import assert from "node:assert/strict";
import test from "node:test";

import {
  isApprovedFinding,
  scorecardResults,
  unapprovedFindings,
} from "./enforce-scorecard.mjs";

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
const TRUSTED_BASE_CHECKOUT_MESSAGE = `score is 0: untrusted code checkout '\${{ github.event.pull_request.base.sha }}'
Remediation tip: Avoid the dangerous workflow patterns.
See [this post](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/) for information on avoiding untrusted code checkouts.
Click Remediation section below for further remediation help`;
const TRUSTED_BASE_CHECKOUT_LOCATION_MESSAGE = `untrusted code checkout '\${{ github.event.pull_request.base.sha }}'
Remediation tip: Avoid the dangerous workflow patterns.
See [this post](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/) for information on avoiding untrusted code checkouts.`;
const BRANCH_PROTECTION_MESSAGE = `score is 3: branch protection is not maximal on development and all release branches:
Warn: 'stale review dismissal' is disabled on branch 'main'
Warn: branch 'main' does not require approvers
Warn: codeowners review is not required on branch 'main'
Warn: 'last push approval' is disabled on branch 'main'
Warn: 'up-to-date branches' is disabled on branch 'main'
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
  const ruleIds = [...new Set(results.map(({ ruleId }) => ruleId))];
  const rules = ruleIds.map((id) => ({ id }));
  return {
    version: "2.1.0",
    runs: [
      {
        automationDetails: { id: "supply-chain/local/test" },
        tool: {
          driver: {
            name: "Scorecard",
            semanticVersion: "v5.5.0",
            rules,
          },
        },
        results: results.map((result) => ({
          ...result,
          ruleIndex: rules.findIndex(({ id }) => id === result.ruleId),
        })),
      },
    ],
  };
}

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

test("rejects every revoked workflow-policy exception", () => {
  const revoked = [
    finding("TokenPermissionsID", {
      path: ".github/workflows/codeql.yml",
      snippet: "write-all",
      message: TOKEN_MESSAGE,
    }),
    finding("TokenPermissionsID", {
      path: ".github/workflows/codeql.yml",
      snippet: "write-all",
      message: TOKEN_PULL_REQUEST_MESSAGE,
    }),
    trustedBaseCheckoutFinding(),
    finding("PinnedDependenciesID", {
      path: ".github/workflows/deploy.yml",
      snippet:
        'npm install --prefix "$wrangler_prefix" --save-exact --ignore-scripts --no-audit --no-fund wrangler@latest',
      message: PINNED_MESSAGE,
    }),
    finding("PinnedDependenciesID", {
      path: ".github/workflows/deploy.yml",
      snippet:
        'npm install --prefix "$wrangler_prefix" --ignore-scripts --no-audit --no-fund',
      message: PINNED_MESSAGE,
    }),
  ];

  assert.deepEqual(
    unapprovedFindings(sarif(revoked)).map(({ ruleId }) => ruleId),
    [
      "TokenPermissionsID",
      "TokenPermissionsID",
      "DangerousWorkflowID",
      "PinnedDependenciesID",
      "PinnedDependenciesID",
    ],
  );
  for (const result of revoked) assert.equal(isApprovedFinding(result), false);
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

test("rejects malformed or empty SARIF documents", () => {
  const validRun = sarif([]).runs[0];
  for (const malformedDocument of [
    null,
    false,
    0,
    "sarif",
    [],
    {},
    { runs: [validRun] },
    { version: "2.0.0", runs: [validRun] },
  ]) {
    assert.throws(() => unapprovedFindings(malformedDocument), /runs array/);
  }
  assert.throws(
    () => unapprovedFindings({ version: "2.1.0", runs: [] }),
    /at least one run/,
  );
  for (const malformedRun of [null, undefined, false, 0, "run", []]) {
    assert.throws(
      () => unapprovedFindings({ version: "2.1.0", runs: [malformedRun] }),
      /run must be an object/,
    );
  }
  for (const automationDetails of [
    undefined,
    null,
    [],
    {},
    { id: "" },
    { id: "   " },
    { id: 1 },
  ]) {
    assert.throws(
      () =>
        unapprovedFindings({
          version: "2.1.0",
          runs: [{ ...validRun, automationDetails }],
        }),
      /automation details/,
    );
  }
  for (const driver of [
    undefined,
    null,
    [],
    {},
    { ...validRun.tool.driver, name: "Other" },
    { ...validRun.tool.driver, semanticVersion: "" },
    { ...validRun.tool.driver, semanticVersion: 1 },
    { ...validRun.tool.driver, rules: undefined },
    { ...validRun.tool.driver, rules: null },
    { ...validRun.tool.driver, rules: {} },
  ]) {
    assert.throws(
      () =>
        unapprovedFindings({
          version: "2.1.0",
          runs: [{ ...validRun, tool: { driver } }],
        }),
      /canonical Scorecard driver/,
    );
  }
  for (const tool of [undefined, null, []]) {
    assert.throws(
      () =>
        unapprovedFindings({
          version: "2.1.0",
          runs: [{ ...validRun, tool }],
        }),
      /canonical Scorecard driver/,
    );
  }
  for (const results of [undefined, null, "not-an-array", {}]) {
    assert.throws(
      () =>
        unapprovedFindings({
          version: "2.1.0",
          runs: [{ ...validRun, results }],
        }),
      /results value must be an array/,
    );
  }
  assert.throws(
    () =>
      unapprovedFindings({
        version: "2.1.0",
        runs: [validRun, { ...validRun, results: undefined }],
      }),
    /results value must be an array/,
  );
});

test("rejects externalized findings and inconsistent rule descriptors", () => {
  const approved = sarif([exactCiiBestPracticesFinding]);
  const [validRun] = approved.runs;
  assert.throws(
    () =>
      unapprovedFindings({
        ...approved,
        inlineExternalProperties: [
          { results: [{ ruleId: "VulnerabilitiesID" }] },
        ],
      }),
    /must not externalize inline properties/,
  );
  for (const externalPropertyFileReferences of [
    {},
    { results: [] },
    {
      results: [
        { location: { uri: "hidden-results.sarif-external-properties" } },
      ],
    },
  ]) {
    assert.throws(
      () =>
        unapprovedFindings({
          ...approved,
          runs: [{ ...validRun, externalPropertyFileReferences }],
        }),
      /must not externalize run properties/,
    );
  }
  for (const [field, value] of [
    ["conversion", {}],
    ["invocations", []],
    ["properties", {}],
  ]) {
    assert.throws(
      () =>
        scorecardResults({
          ...approved,
          runs: [{ ...validRun, [field]: value }],
        }),
      /canonical inline shape/,
    );
  }
  for (const mutation of [
    { ...validRun, tool: { driver: { ...validRun.tool.driver, rules: [] } } },
    {
      ...validRun,
      tool: {
        driver: {
          ...validRun.tool.driver,
          rules: [{ id: "CIIBestPracticesID" }, { id: "CIIBestPracticesID" }],
        },
      },
    },
    { ...validRun, results: [{ ...validRun.results[0], ruleIndex: 1 }] },
    { ...validRun, results: [{ ...validRun.results[0], ruleId: "OtherRule" }] },
  ]) {
    assert.throws(
      () => unapprovedFindings({ ...approved, runs: [mutation] }),
      /rule descriptor/,
    );
  }
});
