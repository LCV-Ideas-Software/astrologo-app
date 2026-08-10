import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const SCORECARD_WORKFLOW_URL = new URL(
  "../workflows/scorecard.yml",
  import.meta.url,
);
const ZIZMOR_WORKFLOW_URL = new URL("../workflows/zizmor.yml", import.meta.url);
const SCORECARD_MERGE_GROUP_IMAGE =
  "ghcr.io/ossf/scorecard-action:v2.4.4@sha256:ae5104dd3cc28466ebeb11144354be4cac4b7ff829654f9fab89021d71c46670";
const CENTRAL_ZIZMOR_V2 =
  "LCV-Ideas-Software/.github/.github/workflows/zizmor.yml@4058fad11eca7c2eb4e9296108667ef6199a6356 # zizmor/v2.0.0";

function namedStep(workflow, name) {
  const lines = workflow.split(/\r?\n/);
  const start = lines.indexOf(`      - name: ${name}`);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);

  let end = start + 1;
  while (end < lines.length && !lines[end].startsWith("      - ")) end += 1;
  return lines.slice(start, end).join("\n");
}

test("pull requests and merge groups produce Scorecard SARIF through the proven execution modes", async () => {
  const workflow = await readFile(SCORECARD_WORKFLOW_URL, "utf8");

  assert.match(workflow, /\n  pull_request:\n\s+branches: \["main"\]/);
  assert.match(workflow, /\n  merge_group:\n\s+types:\n\s+- checks_requested/);

  const regression = namedStep(workflow, "Test Scorecard policy enforcement");
  assert.match(
    regression,
    /node --test\s+\.github\/scripts\/enforce-scorecard\.test\.mjs\s+\.github\/scripts\/scorecard-workflow\.test\.mjs/,
  );
  assert.doesNotMatch(regression, /continue-on-error:/);

  const supported = namedStep(workflow, "Run Scorecard on supported events");
  assert.match(supported, /if: github\.event_name != 'merge_group'/);
  assert.match(supported, /uses: ossf\/scorecard-action@[0-9a-f]{40}/);
  assert.match(supported, /results_file: scorecard-results\.sarif/);
  assert.doesNotMatch(supported, /continue-on-error:/);

  const mergeGroup = namedStep(workflow, "Run Scorecard on merge group");
  assert.match(mergeGroup, /if: github\.event_name == 'merge_group'/);
  assert.deepEqual(
    mergeGroup.match(
      /ghcr\.io\/ossf\/scorecard-action:v\d+\.\d+\.\d+@sha256:[0-9a-f]{64}/g,
    ),
    [SCORECARD_MERGE_GROUP_IMAGE],
  );
  assert.match(mergeGroup, /--env GITHUB_EVENT_NAME=pull_request/);
  assert.match(mergeGroup, /--env INPUT_RESULTS_FILE/);
  assert.match(mergeGroup, /INPUT_RESULTS_FILE: scorecard-results\.sarif/);
  assert.match(mergeGroup, /INPUT_REPO_TOKEN: local-merge-group-no-credential/);
  assert.match(
    mergeGroup,
    /--volume "\$GITHUB_EVENT_PATH:\/github\/event\.json:ro"/,
  );
  assert.match(mergeGroup, /--volume "\$GITHUB_WORKSPACE:\/github\/workspace"/);
  assert.match(mergeGroup, /--env INPUT_REPO_TOKEN/);
  assert.doesNotMatch(mergeGroup, /\$\{\{ github\.token \}\}/);
  assert.doesNotMatch(mergeGroup, /GITHUB_AUTH_TOKEN/);
  assert.doesNotMatch(mergeGroup, /INPUT_INTERNAL_DEFAULT_TOKEN/);
  assert.doesNotMatch(mergeGroup, /continue-on-error:/);

  const requireSarif = namedStep(workflow, "Require Scorecard SARIF");
  assert.match(requireSarif, /test -s scorecard-results\.sarif/);
  assert.doesNotMatch(requireSarif, /if:/);

  const enforcement = namedStep(workflow, "Enforce approved Scorecard policy");
  assert.match(
    enforcement,
    /node \.github\/scripts\/enforce-scorecard\.mjs scorecard-results\.sarif/,
  );
  assert.doesNotMatch(enforcement, /continue-on-error:/);
});

test("Zizmor delegates to the immutable central v2 workflow", async () => {
  const workflow = await readFile(ZIZMOR_WORKFLOW_URL, "utf8");
  assert.equal(
    workflow.match(
      /LCV-Ideas-Software\/\.github\/\.github\/workflows\/zizmor\.yml@[0-9a-f]{40} # zizmor\/v\d+\.\d+\.\d+/g,
    )?.[0],
    CENTRAL_ZIZMOR_V2,
  );
});
