import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, posix } from "node:path";
import { pathToFileURL } from "node:url";
import semver from "semver";

const START_MARKER = "<!-- direct-dependencies:start -->";
const END_MARKER = "<!-- direct-dependencies:end -->";
const DIRECT_HEADERS = [
  "Manifesto",
  "Componente",
  "Relação",
  "Versão",
  "Licença Original",
  "Modificado?",
  "Link de Origem",
];
const RETAINED_MARKERS = [
  "<!-- retained-components:start -->",
  "<!-- retained-components:end -->",
];
const RETAINED_HEADERS = [
  "Componente",
  "Versão",
  "Licença Original",
  "Modificado?",
  "Link de Origem",
];
const TARBALL_MARKERS = [
  "<!-- audited-tarballs:start -->",
  "<!-- audited-tarballs:end -->",
];
const TARBALL_HEADERS = [
  "Artefato",
  "npm `gitHead`",
  "SHA-512 SRI do tarball",
  "SHA-256 do tarball",
];
const FILE_MARKERS = [
  "<!-- audited-files:start -->",
  "<!-- audited-files:end -->",
];
const FILE_HEADERS = ["Arquivo", "Tamanho", "SHA-256", "SHA-512"];
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
const SWISS_EPHEMERIS = {
  version: "2.10.03",
  sourceRevision: "5ae0bce00dbc66c6315c86da20518e3dd138255b",
  noticeSha256:
    "408f30c432942c931be83a68c59b70e4465ae6c36e88fa0e58c8e000d79536b8",
  sourceOfferSha256:
    "e9397d48b61abf1e6373a9695b155b4d9a6817eed811769b1e86deb16091fee0",
};
const AUDITED_TARBALLS = [
  {
    name: "astronomy-engine",
    gitHead: "61dc07020aaa6885d2c7f688a4d82beaf6edb9ef",
    integrity:
      "sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==",
    sha256: "605e9e9ebd0a364f1c5b556f10c1f163e4b8aa63b97ada1ab72e960d73189cdd",
  },
  {
    name: "@js-temporal/polyfill",
    gitHead: "f3c07e503632ddf7ff918066f2eb30a9dcfa06ff",
    integrity:
      "sha512-hloP58zRVCRSpgDxmqCWJNlizAlUgJFqG2ypq79DCvyv9tHjRYMDOcPFjzfl/A1/YxDvRCZz8wvZvmapQnKwFQ==",
    sha256: "c99a4da5678a55a33dfd30c977852dfac9bbe7b8bac73999f1858c167be6b3e3",
  },
  {
    name: "jsbi",
    gitHead: "5382367c7e3199858d36bb620977e1f90605bcb9",
    integrity:
      "sha512-9fqMSQbhJykSeii05nxKl4m6Eqn2P6rOlYiS+C5Dr/HPIU/7yZxu5qzbs40tgaFORiw2Amd0mirjxatXYMkIew==",
    sha256: "131d13488f0f400a0770eaca495749cddef34d315f7aeb248fc501f7538b378e",
  },
  {
    name: "@fusionstrings/swiss-eph",
    gitHead: "e7a7a9311d3058f337b73b72f45ea6d80cffa5f0",
    integrity:
      "sha512-UGKCfVh5TUygShCNKnh7iauJ109QYgV+e3+8PACOsiIFyiX8z3PIw7etbYDqF0egsJfIArRdDjOwrliAOFGNgA==",
    sha256: "ef90330d9ed41da5358b47c60b29ad8f3970a7d09c083fd176f8b9833ad9fcbd",
  },
];
const AUDITED_FILES = [
  {
    packageName: "astronomy-engine",
    packageVersion: "2.1.19",
    row: [
      "`astronomy-engine/astronomy.js` (distribuição CommonJS de referência)",
      "421280 bytes",
      "`729c0ce37cc1a8096034a689039a5f04585ee8184177c638e8c74dec4fa3185a`",
      "`0b66b59b02759e68d10ddaf12ba273d6c81e24f22db218f897a5aa8882bc6be8d50ed48760aede3b0fe3e6e3aaec3f24385df18e5d5bbbfcfc33fb3cca071a81`",
    ],
  },
  {
    packageName: "astronomy-engine",
    packageVersion: "2.1.19",
    row: [
      "`astronomy-engine/esm/astronomy.js` (entrypoint ESM importado e referenciado pelos metadados de cálculo)",
      "412025 bytes",
      "`068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7`",
      "`a898baa9deb4c3ae8e80a961155126039ae3eac6a14a9dac9cd8a39a6cddd7adba5975fe0cbf58cfea40fe99dee8c7df5302ea69c3e1477d89c38a4be4caff65`",
    ],
  },
  {
    packageName: "@js-temporal/polyfill",
    packageVersion: "0.5.1",
    row: [
      "`@js-temporal/polyfill/dist/index.esm.js`",
      "128868 bytes",
      "`21f067c54fa5f532f20a8e85e3d2401a3ae1cf60d85fafea6502f621dc93b167`",
      "`1805d1e0da3844a1972b0e14d45d65ebceefde523e056b7bb235f41a84eff442752b75ddd9e0c558e06ef962e8d26ecc8f2f486322f5a22739c4ce0d736fb501`",
    ],
  },
  {
    packageName: "jsbi",
    packageVersion: "4.3.2",
    row: [
      "`jsbi/dist/jsbi.mjs`",
      "29207 bytes",
      "`c0d70fb47e0818e31bdf964805a530d9a0fb4ee5bdadb442a13f3691a5f15583`",
      "`66327d5ea608de8dfb8d91125c5bed76d9c93fe865deebd957e97911cb1ff44e4fbaefa704340df2cd5c67f7a7684457f299c37e927d021840cb55c796a3b2d7`",
    ],
  },
  {
    packageName: "@fusionstrings/swiss-eph",
    packageVersion: "0.1.1",
    row: [
      "`@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm` (materializado localmente sob demanda)",
      "1275365 bytes",
      "`31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c`",
      "`f0929366006f037e45eb7085234623ec5fdc73f68cea7bf0c2696a038df979e3d346375a3b8123065863666801c234864a61d9042c6af961b7acdb455bad6de3`",
    ],
  },
];
const LICENSE_NOTICES = [
  {
    name: "d3-geo",
    marker: "d3-geo",
    version: "3.1.1",
    license: "ISC",
    sha256: "844b6a5c76e57c5ac48b5f31593592cfd0a18d336301196b9a88180a9e654bac",
  },
  {
    name: "topojson-client",
    marker: "topojson-client",
    version: "3.1.0",
    license: "ISC",
    sha256: "0db495888f6f3a264a6f7ebb770aea036eabfcdf20ac18a41048ae44773193fe",
  },
  {
    name: "d3-array",
    marker: "d3-array",
    version: "3.2.4",
    license: "ISC",
    sha256: "8315057c0e6e9771e7faf93c0d83b637621f29a8c09cde898c01dd5cb3f7bd92",
  },
  {
    name: "internmap",
    marker: "internmap",
    version: "2.0.3",
    license: "ISC",
    sha256: "ccd03c0c11d8e54de99d019f237392fcdf398b531bd6283c0225de52a363eea1",
  },
  {
    name: "commander",
    marker: "commander",
    version: "2.20.3",
    license: "MIT",
    sha256: "08b73f3f363d69b2d0486531e24c8cfcc1b85b9bb9136974f0da0ca8a6a396b4",
  },
  {
    name: "world-atlas",
    marker: "world-atlas",
    version: "2.0.2",
    license: "ISC",
    sha256: "5499a3e2e7d8e979ffda30214572d04c9eb2c5a5cef7a1e8a86022cc3df7ecc0",
  },
  {
    name: "astronomy-engine",
    marker: "astronomy-engine",
    version: "2.1.19",
    license: "MIT",
    sha256: "58ef4adaa4cd3b473ac615044b54a04612f28b09bc58987eff2e0b12d849a93c",
  },
  {
    name: "@js-temporal/polyfill",
    marker: "js-temporal-polyfill",
    version: "0.5.1",
    license: "ISC",
    sha256: "8cd6658f27d69560bba47ffacbd4e6d9d38f79f080070db30123d4c795ef7e8f",
  },
  {
    name: "jsbi",
    marker: "jsbi",
    version: "4.3.2",
    license: "Apache-2.0",
    sha256: "7acf39dce16943e3539bf254894485bb4a5b7041014a6ef67531761cae0ec078",
  },
];

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

function isGitSpec(spec) {
  const withoutFragment = spec.split("#", 1)[0];
  return (
    /^(?:git(?:\+(?:ssh|https?|file))?|github|gitlab|bitbucket):/iu.test(
      withoutFragment,
    ) ||
    /^git@[^:]+:.+/u.test(withoutFragment) ||
    /^[^/@\s]+\/[^/\s]+(?:#.*)?$/u.test(spec) ||
    /^https?:\/\/[^/]+\/.+\.git(?:#.*)?$/iu.test(spec)
  );
}

function publicRegistryPath(name, version) {
  const tarballName = name.split("/").at(-1);
  return `/${name}/-/${tarballName}-${version}.tgz`;
}

function gitRepositoryIdentity(spec) {
  const withoutFragment = spec.split("#", 1)[0];
  const shorthand = withoutFragment.match(
    /^(?:(github|gitlab|bitbucket):)?([^/@\s]+)\/([^/\s]+)$/iu,
  );
  if (shorthand) {
    const host =
      {
        github: "github.com",
        gitlab: "gitlab.com",
        bitbucket: "bitbucket.org",
      }[shorthand[1]?.toLowerCase() ?? "github"] ?? "github.com";
    return `${host}/${shorthand[2]}/${shorthand[3].replace(/\.git$/iu, "")}`.toLowerCase();
  }
  const scp = withoutFragment.match(/^git@([^:]+):(.+)$/iu);
  if (scp) {
    return `${scp[1]}/${scp[2].replace(/\.git$/iu, "")}`.toLowerCase();
  }
  try {
    const parsed = new URL(withoutFragment.replace(/^git\+/iu, ""));
    return `${parsed.hostname}/${parsed.pathname.replace(/^\/+|\/+$/gu, "").replace(/\.git$/iu, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

function validateLockedSource({ name, requested, locked, context, errors }) {
  if (isGitSpec(requested)) {
    const requestedIdentity = gitRepositoryIdentity(requested);
    const resolvedIdentity = gitRepositoryIdentity(locked.resolved);
    if (
      !requestedIdentity ||
      requestedIdentity !== resolvedIdentity ||
      !/#[0-9a-f]{40}$/iu.test(locked.resolved)
    ) {
      errors.push(
        `locked Git source mismatch for ${context} ${name}: requested=${requested} package-lock=${locked.resolved}`,
      );
      return false;
    }
    return true;
  }

  if (/^https?:\/\//iu.test(requested)) {
    if (locked.resolved !== requested || !locked.integrity) {
      errors.push(
        `locked tarball source mismatch for ${context} ${name}: requested=${requested} package-lock=${locked.resolved}`,
      );
      return false;
    }
    return true;
  }

  if (
    !locked.integrity ||
    !(
      /^https?:\/\//iu.test(locked.resolved) ||
      /^registry\.npmjs\.org\//iu.test(locked.resolved)
    )
  ) {
    errors.push(
      `unsupported or incomplete registry source for ${context} ${name}: ${locked.resolved}`,
    );
    return false;
  }
  const expectedPublicPath = publicRegistryPath(name, locked.version);
  if (
    (/^https?:\/\/registry\.npmjs\.org\//iu.test(locked.resolved) &&
      new URL(locked.resolved).pathname !== expectedPublicPath) ||
    (/^registry\.npmjs\.org\//iu.test(locked.resolved) &&
      locked.resolved !== `registry.npmjs.org${expectedPublicPath}`)
  ) {
    errors.push(
      `public registry identity mismatch for ${context} ${name}: ${locked.resolved}`,
    );
    return false;
  }
  const requestedRange = semver.validRange(requested);
  const isDistTag = /^[A-Za-z][A-Za-z0-9._-]*$/u.test(requested);
  if (
    (!requestedRange && !isDistTag) ||
    (requestedRange && !semver.satisfies(locked.version, requestedRange))
  ) {
    errors.push(
      `resolved version does not satisfy requested registry spec for ${context} ${name}: requested=${requested} resolved=${locked.version}`,
    );
    return false;
  }
  return true;
}

function validateLockedIdentity({ name, requested, locked, context, errors }) {
  if (!locked.version || !locked.resolved) {
    errors.push(`missing locked identity metadata for ${context} ${name}`);
    return false;
  }
  if (
    requested.startsWith("npm:") ||
    (locked.name !== undefined && locked.name !== name)
  ) {
    errors.push(
      `npm package aliases are not supported in THIRDPARTY inventory: ${context} ${name} resolves to ${locked.name ?? requested}`,
    );
    return false;
  }

  return validateLockedSource({ name, requested, locked, context, errors });
}

function validateLockedManifestSpec({
  name,
  requested,
  relation,
  lockfile,
  context,
  errors,
}) {
  const lockedRequested = lockfile.packages?.[""]?.[relation]?.[name];
  if (lockedRequested !== requested) {
    errors.push(
      `locked manifest spec mismatch for ${context} ${relation} ${name}: package.json=${requested} package-lock=${lockedRequested ?? "missing"}`,
    );
    return false;
  }
  return true;
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
    trackedPackageFiles.map((file) => file.replaceAll("\\", "/")),
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

function markdownContextAt(markdown, offset) {
  let inHtmlComment = false;
  let fence = null;
  let htmlBlock = null;
  const prefix = markdown.slice(0, offset);
  const currentLineStart = prefix.lastIndexOf("\n") + 1;
  const completePrefix = prefix
    .slice(0, currentLineStart)
    .replace(/\r?\n$/u, "");
  const lines = completePrefix === "" ? [] : completePrefix.split(/\r?\n/u);

  const blockTags =
    "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
  const typeSixStart = new RegExp(
    `^ {0,3}</?(?:${blockTags})(?=[ \\t/>]|$)`,
    "iu",
  );
  const attributeName = "[A-Za-z_:][A-Za-z0-9_.:-]*";
  const unquotedValue = "[^ \\t\\n\\f\\r\"'=<>`]+";
  const attributeValue = `(?:${unquotedValue}|'[^']*'|\"[^\"]*\")`;
  const attribute = `(?:[ \\t]+${attributeName}(?:[ \\t]*=[ \\t]*${attributeValue})?)`;
  const openTag = `<[A-Za-z][A-Za-z0-9-]*(?:${attribute})*[ \\t]*/?>`;
  const closingTag = `</[A-Za-z][A-Za-z0-9-]*[ \\t]*>`;
  const typeSevenStart = new RegExp(
    `^ {0,3}(?:${openTag}|${closingTag})[ \\t]*$`,
    "u",
  );

  const startHtmlBlock = (line) => {
    const indented = line.replace(/^ {0,3}/u, "");
    const rawTag = indented.match(
      /^<(pre|script|style|textarea)(?=[ \\t>]|$)/iu,
    );
    if (rawTag) {
      return {
        untilBlank: false,
        end: new RegExp(`</${rawTag[1]}>`, "iu"),
      };
    }
    if (/^<!--/u.test(indented)) {
      return { untilBlank: false, end: /--!?>/u };
    }
    if (/^<\?/u.test(indented)) return { untilBlank: false, end: /\?>/u };
    if (/^<![A-Za-z]/u.test(indented)) {
      return { untilBlank: false, end: />/u };
    }
    if (/^<!\[CDATA\[/iu.test(indented)) {
      return { untilBlank: false, end: /\]\]>/u };
    }
    if (typeSixStart.test(line) || typeSevenStart.test(line)) {
      return { untilBlank: true, end: null };
    }
    return null;
  };

  for (const line of lines) {
    if (htmlBlock) {
      if (htmlBlock.untilBlank) {
        if (/^[ \\t]*$/u.test(line)) htmlBlock = null;
      } else if (htmlBlock.end.test(line)) {
        htmlBlock = null;
      }
      continue;
    }

    if (fence) {
      const closingFence = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/u);
      if (
        closingFence &&
        closingFence[1][0] === fence.character &&
        closingFence[1].length >= fence.length
      ) {
        fence = null;
      }
      continue;
    }

    let visible = "";
    let cursor = 0;
    while (cursor < line.length) {
      if (inHtmlComment) {
        const close = /--!?>/u.exec(line.slice(cursor));
        if (!close) break;
        inHtmlComment = false;
        cursor += close.index + close[0].length;
        continue;
      }

      const open = line.indexOf("<!--", cursor);
      if (open === -1) {
        visible += line.slice(cursor);
        break;
      }
      visible += line.slice(cursor, open);
      inHtmlComment = true;
      cursor = open + 4;
    }

    const openingFence = visible.match(/^ {0,3}(`{3,}|~{3,})/u);
    if (openingFence) {
      fence = {
        character: openingFence[1][0],
        length: openingFence[1].length,
      };
      continue;
    }

    const candidate = startHtmlBlock(visible);
    if (candidate) {
      htmlBlock = candidate;
      if (!candidate.untilBlank && candidate.end.test(visible)) {
        htmlBlock = null;
      }
    }
  }

  return {
    inHtmlComment,
    inFence: fence !== null,
    inHtmlContainer: htmlBlock !== null,
  };
}

function assertRenderableMarker(markdown, offset, marker, label) {
  const context = markdownContextAt(markdown, offset);
  const prefix = markdown.slice(0, offset);
  const linePrefix = prefix.slice(prefix.lastIndexOf("\n") + 1);
  const suffix = markdown.slice(offset + marker.length);
  const suffixLineEnd = suffix.search(/\r?\n/u);
  const lineSuffix =
    suffixLineEnd === -1 ? suffix : suffix.slice(0, suffixLineEnd);
  const standaloneWithRenderableIndent =
    /^ {0,3}$/u.test(linePrefix) && /^ *$/u.test(lineSuffix);

  if (
    context.inHtmlComment ||
    context.inFence ||
    context.inHtmlContainer ||
    !standaloneWithRenderableIndent
  ) {
    throw new Error(
      `${label} section must contain one contiguous renderable table`,
    );
  }
}

const ASCII_PUNCTUATION = new Set(
  Array.from("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"),
);
const MARKDOWN_ENTITIES = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["gt", ">"],
  ["lt", "<"],
  ["quot", '"'],
  ["verbar", "|"],
  ["vert", "|"],
  ["VerticalLine", "|"],
]);

function decodeEntityAt(value, offset, label) {
  const candidate = value
    .slice(offset)
    .match(/^&(?:#([0-9]+)|#[xX]([0-9A-Fa-f]+)|([A-Za-z][A-Za-z0-9]+));/u);
  if (!candidate) return null;

  let decoded;
  if (candidate[1] !== undefined || candidate[2] !== undefined) {
    const codePoint = Number.parseInt(
      candidate[1] ?? candidate[2],
      candidate[1] === undefined ? 16 : 10,
    );
    if (
      !Number.isSafeInteger(codePoint) ||
      codePoint === 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      throw new Error(`invalid numeric entity in ${label} cell`);
    }
    decoded = String.fromCodePoint(codePoint);
  } else {
    decoded = MARKDOWN_ENTITIES.get(candidate[3]);
    if (decoded === undefined) {
      throw new Error(
        `unsupported named entity &${candidate[3]}; in ${label} cell`,
      );
    }
  }

  return { decoded, length: candidate[0].length };
}

function decodeMarkdownCell(value, label) {
  let decoded = "";
  let codeSpanLength = 0;

  for (let index = 0; index < value.length;) {
    const character = value[index];
    if (character === "`") {
      let runLength = 1;
      while (value[index + runLength] === "`") runLength += 1;
      decoded += "`".repeat(runLength);
      if (codeSpanLength === 0) codeSpanLength = runLength;
      else if (codeSpanLength === runLength) codeSpanLength = 0;
      index += runLength;
      continue;
    }

    if (codeSpanLength > 0) {
      if (character === "\\" && value[index + 1] === "|") {
        decoded += "|";
        index += 2;
      } else {
        decoded += character;
        index += 1;
      }
      continue;
    }

    if (
      character === "\\" &&
      value[index + 1] !== undefined &&
      ASCII_PUNCTUATION.has(value[index + 1])
    ) {
      decoded += value[index + 1];
      index += 2;
      continue;
    }

    if (character === "&") {
      const entity = decodeEntityAt(value, index, label);
      if (entity) {
        decoded += entity.decoded;
        index += entity.length;
        continue;
      }
    }

    decoded += character;
    index += 1;
  }

  if (codeSpanLength !== 0) {
    throw new Error(`unclosed inline code span in ${label} cell`);
  }
  return decoded;
}

function isEscapedPipe(value, offset) {
  let backslashes = 0;
  for (let index = offset - 1; index >= 0 && value[index] === "\\"; index -= 1)
    backslashes += 1;
  return backslashes % 2 === 1;
}

function parseMarkdownTableCells(line, label) {
  const trimmed = line.trim();
  if (
    !trimmed.startsWith("|") ||
    !trimmed.endsWith("|") ||
    isEscapedPipe(trimmed, trimmed.length - 1)
  ) {
    throw new Error(`malformed ${label} row: ${line}`);
  }

  const cells = [];
  let cellStart = 1;
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    if (trimmed[index] === "|" && !isEscapedPipe(trimmed, index)) {
      cells.push(trimmed.slice(cellStart, index));
      cellStart = index + 1;
    }
  }
  cells.push(trimmed.slice(cellStart, -1));

  return cells.map((cell) => decodeMarkdownCell(cell.trim(), label));
}

function markerSection(markdown, startMarker, endMarker, label) {
  const starts = markdown.split(startMarker).length - 1;
  const ends = markdown.split(endMarker).length - 1;

  if (starts !== 1 || ends !== 1) {
    throw new Error(
      `expected exactly one ${label} section, found start=${starts} end=${ends}`,
    );
  }

  const startMarkerIndex = markdown.indexOf(startMarker);
  const end = markdown.indexOf(endMarker);
  assertRenderableMarker(markdown, startMarkerIndex, startMarker, label);
  assertRenderableMarker(markdown, end, endMarker, label);

  const start = startMarkerIndex + startMarker.length;
  if (end <= start) {
    throw new Error(`${label} section markers are out of order`);
  }

  return markdown.slice(start, end);
}

function parseStrictTable(markdown, startMarker, endMarker, headers, label) {
  const rows = [];
  const section = markerSection(markdown, startMarker, endMarker, label);
  const leadingBreak = section.startsWith("\r\n")
    ? "\r\n"
    : section.startsWith("\n")
      ? "\n"
      : null;
  const trailingBreak = section.endsWith("\r\n")
    ? "\r\n"
    : section.endsWith("\n")
      ? "\n"
      : null;
  if (!leadingBreak || !trailingBreak) {
    throw new Error(
      `${label} section must contain one contiguous renderable table`,
    );
  }

  const tableLines = section
    .slice(leadingBreak.length, -trailingBreak.length)
    .split(/\r?\n/u);
  if (tableLines.some((line) => line.trim().length === 0)) {
    throw new Error(
      `${label} section must contain one contiguous renderable table`,
    );
  }

  for (const [index, line] of tableLines.entries()) {
    const trimmed = line.trim();
    const indentation = line.match(/^[ \t]*/u)?.[0] ?? "";
    const isRenderableTableLine =
      !indentation.includes("\t") &&
      indentation.length <= 3 &&
      trimmed.startsWith("|") &&
      trimmed.endsWith("|");
    if (!isRenderableTableLine) {
      throw new Error(
        `${label} section must contain one contiguous renderable table`,
      );
    }

    const cells = parseMarkdownTableCells(line, label);
    const isHeader = JSON.stringify(cells) === JSON.stringify(headers);
    const isSameWidthSeparator =
      cells.length === headers.length &&
      cells.every((cell) => /^:?-+:?$/u.test(cell));

    if (index === 0) {
      if (!isHeader) {
        if (isSameWidthSeparator) {
          throw new Error(
            `${label} separator must immediately follow the header`,
          );
        }
        throw new Error(`${label} table header does not match the schema`);
      }
      continue;
    }

    if (index === 1) {
      if (!isSameWidthSeparator) {
        throw new Error(
          `${label} separator must immediately follow the header`,
        );
      }
      continue;
    }

    if (isHeader || isSameWidthSeparator) {
      throw new Error(`${label} table contains a duplicate structural row`);
    }
    if (
      cells.length !== headers.length ||
      cells.some((cell) => cell.length === 0)
    ) {
      throw new Error(`malformed ${label} row: ${line}`);
    }
    rows.push(cells);
  }

  if (rows.length === 0) {
    throw new Error(`${label} table must contain at least one data row`);
  }

  return rows;
}

export function parseDirectDependencies(markdown) {
  const rows = [];
  const seen = new Set();

  for (const cells of parseStrictTable(
    markdown,
    START_MARKER,
    END_MARKER,
    DIRECT_HEADERS,
    "direct-dependency",
  )) {
    const [component, name, relation, version, license, modified, source] =
      cells;
    const key = entryKey({ component, name, relation });
    if (seen.has(key)) {
      throw new Error(
        `duplicate direct-dependency row: ${component} ${relation} ${name}`,
      );
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

function compareExactRows(actual, expected, label) {
  const errors = [];
  if (actual.length !== expected.length) {
    errors.push(
      `${label} row count mismatch: THIRDPARTY=${actual.length} expected=${expected.length}`,
    );
  }
  for (
    let index = 0;
    index < Math.max(actual.length, expected.length);
    index += 1
  ) {
    if (JSON.stringify(actual[index]) !== JSON.stringify(expected[index])) {
      errors.push(
        `${label} row ${index + 1} mismatch: THIRDPARTY=${JSON.stringify(actual[index])} expected=${JSON.stringify(expected[index])}`,
      );
    }
  }
  return errors;
}

function dependencyCandidatePaths(parentPath, name) {
  const candidates = [`${parentPath}/node_modules/${name}`];
  let ancestor = parentPath;

  while (ancestor.includes("/node_modules/")) {
    ancestor = ancestor.slice(0, ancestor.lastIndexOf("/node_modules/"));
    candidates.push(`${ancestor}/node_modules/${name}`);
  }
  candidates.push(`node_modules/${name}`);

  return [...new Set(candidates)];
}

function resolveDependencyRecord(lockfile, parentPath, name, errors) {
  const parent = lockfile.packages?.[parentPath];
  if (!parent) {
    errors.push(`missing retained parent lockfile record: ${parentPath}`);
    return null;
  }
  const declared = {
    ...(parent.dependencies ?? {}),
    ...(parent.optionalDependencies ?? {}),
  };
  if (!Object.hasOwn(declared, name)) {
    errors.push(
      `retained parent ${parentPath} does not declare dependency ${name}`,
    );
    return null;
  }

  for (const path of dependencyCandidatePaths(parentPath, name)) {
    const locked = lockfile.packages?.[path];
    if (!locked) continue;
    if (
      !validateLockedIdentity({
        name,
        requested: declared[name],
        locked,
        context: `retained dependency from ${parentPath}`,
        errors,
      })
    ) {
      return null;
    }
    return { path, locked };
  }

  errors.push(
    `missing retained dependency resolution for ${name} from ${parentPath}`,
  );
  return null;
}

function verifyRetainedInventory(markdown, lockfile) {
  const errors = [];
  const record = (name, path, requiredFields) => {
    const locked = lockfile.packages?.[path];
    if (!locked || requiredFields.some((field) => !locked[field])) {
      errors.push(
        `missing retained lockfile metadata for ${name} at ${path}: ${requiredFields.join(",")}`,
      );
      return null;
    }
    return locked;
  };

  let retainedRows;
  let tarballRows;
  let fileRows;
  try {
    retainedRows = parseStrictTable(
      markdown,
      ...RETAINED_MARKERS,
      RETAINED_HEADERS,
      "retained-component",
    );
    tarballRows = parseStrictTable(
      markdown,
      ...TARBALL_MARKERS,
      TARBALL_HEADERS,
      "audited-tarball",
    );
    fileRows = parseStrictTable(
      markdown,
      ...FILE_MARKERS,
      FILE_HEADERS,
      "audited-file",
    );
  } catch (error) {
    return [error.message];
  }

  const retainedDefinitions = [
    {
      name: "d3-array",
      parent: "d3-geo",
      label: "d3-array (dependência transitiva de runtime de d3-geo)",
      modified: "Não",
      source: (locked) =>
        `https://github.com/d3/d3-array/tree/v${locked.version}`,
    },
    {
      name: "internmap",
      parent: "d3-array",
      label: "internmap (dependência transitiva de runtime de d3-array)",
      modified: "Não",
      source: (locked) =>
        `https://github.com/mbostock/internmap/tree/v${locked.version}`,
    },
    {
      name: "commander",
      parent: "topojson-client",
      label: "commander (dependência transitiva de runtime de topojson-client)",
      modified: "Não",
      source: (locked) =>
        `https://github.com/tj/commander.js/tree/v${locked.version}`,
    },
    {
      name: "jsbi",
      parent: "@js-temporal/polyfill",
      label:
        "jsbi (dependência transitiva de runtime de @js-temporal/polyfill)",
      modified: "Não",
      source: () =>
        `https://github.com/GoogleChromeLabs/jsbi/tree/${AUDITED_TARBALLS.find(({ name }) => name === "jsbi").gitHead}`,
    },
  ];
  const expectedRetainedRows = [];
  const retainedRecords = new Map();
  for (const definition of retainedDefinitions) {
    const retainedParent = retainedRecords.get(definition.parent);
    const parentPath =
      retainedParent?.path ?? `node_modules/${definition.parent}`;
    const resolved = resolveDependencyRecord(
      lockfile,
      parentPath,
      definition.name,
      errors,
    );
    if (!resolved) continue;
    const locked = record(definition.name, resolved.path, [
      "version",
      "license",
    ]);
    if (!locked) continue;
    retainedRecords.set(definition.name, resolved);
    expectedRetainedRows.push([
      definition.label,
      locked.version,
      locked.license,
      definition.modified,
      definition.source(locked),
    ]);
  }
  expectedRetainedRows.push([
    "Swiss Ephemeris incorporada no WASM",
    `\`swe_version() = ${SWISS_EPHEMERIS.version}\`; fonte \`${SWISS_EPHEMERIS.sourceRevision}\``,
    "AGPL-3.0-only, conforme a opção AGPL da licença dual",
    "Não pelo projeto Astrologo",
    `https://github.com/aloistr/swisseph/tree/${SWISS_EPHEMERIS.sourceRevision}`,
  ]);
  errors.push(
    ...compareExactRows(
      retainedRows,
      expectedRetainedRows,
      "retained-component",
    ),
  );

  const expectedTarballRows = [];
  for (const audited of AUDITED_TARBALLS) {
    const path =
      retainedRecords.get(audited.name)?.path ?? `node_modules/${audited.name}`;
    const locked = record(audited.name, path, ["version", "integrity"]);
    if (!locked) continue;
    if (locked.integrity !== audited.integrity) {
      errors.push(
        `audited package integrity mismatch for ${audited.name}: package-lock=${locked.integrity} expected=${audited.integrity}`,
      );
    }
    expectedTarballRows.push([
      `${audited.name}@${locked.version}`,
      `\`${audited.gitHead}\``,
      `\`${audited.integrity}\``,
      `\`${audited.sha256}\``,
    ]);
  }
  errors.push(
    ...compareExactRows(tarballRows, expectedTarballRows, "audited-tarball"),
  );

  for (const audited of AUDITED_FILES) {
    const path =
      retainedRecords.get(audited.packageName)?.path ??
      `node_modules/${audited.packageName}`;
    const locked = record(audited.packageName, path, ["version", "integrity"]);
    const packageAudit = AUDITED_TARBALLS.find(
      ({ name }) => name === audited.packageName,
    );
    if (!packageAudit) {
      errors.push(
        `audited-file package lacks an audited tarball: ${audited.packageName}`,
      );
    } else if (locked && locked.integrity !== packageAudit.integrity) {
      errors.push(
        `audited-file package integrity mismatch for ${audited.packageName}: package-lock=${locked.integrity} expected=${packageAudit.integrity}`,
      );
    }
    if (locked && locked.version !== audited.packageVersion) {
      errors.push(
        `audited-file package version mismatch for ${audited.packageName}: package-lock=${locked.version} audited=${audited.packageVersion}`,
      );
    }
  }
  errors.push(
    ...compareExactRows(
      fileRows,
      AUDITED_FILES.map(({ row }) => row),
      "audited-file",
    ),
  );

  const noticeSection = markdown.slice(
    markdown.indexOf("## Avisos de licenças permissivas"),
  );
  const noticeHeadings = noticeSection.match(/^### .+$/gmu) ?? [];
  if (noticeHeadings.length !== LICENSE_NOTICES.length) {
    errors.push(
      `license-notice heading count mismatch: THIRDPARTY=${noticeHeadings.length} expected=${LICENSE_NOTICES.length}`,
    );
  }
  for (const notice of LICENSE_NOTICES) {
    const path =
      retainedRecords.get(notice.name)?.path ?? `node_modules/${notice.name}`;
    const locked = record(notice.name, path, ["version", "license"]);
    if (!locked) continue;
    if (locked.version !== notice.version) {
      errors.push(
        `license-notice version mismatch for ${notice.name}: package-lock=${locked.version} audited=${notice.version}`,
      );
    }
    if (locked.license !== notice.license) {
      errors.push(
        `license-notice upstream license mismatch for ${notice.name}: package-lock=${locked.license} audited=${notice.license}`,
      );
    }

    let section;
    try {
      section = markerSection(
        markdown,
        `<!-- license-notice:${notice.marker}:start -->`,
        `<!-- license-notice:${notice.marker}:end -->`,
        `license-notice ${notice.name}`,
      );
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    const actualHash = createHash("sha256").update(section).digest("hex");
    if (actualHash !== notice.sha256) {
      errors.push(
        `license-notice content mismatch for ${notice.name}: sha256=${actualHash} audited=${notice.sha256}`,
      );
    }
  }

  return errors;
}

function verifyDistributedNotice(canonicalNotice, publicNotice, lockfile) {
  const errors = [];
  if (typeof canonicalNotice !== "string" || typeof publicNotice !== "string") {
    errors.push("missing canonical or distributed NOTICE input");
    return errors;
  }
  if (canonicalNotice !== publicNotice) {
    errors.push("NOTICE and astrologo-frontend/public/legal/NOTICE.txt differ");
  }

  const record = (name) => lockfile.packages?.[`node_modules/${name}`];
  const astronomy = record("astronomy-engine");
  const temporal = record("@js-temporal/polyfill");
  const jsbi = resolveDependencyRecord(
    lockfile,
    "node_modules/@js-temporal/polyfill",
    "jsbi",
    errors,
  )?.locked;
  const swiss = record("@fusionstrings/swiss-eph");
  const swissArtifact = AUDITED_FILES.find(
    ({ packageName, row }) =>
      packageName === "@fusionstrings/swiss-eph" &&
      row[0].includes("swiss-eph-wasi.wasm"),
  );
  const swissTarball = AUDITED_TARBALLS.find(
    ({ name }) => name === "@fusionstrings/swiss-eph",
  );
  if (
    !astronomy?.version ||
    !astronomy.license ||
    !temporal?.version ||
    !temporal.license ||
    !jsbi?.version ||
    !jsbi.license ||
    !swiss?.version ||
    !swissArtifact ||
    !swissTarball
  ) {
    errors.push("missing locked or audited metadata required by NOTICE");
    return errors;
  }

  const normalized = canonicalNotice.replace(/\s+/gu, " ").trim();
  const noticeLines = canonicalNotice
    .split(/\r?\n/u)
    .map((line) => line.trim());
  const unquote = (value) => value.replace(/^`|`$/gu, "");
  const requiredPhrases = [
    `Esta distribuição incorpora astronomy-engine ${astronomy.version} (${astronomy.license}), @js-temporal/polyfill ${temporal.version} (${temporal.license}), sua dependência transitiva jsbi ${jsbi.version} (${jsbi.license}) e um binário WebAssembly derivado da Swiss Ephemeris.`,
    `resolve o export \`./wasm-wasi\` publicado em @fusionstrings/swiss-eph@${swiss.version}`,
  ];
  const requiredLines = [
    `SHA-256: ${unquote(swissArtifact.row[2])}`,
    `SHA-512: ${unquote(swissArtifact.row[3])}`,
    `Tamanho: ${swissArtifact.row[1]}`,
    `Versão retornada por swe_version(): ${SWISS_EPHEMERIS.version}`,
    `https://github.com/fusionstrings/swiss-eph/tree/${swissTarball.gitHead}`,
    `https://github.com/aloistr/swisseph/tree/${SWISS_EPHEMERIS.sourceRevision}`,
  ];
  for (const metadata of requiredPhrases) {
    if (!normalized.includes(metadata)) {
      errors.push(`NOTICE audited metadata mismatch: ${metadata}`);
    }
  }
  for (const metadata of requiredLines) {
    if (!noticeLines.includes(metadata)) {
      errors.push(`NOTICE audited metadata mismatch: ${metadata}`);
    }
  }

  const swissNoticeStart =
    "/* Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.  All rights reserved.";
  const starts = canonicalNotice.split(swissNoticeStart).length - 1;
  const start = canonicalNotice.indexOf(swissNoticeStart);
  const end = start === -1 ? -1 : canonicalNotice.indexOf("*/", start);
  if (starts !== 1 || end === -1) {
    errors.push("Swiss Ephemeris special NOTICE block is missing or ambiguous");
  } else {
    const block = canonicalNotice.slice(start, end + 2);
    const actualHash = createHash("sha256").update(block).digest("hex");
    if (actualHash !== SWISS_EPHEMERIS.noticeSha256) {
      errors.push(
        `Swiss Ephemeris special NOTICE block mismatch: sha256=${actualHash} audited=${SWISS_EPHEMERIS.noticeSha256}`,
      );
    }
  }

  const sourceOfferStart =
    "OFERTA DE CÓDIGO-FONTE — GNU AGPL v3, SEÇÕES 6 E 13";
  const offerStarts = canonicalNotice.split(sourceOfferStart).length - 1;
  const offerStart = canonicalNotice.indexOf(sourceOfferStart);
  if (offerStarts !== 1 || offerStart === -1) {
    errors.push("Swiss Ephemeris source-offer section is missing or ambiguous");
  } else {
    const sourceOffer = canonicalNotice.slice(offerStart).trimEnd();
    const actualHash = createHash("sha256").update(sourceOffer).digest("hex");
    if (actualHash !== SWISS_EPHEMERIS.sourceOfferSha256) {
      errors.push(
        `Swiss Ephemeris source-offer section mismatch: sha256=${actualHash} audited=${SWISS_EPHEMERIS.sourceOfferSha256}`,
      );
    }
  }
  return errors;
}

function verifyThirdPartyNarrative(markdown, lockfile) {
  const errors = [];
  const start = markdown.indexOf(FILE_MARKERS[1]);
  const end = markdown.indexOf("## Avisos de licenças permissivas", start);
  if (start === -1 || end === -1 || end <= start) {
    return ["missing bounded THIRDPARTY legal narrative"];
  }

  const narrative = markdown.slice(start + FILE_MARKERS[1].length, end);
  const normalized = narrative.replace(/\s+/gu, " ").trim();
  const swiss = lockfile.packages?.["node_modules/@fusionstrings/swiss-eph"];
  const swissTarball = AUDITED_TARBALLS.find(
    ({ name }) => name === "@fusionstrings/swiss-eph",
  );
  if (!swiss?.version || !swissTarball) {
    return ["missing locked or audited Swiss metadata required by narrative"];
  }

  const requiredMetadata = [
    `resolve o export público \`./wasm-wasi\` de \`@fusionstrings/swiss-eph@${swiss.version}\``,
    `a carga real retorna \`${SWISS_EPHEMERIS.version}\` em \`swe_version()\``,
    `https://github.com/fusionstrings/swiss-eph/tree/${swissTarball.gitHead};`,
    `https://github.com/aloistr/swisseph/tree/${SWISS_EPHEMERIS.sourceRevision};`,
  ];
  for (const metadata of requiredMetadata) {
    if (!normalized.includes(metadata)) {
      errors.push(`THIRDPARTY narrative metadata mismatch: ${metadata}`);
    }
  }
  return errors;
}

export function verifyThirdParty({
  packageSets,
  trackedPackageFiles,
  canonical,
  publicCopy,
  canonicalNotice,
  publicNotice,
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
  const frontendLockfile = lockfiles.get("astrologo-frontend/package.json");
  if (!frontendLockfile) {
    errors.push("missing configured frontend lockfile");
  } else {
    errors.push(...verifyRetainedInventory(canonical, frontendLockfile));
    errors.push(...verifyThirdPartyNarrative(canonical, frontendLockfile));
    errors.push(
      ...verifyDistributedNotice(
        canonicalNotice,
        publicNotice,
        frontendLockfile,
      ),
    );
  }

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

    if (
      !validateLockedManifestSpec({
        name,
        requested: version,
        relation,
        lockfile: lockfiles.get(component),
        context: component,
        errors,
      })
    )
      continue;

    if (
      !validateLockedIdentity({
        name,
        requested: version,
        locked,
        context: component,
        errors,
      })
    )
      continue;
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
  const [packageSets, canonical, publicCopy, canonicalNotice, publicNotice] =
    await Promise.all([
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
      readFile(new URL("../NOTICE", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../astrologo-frontend/public/legal/NOTICE.txt",
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
      ":(glob)**/npm-shrinkwrap.json",
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
    canonicalNotice,
    publicNotice,
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
