import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const WORKFLOWS_URL = new URL("../workflows/", import.meta.url);
const SCORECARD_WORKFLOW_URL = new URL("scorecard.yml", WORKFLOWS_URL);
const PAGES_WORKFLOW_URL = new URL("pages.yml", WORKFLOWS_URL);
const DEPLOY_WORKFLOW_URL = new URL("deploy.yml", WORKFLOWS_URL);
const ZIZMOR_WORKFLOW_URL = new URL("zizmor.yml", WORKFLOWS_URL);
const ZIZMOR_CONFIG_URL = new URL("../zizmor.yml", import.meta.url);
const ROOT_PACKAGE_URL = new URL("../../package.json", import.meta.url);
const FRONTEND_PACKAGE_URL = new URL(
  "../../astrologo-frontend/package.json",
  import.meta.url,
);
const FRONTEND_LOCK_URL = new URL(
  "../../astrologo-frontend/package-lock.json",
  import.meta.url,
);
const CENTRAL_ZIZMOR_SUCCESSOR =
  "LCV-Ideas-Software/.github/.github/workflows/zizmor.yml@f90943a06122468b316c05bb88403d2df451b9f8 # zizmor/v2.3.1";
const EXACT_PERMISSION_BLOCKS = new Map([
  [
    "auto-release.yml",
    [
      "workflow:{}",
      "job:auto-release:actions=read,contents=write,security-events=read",
    ],
  ],
  [
    "codeql.yml",
    ["workflow:{}", "job:analyze:contents=read,security-events=write"],
  ],
  [
    "dependency-review.yml",
    ["workflow:{}", "job:dependency_review:contents=read"],
  ],
  ["deploy.yml", ["workflow:{}", "job:deploy:contents=read"]],
  [
    "native-auto-merge.yml",
    ["workflow:{}", "job:dependency_review:contents=read,pull-requests=read"],
  ],
  [
    "pages.yml",
    [
      "workflow:{}",
      "job:build:contents=read,pages=read",
      "job:deploy:id-token=write,pages=write",
    ],
  ],
  [
    "scorecard.yml",
    [
      "workflow:{}",
      "job:enforce-binary-artifacts:contents=read",
      "job:policy:contents=read",
      "job:scorecard:contents=read,security-events=write",
    ],
  ],
  [
    "zizmor.yml",
    [
      "workflow:{}",
      "job:zizmor:actions=read,contents=read,security-events=write",
    ],
  ],
]);

function namedStep(workflow, name) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.indexOf(`      - name: ${name}`);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);

  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith("      - ")) end += 1;
  return lines.slice(start, end).join("\n");
}

function jobBlock(workflow, job, nextJob) {
  const start = workflow.indexOf(`\n  ${job}:`);
  assert.notEqual(start, -1, `missing workflow job: ${job}`);
  const end = nextJob ? workflow.indexOf(`\n  ${nextJob}:`, start + 1) : -1;
  return workflow.slice(start, end === -1 ? undefined : end);
}

function permissionBlocks(workflow) {
  const lines = workflow.split(/\r?\n/);
  const blocks = [];
  let currentJob = null;
  let inJobs = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === "jobs:") {
      inJobs = true;
      currentJob = null;
      continue;
    }
    if (inJobs) {
      const job = lines[index].match(/^  ([A-Za-z0-9_-]+):\s*$/);
      if (job) currentJob = job[1];
      else if (/^\S/.test(lines[index])) {
        inJobs = false;
        currentJob = null;
      }
    }

    const start = lines[index].match(/^(\s*)permissions:\s*(.*)$/);
    if (!start) continue;

    const indent = start[1].length;
    const owner =
      indent === 0
        ? "workflow"
        : (() => {
            assert.equal(
              indent,
              4,
              "permissions must be workflow or job scoped",
            );
            assert.notEqual(
              currentJob,
              null,
              "job permissions must belong to a named job",
            );
            return `job:${currentJob}`;
          })();
    if (start[2] === "{}") {
      blocks.push(`${owner}:{}`);
      continue;
    }
    assert.equal(start[2], "", "permissions must be a map or an empty map");

    const scopes = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const trimmed = lines[cursor].trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      const scope = lines[cursor].match(
        new RegExp(`^ {${indent + 2}}([a-z-]+): (read|write)(?: #.*)?$`),
      );
      if (!scope) break;
      scopes.push(`${scope[1]}=${scope[2]}`);
    }
    assert.ok(
      scopes.length > 0,
      "permissions map must not be empty implicitly",
    );
    blocks.push(`${owner}:${scopes.sort().join(",")}`);
  }
  return blocks.sort();
}

function assertExactPermissions(file, workflow) {
  assert.deepEqual(
    permissionBlocks(workflow),
    [...EXACT_PERMISSION_BLOCKS.get(file)].sort(),
    `${file} permissions drifted from least privilege`,
  );
}

test("all operational workflows use the exact least-privilege maps", async () => {
  const files = (await readdir(WORKFLOWS_URL)).filter((file) =>
    /\.ya?ml$/i.test(file),
  );
  assert.deepEqual(files.sort(), [...EXACT_PERMISSION_BLOCKS.keys()].sort());
  for (const file of files) {
    const workflow = await readFile(new URL(file, WORKFLOWS_URL), "utf8");
    assertExactPermissions(file, workflow);
  }

  const deploy = await readFile(DEPLOY_WORKFLOW_URL, "utf8");
  assert.throws(() =>
    assertExactPermissions(
      "deploy.yml",
      deploy.replace(
        "      contents: read",
        "      contents: read\n      issues: write",
      ),
    ),
  );
  assert.throws(() =>
    assertExactPermissions(
      "deploy.yml",
      deploy.replace(
        "      contents: read",
        "      contents: read\n      # comment-only line\n      issues: write",
      ),
    ),
  );
  assert.throws(() =>
    assertExactPermissions(
      "deploy.yml",
      deploy.replace("      contents: read", "      contents: write"),
    ),
  );

  const pages = await readFile(PAGES_WORKFLOW_URL, "utf8");
  const buildPermissions =
    "    permissions:\n      contents: read\n      pages: read # Read the existing Pages configuration before building.";
  const deployPermissions =
    "    permissions:\n      id-token: write # Request the OIDC token used by Pages deployment.\n      pages: write # Publish the validated Pages artifact.";
  const swapped = pages
    .replace(buildPermissions, "__BUILD_PERMISSIONS__")
    .replace(deployPermissions, buildPermissions)
    .replace("__BUILD_PERMISSIONS__", deployPermissions);
  assert.notEqual(swapped, pages, "Pages permission swap fixture must mutate");
  assert.throws(() => assertExactPermissions("pages.yml", swapped));
});

test("Scorecard runs only on supported main and schedule events with split privileges", async () => {
  const workflow = await readFile(SCORECARD_WORKFLOW_URL, "utf8");

  assert.match(workflow, /\n  push:\n\s+branches: \[main\]/);
  assert.match(workflow, /\n  schedule:\n\s+- cron:/);
  assert.doesNotMatch(workflow, /\n  pull_request:/);
  assert.doesNotMatch(workflow, /\n  merge_group:/);
  assert.doesNotMatch(workflow, /\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /GITHUB_EVENT_NAME=pull_request/);
  assert.doesNotMatch(workflow, /docker run/);

  const producerJob = jobBlock(workflow, "scorecard", "policy");
  assert.doesNotMatch(producerJob, /\n\s+run:/);
  assert.deepEqual(
    [...producerJob.matchAll(/\n\s+uses: ([^\n]+)/g)].map((match) => match[1]),
    [
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1",
      "ossf/scorecard-action@2d1146689b8cda280b9bc96326124645441f03bc # v2.4.4",
      "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1",
      "github/codeql-action/upload-sarif@5595ccaf912efad79be6eef63a5619ff05969be3 # v4.37.6",
    ],
  );

  const producer = namedStep(workflow, "Run Scorecard");
  assert.match(producer, /uses: ossf\/scorecard-action@[0-9a-f]{40}/);
  assert.match(producer, /publish_results: false/);
  assert.doesNotMatch(producer, /continue-on-error:/);
  assert.doesNotMatch(
    workflow.match(/\n  scorecard:[\s\S]*?\n  policy:/)?.[0] ?? "",
    /id-token:\s*write/,
  );
  assert.match(
    namedStep(workflow, "Upload SARIF artifact"),
    /if-no-files-found: error/,
  );
  assert.match(
    namedStep(workflow, "Require Scorecard SARIF"),
    /test -s scorecard-results\.sarif/,
  );

  const policy = namedStep(workflow, "Test Scorecard policy enforcement");
  assert.match(
    policy,
    /node --test\s+\.github\/scripts\/enforce-scorecard\.test\.mjs\s+\.github\/scripts\/scorecard-workflow\.test\.mjs/,
  );
  assert.doesNotMatch(policy, /continue-on-error:/);
  assert.match(
    workflow,
    /\n  policy:[\s\S]*?permissions:\n      contents: read/,
  );
  assert.doesNotMatch(
    workflow.match(/\n  policy:[\s\S]*?\n  enforce-binary-artifacts:/)?.[0] ??
      "",
    /id-token:\s*write/,
  );
  const binaryJob = jobBlock(workflow, "enforce-binary-artifacts");
  assert.match(
    binaryJob,
    /import \{ scorecardResults \} from '\.\/\.github\/scripts\/enforce-scorecard\.mjs';/,
  );
  assert.match(binaryJob, /scorecardResults\(sarif\)/);
});

test("Pages owns the formatting context and deploys only after the validated build", async () => {
  const workflow = await readFile(PAGES_WORKFLOW_URL, "utf8");
  assert.match(workflow, /\n  pull_request:\n\s+branches: \[main\]/);
  assert.match(workflow, /\n  merge_group:\n\s+types:\n\s+- checks_requested/);
  assert.match(workflow, /\n  build:\n\s+name: Build Pages artifact/);
  assert.match(workflow, /npm run format:public:check/);
  assert.match(workflow, /npm run build:functions/);
  assert.match(workflow, /\n  deploy:[\s\S]*?needs: build/);
  assert.match(
    workflow,
    /if: github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)/,
  );
  assert.match(
    workflow,
    /\n      id-token: write(?: #.*)?\n      pages: write(?: #.*)?/,
  );
  assert.doesNotMatch(workflow, /enablement: true/);
});

test("Wrangler is resolved only from the exact reviewed manifest and lockfile", async () => {
  const [rootPackage, frontendPackage, frontendLock, deployWorkflow] =
    await Promise.all([
      readFile(ROOT_PACKAGE_URL, "utf8").then(JSON.parse),
      readFile(FRONTEND_PACKAGE_URL, "utf8").then(JSON.parse),
      readFile(FRONTEND_LOCK_URL, "utf8").then(JSON.parse),
      readFile(DEPLOY_WORKFLOW_URL, "utf8"),
    ]);

  assert.equal(rootPackage.dependencies?.wrangler, undefined);
  assert.equal(rootPackage.devDependencies?.wrangler, undefined);
  assert.match(
    frontendPackage.devDependencies?.wrangler ?? "",
    /^\d+\.\d+\.\d+$/,
    "Wrangler must be an exact SemVer dependency",
  );
  assert.equal(
    frontendLock.packages?.[""]?.devDependencies?.wrangler,
    frontendPackage.devDependencies.wrangler,
    "the lockfile root must preserve the exact Wrangler version",
  );
  assert.doesNotMatch(deployWorkflow, /wrangler@(?:latest|next|\^|~)/i);
  assert.doesNotMatch(
    deployWorkflow,
    /npm\s+(?:install|add)[^\n]*\bwrangler@/i,
  );
  assert.match(deployWorkflow, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(deployWorkflow, /npm audit signatures/);
});

test("Zizmor delegates to the immutable signed successor baseline", async () => {
  const workflow = await readFile(ZIZMOR_WORKFLOW_URL, "utf8");
  assert.equal(
    workflow.match(
      /LCV-Ideas-Software\/\.github\/\.github\/workflows\/zizmor\.yml@[0-9a-f]{40} # zizmor\/v\d+\.\d+\.\d+/g,
    )?.[0],
    CENTRAL_ZIZMOR_SUCCESSOR,
  );
  assert.match(workflow, /Signed successor baseline authorized by #289/);
});

test("Zizmor audits excessive permissions and dangerous triggers without broad waivers", async () => {
  const config = await readFile(ZIZMOR_CONFIG_URL, "utf8");
  assert.doesNotMatch(config, /write-all/);
  assert.doesNotMatch(config, /excessive-permissions:\s*\n\s+disable:\s*true/);
  assert.doesNotMatch(
    config,
    /dangerous-triggers:[\s\S]*?native-auto-merge\.yml/,
  );
});
