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

## Referências de implementação e pesquisa de produto

As referências abaixo foram usadas como comparação funcional, não como fonte dos cálculos deste projeto:

- O catálogo oficial do Astrodienst descreve roda natal colorida com aspectos, planetas, casas, tabela, distribuição de elementos e Placidus, além de sinastria em roda dupla: <https://www.astro.com/faq/fq_fh_owtype_r.htm>.
- O Astrodienst descreve seu mapa mundial como projeção das posições planetárias para todo o globo, com ASC, DSC, MC e IC: <https://www.astro.com/faq/fq_fh_owspez_r.htm>.
- O manual oficial do TimePassages destaca interpretação acessível ao clicar em elementos do mapa e o biwheel de trânsitos: <https://support.astrograph.com/support/solutions/articles/66000476614-desktop-manual-timepassages>.
- A página oficial do Solar Fire documenta grids de aspectos de sinastria, gráficos temporais, efemérides gráficas e linhas de astro-localidade para ascensão, ocaso, culminação e anticulminação: <https://www.alabe.com/sf6p2.htm>.
- O Astronomy Engine documenta posições, transformações de coordenadas, eventos e classificação de constelação, além de sua validação contra NOVAS e JPL Horizons: <https://github.com/cosinekitty/astronomy>.
- O D3 documenta projeções geográficas esféricas e caminhos SVG: <https://d3js.org/d3-geo/projection>.

Da comparação vieram quatro decisões de UX: desenho e tabela devem coexistir; cada camada precisa ser filtrável ou explicável; termos técnicos devem abrir ajuda contextual; e resultados interpretativos precisam manter visíveis instante, método e limitações. O Astrologo não copia textos, layouts ou perfis de cálculo dessas aplicações.

## Persistência e implantação

As tabelas avançadas são criadas pela migration `016_bigdata_astrologo_advanced_charts.sql` do `admin-app`. Endpoints públicos não executam DDL em tempo de requisição. A implantação deve aplicar as migrations antes de habilitar a nova versão; ausência de schema falha de modo fechado e auditável.
