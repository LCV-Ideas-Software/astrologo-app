# Changelog — Astrologo App

## [Unreleased]

## [v02.18.02] - 2026-07-11

### Segurança

- **CodeQL `js/file-system-race` / CWE-367** — removida a sequência `lstat(path)` seguida de operações pelo mesmo caminho na materialização do Swiss Ephemeris. O destino agora é eliminado diretamente com `unlink`, que não segue links simbólicos, antes do `rename` da cópia temporária criada com exclusividade e já verificada.

### Preservado

- O script continua validando tamanho e SHA-256 na origem, na cópia temporária e no destino final; o WASM permanece fora do Git e byte a byte idêntico ao módulo publicado por `@fusionstrings/swiss-eph@0.1.1`.

## [v02.18.01] - 2026-07-11

### Segurança

- **OpenSSF Scorecard `Binary-Artifacts`** — removido do índice Git o executável `swiss_eph.wasm`; comandos controlados do projeto o materializam localmente sob demanda a partir de `@fusionstrings/swiss-eph@0.1.1`, fixado no lockfile, depois de validar tamanho e SHA-256 antes e depois da gravação.
- **Prevenção de recorrência** — PR e deploy inspecionam o commit imutável, de forma case-insensitive e por extensão/magic bytes; o Scorecard oficial passou a executar e bloquear em todo push para `main`, enquanto o caminho gerado permanece excluído do Git e do pacote npm.
- **Build controlado do Worker** — o CI usa `npm ci --ignore-scripts`, executa os 81 testes, compila Pages Functions antes do deploy e fixa Wrangler em `4.110.0` no lockfile.
- **Publicação fail-closed** — a release automática agora aguarda Deploy, Scorecard, Public Format e CodeQL concluírem com sucesso para o mesmo SHA antes de criar tag ou GitHub Release.
- **Proveniência sem sobredeclaração** — os avisos legais distinguem integridade do tarball, assinatura do registro e ausência de atestado de proveniência/reprodutibilidade do upstream.

### Preservado

- O bytecode carregado continua com SHA-256 `31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c` e `swe_version() = 2.10.03`; o fixture Placidus e todo o contrato posicional permanecem inalterados.

## [astrologo-frontend v02.18.00] - 2026-07-11

### Adicionado

- **Dados posicionais v2** — cálculo server-authoritative dos dez planetas com longitude tropical, signo/grau/decanato, 12 casas e cúspides Placidus, Ascendente/MC, constelação IAU com política fail-closed e os 72 anjos em quinários tropicais de 5°. O resultado agrega a falange por planeta e deriva o Anjo Regente do Consulente exclusivamente do quinário ocupado pelo Sol tropical natal, sem duplicar esse dado no contrato ou no banco.
- **Contrato, persistência e superfícies v2** — schema estrito versionado, coluna D1 própria, reidratação do prompt de IA pelo ID do mapa, painel público, relatórios/e-mail e suporte correspondente no `admin-app/Astrologo`.
- **Apresentação angelical em pt-BR** — os três novos quadros usam nomes planetários em português, capitalização brasileira, ícones maiores e coloridos e um destaque próprio para o Anjo Regente do Consulente; IDs internos em inglês permanecem restritos ao domínio técnico.
- **Runtime astronômico auditável** — Astronomy Engine 2.1.19, Swiss Ephemeris WASM 2.10.03 vendorizado, hashes dos artefatos, teste real do contrato WASI e documentação de licenças/proveniência.

### Corrigido

- Subrequisições Open-Meteo agora têm prazo máximo abortável de 8 segundos; a resolução de uma localidade selecionada usa o endpoint oficial por ID, sem confiar em coordenadas ou timezone enviados pelo navegador.
- Datas e horários de apresentação usam explicitamente `pt-BR` e `America/Sao_Paulo`; o horário de nascimento continua sendo interpretado no fuso do local, com gap/fold de DST explícitos e sem inventar fuso para mapas legados.
- O sanitizador do e-mail preserva com segurança idioma e direção dos tripletes hebraicos, e os rótulos pequenos dos novos quadros atendem ao contraste visual esperado sem alterar a paleta do projeto.

### Preservado

- Os quatro planetas e seis regentes dos dois sistemas legados mantêm forma e caminho compatíveis. O corpo histórico do prompt de IA permanece integral e recebe apenas um adendo v2.

## [astrologo-frontend v02.17.25] - 2026-05-15
### Alterado
- **4-gate quality directive compliance** — frontend package and deploy workflow aligned with eslint, biome, prettier, and cross-review gates; package metadata synchronized with `APP_VERSION` and the published v02.17.25 release.

## [astrologo-frontend v02.17.24] - 2026-05-09
### Alterado
- **`site/index.html`** — iframe `github.com/sponsors/.../card` (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos).

## [astrologo-frontend v02.17.23] - 2026-05-09
### Alterado
- **`site/index.html`** — `<style>` block reskinneado pra nova identidade visual dark-first navy/cyan da org LCV (paleta `#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated companion ship Phase 2 com `calculadora-app` v04.01.17, `oraculo-financeiro` v01.10.04, `admin-app` v02.01.01, `mainsite-app` v03.23.01/v02.19.01, `maestro-app` v0.5.17, `mtasts-motor` v02.00.10. Companion à Phase 1 (cross-review-v1 1.12.9, cross-review-v2 v02.18.07, deepseek-cli 0.3.1, grok-cli 1.6.2, sponsor-motor APP v01.02.02, `.github-org/site`). Sem mudança no app runtime; apenas a página GitHub Pages.
- Entrada [Unreleased] anterior (remoção do widget SumUp em `site/index.html`) consolidada aqui — o widget já havia sido removido em ships anteriores.

## [astrologo-frontend v02.17.22] - 2026-04-30
### Alterado
- `README.md` passou a seguir o novo padrão organizacional de abertura: logo harmonizado, bloco curto de status, tabela `The version history at a glance`, links públicos de release/clone corrigidos para `LCV-Ideas-Software/astrologo-app` e manutenção explícita do GitHub Sponsors em `example-beneficiary`.

## [astrologo-frontend v02.17.21] - 2026-04-26
### Alterado
- **`.github/workflows/pages.yml`** — `actions/configure-pages@v6.0.0` passou a declarar `with: enablement: true` para idempotência em forks/clones que ainda não tenham GitHub Pages habilitado (corrige `Get Pages site failed... HTTP 404` em primeiro run).
- **CI/Pages modernization** — workflows migraram de `gh-pages` legacy branch para o padrão atual (artifact deployment via `configure-pages` + `upload-pages-artifact` + `deploy-pages`, todos SHA-pinned).
### Validação
- Trilateral cross-review session `08bc6b9a-f3f5-434d-8276-2b21f562a843` (caller + Codex + Gemini) **READY**: paridade confirmada nos 9 repos públicos do workspace em security baseline, repo features, workflow perms, branch rulesets, Pages deployment, CodeQL Default Setup, 0 alertas abertos.

## [Security Publication Hardening] - 2026-04-23
### Segurança
- Memórias e contexto de agentes passaram a ser locais apenas: `.ai/`, `.aiexclude`, `.copilotignore` e `.github/copilot-instructions.md` foram adicionados ao ignore e removidos do índice Git com `git rm --cached`, preservando os arquivos no disco local.
- Regras de publicação foram endurecidas para impedir envio de `.env*`, `.dev.vars*`, `.wrangler/`, `.tmp/`, logs, bancos locais e artefatos de teste para GitHub/npm.
### Validação
- `git ls-files` confirmou ausência de memórias/artefatos locais rastreados; `npm pack --dry-run --json --ignore-scripts` não incluiu arquivos proibidos.
