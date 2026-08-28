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
    swissNotice: Object.freeze({
      path: "scripts/legal/swiss-ephemeris-notice.txt",
      sha256:
        "7491d821a58cfa08c32e93af69ee4facb0a1b3ea06ee26110a3c400cbe557714",
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
    wasmExport: "@fusionstrings/swiss-eph/wasm-wasi",
    wasmRelativePath:
      "node_modules/@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm",
    wasmSize: 1_275_365,
    wasmSha256:
      "31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c",
    wasmSha512:
      "f0929366006f037e45eb7085234623ec5fdc73f68cea7bf0c2696a038df979e3d346375a3b8123065863666801c234864a61d9042c6af961b7acdb455bad6de3",
  }),
});
