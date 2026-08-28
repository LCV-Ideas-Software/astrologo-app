export const POLICY = Object.freeze({
  project: Object.freeze({
    sourceRepository: "https://github.com/LCV-Ideas-Software/astrologo-app",
  }),
  packageRoots: Object.freeze([
    Object.freeze({
      manifest: "package.json",
      lock: "package-lock.json",
      installRoot: ".",
    }),
    Object.freeze({
      manifest: "astrologo-frontend/package.json",
      lock: "astrologo-frontend/package-lock.json",
      installRoot: "astrologo-frontend",
    }),
  ]),
  relations: Object.freeze(["dependencies", "devDependencies"]),
  rejectedRelations: Object.freeze([
    "optionalDependencies",
    "peerDependencies",
    "bundledDependencies",
    "bundleDependencies",
  ]),
  outputs: Object.freeze({
    thirdparty: Object.freeze([
      "THIRDPARTY.md",
      "astrologo-frontend/public/legal/THIRDPARTY.md",
    ]),
    notice: Object.freeze([
      "NOTICE",
      "astrologo-frontend/public/legal/NOTICE.txt",
    ]),
  }),
  fragments: Object.freeze({
    astronomy: Object.freeze({
      path: "scripts/legal/astronomy-engine-mit.txt",
      sha256:
        "693f78b6c29b951902a117252b1232632dade91183f221fd754cfa2246ef578f",
    }),
    launderMit: Object.freeze({
      path: "scripts/legal/launder-mit.txt",
      sha256:
        "f9658ba3a4875da01b0099f85e390ee2acd86a496b67b10a33c4ad34f678f744",
    }),
    wranglerMit: Object.freeze({
      path: "scripts/legal/wrangler-mit.txt",
      sha256:
        "9bb3b077cc8628334bab25961223dd8207252c8a56aa054195be38f1c042aaf4",
      normalizedSha256:
        "15345b86d4e051f1ea13baeb91753bd75ac9a1a18b2b0b9cfa096192a5870cdb",
    }),
    wranglerApache: Object.freeze({
      path: "scripts/legal/wrangler-apache-2.0.txt",
      sha256:
        "62c7a1e35f56406896d7aa7ca52d0cc0d272ac022b5d2796e7d6905db8a3636a",
      normalizedSha256:
        "95bd3988beee069fa2848f648dab43cc6e0b2add2ad6bcb17360caf749802bcc",
    }),
    swissNotice: Object.freeze({
      path: "scripts/legal/swiss-ephemeris-notice.txt",
      sha256:
        "c2197fdee9a74327d39fd15c97282fe1b9e93795e74b1bc72ae305e5676996a3",
      normalizedSha256:
        "07fcc749abd75e377b685ce9e1e8cae7683b81825e6a647a3921ebf2f3e6514b",
    }),
    swissSourceOffer: Object.freeze({
      path: "scripts/legal/swiss-source-offer.txt",
      sha256:
        "11045b4cdb20e72f37724cfb98899c0b8ae7f657f13eb57fc04d9ff3a6faed9b",
    }),
  }),
  astronomy: Object.freeze({
    package: "astronomy-engine",
    version: "2.1.19",
    license: "MIT",
    sourceRepository: "https://github.com/cosinekitty/astronomy",
    licensePath: "LICENSE",
  }),
  cartography: Object.freeze({
    package: "world-atlas",
    version: "2.0.2",
    license: "ISC",
    integrity:
      "sha512-IXfV0qwlKXpckz1FhwXVwKRjiIhOnWttOskm5CtxMsjgE/MXAYRHWJqgXOpM8IkcPBoXnyTU5lFHcYa5ChG0LQ==",
    gitHead: "a912c0a22c3fbd1979cb6defdd6389d8c35e7c2a",
    sourceRepository: "https://github.com/topojson/world-atlas",
    runtimePackages: Object.freeze([
      "d3-geo",
      "topojson-client",
      "world-atlas",
    ]),
    readmeRelativePath: "node_modules/world-atlas/README.md",
    readmeSize: 5_403,
    readmeSha256:
      "6fb00482638ef8f6618099e71e3422713c2dd60c7deedcd96d4b95f61d124b9b",
    dataset: "Natural Earth",
    datasetVersion: "4.1.0",
    asset: "countries-110m.json",
    assetRelativePath: "node_modules/world-atlas/countries-110m.json",
    assetSize: 107_761,
    assetSha256:
      "2516c915867c7baf18ddec727aec46c315541a07cfb3d79a6559b05d5e94eee8",
    scale: "1:110m",
    imports: Object.freeze([
      Object.freeze({
        source: "astrologo-frontend/src/components/LocalityWorldMap.tsx",
        specifier: "world-atlas/countries-110m.json",
      }),
    ]),
    termsUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
  }),
  swiss: Object.freeze({
    package: "@fusionstrings/swiss-eph",
    wrapperVersion: "0.1.1",
    wrapperGitHead: "e7a7a9311d3058f337b73b72f45ea6d80cffa5f0",
    wrapperIntegrity:
      "sha512-UGKCfVh5TUygShCNKnh7iauJ109QYgV+e3+8PACOsiIFyiX8z3PIw7etbYDqF0egsJfIArRdDjOwrliAOFGNgA==",
    wrapperTarballSha256:
      "ef90330d9ed41da5358b47c60b29ad8f3970a7d09c083fd176f8b9833ad9fcbd",
    upstreamVersion: "2.10.03",
    upstreamRevision: "5ae0bce00dbc66c6315c86da20518e3dd138255b",
    license: "AGPL-3.0",
    wrapperSourceRepository: "https://github.com/fusionstrings/swiss-eph",
    upstreamSourceRepository: "https://github.com/aloistr/swisseph",
    upstreamNoticePath: "swephexp.h",
    wasmExport: "@fusionstrings/swiss-eph/wasm-wasi",
    wasmRelativePath:
      "node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm",
    wasmSize: 1_275_365,
    wasmSha256:
      "31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c",
    wasmSha512:
      "f0929366006f037e45eb7085234623ec5fdc73f68cea7bf0c2696a038df979e3d346375a3b8123065863666801c234864a61d9042c6af961b7acdb455bad6de3",
  }),
  functionsBundle: Object.freeze({
    metafile:
      "astrologo-frontend/.wrangler/functions-build-check/bundle-meta.json",
    report: "astrologo-frontend/dist/legal/FUNCTIONS-BUNDLED-LICENSES.md",
    licenseFallbacks: Object.freeze({
      "astronomy-engine": Object.freeze({
        version: "2.1.19",
        license: "MIT",
        fragments: Object.freeze(["astronomy"]),
        source: "https://github.com/cosinekitty/astronomy/blob/v2.1.19/LICENSE",
        rationale:
          "O tarball npm não inclui LICENSE; texto pinado do tag oficial.",
      }),
      launder: Object.freeze({
        version: "1.7.1",
        license: "MIT",
        author: "Apostrophe Technologies, Inc.",
        repository: "https://github.com/apostrophecms/apostrophe.git",
        revision: "e9b0ab0849a5dfea0f75335fbdf99b5c6bf9e4b3",
        fragments: Object.freeze(["launderMit"]),
        source: "https://spdx.org/licenses/MIT.html",
        rationale:
          "O tarball e o tag oficial não incluem LICENSE; texto MIT canônico com atribuição do package.json instalado.",
      }),
      wrangler: Object.freeze({
        version: "4.125.0",
        license: "MIT OR Apache-2.0",
        fragments: Object.freeze(["wranglerMit", "wranglerApache"]),
        source:
          "https://github.com/cloudflare/workers-sdk/tree/wrangler%404.125.0",
        sourceRepository: "https://github.com/cloudflare/workers-sdk",
        revision: "38b46238c57f0d85dc1334ce374ba709eab13749",
        licensePaths: Object.freeze(["LICENSE-MIT", "LICENSE-APACHE"]),
        rationale:
          "O tarball npm não inclui os textos; cópias pinadas de LICENSE-MIT e LICENSE-APACHE do tag oficial.",
      }),
    }),
  }),
});
