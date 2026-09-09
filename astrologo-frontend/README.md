<p align="center">
  <img src="../.github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# Astrologo frontend and Pages Functions

[![Deploy](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/LCV-Ideas-Software/astrologo-app/actions/workflows/deploy.yml)
[![CodeQL: Default setup](https://img.shields.io/badge/CodeQL-Default%20setup-2ea44f)](https://github.com/LCV-Ideas-Software/astrologo-app/security/code-scanning)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](../LICENSE)

This package contains the React/Vite application and Cloudflare Pages Functions
for Astrologo. It is a private npm package used to build a web application, not
an npm or Windows distribution. D1 persistence, Vertex AI analysis and Swiss
Ephemeris WASM remain part of the existing product. See the repository
[architecture and deployment guide](../README.md#architecture).

## Change History

**Status.** Stable. Current application version: **v02.25.05**. See [CHANGELOG.md](../CHANGELOG.md) for the full internal version history.

The version history at a glance:

| Version     | Notes                                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v02.25.05` | Persiste e reutiliza os limites de saída aceitos pelo provedor entre etapas do mesmo job/modelo e invalida limites ou pisos que uma rejeição posterior torne obsoletos.                                               |
| `v02.25.04` | Busca binária do teto real de saída: o último valor aceito e o limite superior derivado das rejeições delimitam a negociação de `maxOutputTokens`, sem oscilação nem consumo indevido das tentativas funcionais.      |
| `v02.25.03` | Negociação de teto fora do orçamento de tentativas: teto rejeitado lembrado no payload (escalada clampa nele) e tentativa devolvida no refund — piso 1.024 sempre alcançável.                                         |
| `v02.25.02` | Headroom de saída restaurado para modelos fora da tabela (65.535) com auto-recuperação descendente no 400 de `maxOutputTokens` (metade, piso 1.024) no retry da etapa.                                                |
| `v02.25.01` | Teto conservador de saída para modelos fora da tabela: 8.192 (request inicial); lockfile e changelog paralelo realinhados.                                                                                            |
| `v02.25.00` | O seletor de modelos passa a ser sempre respeitado: sem gate de allowlist na seleção; fallback ao padrão só em indisponibilidade real (404 do publisher model); `gemini-3.6-flash` validado na tabela de capacidades. |
| `v02.24.00` | Migra a autenticação para service account com OAuth2 e substitui o SDK pelo transporte REST do Vertex AI, preservando a orquestração e os contratos de saída.                                                         |
| `v02.23.05` | Atualiza o `protobufjs` transitivo para 7.6.5 e corrige GHSA-j3f2-48v5-ccww / CVE-2026-59877 sem alterar APIs ou prompts.                                                                                             |
| `v02.23.04` | Restaura fragmentos interpretativos completos, extensão sem teto artificial e iconografia obrigatória, mantendo apenas a exclusão de metodologia e o fix do 422.                                                      |
| `v02.23.03` | Remove a barreira semântica responsável pelo 422 final e orienta a cobertura por um checklist editorial derivado das evidências reais do mapa.                                                                        |
| `v02.23.02` | Relatório dedicado à interpretação, ajuda contextual ampliada, barreira contra detalhes internos, roda natal interativa e padronização completa de UI/UX.                                                             |
| `v02.22.04` | Impede que sentinelas internas do particionamento apareçam na tela, em mapas salvos e nos formatos HTML/texto do e-mail.                                                                                              |
| `v02.22.03` | Corrige o 422 dos fragmentos: conteúdo estruturado mínimo, identidade anexada pelo servidor, `thinking` controlado e diagnóstico causal sanitizado.                                                                   |
| `v02.22.02` | Protocolo reentrante da IA: uma parte por requisição, progresso persistido, retomada, timeout abaixo do 524 e síntese somente após cobertura integral.                                                                |
| `v02.22.01` | Sanitização estrutural do HTML da IA com `sanitize-html`, eliminando a vulnerabilidade de remoção incompleta por regex sem alterar os fluxos funcionais.                                                              |
| `v02.22.00` | Reidratação autenticada dos mapas salvos e análise extensa em partes com hashes, cobertura integral, respostas estruturadas e síntese fail-closed.                                                                    |
| `v02.21.00` | Roda natal, aspectos e casas; céu atual tropical e IAU; sinastria consentida; mapa planetário de localidade; IA, e-mail, ajuda e persistência avançada.                                                               |
| `v02.20.00` | Novos “Saiba mais” na leitura detalhada, nas Cúspides Placidus e na Falange Angelical, com explicações leigas das camadas e limitações.                                                                               |
| `v02.19.00` | Tatwas v2 com ordem fixa nos mapas novos, legado identificado, âncora solar auditável, incerteza e novos “Saiba mais” para Tatwas, Numerologia e sistemas astrológicos.                                               |
| `v02.18.02` | Elimina a condição de corrida CodeQL no destino materializado sem seguir links simbólicos e preserva a publicação atômica do WASM verificado.                                                                         |
| `v02.18.01` | Remove o Swiss Ephemeris WASM do Git; dev/test/build materializam e validam o módulo fixado, enquanto CI e Scorecard bloqueiam recorrências.                                                                          |
| `v02.18.00` | Dados posicionais dos dez planetas, Casas Placidus, constelações IAU, falange dos 72 anjos e Anjo Regente solar, com todas as superfícies humanas em pt-BR.                                                           |
| `v02.17.25` | 4-gate quality directive compliance for eslint, biome, prettier, and cross-review in the Astrologo frontend package and deploy workflow.                                                                              |

Consulte a [metodologia de Tatwas e Numerologia](../docs/METODOLOGIA_TATWAS_E_NUMEROLOGIA.md) para as regras, fontes, variantes e limitações desta versão.

O [guia de leitura dos dados posicionais](../docs/GUIA_LEITURA_DADOS_POSICIONAIS.md) documenta posições, Casas Placidus, regiões IAU e correspondências angelicais exibidas nos novos diálogos.

A [metodologia dos mapas avançados](../docs/METODOLOGIA_MAPAS_AVANCADOS.md) documenta os contratos de aspectos, trânsitos, sinastria e localidade, a reidratação autenticada, a análise de IA em partes, os referenciais astronômicos, a pesquisa comparativa e os limites interpretativos.

## Local validation and delivery

From the repository root, run `npm ci`, `npm run lint` and
`npm run format:public:check`. Then, from this directory:

```powershell
npm ci
npm run lint
npm run biome
npm test
npm run build
npm run build:functions
```

The existing `prepare:swiss-wasm` step runs as part of dev, test and build
commands. It materializes the required imported WASM asset from the pinned
dependency with size/hash verification; do not remove it as governance cleanup.
`build` generates the browser bundle; `build:functions` checks the server bundle
with the official Wrangler CLI.

The repository's native CI repeats these validations for PRs to `main`; Deploy
validates and publishes production from `main`. GitHub Pages is a separate
documentation site. CodeQL uses Default setup, and successful production Deploy
runs are recorded through the official Linear Release action at the deployed
SHA. See [native governance](../README.md#ci-and-native-governance) for Dependabot,
official checks and the operator's pre-publication approval boundary.

Vite generates the complete browser license report at
`dist/legal/BUNDLED-LICENSES.md`. The complete Functions notices in
`public/legal/FUNCTIONS-BUNDLED-LICENSES.md` are a maintained snapshot copied to
the deployed site, not an automatically regenerated server report. Relevant
server dependency/distribution changes require its review and update, including
full license texts and provenance. Browser reporting does not cover Functions.

## Repository conventions

- **License**: [AGPL-3.0-or-later](../LICENSE). Network-service trigger applies: running a modified fork as a public service obligates you to publish modifications.
- **Notices**: see [NOTICE](../NOTICE) and [THIRDPARTY](../THIRDPARTY.md).
- **Security disclosure**: see [SECURITY.md](../SECURITY.md).
- **Code of conduct**: see [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md).
- **Contributing**: see [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Inbound rights**: see [INBOUND.md](../INBOUND.md).
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
