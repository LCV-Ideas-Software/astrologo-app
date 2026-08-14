import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REPOSITORY_POLICY_PATH = "no file associated with this alert";
const BRANCH_PROTECTION_MESSAGE = `score is 3: branch protection is not maximal on development and all release branches:
Warn: 'stale review dismissal' is disabled on branch 'main'
Warn: branch 'main' does not require approvers
Warn: codeowners review is not required on branch 'main'
Warn: 'last push approval' is disabled on branch 'main'
Warn: 'up-to-date branches' is disabled on branch 'main'
Click Remediation section below to solve this issue`;
const CODE_REVIEW_MESSAGE =
  /^score is 0: Found 0\/[1-9]\d* approved changesets -- score normalized to 0\nClick Remediation section below to solve this issue$/;
const CII_BEST_PRACTICES_MESSAGE =
  "score is 0: no effort to earn an OpenSSF best practices badge detected\nClick Remediation section below to solve this issue";

function location(result) {
  return result?.locations?.[0]?.physicalLocation ?? {};
}

function hasExactKeys(object, keys) {
  if (object === null || typeof object !== "object" || Array.isArray(object)) {
    return false;
  }
  const objectKeys = Object.keys(object);
  return (
    objectKeys.length === keys.size && objectKeys.every((key) => keys.has(key))
  );
}

function isRepositoryPolicyLocation(physicalLocation) {
  return (
    physicalLocation.artifactLocation?.uri === REPOSITORY_POLICY_PATH &&
    physicalLocation.artifactLocation?.uriBaseId === "%SRCROOT%" &&
    physicalLocation.region?.startLine === 1 &&
    physicalLocation.region?.snippet === undefined
  );
}

function hasCanonicalRepositoryPolicyLocation(result) {
  if (!Array.isArray(result?.locations) || result.locations.length !== 1) {
    return false;
  }
  const [entry] = result.locations;
  if (!hasExactKeys(entry, new Set(["physicalLocation"]))) {
    return false;
  }

  const physicalLocation = entry.physicalLocation;
  if (
    !hasExactKeys(physicalLocation, new Set(["artifactLocation", "region"]))
  ) {
    return false;
  }
  if (
    !hasExactKeys(
      physicalLocation.artifactLocation,
      new Set(["uri", "uriBaseId"]),
    )
  ) {
    return false;
  }
  if (!hasExactKeys(physicalLocation.region, new Set(["startLine"]))) {
    return false;
  }

  return isRepositoryPolicyLocation(physicalLocation);
}

function hasCanonicalRepositoryPolicyResult(result) {
  if (
    !hasExactKeys(
      result,
      new Set(["ruleId", "ruleIndex", "message", "locations"]),
    )
  ) {
    return false;
  }
  if (!Number.isSafeInteger(result.ruleIndex) || result.ruleIndex < 0) {
    return false;
  }
  if (!hasExactKeys(result.message, new Set(["text"]))) {
    return false;
  }
  return hasCanonicalRepositoryPolicyLocation(result);
}

export function isApprovedFinding(result) {
  const message = result?.message?.text ?? "";

  if (result?.ruleId === "BranchProtectionID") {
    if (!hasCanonicalRepositoryPolicyResult(result)) {
      return false;
    }
    return message === BRANCH_PROTECTION_MESSAGE;
  }
  if (result?.ruleId === "CodeReviewID") {
    if (!hasCanonicalRepositoryPolicyResult(result)) {
      return false;
    }
    return CODE_REVIEW_MESSAGE.test(message);
  }
  if (result?.ruleId === "CIIBestPracticesID") {
    if (!hasCanonicalRepositoryPolicyResult(result)) {
      return false;
    }
    return message === CII_BEST_PRACTICES_MESSAGE;
  }

  return false;
}

export function scorecardResults(sarif) {
  if (
    !sarif ||
    typeof sarif !== "object" ||
    Array.isArray(sarif) ||
    sarif.version !== "2.1.0" ||
    !Array.isArray(sarif.runs)
  ) {
    throw new TypeError("Scorecard SARIF must contain a runs array");
  }
  if (sarif.runs.length === 0) {
    throw new TypeError("Scorecard SARIF must contain at least one run");
  }
  if (sarif.inlineExternalProperties !== undefined) {
    throw new TypeError(
      "Scorecard SARIF must not externalize inline properties",
    );
  }

  const results = [];
  for (const run of sarif.runs) {
    if (run === null || typeof run !== "object" || Array.isArray(run)) {
      throw new TypeError("Every Scorecard SARIF run must be an object");
    }
    if (run.externalPropertyFileReferences !== undefined) {
      throw new TypeError(
        "Scorecard SARIF must not externalize run properties",
      );
    }
    if (!hasExactKeys(run, new Set(["automationDetails", "tool", "results"]))) {
      throw new TypeError(
        "Every Scorecard SARIF run must keep its canonical inline shape",
      );
    }
    if (
      run.automationDetails === null ||
      typeof run.automationDetails !== "object" ||
      Array.isArray(run.automationDetails) ||
      typeof run.automationDetails.id !== "string" ||
      run.automationDetails.id.trim() === ""
    ) {
      throw new TypeError(
        "Every Scorecard SARIF run must identify its automation details",
      );
    }
    if (
      run.tool === null ||
      typeof run.tool !== "object" ||
      Array.isArray(run.tool) ||
      run.tool.driver === null ||
      typeof run.tool.driver !== "object" ||
      Array.isArray(run.tool.driver) ||
      run.tool.driver.name !== "Scorecard" ||
      typeof run.tool.driver.semanticVersion !== "string" ||
      run.tool.driver.semanticVersion.trim() === "" ||
      !Array.isArray(run.tool.driver.rules)
    ) {
      throw new TypeError(
        "Every Scorecard SARIF run must use the canonical Scorecard driver",
      );
    }
    const ruleIds = run.tool.driver.rules.map((rule) => rule?.id);
    if (
      ruleIds.some((ruleId) => typeof ruleId !== "string" || ruleId === "") ||
      new Set(ruleIds).size !== ruleIds.length
    ) {
      throw new TypeError(
        "Every Scorecard SARIF rule descriptor must have a unique identifier",
      );
    }
    if (!Array.isArray(run.results)) {
      throw new TypeError(
        "Every Scorecard SARIF results value must be an array",
      );
    }
    for (const result of run.results) {
      if (
        typeof result?.ruleId !== "string" ||
        result.ruleId === "" ||
        !Number.isSafeInteger(result.ruleIndex) ||
        result.ruleIndex < 0 ||
        run.tool.driver.rules[result.ruleIndex]?.id !== result.ruleId
      ) {
        throw new TypeError(
          "Every Scorecard SARIF result must bind to its exact rule descriptor",
        );
      }
      results.push(result);
    }
  }
  return results;
}

export function unapprovedFindings(sarif) {
  const findings = [];
  for (const result of scorecardResults(sarif)) {
    if (!isApprovedFinding(result)) {
      const physicalLocation = location(result);
      findings.push({
        ruleId: result?.ruleId ?? "unknown",
        path: physicalLocation.artifactLocation?.uri ?? "unknown",
        line: physicalLocation.region?.startLine ?? null,
      });
    }
  }
  return findings;
}

function annotationValue(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

export function enforceScorecard(sarif) {
  const findings = unapprovedFindings(sarif);
  for (const finding of findings) {
    console.error(
      `::error::OpenSSF Scorecard finding is not approved: rule=${annotationValue(finding.ruleId)} path=${annotationValue(finding.path)} line=${annotationValue(finding.line ?? "unknown")}`,
    );
  }
  return findings.length === 0;
}

function main() {
  const sarifPath = process.argv[2];
  if (!sarifPath) {
    throw new TypeError(
      "Usage: node enforce-scorecard.mjs <scorecard-results.sarif>",
    );
  }
  const sarif = JSON.parse(readFileSync(sarifPath, "utf8"));
  if (!enforceScorecard(sarif)) {
    process.exitCode = 1;
    return;
  }
  console.log(
    "OpenSSF Scorecard reported only exact approved policy findings.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main();
  } catch (error) {
    console.error(
      `::error::OpenSSF Scorecard enforcement failed closed: ${annotationValue(error.message)}`,
    );
    process.exitCode = 1;
  }
}
