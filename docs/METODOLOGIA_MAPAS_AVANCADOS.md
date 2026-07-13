# Metodologia dos mapas avançados

Este documento descreve os contratos, cálculos, limites e decisões de apresentação do mapa natal completo, dos trânsitos, da sinastria e do mapa planetário de localidade. Ele não transforma interpretações astrológicas em afirmações científicas. Posições, referenciais, instantes e geometrias são calculáveis e auditáveis; os sentidos atribuídos a eles pertencem a tradições simbólicas.

## Princípios compartilhados

- O instante UTC é canônico internamente. Todo instante apresentado ao público é convertido para `America/Sao_Paulo`, identificado como **Hora oficial de Brasília**, com locale `pt-BR`, calendário gregoriano e ciclo de 24 horas.
- Cada resultado avançado possui `schemaId`, `schemaVersion`, proveniência, identificadores ordenados, diagnósticos e SHA-256 de origem. O dado é validado novamente antes da persistência e da reidratação.
- Trânsitos, sinastrias e mapas de localidade só são reidratados quando a execução e seu artefato estão ambos em estado `ready` e reciprocamente vinculados.
- Os perfis de aspectos e orbes são políticas versionadas do Astrologo, não um “padrão universal”. Alterá-los exige nova versão de contrato.
- A IA recebe adendos cumulativos depois do prompt vigente. Nenhum adendo substitui, resume ou elimina as análises anteriores.
- Nenhuma leitura deve prometer acontecimentos, diagnosticar pessoas ou recomendar decisões médicas, jurídicas, financeiras, afetivas, profissionais ou de moradia.

## Mapa natal completo

O contrato `urn:astrologo:natal-chart-analysis` versão `1.0.0` parte exclusivamente dos Dados Posicionais V2 validados.

### Pontos, aspectos e movimentos

O conjunto inclui os dez corpos já suportados pelo mapa — Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão — e os ângulos disponíveis. A separação é a menor distância angular entre duas longitudes eclípticas, de 0° a 180°. Um aspecto entra no resultado somente quando o orbe, isto é, a distância ao ângulo exato, respeita o limite inclusivo do perfil `astrologo-natal-major-v1`.

Fase aplicativa ou separativa não é deduzida pela ordem dos signos. Ela só é apresentada quando as velocidades longitudinais explícitas permitem comparar a evolução do orbe. O grau mundano dentro de uma casa também não é interpolado entre cúspides: ele só fica disponível quando deriva do `hpos` retornado pelo Swiss Ephemeris.

### Casas e desenho

As cúspides e ocupações usam Placidus. Quando o sistema não pode ser calculado para os dados recebidos, o contrato registra indisponibilidade em vez de trocar silenciosamente de sistema. A roda SVG usa os mesmos pontos, cúspides e aspectos do contrato; ela é uma visualização, não um segundo cálculo.

As perspectivas continuam distintas:

- tropical: longitude em um dos 12 setores sazonais de 30°;
- astronômica real: região bidimensional oficial da IAU que contém a coordenada equatorial, sem “grau dentro da constelação”;
- casa: setor local calculado para lugar e instante de nascimento;
- angelologia: quinário tropical simbólico de 5°, sem extensão automática ao sistema IAU.

## Céu atual e trânsitos

O contrato `urn:astrologo:transit-run` versão `1.0.0` usa como referência o relógio UTC do servidor, não o navegador. As posições geocêntricas aparentes vêm do Astronomy Engine 2.1.19. O horizonte selecionado é um intervalo de busca em UTC de 0 a 30 dias; não representa duração de influência.

O perfil `astrologo-transit-major-v1` examina os dez corpos em trânsito contra os dez corpos natais, o Ascendente e o Meio do Céu. Ele usa conjunção, sextil, quadratura, trígono e oposição, todos com orbe inclusivo de 2°. O snapshot seis horas depois permite classificar um aspecto vigente como aplicativo, exato ou separativo. Quando o orbe não muda de modo conclusivo, a fase fica indisponível.

A data de aperfeiçoamento só é exibida quando a busca do provedor encontra um instante dentro do horizonte e um novo snapshot comprova a separação geométrica dentro da tolerância de `1e-7` grau. Ela não é uma previsão de acontecimento.

As posições atuais exibem lado a lado a projeção tropical e, quando a classificação não está perto de uma fronteira, a região constelacional oficial da IAU. A classificação IAU não possui grau interno. A Casa Placidus exibida é a casa **natal** atravessada pela longitude atual.

## Sinastria

O contrato `urn:astrologo:synastry-run` versão `1.0.0` exige consentimento explícito para calcular e persistir os dados da segunda pessoa. Os nomes não são incorporados ao artefato geométrico; eles permanecem nos registros autorizados dos mapas.

O perfil `astrologo-synastry-major-v1` examina os 100 pares formados pelos dez corpos de A e os dez corpos de B. Ele registra conjunção, sextil, quadratura, trígono, quincúncio e oposição conforme seus orbes versionados. Não existe percentual de compatibilidade, ranking, “alma gêmea”, fase aplicativa/separativa ou previsão de duração.

As sobreposições de casas são direcionais e não intercambiáveis:

- `aToB`: corpos de A nas Casas Placidus de B;
- `bToA`: corpos de B nas Casas Placidus de A.

Se as casas de um mapa não estiverem disponíveis, toda a direção correspondente permanece indisponível. O sistema não substitui Placidus por outro método sem informar.

## Mapa planetário de localidade

O contrato `urn:astrologo:locality-map` versão `1.0.0` projeta onde os dez corpos natais se relacionam geometricamente a quatro ângulos terrestres: Meio do Céu, Fundo do Céu, Ascendente e Descendente.

### Referencial e geometria

Os vetores de origem dos Dados Posicionais V2 estão no equador e equinócio J2000 (`EQJ/J2000`). Antes de usar o tempo sideral aparente de Greenwich (`GAST`), cada vetor é transformado com `Rotation_EQJ_EQD` para o equador verdadeiro da data (`EQD`), aplicando precessão e nutação. Misturar diretamente uma ascensão reta J2000 com GAST produziria longitudes terrestres em referenciais incompatíveis.

Para ascensão reta `α`, GAST `θ`, latitude geográfica `φ` e declinação `δ`:

- MC usa ângulo horário `H = 0`;
- IC usa a longitude oposta ao MC;
- no horizonte geométrico, `cos(H₀) = -tan(φ) tan(δ)`;
- ASC usa `H = -H₀` e DSC usa `H = +H₀`;
- a longitude terrestre é normalizada a partir de `15 × (H + α - θ)`.

As linhas de horizonte são amostradas na resolução escolhida, com altitude de referência 0°, sem refração e sem modelo de elevação do observador. Latitudes sem cruzamento geométrico válido ficam parciais ou indisponíveis; segmentos que atravessam o antimeridiano são separados para não desenhar uma linha falsa através do mapa.

O mapa-base é Natural Earth 1:110m, empacotado por `world-atlas@2.0.2`, convertido por `topojson-client@3.1.0` e projetado/renderizado em SVG por `d3-geo@3.1.1`. Não há tiles externos nem envio de dados a um serviço cartográfico. O Natural Earth declara seus dados em domínio público em <https://www.naturalearthdata.com/about/terms-of-use/>.

O contrato não calcula parans, espaço local, linhas de eclipse, direções por azimute ou um raio quilométrico de influência. Proximidade visual e cruzamento de linhas não autorizam afirmar maior intensidade. O mapa não recomenda mudança, viagem, investimento ou moradia.

## Reidratação de mapas salvos

O snapshot guardado em `astrologo_user_data` continua sendo o registro histórico apresentado imediatamente ao abrir um mapa. Em paralelo, o frontend solicita um envelope `urn:astrologo:saved-map-hydration` versão `1.0.0` ao endpoint autenticado. O servidor resolve o e-mail exclusivamente pelo token de sessão e exige simultaneamente:

- sessão do tipo `session`, não utilizada e não expirada;
- identificador presente na lista de mapas daquela conta;
- linha de `astrologo_mapas` com o mesmo proprietário;
- contrato, versão, estado `ready` e vínculos internos válidos em cada artefato.

Mapa inexistente e mapa de outra conta retornam a mesma resposta `404`. A sinastria só é reidratada quando o mapa aberto é o gráfico primário A e o contrato confirma os identificadores de A e B. Cada artefato é independente: um payload inválido ou ausente não apaga os demais nem substitui o snapshot legado. No navegador, aborto da requisição, identidade do controlador e comparação do `calculationId` impedem que uma resposta atrasada do mapa A modifique o mapa B.

Mapas novos recebem em `/api/calcular` uma prova aleatória cujo SHA-256, e nunca o segredo, fica em `astrologo_mapas.save_claim_hash`. No primeiro salvamento, o navegador apresenta o segredo; o servidor pré-valida existência, proprietário e hash de todos os mapas e executa a reivindicação em uma transação D1 com assertivas internas. Se qualquer prova mudar ou falhar, a transação inteira é revertida. O segredo é removido antes de persistir `astrologo_user_data`, e um titular já registrado nunca é sobrescrito.

Mapas históricos não recebem uma prova inventada. A migration 017 associa registros antigos somente quando `astrologo_user_data` demonstra exatamente um e-mail normalizado para aquele identificador; conflitos, JSON legado malformado e linhas já atribuídas permanecem intocados. Reidratações usam o bucket separado `astrologo/auth-read`, sem consumir a cota das operações mutáveis de autenticação.

Cada artefato possui um estado explícito: `available`, `absent`, `invalid` ou `error`. Somente `absent` autoriza o fallback identificado para o snapshot histórico. Payload canônico corrompido produz `409`; falha operacional do D1 produz `503`. O envelope também confere novamente todos os backlinks internos antes de chegar à interface.

## Análise de IA com contexto extenso

O prompt histórico e todos os adendos permanecem cumulativos. O caminho direto é reservado a entradas de até 6.000 tokens e ainda precisa caber em 75% do limite publicado pelo modelo configurado. Esse teto operacional deliberadamente menor separa mapas avançados mesmo quando o contexto total tecnicamente caberia no modelo, reduzindo latência e risco de timeout. A resposta direta também precisa terminar com `finishReason=STOP`.

Quando o contexto ultrapassa esse teto, o servidor ativa `astrologo-long-analysis-v2`:

1. preserva os bytes UTF-8 e o SHA-256 do prompt monolítico original;
2. substitui exclusivamente cada payload serializado por uma sentinela ligada ao seu hash e comprova que a restauração reproduz o prompt byte por byte; essa sentinela permanece apenas no artefato interno de restauração e é retirada do prefixo entregue ao modelo;
3. reúne consulta, Tropical, Astronômica, dados globais, Tatwas e dados posicionais no domínio coerente `core`, mantendo mapa natal, trânsitos, sinastria e localidade como domínios próprios;
4. mantém cada linha cartográfica como unidade indivisível enquanto ela couber; documentos ou linhas isoladamente excessivos são divididos por uma árvore JSON genérica e reversível, com índices e hashes suficientes para comprovar a reconstrução exata;
5. usa divisão balanceada e consulta `countTokens` somente para grupos finais ou subgrupos que ainda precisam ser divididos, evitando uma chamada remota para cada unidade;
6. cria um trabalho persistido e executa exatamente uma geração por requisição HTTP, sempre depois que a etapa anterior foi validada e gravada;
7. valida cada envelope estruturado antes de coletar seu extrato interno e suas notas interpretativas;
8. inicia a síntese apenas quando a cobertura conjunta coincide exatamente com o manifesto;
9. quando as notas ainda excedem o contexto, executa reduções hierárquicas token-aware que preservam toda a cobertura antes da síntese final;
10. usa as notas completas para redigir uma única síntese definitiva; os extratos dos fragmentos são validados, mas não são concatenados nem apresentados ao consulente.

O contrato editorial da versão 2 separa rigorosamente interpretação e documentação. O relatório ao consulente não ensina conceitos, métodos, sistemas, contratos ou funcionamento interno; essas explicações ficam nos diálogos “Saiba Mais”. A síntese deve interpretar cada domínio disponível uma única vez, aprofundar relações relevantes e incluir explicitamente aspectos natais, sinastria, Anjo Regente e Falange Angelical quando as respectivas evidências existirem. A lista exata e ordenada de títulos desejados é derivada das evidências do próprio mapa e entregue ao modelo. Na versão 02.23.03, essa cobertura é deliberadamente tratada como instrução editorial: omissões ou escolhas vocabulares não derrubam o trabalho. Permanecem obrigatórias as validações técnicas de transporte, schema, integridade, sanitização e persistência.

O Aviso Fundamental e a orientação para consultar os botões “Saiba Mais” são textos fixos do aplicativo, acrescentados na fronteira final. Eles não são regenerados pelo modelo. Trabalhos iniciados com a versão anterior mantêm sua regra histórica de montagem; novos trabalhos usam exclusivamente a síntese consolidada.

O empacotamento usa um limite conservador equivalente a no máximo 48.000 bytes UTF-8 por entrada completa da etapa — cada token necessariamente consome ao menos um byte, portanto esse valor é também um limite superior seguro de tokens e, em português/JSON usuais, resulta em muito menos tokens reais. São reservados tokens para saída e uma margem adicional de 2.048 tokens. A contagem remota inicial decide entre caminho direto e particionado; toda divisão posterior usa o limite local em bytes, evitando várias chamadas remotas de planejamento dentro da mesma requisição. O plano admite no máximo 40 fragmentos, mantendo criação e transições abaixo do teto de 50 consultas por invocação do D1 Free; volumes superiores falham de modo fechado antes de qualquer geração.

### Cobertura e falha fechada

Cada unidade possui `evidenceId`, caminho, SHA-256 e vínculo com a fonte original. A resposta de uma etapa deve repetir exatamente identidade, versão do prompt, hash de entrada e todos os IDs atribuídos. As notas usadas pela síntese também precisam cobrir todas as evidências do lote. As condições abaixo interrompem a montagem e impedem qualquer atualização de `astrologo_mapas.analise_ia`:

- `finishReason` diferente de `STOP`, inclusive `MAX_TOKENS`;
- JSON inválido, campo inesperado ou schema divergente;
- hash, ordinal, fragmento ou domínio diferente do plano;
- evidência ausente, extra, duplicada ou não coberta pelas notas;
- falha de contagem, etapa acima do contexto ou síntese truncada, vazia ou estruturalmente inválida;
- HTML final acima de 1.500.000 bytes ou sem espaço na linha D1 completa depois de reservar 131.072 bytes de margem operacional.

Há até três tentativas por etapa tecnicamente inválida, mas cada tentativa ocupa uma requisição independente. Nenhuma chamada repete `generateContent` dentro da mesma conexão. O navegador recebe `202`, mostra o progresso e solicita a próxima etapa; jobs, partes, leases e resultados intermediários ficam no D1 por até 24 horas e podem ser retomados pela mesma aba. Omissões estritamente editoriais da síntese não acionam repetição nem erro `422`. Uma capability aleatória permanece apenas no navegador e somente seu SHA-256 é persistido. A coluna final existente continua sendo atualizada uma única vez, depois da cobertura estrutural integral. Antes do `UPDATE`, o servidor soma em bytes os demais campos variáveis da linha e recusa a persistência se análise, dados existentes e margem não couberem no limite D1 de 2 MB.

A arquitetura considera os limites oficiais atuais: o Gemini fornece consulta de modelos, contagem de tokens, JSON estruturado, `finishReason`, níveis explícitos de raciocínio e timeout por chamada; o proxy Cloudflare encerra por padrão uma origem silenciosa após 120 segundos; e o D1 limita string ou linha a 2 MB. Cada etapa começa com orçamento de 8.192 tokens de saída e usa timeout de 80 segundos; uma repetição causada por `MAX_TOKENS` pode ampliar esse orçamento até o limite declarado pelo modelo. O navegador aguarda no máximo 110 segundos, o lease da etapa dura 115 segundos e o lease do job 118 segundos; essa ordem impede uma nova posse do trabalho enquanto a conexão anterior ainda encerra e permanece abaixo do proxy. Nos modelos Gemini 3.1 ou posteriores, fragmentos e reduções usam `thinkingLevel=LOW`, enquanto o caminho direto e a síntese usam `MEDIUM`; aliases Gemini 3 sem suporte comprovado a `MEDIUM` recebem `LOW`. Os tokens de raciocínio entram na telemetria de saída. Referências: <https://ai.google.dev/gemini-api/docs/tokens>, <https://ai.google.dev/gemini-api/docs/generate-content/thinking>, <https://ai.google.dev/gemini-api/docs/generate-content/structured-output>, <https://ai.google.dev/api/generate-content>, <https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/>, <https://developers.cloudflare.com/workers/platform/limits/> e <https://developers.cloudflare.com/d1/platform/limits/>.

As sentinelas de restauração nunca compõem uma entrada destinada ao Gemini. A sanitização das respostas remove somente o formato reservado completo antes de gravar fragmentos ou o HTML integral, e qualquer resíduo do namespace interno bloqueia a persistência. A mesma remoção é repetida na apresentação e no e-mail para compatibilidade com análises geradas antes da versão 02.22.04. A versão 02.23.02 também remove a frase histórica sobre indisponibilidade de dados posicionais e bloqueia nomes de infraestrutura, versões, contratos, identificadores, hashes e mensagens operacionais em qualquer nova análise destinada ao usuário.

O JSON estruturado gerado pelo modelo contém apenas os campos narrativos variáveis (`html`, notas e avisos). Identidade do schema, hashes, versão do prompt, ordinal, IDs e cobertura ordenada são valores derivados do plano e anexados pelo servidor antes da validação canônica. Assim, a IA não pode alterar a identidade nem precisa copiar listas técnicas cuja ordem o schema JSON não garante semanticamente; a cobertura das notas e o conteúdo continuam falhando de modo fechado quando incompletos.

## Referências de implementação e pesquisa de produto

As referências abaixo foram usadas como comparação funcional, não como fonte dos cálculos deste projeto:

- O catálogo oficial do Astrodienst descreve roda natal colorida com aspectos, planetas, casas, tabela, distribuição de elementos e Placidus, além de sinastria em roda dupla: <https://www.astro.com/faq/fq_fh_owtype_r.htm>.
- O Astrodienst descreve seu mapa mundial como projeção das posições planetárias para todo o globo, com ASC, DSC, MC e IC: <https://www.astro.com/faq/fq_fh_owspez_r.htm>.
- O manual oficial do TimePassages destaca interpretação acessível ao clicar em elementos do mapa e o biwheel de trânsitos: <https://support.astrograph.com/support/solutions/articles/66000476614-desktop-manual-timepassages>.
- A página oficial do Solar Fire documenta grids de aspectos de sinastria, gráficos temporais, efemérides gráficas e linhas de astro-localidade para ascensão, ocaso, culminação e anticulminação: <https://www.alabe.com/sf6p2.htm>.
- O Astronomy Engine documenta posições, transformações de coordenadas, eventos e classificação de constelação, além de sua validação contra NOVAS e JPL Horizons: <https://github.com/cosinekitty/astronomy>.
- O D3 documenta projeções geográficas esféricas e caminhos SVG: <https://d3js.org/d3-geo/projection>.

Da comparação vieram quatro decisões de UI/UX: desenho e tabela devem coexistir; cada camada precisa ser interativa ou explicável; termos especializados devem abrir ajuda contextual; e métodos e limitações pertencem à documentação “Saiba Mais”, não ao texto interpretativo final. O Astrologo não copia textos, layouts ou perfis de cálculo dessas aplicações.

Na versão 02.23.02, a roda natal continua sendo SVG React derivado dos dados já calculados pelo aplicativo. Planetas, aspectos, Casas, signos e ângulos compartilham um modelo de interação: hover e foco realçam o elemento e suas relações; clique, toque, Enter ou espaço abrem um painel envidraçado curto em pt-BR. Áreas transparentes ampliam os alvos sem alterar a geometria visível, o foco retorna ao acionador, `Escape` fecha o painel e `prefers-reduced-motion` desativa transições não essenciais. A solução nativa evita um segundo motor astrológico e o risco de divergência de cálculo.

Foram consultados os padrões públicos de interação do AstroClick Portrait e AstroClick Travel, do Astrodienst, e do TimePassages. A escolha de manter o SVG existente também considerou o mapeamento de acessibilidade do W3C para SVG e evitou bibliotecas que manipulam diretamente o DOM ou duplicam a geometria astrológica. Referências: <https://www.astro.com/cgi/aclch.cgi>, <https://www.astro.com/cgi/aclch.cgi?btyp=acm>, <https://astrograph.com/timepassages/standard?purchase=1&type=SE>, <https://www.w3.org/TR/svg-aam-1.0/> e <https://www.w3.org/TR/SVG/interact.html>.

## Persistência e implantação

As tabelas avançadas são criadas pela migration `016_bigdata_astrologo_advanced_charts.sql` do `admin-app`; a migration 017 acrescenta a prova de propriedade dos mapas. A versão 02.22.03 depende também da migration `018_astrologo_reentrant_ai_analysis.sql`, que cria jobs, etapas, leases, índices e a policy `astrologo/analisar-etapa`. O preflight 3.0 do `admin-app` reconcilia e verifica essas garantias idempotentemente antes do deploy. Endpoints públicos não executam DDL em tempo de requisição; ausência ou incompatibilidade de schema falha de modo fechado e auditável.
