import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { verifyThirdParty } from "./verify-thirdparty.mjs";

const [manifestText, lockfileText, canonical, publicCopy] = await Promise.all([
  readFile(
    new URL("../astrologo-frontend/package.json", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../astrologo-frontend/package-lock.json", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../THIRDPARTY.md", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../astrologo-frontend/public/legal/THIRDPARTY.md",
      import.meta.url,
    ),
    "utf8",
  ),
]);
const manifest = JSON.parse(manifestText);
const lockfile = JSON.parse(lockfileText);

function errorsFor(
  markdown,
  publicMarkdown = markdown,
  candidateLockfile = lockfile,
  candidateManifest = manifest,
) {
  return verifyThirdParty({
    manifest: candidateManifest,
    lockfile: candidateLockfile,
    canonical: markdown,
    publicCopy: publicMarkdown,
  });
}

test("accepts the current complete inventory", () => {
  assert.deepEqual(errorsFor(canonical, publicCopy), []);
});

test("rejects a stale direct version", () => {
  const current = canonical.match(/^\| vite \| ([^|]+) \|/mu)?.[1].trim();
  assert.ok(current);
  const stale = canonical.replace(
    `| vite | ${current} |`,
    `| vite | ${current}-stale |`,
  );
  assert.match(errorsFor(stale).join("\n"), /version mismatch for vite/u);
});

test("rejects a lockfile-only resolved update", () => {
  const changedLockfile = structuredClone(lockfile);
  const record = changedLockfile.packages["node_modules/vite"];
  assert.ok(record?.version && record.resolved);
  const current = record.version;
  const candidate = `${current}-fixture`;
  record.version = candidate;
  record.resolved = record.resolved.replace(current, candidate);
  assert.notEqual(
    record.resolved,
    lockfile.packages["node_modules/vite"].resolved,
  );
  assert.match(
    errorsFor(canonical, publicCopy, changedLockfile).join("\n"),
    /resolved source mismatch for vite/u,
  );
});

test("rejects an inaccurate direct license", () => {
  const wrongLicense = canonical.replace(
    "| react | ^19.2.8 | MIT |",
    "| react | ^19.2.8 | GPL-3.0-only |",
  );
  assert.match(
    errorsFor(wrongLicense).join("\n"),
    /license mismatch for react/u,
  );
});

test("includes optional dependencies in the direct inventory", () => {
  const candidateManifest = structuredClone(manifest);
  candidateManifest.optionalDependencies = { "optional-test": "1.0.0" };
  const candidateLockfile = structuredClone(lockfile);
  candidateLockfile.packages["node_modules/optional-test"] = {
    version: "1.0.0",
    resolved:
      "https://registry.npmjs.org/optional-test/-/optional-test-1.0.0.tgz",
    license: "MIT",
  };
  assert.match(
    errorsFor(canonical, publicCopy, candidateLockfile, candidateManifest).join(
      "\n",
    ),
    /missing direct dependency: optional-test/u,
  );
});

test("rejects a missing direct dependency", () => {
  const missing = canonical.replace(/^\| lucide-react .*\r?\n/mu, "");
  assert.match(
    errorsFor(missing).join("\n"),
    /missing direct dependency: lucide-react/u,
  );
});

test("rejects a duplicate direct dependency", () => {
  const row = canonical.match(/^\| react \|.*$/mu)?.[0];
  assert.ok(row);
  const duplicate = canonical.replace(row, `${row}\n${row}`);
  assert.match(
    errorsFor(duplicate).join("\n"),
    /duplicate direct-dependency row: react/u,
  );
});

test("rejects an extra direct dependency", () => {
  const extra = canonical.replace(
    "<!-- direct-dependencies:end -->",
    "| invented-package | 1.0.0 | MIT | Não | https://example.invalid/invented.tgz |\n\n<!-- direct-dependencies:end -->",
  );
  assert.match(
    errorsFor(extra).join("\n"),
    /extra direct dependency: invented-package/u,
  );
});

test("rejects divergence between distributed copies", () => {
  assert.match(
    errorsFor(canonical, `${publicCopy}\n`).join("\n"),
    /THIRDPARTY\.md.*differ/u,
  );
});

test("rejects a missing direct-dependency section", () => {
  const unbounded = canonical
    .replace("<!-- direct-dependencies:start -->", "")
    .replace("<!-- direct-dependencies:end -->", "");
  assert.match(
    errorsFor(unbounded).join("\n"),
    /expected exactly one direct-dependency section/u,
  );
});

test("rejects a malformed direct-dependency row", () => {
  const malformed = canonical.replace(
    /^\| react \|.*$/mu,
    "| react | ^19.2.8 | MIT |",
  );
  assert.match(
    errorsFor(malformed).join("\n"),
    /malformed direct-dependency row/u,
  );
});
