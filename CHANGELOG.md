# Changelog — Astrologo App

## [Unreleased]

### Alterado

- O inventário `THIRDPARTY` passa a refletir integralmente as 42 relações diretas dos manifestos raiz e frontend. A arquitetura official-first combina o License Compliance e o Dependency Review nativos do GitHub, o `build.license` do Vite e o `--metafile` do Wrangler com validação local fail-closed de proveniência, lockfile, licenças e Swiss/WASM; os bundles do navegador e das Cloudflare Pages Functions publicam, respectivamente, `legal/BUNDLED-LICENSES.md` e `legal/FUNCTIONS-BUNDLED-LICENSES.md` (#346).
- A criação de Linear Releases após deploy bem-sucedido passa a usar a action oficial `linear/linear-release-action` v0.16.0, pinada por SHA completo; o gatilho pós-Deploy, o SHA publicado, o histórico Git completo, o environment dedicado e as permissões mínimas permanecem inalterados.
- CodeQL, Dependency Review, OpenSSF Scorecard e Zizmor passam a usar diretamente as implementacoes oficiais, sem gate SARIF, reusable workflow, manifesto, scanner ou validador proprio.
- O deploy passa a usar `cloudflare/wrangler-action` oficial; o identificador da D1 compartilhada fica versionado no `wrangler.json`, enquanto tokens e credenciais permanecem secretos.
- O Auto-add nativo dos Projects #11 e #17 substitui o workflow com GitHub App e seu verificador.
- `eslint-plugin-react-refresh` sobe de 0.5.3 para 0.5.4 e `typescript-eslint` de 8.66.0 para 8.67.0 nos dois pacotes; CodeQL sobe para v4.37.7.
- O cooldown nativo do Dependabot passa a sete dias para atualizacoes de versao npm; atualizacoes de seguranca continuam imediatas e Actions permanecem excluidas do atraso.

### Removido

- Native Auto-merge, Auto-release, Releases/tags do web app, validadores customizados de Dependency Review/Scorecard/Projects e o verificador proprio de binarios rastreados.
- O versionamento GitHub externo deixa de ser produzido; a versao interna `APP v02.25.05`, exibida no rodape e validada pelos testes normais do aplicativo, permanece inalterada.

## [v02.25.05] - 10/08/2026

**Limites de saída reaproveitados com segurança entre etapas (achados Copilot e Codex no PR da v02.25.04).**

### Alterado

- O plano persistido do job agora compartilha, somente para o mesmo modelo imutável, o menor teto rejeitado e o maior limite de saída aceito. Fragmentos, reduções e síntese reutilizam essa descoberta, evitando repetir a negociação e reduzindo chamadas e pressão de rate limit.
- Uma rejeição posterior do provedor invalida automaticamente qualquer limite aceito que tenha ficado acima do novo teto. O piso local obsoleto da etapa também é descartado, permitindo retomar a busca binária sem intervalo contraditório.
- As atualizações do plano, da etapa e da contabilidade de tokens são gravadas no mesmo lote D1 sob o lease exclusivo do job; planos anteriores permanecem compatíveis porque os novos campos são opcionais.

## [v02.25.04] - 10/08/2026

**Busca binária do teto real de saída (achado Copilot no PR da v02.25.03).**

### Alterado

- A negociação de `maxOutputTokens` agora persiste tanto o último valor aceito (`outputTokenFloor`) quanto o limite superior derivado dos valores rejeitados (`outputTokenCeiling`) e converge por busca binária. Isso elimina a sequência patológica que voltava a dobrar o valor aceito e reduzia o teto apenas de um em um, consumindo o orçamento de tentativas em modelos com limites não adjacentes, como 8.000 tokens.
- A regressão cobre a negociação completa de 8.192 até 8.000 e comprova que somente probes que estreitam o intervalo são reembolsados; retries funcionais sem progresso continuam sujeitos ao orçamento normal.

## [v02.25.03] - 2026-08-09

**Negociação de teto fora do orçamento de tentativas (achados codex P1 + Copilot no PR da v02.25.02).**

### Alterado

- O 400 de `maxOutputTokens` agora registra o teto rejeitado no payload persistido (`outputTokenCeiling`) e a escalada de `MAX_TOKENS` clampa nele — sem oscilação nem re-tentativa de valor já rejeitado (achado Copilot: 8.192↔16.384).
- A negociação de teto devolve a tentativa consumida (`refundAttempt` no repositório de etapas): a redução até o piso de 1.024 não consome o orçamento de 3 tentativas, que fica reservado para falhas reais (achado codex P1: modelos com teto 1.024 esgotavam o orçamento em 8.192→4.096→2.048 e falhavam antes do piso). O reembolso é finito por construção — o halving é estritamente decrescente.

## [v02.25.02] - 2026-08-09

**Adaptação de teto em runtime (achados codex P1 + Copilot no PR da v02.25.01).**

### Alterado

- O teto conservador de saída para IDs fora da tabela validada volta a ter headroom (65.535): o cap de 8.192 da v02.25.01 eliminava a escalada de `MAX_TOKENS` e criava um beco de truncamento — respostas longas em modelos desconhecidos falhavam o job repetindo o mesmo request (achado codex P1).
- Novo comportamento no retry de etapa: um 400 de `maxOutputTokens` reduz o valor pela metade (piso 1.024) e mantém a etapa retryable — o teto real do modelo é descoberto em runtime em vez de assumido. A garantia absoluta descrita na v02.25.01 ("nenhum 400 possível") era mais forte que o implementado (achado Copilot); esta versão a substitui por recuperação automática documentada.

## [v02.25.01] - 2026-08-09

**Correções dos achados dos bots do PR da v02.25.00.**

### Alterado

- Teto conservador de saída para IDs fora da tabela validada reduzido de 65.535 para 8.192 (o request inicial da orquestração): a escalada de `MAX_TOKENS` nunca dobra além do que um modelo desconhecido comprovadamente aceitou, eliminando 400 por `maxOutputTokens` acima do suportado (achado codex P2).
- `package-lock.json` realinhado à versão do manifesto (achado codex P2 + Copilot).
- O changelog paralelo do frontend passa a acompanhar as entradas do canônico (achado Copilot).

## [v02.25.00] - 2026-08-09

**Seletor de modelos sempre respeitado (diretiva fleet-wide do operador).**

### Alterado

- A tabela `vertexModelCapabilities` deixa de gatear a seleção do modelo: o ID configurado no seletor do admin é usado exatamente como está (validação apenas sintática, pois compõe o path da URL do publisher model). IDs fora da tabela validada recebem limites conservadores (entrada 128 mil tokens pela orquestração; saída 65.535, o menor teto observado entre os modelos validados) — modelos novos nunca são rebaixados silenciosamente na seleção.
- Fallback para `gemini-3.1-pro-preview` passa a ocorrer apenas em runtime, quando o Vertex responde 404 de publisher model para o modelo selecionado, ANTES de qualquer plano de análise ser persistido (novo módulo `functions/api/_shared/modelAvailability.ts`); um 404 da mint OAuth nunca dispara a troca (`VertexHttpError` agora carrega a operação de origem).
- `gemini-3.6-flash` entra na tabela de capacidades validadas (teto de saída 65.536, validado empiricamente no endpoint global em 2026-08-09).
- Planos persistidos por versões anteriores continuam sendo clampados aos limites atuais na retomada, agora preservando o modelo do seletor em vez de reescrevê-lo.

## [v02.24.00] - 2026-08-08

### Alterado

- **Transporte de IA migrado para o Vertex AI** — a análise astrológica deixa a API key do AI Studio e passa a autenticar com service account (`VERTEX_SA_KEY`, secret do projeto Pages) via JWT RS256 → OAuth2, faturando no pós-pago padrão do Cloud Billing. Comportamento preservado integralmente: prompts, seletor de modelo do admin, orquestração reentrante, saída estruturada, `thinkingLevel`, retries e telemetria.
- O modelo configurado passa por uma tabela fail-closed de publisher models Vertex compatíveis com `Count Tokens` e `Structured Output`: aliases legados, variantes incompatíveis e IDs desconhecidos usam `gemini-3.1-pro-preview`; a entrada continua limitada a 128 mil tokens pela orquestração e cada escalada de `MAX_TOKENS` respeita o teto oficial do modelo selecionado.
- Trabalhos iniciados antes da migração também normalizam o modelo e os limites do plano persistido ao serem retomados, preservando análises em andamento sem enviar aliases da Developer API ao Vertex AI.

### Segurança

- `VERTEX_LOCATION` passa por um allowlist dos endpoints oficiais antes da autenticação. Isso impede que delimitadores ou regiões inventadas alterem a origem que receberia o bearer token e mapeia `us`/`eu` para os hostnames multirregionais `.rep` documentados pelo Google.

### Removido

- Dependência `@google/genai` (e seu lockfile transitivo) e a entrada `generativelanguage.googleapis.com` da CSP.

## [v02.23.05] - 2026-07-21

### Segurança

- Atualiza o override transitivo de `protobufjs` de `7.6.3` para `7.6.5` na cadeia do `@google/genai`, corrigindo a possibilidade de negação de serviço por loop infinito durante a análise de opções `.proto` malformadas (GHSA-j3f2-48v5-ccww / CVE-2026-59877).
- Preserva APIs, prompts e comportamento da aplicação; a mudança funcional restringe-se ao patch da dependência e ao lockfile correspondente.

## [v02.23.04] - 2026-07-13

### Corrigido

- **Profundidade integral restaurada** — o relatório particionado volta a preservar e concatenar todos os HTMLs interpretativos dos fragmentos antes de acrescentar a síntese. A montagem deixa de descartar conteúdo já produzido e não impõe limite editorial de palavras, parágrafos ou extensão.
- **Prompt restaurado e corrigido no escopo solicitado** — a base anterior à regressão volta a reger fragmentos e síntese. Somente explicações conceituais, metodológicas e tecnológicas são excluídas; aspectos, Casas, sinastria, Anjo Regente, Falange Angelical, trânsitos e localidade permanecem profundos e cumulativos.
- **Iconografia recuperada** — emojis e símbolos pictóricos voltam a ser obrigatórios nos títulos e ao longo da interpretação, com o repertório astrológico, zodiacal, espiritual e esotérico histórico do projeto.
- **Fix do 422 preservado** — a restauração não reintroduz a antiga barreira semântica; transporte, schema, identidade, sanitização e persistência continuam validados separadamente.

### Testes

- As guardas passam a rejeitar teto artificial de extensão, fragmentos compactados, descarte do HTML interpretativo e enfraquecimento da iconografia. Trabalhos novos usam o contrato rico v3; trabalhos v2 ainda em andamento também deixam de perder seus fragmentos na montagem.

## [v02.23.03] - 2026-07-13

### Corrigido

- **Erro 422 na síntese final da IA** — a barreira semântica introduzida na versão anterior deixa de transformar escolhas editoriais, títulos ou omissões do modelo em falha estrutural do trabalho. As validações de transporte, schema, integridade, sanitização e persistência permanecem inalteradas.
- **Prompt editorial preciso** — a lista exata e ordenada de seções passa a ser derivada das evidências reais do mapa e entregue explicitamente ao modelo. A qualidade do texto volta a ser aperfeiçoada primeiro no prompt, sem alterar o mecanismo reentrante estável.

### Testes

- O protocolo reentrante cobre uma síntese com omissão editorial sem convertê-la em erro `422`, e verifica a lista completa de títulos produzida quando mapa natal, angelologia, trânsitos, sinastria e localidade estão disponíveis.

## [v02.23.02] - 2026-07-12

### Melhorado

- **Análise dedicada ao consulente** — o relatório final deixa de repetir definições, métodos, contratos e detalhes de funcionamento já cobertos pelos diálogos “Saiba Mais”. A síntese passa a publicar somente interpretação personalizada dos cálculos, com um aviso fundamental fixo no início e uma orientação breve para a ajuda contextual.
- **Profundidade interpretativa** — aspectos natais e Casas são conectados por prioridade e padrões; a sinastria integra comunicação, afeto, desejo, tensões, limites e sobreposições recíprocas; o Anjo Regente e a Falange Angelical passam a ter seções obrigatórias quando seus dados estão presentes.
- **“Saiba Mais” ampliado** — Tatwas, sistemas astrológicos, casas, aspectos, trânsitos, sinastria, localidade, angelologia e roda natal recebem explicações para leitores leigos e poucas referências externas selecionadas.
- **Roda natal interativa** — planetas, aspectos, casas, signos e ângulos reagem a ponteiro, foco e toque, exibem dicas em pt-BR e abrem detalhes curtos em painel envidraçado. A navegação por teclado, o retorno de foco e a preferência de movimento reduzido são respeitados sem acrescentar dependências.
- **UI/UX coerente** — cards originais e novos adotam o mesmo acabamento, hierarquia, estados de hover/foco, ícones coloridos e comportamento responsivo. A legenda da roda mantém contraste integralmente branco sobre o fundo escuro.

### Segurança e privacidade da apresentação

- Uma barreira editorial bloqueia versões, hashes, identificadores, contratos, nomes de infraestrutura, mensagens sobre mapas antigos e outros detalhes internos antes da persistência. Tela, mapas salvos e e-mail também removem a antiga mensagem sobre dados posicionais indisponíveis.
- Mensagens públicas de erro e estado passam a explicar somente o que o usuário pode fazer, enquanto o diagnóstico técnico permanece restrito à telemetria e aos logs internos.
- A configuração do Biome adota a chave `rules.recommended` aceita pela versão instalada, restaurando o gate de formatação e análise estática.
- O Dependabot passa a atualizar também as revisões fixadas em `.pre-commit-config.yaml` e o ambiente Python de `socketsecurity-requirements.txt`, completando a cobertura já existente para os dois projetos npm e para GitHub Actions; todas as agendas diárias foram normalizadas conforme a especificação do GitHub.

### Compatibilidade

- Cálculos, contratos persistidos, schema D1, autenticação, particionamento reentrante e artefatos históricos permanecem inalterados. A montagem antiga é preservada para trabalhos já iniciados; novos trabalhos usam a síntese editorial integrada.
- O acionador do painel da roda passa a ser mantido em estado React, sem leitura de referência durante a renderização, e os utilitários do modal foram isolados do componente para preservar o Fast Refresh e os gates de entrega.
- Cards informativos deixam de entrar artificialmente na ordem de tabulação; a roda mantém somente seus controles reais no teclado e elimina atributos ARIA redundantes dos desenhos internos.
- O lock hashado do Socket Security passa a ser compilado de uma entrada direta rastreada, evitando atualizações parciais que omitam novas dependências transitivas.

## [v02.22.04] - 2026-07-12

### Corrigido

- **Sentinelas internas visíveis na análise** — os marcadores `ASTROLOGO_PAYLOAD` usados para provar a restauração do prompt deixam de integrar o prefixo enviado ao Gemini. O mapa interno referencia apenas as evidências canônicas transferidas para cada unidade.
- **Tela, e-mail e mapas salvos** — a fronteira de saída remove exclusivamente sentinelas completas antes de persistir o HTML. Frontend, relatório em texto e Worker de e-mail repetem a proteção para limpar também análises históricas já armazenadas.

### Segurança e integridade

- Resíduos incompletos do namespace reservado falham de modo fechado antes da persistência final; hashes, manifesto, cobertura, ordem dos fragmentos e restauração byte a byte do prompt original permanecem inalterados.

## [v02.22.03] - 2026-07-12

### Corrigido

- **Falha 422 no primeiro fragmento da IA** — a resposta estruturada deixa de exigir que o Gemini copie hashes, IDs, ordinais e listas em ordem literal. O modelo produz somente o conteúdo narrativo; o servidor anexa a identidade imutável do plano e mantém a mesma validação integral antes de aceitar cada parte.
- **Timeout do Gemini 3.1 Pro** — fragmentos e reduções usam explicitamente `thinkingLevel=LOW`; síntese e caminho direto usam `MEDIUM`. O orçamento inicial de saída das partes passa a 8.192 tokens e o timeout do provedor a 80 segundos, com leases de 115/118 segundos e limite do navegador de 110 segundos, todos ainda abaixo do proxy Cloudflare.

### Melhorado

- A telemetria contabiliza os tokens de raciocínio na saída, registra separadamente falhas de validação e do provedor e persiste a cadeia causal e o `finishReason` com credenciais redigidas.
- Repetições transitórias usam espera exponencial e erros HTTP determinísticos do provedor não são repetidos inutilmente.
- O teste reentrante agora força de fato o caminho acima de 6.000 tokens e comprova resposta de conteúdo, identidade anexada pelo servidor, `thinking` controlado e exatamente uma geração por requisição.

### Preservado

- O prompt histórico e todos os adendos cumulativos permanecem integrais. Cobertura, hashes, ordem canônica, sanitização, persistência final, UI em pt-BR, e-mail, PDF e cálculos não foram reduzidos nem flexibilizados.

## [v02.22.02] - 2026-07-12

### Corrigido

- **Análise realmente distribuída entre requisições** — o particionamento deixa de executar planejamento, fragmentos, reduções e síntese dentro de um único `POST`. O navegador inicia um trabalho persistido, solicita exatamente uma etapa por vez e somente pede a seguinte depois que a anterior foi validada e gravada.
- **Fim do 524 estrutural** — cada geração Gemini recebe prazo de 65 segundos, abaixo do proxy Cloudflare de 120 segundos, e nenhuma repetição ocorre dentro da mesma conexão. Tentativas adicionais acontecem em novas requisições, com progresso e estado retomável.
- **Erro compreensível na UI** — respostas HTML do proxy, inclusive 524, deixam de cair no genérico “A Inteligência falhou”; o frontend identifica resposta não JSON, preserva o trabalho e consulta seu estado antes de repetir.

### Adicionado

- Trabalho de análise protegido por capability SHA-256, lease expirável, etapas idempotentes no D1, progresso em português do Brasil e retomada pela mesma aba por `sessionStorage`.
- Telemetria aguardada por etapa e registro final em `astrologo_ai_analyses`, sem persistir conteúdo parcial em `astrologo_mapas.analise_ia`.

### Preservado

- Prompt histórico e adendos cumulativos, hashes, schemas estruturados, cobertura integral, sanitização, ordem canônica, limites D1, e-mail, PDF e demais cálculos permanecem preservados.

## [v02.22.01] - 2026-07-12

### Segurança

- **Sanitização estrutural do HTML da IA** — substitui a remoção de tags por expressão regular de passagem única pelo parser `sanitize-html` já adotado no projeto, com allowlist de tags, atributos e estilos. A correção elimina a formação de uma nova tag após a remoção de marcação aninhada e fecha o alerta CodeQL `js/incomplete-multi-character-sanitization` sem relaxar a rejeição de respostas visualmente vazias.

### Preservado

- Planejamento em partes, prompt cumulativo, cobertura, síntese, reidratação, autenticação, cálculos, UI, e-mail e persistência permanecem inalterados.

## [v02.22.00] - 2026-07-12

### Adicionado

- **Reidratação canônica de mapas salvos** — ao abrir um registro do Arquivo Akáshico, o frontend preserva imediatamente o snapshot histórico e busca, em segundo plano, os artefatos validados de mapa natal, trânsitos, sinastria e localidade; o envelope é versionado e respostas tardias de outro mapa são descartadas.
- **Análise integral em etapas** — quando o contexto ultrapassa o teto seguro do caminho direto, um planejador divide qualquer documento excessivo por uma árvore JSON genérica, determinística e reversível, preserva linhas cartográficas inteiras quando possível e comprova a reconstrução e a cobertura por SHA-256.

### Melhorado

- **Orquestração adaptativa do Gemini** — os limites de entrada e saída são consultados no modelo configurado, os lotes são aferidos por `countTokens`, no máximo duas gerações são executadas em paralelo e reduções hierárquicas compactam somente as notas que ainda não couberem na síntese, sem regerar nem substituir os HTMLs completos já coletados.
- **Compatibilidade do prompt** — mapas pequenos continuam usando, byte por byte, o prompt monolítico vigente; no caminho longo, somente os contêineres de dados são substituídos por placeholders verificáveis, mantendo todas as instruções e adendos anteriores literais e cumulativos.

### Segurança e confiabilidade

- Cada fragmento usa saída JSON estruturada e só é aceito com `finishReason=STOP`, identidade, hashes e cobertura exata; unidade ausente, evidência extra, nota incompleta, JSON inválido ou `MAX_TOKENS` impedem a síntese e a persistência de qualquer resultado parcial.
- `session-retrieve` volta a funcionar somente com o token de sessão, sem exigir e-mail ou chave do Resend. A recuperação avançada exige sessão válida, presença do mapa na conta e proprietário coincidente no D1; mapa ausente e mapa alheio recebem o mesmo `404`.
- O primeiro salvamento de um mapa sem proprietário exige a prova secreta emitida em `/api/calcular`; todas as provas são pré-validadas e reivindicadas em uma transação D1, sem aceitar apenas o identificador nem permitir associação parcial. Sinastrias salvas são reidratadas apenas para o mapa primário, com os vínculos A/B novamente validados.
- Ausência, corrupção e falha de leitura de artefatos canônicos possuem estados distintos: somente ausência preserva silenciosamente o snapshot legado; contrato inválido retorna `409` e falha D1 retorna `503`.
- Antes do `UPDATE`, o servidor mede os bytes já ocupados pela linha e reserva 131.072 bytes dentro do limite D1 de 2 MB; a análise permanece limitada a 1,5 MB e nunca é persistida se a linha completa não couber.

### Documentado

- `docs/METODOLOGIA_MAPAS_AVANCADOS.md` passa a registrar o fluxo de reidratação, o planejamento da IA em partes, as garantias de cobertura e os limites operacionais.
- O `admin-app` v02.14.00 fornece a migration `017_astrologo_saved_map_claims.sql` e um preflight idempotente que materializa `save_claim_hash`, o backfill histórico inequívoco, o bucket `astrologo/auth-read` e o índice parcial antes do deploy público.

### Preservado

- Mapas legados, snapshots históricos, o caminho direto da IA, o corpo integral do prompt, relatórios, e-mail e toda apresentação visível em português do Brasil permanecem compatíveis.

## [v02.21.00] - 2026-07-12

### Adicionado

- **Mapa natal completo** — roda SVG responsiva com signos, cúspides, dez corpos, ASC/DSC/MC/FC e linhas de aspectos; quadros próprios detalham aspectos natais, fases comprovadas, ocupações das 12 Casas Placidus e grau mundano somente quando derivado do `swe_house_pos`.
- **Céu atual e trânsitos** — posições calculadas pelo relógio UTC do servidor, projeções tropical e constelacional IAU com guarda de fronteira, sobreposição nas casas natais, aspectos vigentes, fase por snapshot posterior e aperfeiçoamento geométrico verificado dentro do horizonte escolhido.
- **Sinastria consentida** — cálculo entre dois mapas completos, 100 pares planetários examinados, aspectos intermapa e sobreposições recíprocas A→B e B→A; o segundo mapa só é persistido após consentimento explícito e não recebe pontuação determinista de compatibilidade.
- **Mapa Planetário de Localidade** — 40 linhas MC, IC, ASC e DSC calculadas após transformar EQJ/J2000 em EQD verdadeiro da data; mapa-múndi SVG filtrável sobre Natural Earth 1:110m, sem tiles, rastreamento ou chamadas cartográficas externas.
- **Ajuda contextual para usuários leigos** — cada novo quadro inclui **Saiba mais**, explicando separação, orbe, fase, reciprocidade, referenciais, limitações, incerteza e o caráter simbólico das interpretações.
- **Contratos e persistência avançada** — artefatos natais, execuções de trânsitos, sinastrias e localidade ganham schemas estritos, hashes SHA-256, diagnósticos, vínculos auditáveis e estados fail-closed no `bigdata_db`.

### Melhorado

- **Agente de IA cumulativo** — o prompt vigente permanece integral e recebe, ao final, adendos autônomos para aspectos/casas, trânsitos, sinastria e localidade; os dados são reidratados do D1 validado e a narrativa é proibida de inventar graus IAU, datas, raios de influência, compatibilidade ou destinos.
- **Relatórios, e-mail e mapas salvos** — todos os novos dados têm apresentação textual e HTML em português do Brasil; instantes visíveis usam `America/Sao_Paulo`, e resultados calculados na sessão acompanham o mapa quando ele é salvo e reaberto.
- **Desempenho cartográfico** — D3, TopoJSON e o mapa-base foram isolados em carregamento sob demanda; o bundle inicial de produção caiu de 534,07 kB para 400,63 kB, deixando o chunk cartográfico separado.
- **Configuração administrativa da IA** — a seleção dinâmica do modelo passa a ler a configuração canônica de `admin_module_configs`, com fallback compatível para o armazenamento legado.

### Segurança e confiabilidade

- Endpoints públicos deixam de executar DDL durante requisições; migrations versionadas tornam-se pré-condição explícita de implantação e as políticas de rate limit são semeadas administrativamente.
- Reidratação de trânsitos, sinastrias e localidade exige execução `ready`, artefato `ready` e vínculo recíproco; sinastrias são encontradas tanto pelo mapa primário quanto pelo secundário.
- Consumidores de rede rejeitam respostas estruturalmente incompletas antes de renderizar. O Swiss Ephemeris continua materializado sob demanda, verificado por tamanho e SHA-256 e ausente do índice Git.

### Documentado

- `docs/METODOLOGIA_MAPAS_AVANCADOS.md` registra fórmulas, referenciais, perfis versionados, pesquisa comparativa de mercado, escolhas de UX, limites interpretativos e estratégia de implantação.
- Avisos de terceiros passam a incluir `d3-geo@3.1.1`, `topojson-client@3.1.0`, `world-atlas@2.0.2`, o trecho MIT da GeographicLib e a condição de domínio público dos dados Natural Earth.

### Preservado

- Dados Posicionais V2, Tatwas, Numerologia, angelologia tropical, Anjo Regente do Consulente, autenticação, mapas legados e o corpo histórico do prompt permanecem compatíveis e não são recalculados silenciosamente.

## [v02.20.00] - 2026-07-11

### Adicionado

- **Ajuda para a leitura detalhada** — o quadro de posições passa a explicar, em linguagem leiga, as diferenças entre posição tropical, Casa Placidus, região oficial da IAU e quinário angelical, além da conversão visual para a Hora oficial de Brasília.
- **Ajuda para as cúspides Placidus** — o novo diálogo define cúspide, diferencia casa de signo, explica a dependência de hora e local, os tamanhos desiguais e a indisponibilidade em latitudes incompatíveis com o método.
- **Ajuda para a Falange Angelical** — o novo conteúdo mostra como os 72 quinários tropicais de 5° são agrupados, distingue o Anjo Regente solar da falange e declara que esta metodologia ainda não foi adaptada ao sistema constelacional.

### Melhorado

- O subtítulo das cúspides deixa de chamar de “exato” um grau apresentado com duas casas decimais, e as referências ao conjunto posicional passam a usar “dez corpos celestes” quando incluem Sol e Lua.
- Os três botões seguem o mesmo modal acessível e responsivo já usado nos demais módulos, com fechamento por Escape, fundo, botão superior ou ação **Entendi**.

### Documentado

- O novo guia `docs/GUIA_LEITURA_DADOS_POSICIONAIS.md` registra as camadas exibidas, as limitações metodológicas e as fontes oficiais utilizadas nas explicações.

### Preservado

- Cálculos, contratos de API, banco D1, persistência, prompt da IA, e-mail, relatórios e `admin-app` permanecem inalterados.

## [v02.19.00] - 2026-07-11

### Corrigido

- **Tatwas por instante astronômico** — o cálculo deixa de descartar segundos e elimina o uso de minutos fracionários. O ciclo agora usa segundos inteiros, intervalos semiabertos, nascer aparente do Sol calculado para as coordenadas exatas e o nascer do Sol do dia civil anterior quando o nascimento ocorre antes do evento local.
- **Fonte solar determinística** — Astronomy Engine 2.1.19 passa a ser a fonte controlada pelo servidor, sem horário genérico nem fallback silencioso para outra cidade; indisponibilidade retorna erro tipado.
- **Perspectivas sem falsa hierarquia** — a narrativa visível deixa de chamar o sistema tropical de “máscara” e o constelacional de “verdade oculta”; ambos são explicados como referências distintas aplicadas ao mesmo nascimento.

### Adicionado

- **Contrato Tatwa v2** — novos mapas usam `fixed` (**Ordem fixa — Akasha primeiro**) e persistem também a perspectiva `legacy-rulingFirst` (**Ordem pelo principal — Tatwa principal primeiro**), com âncora, proveniência, intermediários, margens e hipótese adjacente.
- **Compatibilidade histórica** — mapas sem marcador continuam com seus valores originais e são identificados como registros legados; nenhuma leitura antiga é recalculada ou relabelada como se tivesse a nova proveniência.
- **Ajuda para usuários leigos** — botões **Saiba mais** em Tatwas e Numerologia e explicações ampliadas nos módulos Tropical e Astronômico, com metodologia, limitações, resultado contextual e linguagem integralmente em português do Brasil.
- **Agente de IA e relatórios** — adendo acumulativo, reidratado do D1, ensina os dois métodos sem resumir o prompt anterior; tela, texto, WhatsApp e e-mail passam a identificar método e incerteza.
- **Contrato validado antes de salvar** — combinações impossíveis, timestamps/fusos inválidos e proveniência incoerente são recusados; se o D1 não devolver o Tatwa canônico, o agente omite o dado em vez de aceitar uma substituição enviada pelo navegador.

### Documentado

- Metodologia, fontes históricas concorrentes, algoritmo, fixtures reais, incerteza e cálculo numerológico em `docs/METODOLOGIA_TATWAS_E_NUMEROLOGIA.md`.
- O objeto expandido continua dentro de `dados_globais`; a coluna `TEXT` existente comporta o JSON e não exige nova migração ou `ALTER TABLE`.

### Preservado

- Posições, Casas Placidus, angelologia, autenticação, persistência e estrutura integral do prompt legado permanecem compatíveis.

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

- **`site/index.html`** — `<style>` block reskinneado pra nova identidade visual dark-first navy/cyan da LCV Ideas & Software (paleta `#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated companion ship Phase 2 com `calculadora-app` v04.01.17, `oraculo-financeiro` v01.10.04, `admin-app` v02.01.01, `mainsite-app` v03.23.01/v02.19.01, `maestro-app` v0.5.17, `mtasts-motor` v02.00.10. Companion à Phase 1 (cross-review-v1 1.12.9, cross-review-v2 v02.18.07, deepseek-cli 0.3.1, grok-cli 1.6.2, sponsor-motor APP v01.02.02, `.github-org/site`). Sem mudança no app runtime; apenas a página GitHub Pages.
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
