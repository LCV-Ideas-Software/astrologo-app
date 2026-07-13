<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# astrologo-app

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![release](https://img.shields.io/github/v/release/LCV-Ideas-Software/astrologo-app?sort=semver)](https://github.com/LCV-Ideas-Software/astrologo-app/releases)
[![Deploy](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/deploy.yml)
[![Pages](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/pages.yml/badge.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/pages.yml)
[![CodeQL](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/codeql.yml)
[![runtime: Cloudflare Pages](https://img.shields.io/badge/runtime-Cloudflare%20Pages-orange.svg)](https://pages.cloudflare.com/)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

**Astrólogo** — gerador de mapas astrais e análises esotéricas via integração Gemini AI. React 19 + Vite 8 sobre Cloudflare Pages com D1 backing store.

**Status.** Stable. Current release: **v02.23.02**. See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

The version history at a glance:

| Release                              | Scope                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`v02.23.02`**                      | **Interpretação útil e experiência integrada.** A análise final exclui aulas metodológicas e detalhes internos, aprofunda aspectos, sinastria e angelologia; os “Saiba Mais” absorvem as explicações; a roda natal ganha interação acessível e toda a UI/UX adota o mesmo acabamento e movimento.                                                                 |
| **`v02.22.04`**                      | **Saída da IA sem marcadores internos.** Sentinelas de restauração deixam de chegar ao Gemini e são removidas nas fronteiras de persistência, tela, mapas salvos e e-mail, inclusive para análises históricas.                                                                                                                                                     |
| **`v02.22.03`**                      | **IA fragmentada estabilizada.** O Gemini devolve somente conteúdo, o servidor anexa identidades e cobertura imutáveis, fragmentos usam `thinking=LOW` e falhas preservam diagnóstico sanitizado sem ultrapassar a conexão Cloudflare.                                                                                                                             |
| **`v02.22.02`**                      | **IA reentrante sem 524.** Processa uma única parte por requisição, persiste progresso e tentativas no D1, retoma pela mesma aba e só apresenta o relatório depois da síntese e cobertura integrais.                                                                                                                                                                |
| **`v02.22.01`**                      | **Sanitização estrutural da IA.** Substitui a remoção de tags por regex pelo parser `sanitize-html` com allowlist, fechando o alerta CodeQL de sanitização incompleta sem alterar o conteúdo funcional da análise.                                                                                                                                                  |
| **`v02.22.00`**                      | **Reidratação e IA integral.** Restaura artefatos canônicos de mapas salvos com autorização por proprietário e processa contextos extensos em fragmentos semanticamente completos, validados e reunidos antes da persistência.                                                                                                                                    |
| **`v02.21.00`**                      | **Mapas avançados.** Acrescenta roda natal com aspectos e casas, céu atual tropical e IAU com trânsitos, sinastria consentida e mapa planetário de localidade, todos com contratos auditáveis, ajuda contextual, relatórios, e-mail, IA cumulativa e persistência D1.                                                                                             |
| **`v02.20.00`**                      | **Ajuda contextual dos dados posicionais.** Acrescenta explicações leigas à leitura detalhada, às Cúspides Placidus e à Falange Angelical, distinguindo posições tropicais, regiões IAU, casas, quinários e regência solar sem alterar os cálculos.                                                                                                               |
| **`v02.19.00`**                      | **Tatwas v2 e ajuda contextual.** Corrige a âncora solar e a precisão temporal, adota a ordem fixa em novos mapas, identifica a perspectiva legada, comunica fronteiras e proveniência e acrescenta explicações leigas de Tatwas, Numerologia e dos dois sistemas astrológicos.                                                                                   |
| **`v02.18.02`**                      | **Correção CodeQL CWE-367.** A materialização do Swiss Ephemeris elimina a checagem separada do destino e passa a removê-lo sem seguir links simbólicos antes da publicação atômica da cópia verificada.                                                                                                                                                          |
| **`v02.18.01`**                      | **Hardening da cadeia de suprimentos.** O Swiss Ephemeris WASM deixa de ser versionado no Git e passa a ser materializado localmente sob demanda a partir da dependência exata, com verificação de tamanho/SHA-256; CI, Wrangler e Scorecard bloqueiam recorrências antes do deploy.                                                                              |
| **`v02.18.00`**                      | **Dados posicionais e angelologia v2.** Dez planetas com graus, Casas Placidus, cúspides, constelações IAU e quinários dos 72 anjos; Anjo Regente do Consulente derivado do Sol tropical; UI, relatórios, e-mail, prompt de IA e admin integralmente adaptados para apresentação em pt-BR.                                                                        |
| **`v02.17.25`**                      | **4-gate quality directive compliance.** Added Biome gate and deploy workflow coverage for eslint, biome, prettier, and cross-review; synchronized package metadata and aligned the public release train with the published v02.17.25 tag.                                                                                                                        |
| **`v02.17.24`**                      | **Site sponsor card iteration.** `site/index.html` GitHub Sponsors iframe (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos).                                                   |
| **`v02.17.23`**                      | **Site visual identity refresh.** `site/index.html` (GitHub Pages) reskinneada para a nova identidade dark-first navy/cyan da org LCV (`#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated Phase 2 companion ship (calculadora, oraculo, astrologo, admin, mainsite, maestro, mtasts). Sem mudança no app runtime. |
| **`v02.17.22`**                      | **README organizational standardization.** Adopted the shared repository README opening pattern, corrected public release and clone links to the organization, surfaced the top-level version-history table, and kept the GitHub Sponsors link on `example-beneficiary` by explicit beneficiary decision.                                                         |
| **`v02.17.21`**                      | **Pages modernization.** Migrated fully to the current GitHub Pages artifact-deployment model and enabled idempotent Pages setup for fresh clones/forks.                                                                                                                                                                                                          |
| **`v02.17.20`**                      | **Pre-public stabilization.** Baseline immediately before the Pages modernization and organization-wide publication parity sweep.                                                                                                                                                                                                                                 |
| **`Security Publication Hardening`** | **Public repo hygiene.** Hardened ignores and packaging boundaries so agent memories, secrets, and local artifacts stay out of GitHub and npm surfaces.                                                                                                                                                                                                           |

## What it does

Aplicação para gerar análises astrológicas a partir de dados de nascimento (data, hora, local). O fluxo:

1. **Coleta**: usuário fornece dados de nascimento via formulário.
2. **Cálculo astrométrico** (`functions/api/calcular.ts`): cálculos determinísticos de posições planetárias, signos, casas e Tatwas ancorados no nascer do Sol local — sem IA, com contratos versionados e proveniência.
3. **Análise por IA** (`functions/api/analisar.ts`): o modelo Gemini configurado no Admin recebe os dados calculados; contextos pequenos preservam o prompt direto e contextos extensos são analisados em partes com cobertura verificável antes da síntese.
4. **Persistência opcional** (`functions/api/astrologo-auth.ts` + D1): usuário pode salvar a análise sob um identificador único, recuperar depois com e-mail + código e reidratar os artefatos avançados pertencentes à sua sessão.
5. **Compartilhamento via e-mail** (`functions/api/enviar-email.ts`): envio do mapa + análise para um endereço informado.

Funcionalidades adicionais:

- **Metodologia auditável**: [Tatwas e Numerologia](./docs/METODOLOGIA_TATWAS_E_NUMEROLOGIA.md) e [leitura dos dados posicionais](./docs/GUIA_LEITURA_DADOS_POSICIONAIS.md), com fontes, regras e limites interpretativos.
- **Mapa natal completo**: roda SVG interativa e acessível, aspectos, movimentos, Casas Placidus e grau mundano, acompanhados de detalhes curtos por hover, foco, toque ou clique.
- **Céu atual e trânsitos**: posições tropicais e regiões IAU, aspectos trânsito–natal, fase por snapshot posterior e aperfeiçoamento geométrico verificado dentro do horizonte escolhido.
- **Sinastria consentida**: aspectos entre dois mapas e sobreposições recíprocas de Casas Placidus, sem pontuação determinista de compatibilidade.
- **Mapa planetário de localidade**: linhas MC, IC, ASC e DSC em SVG sobre Natural Earth empacotado, sem tiles ou rastreamento cartográfico externo.
- **IA para mapas extensos**: lotes medidos por tokens, hashes e cobertura exata; respostas truncadas nunca são persistidas e somente a síntese interpretativa consolidada chega ao consulente.
- **Metodologia dos mapas avançados**: [contratos, fórmulas, pesquisa comparativa e limites](./docs/METODOLOGIA_MAPAS_AVANCADOS.md).
- **Rate limiting por D1** (`requestSecurity.ts`): proteção contra abuso de endpoints públicos via janelas deslizantes persistidas.
- **Auth opcional**: resgate por e-mail/código, sessão rotativa e reidratação canônica autorizada dos mapas previamente salvos.
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
             maps, artifacts,     - Geocoding/time-zone
             runs, rate limits,
             sessions, saved data)
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

### 4. Apply schema migrations

Apply the versioned migrations before serving requests. Pages Functions deliberately do not execute DDL at request time. In the LCV deployment, migrations `015_bigdata_astrologo_schema_regularization.sql`, `016_bigdata_astrologo_advanced_charts.sql`, and `017_astrologo_saved_map_claims.sql` live in `admin-app/db/migrations` because `bigdata_db` is shared and administratively governed there. A fork must apply equivalent schema to its own D1 before enabling the endpoints.

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
- `migrations/` — historical SQL migrations. The authoritative shared `bigdata_db` migrations are governed by `admin-app/db/migrations` and must be applied before deployment.
- `LICENSE`, `NOTICE`, `THIRDPARTY.md`, `SECURITY.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` — repo conventions at root.
- `.github/workflows/deploy.yml` — CI: install + build + jq inject D1 ID + wrangler pages deploy.

## CI deploy (this repo)

Triggers on push to `main`. Steps: setup-node 24 → npm install + build (in `astrologo-frontend/`) → `jq` substitution to inject `D1_DATABASE_ID` from secret into `wrangler.json` → `wrangler pages deploy dist`. The placeholder `database_id` is kept out of git history; the real ID lives only as a GitHub Actions secret.

## Repository conventions

- **License**: [AGPL-3.0-or-later](./LICENSE). Network-service trigger applies: running a modified fork as a public service obligates you to publish modifications.
- **Notices**: see [NOTICE](./NOTICE) and [THIRDPARTY](./THIRDPARTY.md).
- **Security disclosure**: see [SECURITY.md](./SECURITY.md).
- **Code of conduct**: see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md).
- **Contributing**: see [CONTRIBUTING.md](./CONTRIBUTING.md).
- **Sponsorship**: see the repo's `Sponsor` button or [central sponsor page](https://www.lcv.dev/sponsor).
- **Action pinning**: all GitHub Actions are pinned by full SHA per supply-chain hardening baseline.
- **Code owners**: [.github/CODEOWNERS](.github/CODEOWNERS).

## Links

- Site: [https://astrologo-app.lcv.dev](https://astrologo-app.lcv.dev)
- GitHub: [https://github.com/LCV-Ideas-Software/astrologo-app](https://github.com/LCV-Ideas-Software/astrologo-app)
- Sponsors: [https://github.com/sponsors/LCV-Ideas-Software](https://github.com/sponsors/LCV-Ideas-Software)

## License

AGPL-3.0-or-later. See [LICENSE](./LICENSE), [NOTICE](./NOTICE), and [THIRDPARTY](./THIRDPARTY.md).

---

<p align="center"><span style="font-size: 1.5em;"><strong>Copyright © 2026 LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713 - Pinheiros<br>São Paulo - SP - CEP 05424-150<br>CNPJ: 66.584.678/0001-77 - IM: 3039854</sub></p>
