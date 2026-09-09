# AGENTS.md - astrologo-app

Pointer for AI agents working in this repository.

## Project

- Repository: `https://github.com/LCV-Ideas-Software/astrologo-app`
- App: Astrologo — aplicacao de astrologia servida por Cloudflare
- Branch: `main`
- License: AGPL-3.0-or-later

## Runtime Shape

React 19 + Vite 8 browser application and Cloudflare Pages Functions live in
`astrologo-frontend/`. The root npm package provides repository validation.
Production deploys run from `main` through GitHub Actions and the official
Cloudflare Wrangler Action. The separate GitHub Pages site comes from `site/`.
This repository does not publish npm packages, Windows packages, GitHub Releases
or version tags.

## Mandatory Gates

From the repository root, install dependencies with `npm ci`, then run:

```powershell
npm run lint
npm run format:public:check
```

From `astrologo-frontend/`, install dependencies with `npm ci`, then run:

```powershell
npm run lint
npm run biome
npm test
npm run build
npm run build:functions
```

## Workspace Policy

The current Enterprise/Organization reform standard supersedes obsolete local
governance instructions. Follow the workspace-root `AGENTS.md` directives of
the private workspace hosting this checkout: prefer official native GitHub
capabilities, then official approved third-party tools; keep repositories
operationally independent. Do not introduce custom gates or central controllers.
Any customization requires the operator's explicit prior decision.

Use Ultrabrain for substantive reasoning and cross-review only when complexity
justifies independent review. Supply complete raw/verbatim evidence, not a
summary presented as evidence. Conduct internal agent communication in English;
preserve external evidence in its original language. Do not require human or AI
review of Dependabot PRs, manually invoke review bots or treat provider quota
exhaustion as a code defect.

Prepare changes locally and present the complete report for operator approval
before committing, pushing or opening a PR. GitHub configuration changes require
separate explicit approval. After an approved push, read the automatic reviews
and checks at the exact PR head before claiming completion. Never change Git or
signing configuration to work around a failure; report it and await the operator.
Do not run local `cargo` or `rustc`, or use Codespaces. Clean up only this
execution's no-longer-needed branches/worktrees after confirming preservation.

CI validates PRs to `main` and manual dispatches. Deploy repeats the root and
frontend checks before publishing the application. GitHub Pages builds its
separate artifact on PRs and deploys only from `main`. CodeQL uses Default setup;
Dependency Review, Zizmor and Scorecard use their official implementations.
Dependabot uses native auto-merge subject to the effective required checks;
minor/patch grouping does not exclude major PRs from auto-merge. Keep the two
TypeScript `>=6.1.0` ignores until the upstream peer range supports that version.
Linear Release records successful push-triggered production Deploy runs at the
exact deployed SHA, using the official Linear action and CLI.

Do not restore retired `actions.lock` mechanisms, merge queue, advanced CodeQL
workflows or custom legal inventory/Functions-report gates. Dependency-manager
lockfiles are distinct: preserve them and regenerate with the official tool
when their dependency graph changes. The official Prettier HTML check remains
part of normal CI and Deploy.

Preserve the existing D1 bindings/schema ownership, Vertex authentication and
model-selection behavior, application version, astronomical calculations and
product tests. `astrologo-frontend/scripts/prepare-swiss-wasm.mjs` materializes a
required imported product asset; it is not a governance controller to retire.
The native Vite license report covers the browser build only. Keep the complete
Functions notices in `astrologo-frontend/public/legal/FUNCTIONS-BUNDLED-LICENSES.md`
as a maintained snapshot, updating component versions, full license texts and
provenance when its distribution changes. Do not claim that Vite covers server
dependencies or that a static snapshot proves future bundle coverage. Follow
`INBOUND.md` for written inbound rights and `SECURITY.md` for private disclosure.

## Registro de trabalho (GitHub Projects, Issues e Discussions)

Existe um unico **operador humano**, assistido por **Claude Code** e **ChatGPT-Codex**.
Os agentes nao formam uma equipe de aprovadores humanos. O que fica so no transcript
se perde para a proxima execucao; por isso o registro abaixo e **obrigatorio**.
Mantenha Issues, Projects e Discussions GitHub vinculados aos Issues, Projects,
Teams, Initiatives e Cycles Linear pertinentes, com conteudo e status coerentes.
Preserve historico, titularidade, prioridade e estado dos conteineres; aplique
o label `Codex` ao trabalho executado pelo Codex. Uma tarefa Em Andamento nao
autoriza mudar o estado ou a saude do projeto que a contem.

Quadro deste repositorio: `https://github.com/orgs/LCV-Ideas-Software/projects/11`
Quadro consolidado da organizacao: `https://github.com/orgs/LCV-Ideas-Software/projects/17`

### Os quatro gatilhos

**G1 — mudanca material de estado.** Atualize o registro canonico existente com o
que foi feito, o que ficou pendente e o contexto necessario a proxima execucao.
Evite comentarios repetitivos. Uma atualizacao de projeto deve refletir seu
estado real, sem marcar `ON_TRACK` automaticamente por causa de uma tarefa.

**G2 — achado nao corrigido.** Todo bug, falha, limitacao de plataforma ou comportamento
inesperado que voce encontrar e **nao** resolver na hora vira issue imediatamente, com
reproducao, ambiente, evidencia, o que ja foi tentado e a hipotese de causa. Use o
formulario adequado em `.github/ISSUE_TEMPLATE/`. **Excecao de seguranca**: nenhum caso coberto
pelo reporte privado de `SECURITY.md` — nem a suspeita de um deles — vira issue
publica; siga o canal privado de la.

**G3 — decisao ou aprendizado duravel.** Criterio objetivo: _"isto seria util para quem
enfrentar este problema daqui a tres meses?"_ Se sim, vira Discussion.

- Conhecimento especifico deste repo -> Discussions **deste repositorio** (Q&A ou Ideas).
- Conhecimento transversal a varios repos (politica de release, regra de ruleset, restricao
  de plataforma) -> Discussions **da organizacao**.

**Excecao de seguranca** (tambem no G3): causa raiz, caminho de exploracao ou licao de
remediacao ligada a **qualquer caso coberto pelo reporte privado de `SECURITY.md`** nao
vira Discussion publica antes da divulgacao coordenada. Registre no canal privado de
`SECURITY.md`/advisory correspondente; apos a divulgacao, publique a versao saneada como
Discussion, sem detalhes de exploracao.
**G4 — trabalho nao-trivial.** Abra a issue **antes** do PR e referencie com `Closes #N`.
Isso ativa o fechamento automatico, o campo _Linked pull requests_ e a progressao de Status.
**Excecao de seguranca** (tambem no G4): trabalho que remedia **qualquer caso coberto
pelo reporte privado de `SECURITY.md`** — a lista de la, nao uma mais estreita: suspeita
de vulnerabilidade, vazamento de credencial, exposicao de dado privado, bypass de
autenticacao, problema em fluxo de pagamento, questao de cadeia de suprimentos ou
configuracao incorreta de deploy — nao abre issue publica nem carrega `Closes #N` de
superficie publica. O rastreio segue o canal privado do `SECURITY.md` e o advisory
correspondente; o PR referencia o advisory, sem detalhes de exploracao. Se `SECURITY.md`
mudar de escopo, vale o texto de la.

### Valvula de escape

Bump de dependencia, correcao de typo, lockfile e ajuste de formatacao **dispensam issue**.
O PR basta. Use os recursos Auto-add nativos dos Projects #11 e #17 e confira
os itens reais; regularize um item ausente diretamente no Project, sem criar
um controlador paralelo. A dispensa de issue nao dispensa o relatorio e a
aprovacao do operador para os envios realizados por agentes nesta reforma.

### Campos

Classifique toda issue com **Type** (Task, Bug, Feature, Incident, Security, Maintenance,
Documentation, Spike) e preencha os campos de issue da organizacao **Agent** (quem esta
tocando) e **Origin** (de onde surgiu). Em Bug e Incident preencha tambem **Environment**.
Esses campos sao `ORG_ONLY`: nao aparecem para o publico, mesmo neste repositorio publico.

### Fluxo de Status no quadro

`Triagem` -> `Backlog` -> `Em andamento` -> `Em cross-review` -> `Em PR` -> `Concluido`,
com desvios `Bloqueado` e `Descartado`.

> **Invariante**: as opcoes `Triagem` e `Concluido` estao vinculadas **por ID** a workflows
> internos do GitHub que nao sao editaveis por API. Podem ser renomeadas; **nunca apagadas**.

> **Atualizacao por quadro**: `Status`, `Area` e `Ciclo` sao campos de projeto com IDs
> proprios em cada quadro. Atualize os DOIS quadros — o deste repositorio e o portfolio
> #17 — a cada transicao; ID de opcao de um quadro nunca vale no outro (Discussion org#176).

### Configuration metadata and secrets

Nonsecret identifiers required by official configuration may be versioned under
the current fleet-wide operator directive. The existing D1 `database_name` and
`database_id` in `astrologo-frontend/wrangler.json` identify resources, not
credentials; this is the standard, not a repository-only exception. Tokens,
credentials, secret values and sensitive operational evidence remain private.
Do not rename resources, replace domain metadata, move bindings or change
GitHub settings as incidental cleanup.
