<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# astrologo-app

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![version](https://img.shields.io/github/v/release/LCV-Ideas-Software/astrologo-app.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/releases)
[![runtime: Cloudflare Pages](https://img.shields.io/badge/runtime-Cloudflare%20Pages-orange.svg)](https://pages.cloudflare.com/)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

**Astrólogo** — gerador de mapas astrais e análises esotéricas via integração Gemini AI. React 19 + Vite 8 sobre Cloudflare Pages com D1 backing store.

**Status.** Stable. Current release: **v02.17.24**. See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

The version history at a glance:

| Release                              | Scope                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`v02.17.24`**                      | **Site sponsor card iteration.** `site/index.html` GitHub Sponsors iframe (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos).                                                   |
| **`v02.17.23`**                      | **Site visual identity refresh.** `site/index.html` (GitHub Pages) reskinneada para a nova identidade dark-first navy/cyan da org LCV (`#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated Phase 2 companion ship (calculadora, oraculo, astrologo, admin, mainsite, maestro, mtasts). Sem mudança no app runtime. |
| **`v02.17.22`**                      | **README organizational standardization.** Adopted the shared repository README opening pattern, corrected public release and clone links to the organization, surfaced the top-level version-history table, and kept the GitHub Sponsors link on `example-beneficiary` by explicit beneficiary decision.                                                                     |
| **`v02.17.21`**                      | **Pages modernization.** Migrated fully to the current GitHub Pages artifact-deployment model and enabled idempotent Pages setup for fresh clones/forks.                                                                                                                                                                                                          |
| **`v02.17.20`**                      | **Pre-public stabilization.** Baseline immediately before the Pages modernization and organization-wide publication parity sweep.                                                                                                                                                                                                                                 |
| **`Security Publication Hardening`** | **Public repo hygiene.** Hardened ignores and packaging boundaries so agent memories, secrets, and local artifacts stay out of GitHub and npm surfaces.                                                                                                                                                                                                           |

## What it does

Aplicação para gerar análises astrológicas a partir de dados de nascimento (data, hora, local). O fluxo:

1. **Coleta**: usuário fornece dados de nascimento via formulário.
2. **Cálculo astrométrico** (`functions/api/calcular.ts`): cálculos determinísticos de posições planetárias, signos, casas — sem IA, baseado em algoritmos astronômicos públicos.
3. **Análise por IA** (`functions/api/analisar.ts`): Gemini 2.5 Pro recebe os dados astrométricos calculados e produz uma narrativa em prosa esotérica.
4. **Persistência opcional** (`functions/api/astrologo-auth.ts` + D1): usuário pode salvar a análise sob um identificador único e recuperar depois com e-mail + código.
5. **Compartilhamento via e-mail** (`functions/api/enviar-email.ts`): envio do mapa + análise para um endereço informado.

Funcionalidades adicionais:

- **Rate limiting por D1** (`requestSecurity.ts`): proteção contra abuso de endpoints públicos via janelas deslizantes persistidas.
- **Auth opcional**: endpoint de resgate por e-mail/código para acesso a análises previamente salvas.
- **Compliance** (`functions/_middleware.ts`): redirect canônico para domínio público + headers de segurança baseline.

## Architecture

```
Browser -> Cloudflare Pages (React build)
                |
                v
       client-side fetch to /api/*
                |
                v
   Cloudflare Pages Functions (functions/api/*)
                |                       |
                v                       v
            D1: BIGDATA_DB        External APIs:
            (astrologo_*          - Gemini AI (análise)
             tables: rate
             limit, sessions,
             saved analyses)
```

## Deploy your own fork

You will need:

- A Cloudflare account with Pages + D1 enabled.
- The Cloudflare CLI [`wrangler`](https://developers.cloudflare.com/workers/wrangler/).
- Node.js 22+.
- A Google AI Studio API key for Gemini integration.

### 1. Clone + install

```bash
git clone https://github.com/LCV-Ideas-Software/astrologo-app.git
cd astrologo-app/astrologo-frontend
npm ci
```

### 2. Create your D1 database

```bash
npx wrangler d1 create example_db
# wrangler outputs:
#   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Wire the database_id into wrangler.json

`astrologo-frontend/wrangler.json` ships with placeholder `00000000-0000-0000-0000-000000000000`. Replace it with the ID from step 2:

```jsonc
{
  "d1_databases": [
    {
      "binding": "BIGDATA_DB",
      "database_name": "example_db",
      "database_id": "<your-d1-id-from-step-2>",
    },
  ],
}
```

### 4. Apply schema (auto-bootstrap)

The Pages Functions self-bootstrap their tables via `CREATE TABLE IF NOT EXISTS` on first hit. A clean D1 will populate the necessary tables on the first request that needs them.

### 5. Configure Gemini secret

```bash
npx wrangler secret put GEMINI_API_KEY --env production
# paste your Google AI Studio API key when prompted
```

### 6. Build + deploy

```bash
cd astrologo-frontend
npm run build
npx wrangler pages deploy dist --project-name=astrologo-frontend
```

## Repository layout

This repo uses a sub-project structure:

- `astrologo-frontend/` — React + Vite app + Pages Functions (the actual deployable surface; contains its own `wrangler.json` with D1 binding).
- `migrations/` — SQL migrations for D1 schema evolution (auto-bootstrap via Functions covers the baseline; migrations are for incremental changes).
- `LICENSE`, `NOTICE`, `THIRDPARTY.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` — repo conventions at root.
- `.github/workflows/deploy.yml` — CI: install + build + jq inject D1 ID + wrangler pages deploy.

## CI deploy (this repo)

Triggers on push to `main`. Steps: setup-node 24 → npm install + build (in `astrologo-frontend/`) → `jq` substitution to inject `D1_DATABASE_ID` from secret into `wrangler.json` → `wrangler pages deploy dist`. The placeholder `database_id` is kept out of git history; the real ID lives only as a GitHub Actions secret.

## Repository conventions

- **License**: [AGPL-3.0-or-later](./LICENSE). Network-service trigger applies — running a modified fork as a public service obligates you to publish modifications. See AGPL §13 source-offer below.
- **Security disclosure**: see [SECURITY.md](./SECURITY.md).
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md).
- **Sponsorship**: see the repo's `Sponsor` button or [central sponsor page](https://www.lcv.dev/sponsor).
- **Action pinning**: all GitHub Actions are pinned by full SHA per supply-chain hardening baseline.
- **Code owners**: [.github/CODEOWNERS](./.github/CODEOWNERS).

## License

Copyright (C) 2026 LCV Ideas & Software

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY. See the GNU Affero General Public License for more details. The full license text is at [LICENSE](./LICENSE).

### AGPL §13 source-offer (operators of public deployments)

If you operate a modified copy of this app as a publicly-accessible network service, AGPL-3.0 §13 obligates you to make the corresponding source code available to your remote users. Comply via:

- A "Source" link in the app's footer pointing to your fork's repository URL.
- A `GET /source` route in `functions/api/` returning your fork's URL as `text/plain`.

If you only deploy this app for your own infrastructure (no external users), §13 does not apply.

---

<p align="center"><span style="font-size: 1.5em;"><strong>© LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713&nbsp;&nbsp;- Pinheiros<br>São Paulo - SP<br>CEP 05.424-150<br>CNPJ: 66.584.678/0001-77<br>IM 05.424-150</sub></p>
