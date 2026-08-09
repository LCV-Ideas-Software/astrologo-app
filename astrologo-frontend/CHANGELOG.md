# Changelog — Astrólogo Frontend

## [v02.24.00] - 2026-08-08

### Alterado

- Migra o transporte de IA do endpoint AI Studio (API key `GEMINI_API_KEY`) para o **Vertex AI** (Gemini Enterprise Agent Platform), autenticando com service account (`VERTEX_SA_KEY`) via JWT RS256 (WebCrypto) trocado por access token OAuth2. O consumo passa a faturar no pós-pago padrão do Cloud Billing. Prompts, seletor de modelo do admin (D1 `admin_module_configs`/`astrologo-config`, com fallback legado), orquestração reentrante (jobs, fragmentos, reduções, síntese), saída estruturada (`responseJsonSchema`), `thinkingLevel` por família de modelo, retries e telemetria permanecem com o mesmo comportamento.
- Os limites de planejamento do orquestrador tornam-se constantes locais (entrada 128k, teto de escalada de saída 65.536): o Vertex AI não expõe limites de token do modelo por API (o probe `models.get` do AI Studio deixa de existir). Nenhum budget derivado muda; a escalada de `MAX_TOKENS` preserva o teto anterior.

### Adicionado

- Novo módulo `functions/api/_shared/vertex.ts`: cliente REST mínimo do Vertex AI espelhando a superfície do SDK usada pela análise (`generateContent`/`countTokens`), com cache de access token por identidade de chave, single-flight, `httpOptions.timeout` via `AbortSignal`, erros `VertexHttpError` com `status` numérico (preserva o classificador de retry) e o fetch global desacoplado do `this` (regressão conhecida do workerd).

### Removido

- Dependência `@google/genai` e a entrada `https://generativelanguage.googleapis.com` do `connect-src` da CSP (as chamadas de IA sempre foram server-side).

### Testes

- Novo `functions/api/_shared/vertex.test.ts` — 17 testes do cliente (assinatura JWT verificada criptograficamente, cache/expiração/single-flight, mapeamento REST incluindo `responseJsonSchema` e timeout, regressão do `this` do workerd, erros com `status`). Suíte total: 313/313.

## [v02.23.05] - 2026-07-21

### Segurança

- Atualiza `protobufjs` para `7.6.5` por meio do override transitivo usado pelo `@google/genai`, corrigindo GHSA-j3f2-48v5-ccww / CVE-2026-59877 sem alterar a API do frontend ou das Pages Functions.

## [v02.23.04] - 2026-07-13

### Corrigido

- A análise reentrante volta a preservar todos os fragmentos interpretativos e acrescenta a síntese sem substituir ou resumir o conteúdo já produzido.
- O prompt não limita palavras, parágrafos ou extensão: remove somente metodologia, definições e informações tecnológicas destinadas aos diálogos “Saiba Mais”.
- A regra histórica de emojis e símbolos pictóricos obrigatórios é restaurada integralmente, inclusive nos títulos e ao longo da interpretação.
- Aspectos, Casas, sinastria, Anjo Regente, Falange Angelical, trânsitos e localidade mantêm instruções cumulativas de profundidade; o fix do erro `422` permanece intacto.

### Testes

- O contrato atual prova a montagem `fragmentos + síntese`, a ausência de tetos editoriais e a presença da diretiva pictórica completa nos caminhos particionado e direto.

## [v02.23.03] - 2026-07-13

### Corrigido

- A barreira semântica deixa de converter escolhas editoriais, títulos ou omissões da síntese em falha `422`; transporte, schema, integridade, sanitização e persistência continuam falhando de modo fechado quando tecnicamente inválidos.
- Os títulos desejados são derivados dos domínios realmente disponíveis e informados ao modelo em ordem explícita, mantendo a melhoria de texto no prompt sem interferir no mecanismo reentrante.

### Testes

- O protocolo reentrante cobre uma síntese com omissão editorial sem falha estrutural e a composição completa do checklist quando todos os domínios opcionais estão presentes.

## [v02.22.04] - 2026-07-12

### Corrigido

- Marcadores técnicos `ASTROLOGO_PAYLOAD` não são mais apresentados na Síntese do Mestre, no relatório em texto, no e-mail ou ao reabrir um mapa salvo.
- O prefixo entregue ao Gemini não contém mais as sentinelas de restauração; a sanitização central e a última fronteira de persistência impedem que uma resposta do modelo volte a expô-las.
- O endpoint de e-mail limpa independentemente HTML e texto simples, inclusive quando recebe uma análise histórica contaminada.

## [v02.22.03] - 2026-07-12

### Corrigido

- A análise em partes não depende mais de a IA reproduzir hashes, IDs e listas técnicas: o backend anexa esses valores imutáveis e valida integralmente o conteúdo devolvido.
- O Gemini 3.1 Pro usa raciocínio `LOW` nos fragmentos e reduções, evitando o `thinking` alto implícito que consumia tempo até o timeout; síntese e análise direta usam `MEDIUM`, e as partes recebem orçamento inicial de 8.192 tokens de saída.
- Os prazos coordenados passam a 80 segundos no provedor, 115 segundos na etapa, 118 segundos no job e 110 segundos no navegador, evitando uma nova posse enquanto a requisição anterior ainda encerra.

### Observabilidade

- Falhas registram `finishReason`, cadeia causal sanitizada, categoria de validação ou transporte e tokens de raciocínio, sem expor credenciais ao D1.
- O teste de regressão percorre realmente o modo particionado e garante uma única geração por requisição.

## [v02.22.02] - 2026-07-12

### Corrigido

- A análise extensa agora usa várias requisições sequenciais: iniciar, planejar, analisar uma parte, persistir, avançar e sintetizar.
- Cada requisição executa no máximo uma geração da IA e possui timeout de 65 segundos no provedor; repetições são novas requisições e nunca três chamadas escondidas na mesma conexão.
- A interface mostra fase, etapas concluídas e barra de progresso, retoma o trabalho pela mesma aba e trata explicitamente respostas 524 ou não JSON.

### Persistência

- Jobs e etapas usam o schema D1 da migration administrativa 018, com capability, lease, tentativas, tokens, payloads e resultados validados por etapa.
- Apenas o relatório integral montado é gravado no mapa; fragmentos nunca aparecem como análise final.

## [v02.22.01] - 2026-07-12

### Segurança

- O HTML produzido pela IA passa por `sanitize-html` com allowlist estrutural de tags, atributos e estilos, eliminando a sanitização incompleta por expressão regular.
- A verificação de conteúdo visível também usa os nós de texto processados pelo parser e continua falhando de forma fechada para respostas vazias.

### Preservado

- Nenhum cálculo, prompt, fluxo de análise, dado persistido ou componente visual foi alterado por este patch.

## [v02.22.00] - 2026-07-12

### Adicionado

- Reidratação autenticada e versionada dos artefatos avançados ao abrir mapas do Arquivo Akáshico, com proteção contra respostas tardias ao alternar entre registros.
- Planejador semântico para análises extensas, com split JSON genérico e reversível, hashes, manifesto de cobertura, lotes aferidos por tokens, fragmentos estruturados, redução hierárquica e síntese integrada.

### Melhorado

- O prompt monolítico vigente permanece inalterado para mapas pequenos; em mapas extensos, todas as instruções continuam cumulativas e somente os dados são distribuídos entre as etapas.
- A localidade mantém cada linha completa quando ela cabe no orçamento e divide apenas linhas isoladamente excessivas em janelas contíguas sem perder coordenadas.
- Todos os HTMLs validados são montados deterministicamente antes da síntese final; o frontend continua recebendo o mesmo campo `analise` e não precisa recompor respostas parciais.

### Segurança e confiabilidade

- Somente gerações terminadas com `STOP` e cobertura exata são aceitas. Respostas truncadas, inválidas ou incompletas não atualizam `analise_ia`.
- Sessões são restauradas somente pelo token e sem dependência do Resend; artefatos avançados exigem mapa pertencente ao e-mail resolvido pela sessão e nunca expõem sinastria de um mapa secundário.
- O primeiro salvamento exige a prova secreta emitida no cálculo e reivindica atomicamente todos os mapas ainda sem proprietário; apenas conhecer um ID não concede acesso, e proprietários existentes nunca são sobrescritos.
- Ausência canônica, contrato inválido e falha D1 são diferenciados; corrupção e indisponibilidade operacional falham com `409`/`503`, sem falso sucesso nem apagamento do snapshot salvo.
- A persistência mede o tamanho da linha completa, reserva margem operacional e bloqueia o `UPDATE` antes que a análise ultrapasse o limite de 2 MB do D1.

### Preservado

- Ausência de artefato canônico não apaga o snapshot salvo. UI, relatórios, e-mail, horários de Brasília e textos em português do Brasil permanecem compatíveis.

### Implantação

- Requer o `admin-app` v02.14.00, cuja migration 017 e preflight idempotente preparam a prova de propriedade e o bucket separado de leitura autenticada.

## [v02.21.00] - 2026-07-12

### Adicionado

- Roda natal SVG com cúspides, corpos, ângulos e aspectos, acompanhada por quadros de Aspectos Natais e Análise das 12 Casas Placidus.
- Céu Atual com posições tropicais e regiões constelacionais IAU, aspectos trânsito–natal, fases e aperfeiçoamentos geométricos verificados.
- Sinastria com consentimento, dados brasileiros de nascimento, resolução de ambiguidades de horário, aspectos intermapa e casas recíprocas.
- Mapa Planetário de Localidade com linhas MC, IC, ASC e DSC, filtros por planeta e mapa Natural Earth empacotado.
- Botão **Saiba mais** e explicação leiga em cada novo quadro.

### Melhorado

- Adendos cumulativos da IA cobrem os quatro novos módulos sem alterar ou resumir o prompt anterior.
- Relatório copiado, WhatsApp, e-mail e mapas salvos incluem os resultados avançados em português do Brasil e Hora oficial de Brasília.
- Cartografia carregada sob demanda: o bundle inicial de produção permanece abaixo de 500 kB e o mapa usa um chunk independente.
- Modelo do Astrólogo passa a respeitar a configuração canônica do Admin, mantendo fallback para registros legados.

### Segurança e confiabilidade

- Contratos estritos, hashes, diagnósticos e persistência fail-closed ligam execuções e artefatos; respostas incompletas não chegam à renderização.
- Endpoints não criam nem alteram tabelas durante requisições. O schema avançado e os rate limits são providos pelas migrations administrativas.
- Sinastria exige consentimento explícito; localidade não envia dados para serviços de mapa e não recomenda relocação.

### Documentado

- Metodologia, pesquisa comparativa, referenciais e limites em `../docs/METODOLOGIA_MAPAS_AVANCADOS.md`.
- Licenças ISC/MIT e proveniência pública da nova pilha cartográfica adicionadas aos avisos exibidos no aplicativo.

### Preservado

- Mapa básico, Dados Posicionais V2, Tatwas, Numerologia, angelologia, autenticação, registros legados e prompt histórico continuam compatíveis.

## [v02.20.00] - 2026-07-11

### Adicionado

- Botão **Saiba mais** no quadro de posições detalhadas, explicando as quatro camadas: posição tropical, Casa Placidus, região IAU e quinário angelical.
- Botão **Saiba mais** nas Cúspides das 12 Casas Placidus, com definição de cúspide, diferença entre casa e signo, sensibilidade a hora/local e limitação polar.
- Botão **Saiba mais** na Falange Angelical do Mapa, distinguindo o regente derivado do Sol das dez correspondências agrupadas e declarando a base exclusivamente tropical.

### Melhorado

- Conteúdos em português do Brasil voltados a usuários leigos, sem apresentar sistemas simbólicos como medições científicas nem misturar grau tropical com região constelacional.
- A descrição das cúspides agora informa a apresentação com duas casas decimais, e o conjunto que inclui Sol e Lua é chamado de “dez corpos celestes”.

### Preservado

- Cálculos, payloads, persistência, análise por IA, relatórios, e-mail e compatibilidade com mapas salvos não foram alterados.

## [v02.19.00] - 2026-07-11

### Corrigido

- Tatwas calculados em segundos inteiros a partir do instante UTC e do nascer aparente do Sol local, inclusive com o nascer do Sol do dia civil anterior para nascimentos anteriores ao evento local.
- Removidos o truncamento para hora/minuto, a aritmética por `4.8` minutos, o fallback solar genérico e a dependência do retorno arredondado do Open-Meteo.
- Astrologia Tropical e Astronômica passam a ser apresentadas como perspectivas diferentes, sem tratar uma delas como ilusão e a outra como verdade absoluta.

### Adicionado

- Contrato Tatwa `2.0.0` com padrão `fixed`, perspectiva `legacy-rulingFirst`, proveniência astronômica, margens, aviso de fronteira e possibilidade adjacente.
- Identificação defensiva de mapas legados sem marcador, preservando exatamente os resultados históricos.
- Botões **Saiba mais** em Tatwas e Numerologia; conteúdos Tropical e Astronômico reescritos para explicar método, alcance e limitações a usuários leigos.
- Paridade do método e da incerteza na interface, relatório copiado, WhatsApp, e-mail e adendo acumulativo da IA reidratado do registro canônico.
- Validação integral do contrato antes da persistência e política fail-closed no agente: Tatwa ausente no D1 não pode ser substituído pelo navegador.

### Documentado

- Fontes, decisões, casos reais e regras de Numerologia em `../docs/METODOLOGIA_TATWAS_E_NUMEROLOGIA.md`.
- Nenhuma alteração de schema D1 é necessária: `dados_globais` já armazena o contrato expandido como JSON serializado.

### Preservado

- Prompt legado integral, cálculos astrológicos, dados posicionais, angelologia, autenticação e mapas salvos continuam compatíveis.

## [v02.18.02] - 2026-07-11

### Segurança

- Corrigido o alerta CodeQL `js/file-system-race` (CWE-367): o destino do WASM é removido por `unlink`, sem checagem prévia e sem seguir links simbólicos, antes da publicação da cópia temporária validada.

### Preservado

- Verificações de tamanho/SHA-256, gravação exclusiva, `rename`, rehash final, testes Placidus e bytecode Swiss Ephemeris `2.10.03` permanecem inalterados.

## [v02.18.01] - 2026-07-11

### Segurança

- O Swiss Ephemeris WASM não é mais versionado no repositório: comandos controlados de desenvolvimento, teste e build o materializam sob demanda a partir de `@fusionstrings/swiss-eph@0.1.1`, com conferência de tamanho e SHA-256 antes e depois da gravação.
- PR e deploy rejeitam artefatos binários executáveis no commit imutável; o Scorecard oficial agora roda em todo push para `main`, e o caminho materializado também foi excluído da publicação npm.
- CI endurecido com lifecycle scripts de dependências desativados, 81 testes obrigatórios, build prévio de Pages Functions e Wrangler `4.110.0` fixado no lockfile.
- A release automática só é criada depois que Deploy, Scorecard, Public Format e CodeQL do mesmo commit concluem com sucesso.
- Documentação de proveniência atualizada para distinguir identidade criptográfica do tarball, assinatura do registro e ausência de atestado de build reproduzível do upstream.

### Preservado

- O módulo permanece byte a byte idêntico, reporta Swiss Ephemeris `2.10.03` e conserva os mesmos resultados no fixture Placidus.

## [v02.18.00] - 2026-07-11

### Adicionado

- Dados posicionais v2 dos dez planetas: graus tropicais, decanatos, Casas Placidus, 12 cúspides, Ascendente, Meio do Céu, classificação de constelações IAU e correspondências dos 72 anjos em quinários de 5 graus.
- Anjo Regente do Consulente derivado exclusivamente do quinário tropical do Sol natal, sem campo redundante no schema ou no D1; falange dos demais corpos preservada.
- Novos quadros responsivos de posições, cúspides e falange, com nomes em português brasileiro, ícones planetários e zodiacais maiores e coloridos, sem exposição de IDs internos.
- Relatórios de texto, HTML/e-mail e adendo acumulativo do agente de IA atualizados para os novos cálculos; prompt legado preservado byte a byte.

### Corrigido

- Toda data e hora apresentada usa explicitamente `pt-BR` e `America/Sao_Paulo`, enquanto o nascimento continua sendo interpretado no fuso real do local.
- Sanitização de e-mail preserva com segurança idioma e direção dos tripletes hebraicos; contraste e responsividade dos novos componentes foram validados em desktop e dispositivo móvel.

### Documentado

- Regra matemática e base metodológica do regente solar em `docs/DECISAO_ANJO_REGENTE_DO_CONSULENTE.md`, incluindo o registro explícito de sequências angelicais concorrentes.

## [v02.17.25] - 2026-05-15

**Patch — 4-gate quality directive compliance (eslint + biome + prettier + cross-review).** Workspace directive 2026-05-15: every code change must pass eslint + biome + prettier + cross-review before Commit & Sync / tag / release / deploy / publish.

### Adicionado

- `npm run biome` (biome check . — uses biome.json scope) + `npm run biome:write` (biome check --write . — auto-fix).
- `deploy.yml` runs `npm run lint` (eslint) + `npm run biome` after `npm ci` and before `npm run build`, so both static gates fire on every push to `main` and every PR.

### Configurado

- `biome.json` schema URL atualizado `2.4.11` → `2.4.14` (installed CLI version).
- `biome.json` `files.includes` adicionado: scopes biome para `src/**/*.{ts,tsx,js,jsx}` + `functions/**/*.ts`; exclui `dist/`, `build/`, `.wrangler/`, `node_modules/`, `coverage/`, e CSS files. Sem este scope explícito, biome estava varrendo `dist/` (build artifacts).
- Rule overrides para padrões legítimos deste codebase React+Tailwind:
  - `suspicious.{noArrayIndexKey,noImplicitAnyLet}` → off.
  - `correctness.useExhaustiveDependencies` → off (mount-once useEffect).
  - `style.noNonNullAssertion` → off (Vite `createRoot(document.getElementById('root')!)` idiom).
  - `a11y.{useKeyWithClickEvents,useButtonType,noStaticElementInteractions,useAriaPropsSupportedByRole}` → off.
  - `security.noDangerouslySetInnerHtml` → off (SVG/HTML embedding com sanitização explícita).
- `package.json` version sincronizada com `APP_VERSION`: `2.17.20` → `2.17.25` (estavam fora de sync — `APP_VERSION` já estava em `v02.17.24`).

## [v2.17.20-public-release] - 2026-04-25 — first public release

### Segurança

- **CodeQL `js/redos`** (2 alertas high-severity em `functions/api/analisar.ts:85`): regex `SAFE_STYLE_RE = /^(?:\s*(?:text-align|text-indent)\s*:\s*[^;"'<>]+;\s*)+$/i` continha quantificador aninhado `(?:...)+` com `\s*` interno causando backtracking polinomial. Substituído por função linear-time `isSafeStyle(decls)` que faz split em `;` + valida cada declaração manualmente (key ∈ {text-align, text-indent}, value sem `["'<>]`, length ≤ 256). O(n) traversal sem backtracking.
- **CodeQL `js/incomplete-multi-character-sanitization` + `js/bad-tag-filter` + `js/incomplete-url-scheme-check`** (5 alertas high-severity em `functions/api/enviar-email.ts`): substituída sanitização regex por `sanitize-html` parser-based allowlist. Mesmo playbook aplicado em calculadora-app + oraculo-financeiro nesta sessão.
- 0 alertas abertos pós-fix em CodeQL re-scan.

### Deploy fix

- `wrangler.json` na raiz do repo (com `name: astrologo-app`) era órfão — o Pages project é `astrologo-frontend` (definido em `astrologo-frontend/wrangler.json`). O step `Inject D1 database_id` mutava o root, mas `wrangler pages deploy` rodando de `working-directory: ./astrologo-frontend` resolvia config do CWD = `astrologo-frontend/wrangler.json` (que ainda tinha o placeholder). Deploy #178 (commit `dede313`) falhou com `Error 8000022: Invalid database UUID`. Fix: deletado root `wrangler.json`, jq agora roda com `working-directory: ./astrologo-frontend`.

### Phase 2 hardening (workspace baseline)

- License: AGPL-3.0-or-later. README com seção AGPL §13 source-offer.
- `astrologo-frontend/package.json`: bump 2.17.13 → 2.17.20, +metadata, removido `private: true`.
- `wrangler.json` (em `astrologo-frontend/`, único agora): literal `database_id` redatado via placeholder + injeção jq no deploy.yml a partir de `D1_DATABASE_ID` secret.
- Branch ruleset: `deletion` + `non_fast_forward` + `required_status_checks=deploy` + `code_scanning Any/Any`.
- Workflow permissions: `read` default, allowed_actions `selected`, SHA pinning required.
- README rewrite: 5-entry badges, Fork & Deploy guide explicando layout sub-projeto, AGPL §13 source-offer.
- Community files: `CODE_OF_CONDUCT.md` + `CONTRIBUTING.md` + `.github/CODEOWNERS` (criados na raiz do repo).
- gh-pages branch + Pages live em https://example-beneficiary.github.io/astrologo-app/ + FUNDING.yml self-URL.
- History scrub via `git-filter-repo` (literal D1 ID gone from blobs).

### Validação

- `npm run lint` + `npm run build`: GREEN.
- Deploy CI GREEN no HEAD `6859525` (post-fix run).
- Cross-review session `fda3ee33` aceita o playbook.

## [v02.17.20] - 2026-04-24

### Corrigido

- **Resgate via e-mail/código não restaurava a análise de IA**: o `onClick` do card de mapa salvo (App.tsx) executava `setAnaliseIa('')` — descartando a síntese salva — em vez de ler o campo `analiseIa` embutido no `ResultData` recuperado do D1. Agora usa `setAnaliseIa(m.analiseIa ?? '')`.
- `interface ResultData` passou a declarar `analiseIa?: string`, tipando corretamente o campo que já era persistido (save merge em `{ ...result, analiseIa }`) mas até então invisível ao TypeScript.

### Motivação

- Usuário reportou que dados salvos + análise IA apareciam no admin-app/Astrologo (prova que a D1 tinha o campo), mas o front-end público não restaurava a síntese ao clicar no mapa salvo. Bug client-only, sem mudança no worker nem no schema.

### Corrigido

- `../wrangler.json` e `wrangler.json` deixaram de declarar `observability` por serem configs de Cloudflare Pages; os logs do GitHub Actions confirmaram a incompatibilidade com `wrangler 4.83.0`.

### Motivação

- Restaurar o deploy do `astrologo-frontend` sem perder o restante do baseline validado na rodada anterior.

## [v02.17.18] - 2026-04-17

### Alterado

- Os arquivos `../wrangler.json` e `wrangler.json` agora garantem `observability.logs.enabled = true`, `observability.logs.invocation_logs = true` e `observability.traces.enabled = true`.

### Motivação

- Padronizar logs de invocação e traces do Cloudflare no `astrologo-app` sem perder campos já existentes de observability.

## [v02.17.17] - 2026-04-17

### Alterado

- **Origem e rate limiting fail-closed**: `calcular.ts`, `analisar.ts`, `contato.ts`, `enviar-email.ts` e `astrologo-auth.ts` migraram do limiter ausente/implícito para enforcement real baseado em D1, com rejeição de `Origin` ausente ou fora de `https://*.lcv.app.br`.
- **Tokens de auth endurecidos**: OTPs e sessões passaram a ser persistidos por hash, com lookup compatível durante a transição para não quebrar o fluxo atual dos usuários.
- **Relay de e-mail reduzido**: o envio de relatórios/contato passou a aplicar validação de origem, rate limiting e sanitização dos blocos HTML sensíveis antes do Resend.
- **Suíte alinhada ao novo contrato**: `requestSecurity.test.ts` foi atualizada para afirmar o comportamento seguro de origem ausente como bloqueada.

### Motivação

- **Origem da rodada**: fechamento da auditoria defensiva de 2026-04-17, com foco em remover fail-open de rate limiting, reduzir abuso de e-mail e endurecer os fluxos OTP/sessão.

## [v02.17.16] - 2026-04-16

### Alterado — limpeza de classes Tailwind

- **33 warnings** de classes não-canônicas e conflito de CSS resolvidos em `src/App.tsx` (todos pré-existentes, expostos pelo plugin IDE do Tailwind 4). Substituições canônicas:
  - `z-[99999]` → `z-99999` (4 ocorrências), `z-[100]` → `z-100` (1)
  - `bg-gradient-to-r` → `bg-linear-to-r` (6)
  - `flex-shrink-0` → `shrink-0` (6), `flex-grow` → `grow` (2)
  - `rounded-[2rem]` → `rounded-4xl` (6)
  - `min-w-[140px]` → `min-w-35` (3), `max-w-[200px]` → `max-w-50` (3)
  - `[color-scheme:light]` → `scheme-light` (2)
  - `bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]` → `bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))]` (1, remove whitespace após vírgula conforme canonical)
  - Linha 600: `cssConflict` (`absolute` + `fixed` aplicando `position`): removido `absolute`, mantido `fixed` (background decorativo full-viewport com `-z-10`).

### Motivação

- Política de qualidade: corrigir todos os diagnósticos detectados (errors + warnings, pré-existentes incluídos).
- Bundle sem regressão (275.45 vs 275.58 KB — ganho mínimo pelo uso de classes canônicas).

## [v02.17.15] - 2026-04-16

### Alterado

- **dompurify**: lockfile refreshed; caret `^3.3.3` agora resolve para 3.4.0, que fixa o bypass de `FORBID_TAGS` quando `ADD_TAGS` é função (Dependabot #13, GHSA-39q2-94rc-95cp, medium severity). O Astrólogo não usa `ADD_TAGS` como função (apenas sanitiza output de IA do Gemini com config default), impacto real zero — mas fecha o alerta.
- **Lockfile**: `package-lock.json` regenerado (rm -rf + npm install). 237 packages, 0 vulnerabilidades. Build ok (6.4s).

## [v02.17.14] - 2026-04-10

### Adicionado

- **Biome 2.x**: lint + format com organizeImports

### Alterado

- **vite**: 8.0.7 → 8.0.8
- **vitest**: 4.1.2 → 4.1.4
- **lucide-react**: 1.7.0 → 1.8.0
- **Dependabot groups**: @vitest/_e @biomejs/_ adicionados

## [v02.17.13] - 2026-04-08

### Atualização Tecnológica

- **ESLint 9 → 10**: Migração para `eslint@10.2.0` e `@eslint/js@10.0.1`.
- **`.npmrc`**: Criado com `legacy-peer-deps=true` para resolver conflito `eslint-plugin-react-hooks@7` ↔ ESLint 10.

### Corrigido

- **`_middleware.ts`**: `context: any` substituído por tipagem estrutural `{ request: Request; next: () => Promise<Response> }` — resolve `no-explicit-any`.
- **`calcular.ts`**: Removidas 3 atribuições iniciais mortas (`isDay`, `minsFromStart`, `periodDurationMins`) que jamais eram lidas (regra `no-useless-assignment` do ESLint 10).

### Controle de versão

- `astrologo-frontend`: APP v02.17.12 → APP v02.17.13

## [v02.17.12] - 2026-04-07

### Segurança

- **Vite 8.0.3 → 8.0.7**: Correção de 3 CVEs de severidade alta/média.

### Controle de versão

- `astrologo-frontend`: APP v02.17.11 → APP v02.17.12

## [v02.17.11] - 2026-04-06

### Adicionado

- **Cross-Service AI Telemetry**: Implementação de `logAiUsage` em `analisar.ts` para registro de tokens, latência e status no `ai_usage_logs` (D1).

### Alterado

- **Compatibility Date**: `wrangler.json` atualizados para `2026-04-06`.

### Controle de versão

- `astrologo-app`: APP v02.17.10 → APP v02.17.11

## [v02.17.10] - 2026-04-06

### Corrigido

- **Renderização HTML da Síntese (IA)**: Root cause identificado e corrigido em `sanitizeGeneratedHtml()` no backend `analisar.ts`. A função chamava `escapeHtml()` no conteúdo HTML retornado pelo Gemini, convertendo `<p>`, `<strong>` etc. em `&lt;p&gt;`, `&lt;strong&gt;` — exibindo tags cruas como texto visível ao invés de elementos formatados. Substituído por sanitizador baseado em whitelist de tags (`p`, `strong`, `ul`, `li`, `em`, `b`, `i`, `h1`-`h3`, `br`) com suporte a `style` para `text-align`/`text-indent`.
- **Frontend DOMPurify — style attributes**: Adicionado `'style'` ao `ALLOWED_ATTR` do `sanitizeRichHtml` em `App.tsx`, permitindo que estilos de alinhamento gerados pelo Gemini sobrevivam à sanitização no browser.
- **Persistência de análise IA nos dados de usuário**: O fluxo de salvamento na nuvem ("Salvar na Nuvem") agora inclui `analiseIa` no objeto de mapa salvo (`{ ...result, analiseIa }`), corrigindo a ausência da Síntese do Mestre (IA) na aba "Dados de Usuários" do admin-app.
- **Migração D1 — dados históricos**: Executada migração em produção para reverter `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;` em 2 registros existentes na tabela `astrologo_mapas.analise_ia` e limpar tags `<p>` duplicadas residuais do algoritmo anterior.

### Removido

- Função `escapeHtml()` obsoleta removida de `analisar.ts` (sem uso após refatoração).

### Controle de versão

- `astrologo-app`: APP v02.17.09 → APP v02.17.10

## [v02.17.09] - 2026-04-04

### Resolvido

- **Infraestrutura IA**: Restabelecimento da comunicação das chamadas e análises cósmicas solucionando o erro 500 do backend ao adotar hardcode literal 'gemini-pro-latest' como fallback model, impedindo payload strings vazias.
- **Cloudflare Environment**: Sincronização e injeção do binding `RESEND_API_KEY` mapeado via Secrets Store nativo.

## [v02.17.08] - 2026-04-02

### Controle de versão

- `astrologo-app`: APP v02.17.07 → APP v02.17.08

## [v02.17.09] - 2026-04-04

### Resolvido

- **Infraestrutura IA**: Restabelecimento da comunicação das chamadas e análises cósmicas solucionando o erro 500 do backend ao adotar hardcode literal 'gemini-pro-latest' como fallback model, impedindo payload strings vazias.
- **Cloudflare Environment**: Sincronização e injeção do binding `RESEND_API_KEY` mapeado via Secrets Store nativo.

## [v02.17.07] - 2026-04-01

### Adicionado

- **Configuração de IA Dinâmica (Paridade D1)**: Função serverless `analisar.ts` agora consome a configuração `astrologo-config` nativamente a partir da tabela `admin_config_store` (`BIGDATA_DB`), obedecendo ao que for definido no Admin App, com fallback seguro para \`gemini-2.5-flash\`. O hardcode de modelos (ex: \`gemini-pro-latest\`) foi permanentemente abolido.

### Controle de versão

- `astrologo-app`: APP v02.17.06 → APP v02.17.07

## [v02.17.09] - 2026-04-04

### Resolvido

- **Infraestrutura IA**: Restabelecimento da comunicação das chamadas e análises cósmicas solucionando o erro 500 do backend ao adotar hardcode literal 'gemini-pro-latest' como fallback model, impedindo payload strings vazias.
- **Cloudflare Environment**: Sincronização e injeção do binding `RESEND_API_KEY` mapeado via Secrets Store nativo.

## [v02.17.06] - 2026-03-31

### Corrigido

- **Compliance - docs legais locais em runtime**: o `LicencasModule` passou a carregar `LICENSE`, `NOTICE` e `THIRDPARTY` a partir de `public/legal/*` via `BASE_URL`, eliminando dependência de `raw.githubusercontent.com` no browser e removendo os 404 recorrentes em produção.

### Controle de versão

- `astrologo-app`: APP v02.17.05 → APP v02.17.06

## [v02.17.09] - 2026-04-04

### Resolvido

- **Infraestrutura IA**: Restabelecimento da comunicação das chamadas e análises cósmicas solucionando o erro 500 do backend ao adotar hardcode literal 'gemini-pro-latest' como fallback model, impedindo payload strings vazias.
- **Cloudflare Environment**: Sincronização e injeção do binding `RESEND_API_KEY` mapeado via Secrets Store nativo.

## [v02.17.05] - 2026-03-31

### Adicionado

- **Governança de Licenciamento (GNU AGPLv3)**: Inserção do `LicencasModule` e `ComplianceBanner` no frontend para fechamento do SaaS Loophole com conformidade total.

### Controle de versão

- `astrologo-app`: APP v02.17.04 -> APP v02.17.05

## [v02.17.09] - 2026-04-04

### Resolvido

- **Infraestrutura IA**: Restabelecimento da comunicação das chamadas e análises cósmicas solucionando o erro 500 do backend ao adotar hardcode literal 'gemini-pro-latest' como fallback model, impedindo payload strings vazias.
- **Cloudflare Environment**: Sincronização e injeção do binding `RESEND_API_KEY` mapeado via Secrets Store nativo.

## [v02.17.04] - 2026-03-31

### Corrigido

- **Compliance - GNU AGPLv3**: corrigido erro 404 no invólucro do arquivo LICENSE, publicando o texto integral da licença (~34KB) em conformidade técnica e jurídica.

### Controle de versão

- "astrologo-app": APP v02.17.03 APP v02.17.04

## [v02.17.03] — 2026-03-31

### Alterado

- **Fluxo indireto `preview` padronizado**: branch operacional `preview` adotado no monorepo para promoções consistentes para `main`.
- **Automação de promoção**: workflow `.github/workflows/preview-auto-pr.yml` adicionado/atualizado para abrir/reusar PR `preview -> main`, habilitar auto-merge e tentar merge imediato quando elegível.
- **Permissões do GitHub Actions**: ajuste para permitir criação/aprovação de PR por workflow, eliminando falhas 403 operacionais.

### Controle de versão

- `astrologo-frontend`: APP v02.17.02 → APP v02.17.03

## [v02.17.02] — 2026-03-29

### Alterado

- **CI/CD branch standardization**: workflow de deploy do monorepo `astrologo-app` padronizado para publicar no branch `main` na Cloudflare Pages, com trigger GitHub em `main` e `concurrency.group` atualizado para `deploy-main`.

### Controle de versão

- `astrologo-frontend`: APP v02.17.01 → APP v02.17.02

## [v02.17.01] — 2026-03-27

### Corrigido

- **Acessibilidade e UX**: adicionados atributos de autocompletar (`name`, `tel-national`, `email`) e formatador/máscara de telefone (`formatPhone`) aos inputs do Modal de Contato para garantir paridade com o Oráculo Financeiro.

## [v02.17.00] — 2026-03-27

### Adicionado

- Autenticação por e-mail e token (OTP) implementada para acesso unificado e proteção dos dados do usuário.
- Fluxo completo para salvar, resgatar e excluir dados associados ao seu e-mail de forma segura (`astrologo_user_data` e `astrologo_mapas`).
- Modal de Contato integrado via API Resend, com paridade aos demais sistemas.
- Gerenciamento de sessão persistente no client interligado ao UUID de autenticação de 60 minutos D1.

## [v02.16.00] — 2026-03-24

### Alterado

- Migração de D1 para `example_db` com tabelas prefixadas (`astrologo_mapas`, `astrologo_api_rate_limits`, `astrologo_rate_limit_policies`)
- Rotas de rate limit migradas para namespace contextual (`astrologo/calcular`, `astrologo/analisar`, `astrologo/enviar-email`)

### Infra

- `wrangler.json` atualizado para `example_db` (binding `BIGDATA_DB`)
- Versionamento consolidado para `APP v02.16.00` + `package.json` 2.16.0

## [v02.15.01] — 2026-03-24

### Corrigido

- Persistência da análise de IA na D1 com fallback quando a coluna `data_analise` não existe no schema
- Restauração no admin normalizada ao garantir gravação de `analise_ia` no registro

## [v02.15.00] — 2026-03-23

### Corrigido

- Reinserção obrigatória de emojis e símbolos pictóricos (astros, signos, orixás, esotérico) no prompt da IA, que haviam desaparecido após o upgrade do modelo Gemini

## [v02.14.00] — 2026-03-22

### Alterado

- Upgrade Gemini API: modelo gemini-pro-latest, endpoint v1beta, thinkingLevel HIGH, safetySettings, retry
- Padronização do sistema de versão para formato APP v00.00.00
- Cabeçalho de código adicionado (App.tsx e analisar.ts)
- Correção de duplicação de prefixo "APP v" no footer, email e WhatsApp

## [v02.13.00] — Anterior

### Histórico

- Versão anterior à padronização do controle de versão
