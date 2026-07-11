<p align="center">
  <img src="../.github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# React + TypeScript + Vite

[![release](https://img.shields.io/github/v/release/LCV-Ideas-Software/astrologo-app?sort=semver)](https://github.com/LCV-Ideas-Software/astrologo-app/releases)
[![Deploy](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/codeql.yml)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](../LICENSE)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Change History

**Status.** Stable. Current release: **v02.18.02**. See [CHANGELOG.md](../CHANGELOG.md) for the full release history.

The version history at a glance:

| Release     | Notes                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `v02.18.02` | Elimina a condição de corrida CodeQL no destino materializado sem seguir links simbólicos e preserva a publicação atômica do WASM verificado. |
| `v02.18.01` | Remove o Swiss Ephemeris WASM do Git; dev/test/build materializam e validam o módulo fixado, enquanto CI e Scorecard bloqueiam recorrências. |
| `v02.18.00` | Dados posicionais dos dez planetas, Casas Placidus, constelações IAU, falange dos 72 anjos e Anjo Regente solar, com todas as superfícies humanas em pt-BR. |
| `v02.17.25` | 4-gate quality directive compliance for eslint, biome, prettier, and cross-review in the Astrologo frontend package and deploy workflow. |

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

## Repository conventions

- **License**: [AGPL-3.0-or-later](../LICENSE). Network-service trigger applies: running a modified fork as a public service obligates you to publish modifications.
- **Notices**: see [NOTICE](../NOTICE) and [THIRDPARTY](../THIRDPARTY.md).
- **Security disclosure**: see [SECURITY.md](../SECURITY.md).
- **Code of conduct**: see [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md).
- **Contributing**: see [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Sponsorship**: see the repo's `Sponsor` button or [central sponsor page](https://www.lcv.dev/sponsor).
- **Action pinning**: all GitHub Actions are pinned by full SHA per supply-chain hardening baseline.
- **Code owners**: [.github/CODEOWNERS](../.github/CODEOWNERS).

## Links

- Site: [https://astrologo-app.lcv.dev](https://astrologo-app.lcv.dev)
- GitHub: [https://github.com/LCV-Ideas-Software/astrologo-app](https://github.com/LCV-Ideas-Software/astrologo-app)
- Sponsors: [https://github.com/sponsors/LCV-Ideas-Software](https://github.com/sponsors/LCV-Ideas-Software)

## License

AGPL-3.0-or-later. See [LICENSE](../LICENSE), [NOTICE](../NOTICE), and [THIRDPARTY](../THIRDPARTY.md).

---

<p align="center"><span style="font-size: 1.5em;"><strong>Copyright © 2026 LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713 - Pinheiros<br>São Paulo - SP - CEP 05424-150<br>CNPJ: 66.584.678/0001-77 - IM: 3039854</sub></p>
