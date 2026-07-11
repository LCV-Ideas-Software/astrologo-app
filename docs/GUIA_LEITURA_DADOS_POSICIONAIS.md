# Guia de leitura dos dados posicionais

## Objetivo

Este documento registra o significado exato dos três quadros posicionais e sustenta os conteúdos **Saiba mais** voltados a usuários leigos. As camadas usam o mesmo instante natal, mas respondem a perguntas diferentes. O aplicativo não apresenta correspondências simbólicas como medições científicas nem transforma uma região astronômica em signo ou casa.

## Leitura detalhada do mapa

Cada um dos dez corpos celestes considerados — Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão — recebe quatro projeções:

1. **Posição tropical** — signo, grau e decanato no zodíaco sazonal de 12 setores iguais de 30°.
2. **Casa Placidus** — uma das 12 casas calculadas para o instante e as coordenadas geográficas do nascimento.
3. **Região astronômica** — constelação oficial da União Astronômica Internacional que contém a coordenada geocêntrica calculada.
4. **Quinário angelical** — intervalo tropical de 5° e anjo correspondente no catálogo de 72 entradas adotado pelo projeto.

As constelações oficiais são áreas bidimensionais delimitadas no céu. Por isso, esta camada informa uma região IAU e não inventa um “grau dentro da constelação”. Posições próximas a um limite podem ficar indisponíveis quando as verificações do projeto não permitem uma classificação segura.

O horário civil é resolvido com o fuso histórico do lugar de nascimento para produzir um instante UTC único. Toda data e hora humana exibida no frontend é a conversão desse mesmo instante para `America/Sao_Paulo`, identificada como **Hora oficial de Brasília**. A conversão de apresentação não altera o instante usado nos cálculos.

## Cúspides das Casas Placidus

Uma cúspide é o ponto em que uma casa começa. A tela mostra a posição tropical de cada uma das 12 cúspides, truncada para duas casas decimais somente na apresentação; o contrato preserva o valor calculado com maior precisão.

Casas e signos não são a mesma divisão:

- signos tropicais ocupam sempre 30°;
- Casas Placidus dependem de instante, latitude e longitude e podem ocupar extensões diferentes na eclíptica;
- a cúspide marca uma fronteira, não a posição de um planeta nem um grau percorrido dentro da casa;
- a Casa 1 começa no Ascendente e a Casa 10 começa no Meio do Céu;
- um mesmo signo pode aparecer em duas cúspides consecutivas, enquanto outro pode não aparecer em nenhuma.

O Swiss Ephemeris documenta limitações matemáticas de Placidus em latitudes polares. Embora a biblioteca possa devolver cúspides de outro sistema junto de um código de erro, o aplicativo rejeita esse fallback: se Placidus não estiver disponível, a tela informa a indisponibilidade em vez de relabelar outro método.

## Falange Angelical do Mapa

O catálogo adotado divide a longitude tropical `[0°, 360°)` em 72 intervalos consecutivos de 5°. Cada intervalo inclui o limite inicial e exclui o final; assim, uma posição exatamente em 5° já pertence ao segundo quinário.

Cada corpo celeste produz uma correspondência. A **Falange Angelical do Mapa** agrupa resultados com o mesmo anjo, portanto pode mostrar menos de dez cartões, mas sempre representa dez correspondências. A contagem indica apenas quantos corpos pertencem ao grupo; não estabelece poder, dominância ou hierarquia espiritual.

O **Anjo Regente do Consulente** é exclusivamente a correspondência do quinário ocupado pelo Sol tropical natal. Ele não é escolhido por repetição na falange. A decisão completa está registrada em [`DECISAO_ANJO_REGENTE_DO_CONSULENTE.md`](./DECISAO_ANJO_REGENTE_DO_CONSULENTE.md).

Esta metodologia angelical é exclusivamente tropical. Ela ainda não foi adaptada às 13 constelações de referência nem às regiões oficiais da IAU. O resultado é uma correspondência simbólica da tradição específica adotada pelo projeto, não uma medição física, diagnóstico, promessa ou consenso universal entre escolas.

## Fontes

- União Astronômica Internacional, definição e limites das 88 constelações: <https://www.iau.org/Iau/Science/What-we-do/The-Constellations.aspx>
- Swiss Ephemeris, interface oficial para cúspides e posições de casas: <https://www.astro.com/ftp/swisseph/doc/swephprg.htm>
- Swiss Ephemeris, descrição e limitações do sistema Placidus: <https://www.astro.com/swisseph/sweph_ht_e.htm>
- Marcelo Del Debbio, índice dos Anjos Cabalísticos: <https://wiki.deldebbio.com.br/index.php/Anjos_Cabal%C3%ADsticos>
- Project Mayhem, lamen e ilustrações do catálogo utilizado: <https://www.behance.net/gallery/15162493/Ilustracoes-TdCProjectMayhem>

## Escopo técnico

Esta versão acrescenta somente conteúdo e controles de interface. Não altera cálculos, payloads, banco D1, persistência, prompt do agente de IA, relatórios, e-mail ou `admin-app`.
