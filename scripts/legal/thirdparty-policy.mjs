export const POLICY = Object.freeze({
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
      source: "https://github.com/cosinekitty/astronomy/blob/v2.1.19/LICENSE",
    }),
    swissNotice: Object.freeze({
      path: "scripts/legal/swiss-ephemeris-notice.txt",
      sha256:
        "7491d821a58cfa08c32e93af69ee4facb0a1b3ea06ee26110a3c400cbe557714",
    }),
    swissSourceOffer: Object.freeze({
      path: "scripts/legal/swiss-source-offer.txt",
      sha256:
        "3479d2b628b7b48fc20fca051a4de6fb939cba68532720368cb2717282ff5e21",
    }),
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
