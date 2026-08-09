import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const WORKFLOW_PATH = /^\.github\/workflows\/([^/]+\.ya?ml)$/;
const PINNED_DEPENDENCY_MESSAGE =
  "score is 8: npmCommand not pinned by hash\nClick Remediation section below to solve this issue";
const APPROVED_WRANGLER_SNIPPETS = new Set([
  'npm install --prefix "$wrangler_prefix" --save-exact --ignore-scripts --no-audit --no-fund wrangler@latest',
  'npm install --prefix "$wrangler_prefix" --ignore-scripts --no-audit --no-fund',
]);

function location(result) {
  return result?.locations?.[0]?.physicalLocation ?? {};
}

function tokenPermissionsMessages(workflowFile) {
  const prefix = `score is 5: topLevel permissions set to 'write-all'
Remediation tip: Visit [https://app.stepsecurity.io/secureworkflow](`;
  const suffix = `).
Tick the 'Restrict permissions for GITHUB_TOKEN'
Untick other options
NOTE: If you want to resolve multiple issues at once, you can visit [https://app.stepsecurity.io/securerepo](https://app.stepsecurity.io/securerepo) instead.
Click Remediation section below for further remediation help`;
  return new Set([
    `${prefix}https://app.stepsecurity.io/secureworkflow/github.com/LCV-Ideas-Software/astrologo-app/${workflowFile}/main?enable=permissions${suffix}`,
    `${prefix}https://app.stepsecurity.io/secureworkflow/file://./${workflowFile}/unknown?enable=permissions${suffix}`,
  ]);
}

export function isApprovedFinding(result) {
  const physicalLocation = location(result);
  const path = physicalLocation.artifactLocation?.uri ?? "";
  const snippet = physicalLocation.region?.snippet?.text ?? "";
  const message = result?.message?.text ?? "";

  if (result?.ruleId === "TokenPermissionsID") {
    const match = WORKFLOW_PATH.exec(path);
    return (
      match !== null &&
      snippet === "write-all" &&
      tokenPermissionsMessages(match[1]).has(message)
    );
  }

  if (result?.ruleId === "PinnedDependenciesID") {
    return (
      path === ".github/workflows/deploy.yml" &&
      message === PINNED_DEPENDENCY_MESSAGE &&
      APPROVED_WRANGLER_SNIPPETS.has(snippet)
    );
  }

  return false;
}

export function unapprovedFindings(sarif) {
  if (!sarif || typeof sarif !== "object" || !Array.isArray(sarif.runs)) {
    throw new TypeError("Scorecard SARIF must contain a runs array");
  }
  if (sarif.runs.length === 0) {
    throw new TypeError("Scorecard SARIF must contain at least one run");
  }

  const findings = [];
  for (const run of sarif.runs) {
    if (run?.results !== undefined && !Array.isArray(run.results)) {
      throw new TypeError(
        "Every Scorecard SARIF results value must be an array",
      );
    }
    for (const result of run?.results ?? []) {
      if (!isApprovedFinding(result)) {
        const physicalLocation = location(result);
        findings.push({
          ruleId: result?.ruleId ?? "unknown",
          path: physicalLocation.artifactLocation?.uri ?? "unknown",
          line: physicalLocation.region?.startLine ?? null,
        });
      }
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
