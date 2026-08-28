import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const START_MARKER = "<!-- direct-dependencies:start -->";
const END_MARKER = "<!-- direct-dependencies:end -->";
const LICENSE_OVERRIDES = new Map([
  ["d3-geo", "ISC; incorpora GeographicLib sob MIT"],
  ["world-atlas", "ISC; dados Natural Earth em domínio público"],
  [
    "@fusionstrings/swiss-eph",
    "AGPL-3.0-only (manifesto upstream: `AGPL-3.0`)",
  ],
]);

function manifestEntries(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}),
    ...Object.entries(manifest.devDependencies ?? {}),
    ...Object.entries(manifest.optionalDependencies ?? {}),
  ];
}

function markerSection(markdown) {
  const starts = markdown.split(START_MARKER).length - 1;
  const ends = markdown.split(END_MARKER).length - 1;

  if (starts !== 1 || ends !== 1) {
    throw new Error(
      `expected exactly one direct-dependency section, found start=${starts} end=${ends}`,
    );
  }

  const start = markdown.indexOf(START_MARKER) + START_MARKER.length;
  const end = markdown.indexOf(END_MARKER);
  if (end <= start) {
    throw new Error("direct-dependency section markers are out of order");
  }

  return markdown.slice(start, end);
}

export function parseDirectDependencies(markdown) {
  const rows = [];
  const seen = new Set();

  for (const line of markerSection(markdown).split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;

    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (
      cells[0] === "Componente" ||
      cells.every((cell) => /^-+$/u.test(cell))
    ) {
      continue;
    }
    if (cells.length !== 5 || cells.some((cell) => cell.length === 0)) {
      throw new Error(`malformed direct-dependency row: ${line}`);
    }

    const [name, version, license, modified, source] = cells;
    if (seen.has(name)) {
      throw new Error(`duplicate direct-dependency row: ${name}`);
    }
    if (!source.startsWith("https://")) {
      throw new Error(`direct-dependency source must use HTTPS: ${name}`);
    }

    seen.add(name);
    rows.push({ name, version, license, modified, source });
  }

  return rows;
}

export function verifyThirdParty({
  manifest,
  lockfile,
  canonical,
  publicCopy,
}) {
  const errors = [];
  if (canonical !== publicCopy) {
    errors.push(
      "THIRDPARTY.md and astrologo-frontend/public/legal/THIRDPARTY.md differ",
    );
  }

  let rows;
  try {
    rows = parseDirectDependencies(canonical);
  } catch (error) {
    return [...errors, error.message];
  }

  const expected = manifestEntries(manifest);
  const observed = new Map(rows.map((row) => [row.name, row]));

  for (const [name, version] of expected) {
    if (!observed.has(name)) {
      errors.push(`missing direct dependency: ${name}@${version}`);
      continue;
    }

    const row = observed.get(name);
    if (row.version !== version) {
      errors.push(
        `version mismatch for ${name}: THIRDPARTY=${row.version} package.json=${version}`,
      );
    }

    const locked = lockfile.packages?.[`node_modules/${name}`];
    if (!locked?.version || !locked?.resolved || !locked?.license) {
      errors.push(`missing complete lockfile record: ${name}`);
      continue;
    }

    if (!locked.resolved.endsWith(`-${locked.version}.tgz`)) {
      errors.push(
        `lockfile version does not match resolved source for ${name}: version=${locked.version} resolved=${locked.resolved}`,
      );
    }
    if (row.source !== locked.resolved) {
      errors.push(
        `resolved source mismatch for ${name}: THIRDPARTY=${row.source} package-lock=${locked.resolved}`,
      );
    }
    const expectedLicense = LICENSE_OVERRIDES.get(name) ?? locked.license;
    if (row.license !== expectedLicense) {
      errors.push(
        `license mismatch for ${name}: THIRDPARTY=${row.license} package-lock=${expectedLicense}`,
      );
    }
  }

  const expectedNames = new Set(expected.map(([name]) => name));
  for (const { name, version } of rows) {
    if (!expectedNames.has(name)) {
      errors.push(`extra direct dependency: ${name}@${version}`);
    }
  }

  const expectedOrder = expected.map(([name]) => name);
  const observedOrder = rows.map(({ name }) => name);
  if (JSON.stringify(expectedOrder) !== JSON.stringify(observedOrder)) {
    errors.push(
      "direct-dependency rows must follow package.json dependency order",
    );
  }

  return errors;
}

async function main() {
  const [manifestText, lockfileText, canonical, publicCopy] = await Promise.all(
    [
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
    ],
  );
  const errors = verifyThirdParty({
    manifest: JSON.parse(manifestText),
    lockfile: JSON.parse(lockfileText),
    canonical,
    publicCopy,
  });

  if (errors.length > 0) {
    for (const error of errors) console.error(`THIRDPARTY inválido: ${error}`);
    process.exitCode = 1;
    return;
  }

  const manifest = JSON.parse(manifestText);
  const count = manifestEntries(manifest).length;
  console.log(
    `THIRDPARTY válido: ${count} dependências diretas e cópias idênticas.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
