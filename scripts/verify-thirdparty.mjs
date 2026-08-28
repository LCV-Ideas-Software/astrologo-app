import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, posix } from "node:path";
import { pathToFileURL } from "node:url";

const START_MARKER = "<!-- direct-dependencies:start -->";
const END_MARKER = "<!-- direct-dependencies:end -->";
const PACKAGE_SETS = [
  {
    component: "package.json",
    manifestUrl: new URL("../package.json", import.meta.url),
    lockfileUrl: new URL("../package-lock.json", import.meta.url),
  },
  {
    component: "astrologo-frontend/package.json",
    manifestUrl: new URL("../astrologo-frontend/package.json", import.meta.url),
    lockfileUrl: new URL(
      "../astrologo-frontend/package-lock.json",
      import.meta.url,
    ),
  },
];
const LICENSE_OVERRIDES = new Map([
  [
    "d3-geo",
    { upstream: "ISC", display: "ISC; incorpora GeographicLib sob MIT" },
  ],
  [
    "world-atlas",
    {
      upstream: "ISC",
      display: "ISC; dados Natural Earth em domínio público",
    },
  ],
  [
    "@fusionstrings/swiss-eph",
    {
      upstream: "AGPL-3.0",
      display: "AGPL-3.0-only (manifesto upstream: `AGPL-3.0`)",
    },
  ],
]);
const MODIFICATION_OVERRIDES = new Map([
  [
    JSON.stringify([
      "astrologo-frontend/package.json",
      "@fusionstrings/swiss-eph",
    ]),
    "Não; o módulo é consumido sem alteração",
  ],
]);

function manifestEntries(component, manifest, lockfile) {
  const optionalNames = new Set(
    Object.keys(manifest.optionalDependencies ?? {}),
  );
  const sectionEntries = (relation, dependencies) =>
    Object.entries(dependencies ?? {}).map(([name, version]) => ({
      component,
      name,
      relation,
      version,
    }));
  const installedPeerDependencies = Object.fromEntries(
    Object.entries(manifest.peerDependencies ?? {}).filter(([name]) => {
      const isOptional =
        manifest.peerDependenciesMeta?.[name]?.optional === true;
      const isInstalled = Boolean(lockfile.packages?.[`node_modules/${name}`]);
      return !isOptional || isInstalled;
    }),
  );

  return [
    ...sectionEntries(
      "dependencies",
      Object.fromEntries(
        Object.entries(manifest.dependencies ?? {}).filter(
          ([name]) => !optionalNames.has(name),
        ),
      ),
    ),
    ...sectionEntries("devDependencies", manifest.devDependencies),
    ...sectionEntries("optionalDependencies", manifest.optionalDependencies),
    ...sectionEntries("peerDependencies", installedPeerDependencies),
  ];
}

function entryKey({ component, name, relation }) {
  return JSON.stringify([component, name, relation]);
}

function lockfilePathFor(component) {
  const directory = dirname(component).replaceAll("\\", "/");
  return directory === "."
    ? "package-lock.json"
    : posix.join(directory, "package-lock.json");
}

export function verifyPackageTopology(packageSets, trackedPackageFiles) {
  const configured = new Set(
    packageSets.flatMap(({ component }) => [
      component,
      lockfilePathFor(component),
    ]),
  );
  const tracked = new Set(
    trackedPackageFiles
      .map((file) => file.replaceAll("\\", "/"))
      .filter((file) => {
        const segments = file.split("/");
        return !segments.some((segment) =>
          ["node_modules", "build", "dist"].includes(segment),
        );
      }),
  );
  const errors = [];

  for (const file of tracked) {
    if (!configured.has(file)) {
      errors.push(`unclassified tracked package metadata: ${file}`);
    }
  }
  for (const file of configured) {
    if (!tracked.has(file)) {
      errors.push(`configured package metadata is not tracked: ${file}`);
    }
  }

  return errors;
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

    if (cells[0] === "Manifesto" || cells.every((cell) => /^-+$/u.test(cell))) {
      continue;
    }
    if (cells.length !== 7 || cells.some((cell) => cell.length === 0)) {
      throw new Error(`malformed direct-dependency row: ${line}`);
    }

    const [component, name, relation, version, license, modified, source] =
      cells;
    const key = entryKey({ component, name, relation });
    if (seen.has(key)) {
      throw new Error(
        `duplicate direct-dependency row: ${component} ${relation} ${name}`,
      );
    }
    if (!source.startsWith("https://")) {
      throw new Error(`direct-dependency source must use HTTPS: ${name}`);
    }

    seen.add(key);
    rows.push({
      component,
      name,
      relation,
      version,
      license,
      modified,
      source,
    });
  }

  return rows;
}

export function verifyThirdParty({
  packageSets,
  trackedPackageFiles,
  canonical,
  publicCopy,
}) {
  const errors = [];
  errors.push(...verifyPackageTopology(packageSets, trackedPackageFiles));
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

  const expected = packageSets.flatMap(({ component, manifest, lockfile }) =>
    manifestEntries(component, manifest, lockfile),
  );
  const observed = new Map(rows.map((row) => [entryKey(row), row]));
  const lockfiles = new Map(
    packageSets.map(({ component, lockfile }) => [component, lockfile]),
  );

  for (const entry of expected) {
    const { component, name, relation, version } = entry;
    const key = entryKey(entry);
    if (!observed.has(key)) {
      errors.push(
        `missing direct dependency: ${component} ${relation} ${name}@${version}`,
      );
      continue;
    }

    const row = observed.get(key);
    if (row.version !== version) {
      errors.push(
        `version mismatch for ${name}: THIRDPARTY=${row.version} package.json=${version}`,
      );
    }

    const locked = lockfiles.get(component)?.packages?.[`node_modules/${name}`];
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
    const licenseOverride = LICENSE_OVERRIDES.get(name);
    if (licenseOverride && locked.license !== licenseOverride.upstream) {
      errors.push(
        `upstream license changed for ${name}: expected=${licenseOverride.upstream} package-lock=${locked.license}`,
      );
    }
    const expectedLicense = licenseOverride?.display ?? locked.license;
    if (row.license !== expectedLicense) {
      errors.push(
        `license mismatch for ${name}: THIRDPARTY=${row.license} package-lock=${expectedLicense}`,
      );
    }
    const expectedModified =
      MODIFICATION_OVERRIDES.get(JSON.stringify([component, name])) ?? "Não";
    if (row.modified !== expectedModified) {
      errors.push(
        `modification disclosure mismatch for ${name}: THIRDPARTY=${row.modified} expected=${expectedModified}`,
      );
    }
  }

  const expectedKeys = new Set(expected.map((entry) => entryKey(entry)));
  for (const row of rows) {
    if (!expectedKeys.has(entryKey(row))) {
      errors.push(
        `extra direct dependency: ${row.component} ${row.relation} ${row.name}@${row.version}`,
      );
    }
  }

  const expectedOrder = expected.map((entry) => entryKey(entry));
  const observedOrder = rows.map((row) => entryKey(row));
  if (JSON.stringify(expectedOrder) !== JSON.stringify(observedOrder)) {
    errors.push(
      "direct-dependency rows must follow package.json dependency order",
    );
  }

  return errors;
}

async function main() {
  const [packageSets, canonical, publicCopy] = await Promise.all([
    Promise.all(
      PACKAGE_SETS.map(async ({ component, manifestUrl, lockfileUrl }) => {
        const [manifestText, lockfileText] = await Promise.all([
          readFile(manifestUrl, "utf8"),
          readFile(lockfileUrl, "utf8"),
        ]);
        return {
          component,
          manifest: JSON.parse(manifestText),
          lockfile: JSON.parse(lockfileText),
        };
      }),
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
  const trackedPackageFiles = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--",
      ":(glob)**/package.json",
      ":(glob)**/package-lock.json",
    ],
    {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean);
  const errors = verifyThirdParty({
    packageSets,
    trackedPackageFiles,
    canonical,
    publicCopy,
  });

  if (errors.length > 0) {
    for (const error of errors) console.error(`THIRDPARTY inválido: ${error}`);
    process.exitCode = 1;
    return;
  }

  const count = packageSets.flatMap(({ component, manifest, lockfile }) =>
    manifestEntries(component, manifest, lockfile),
  ).length;
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
