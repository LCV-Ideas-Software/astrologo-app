# Decisão metodológica — Anjo Regente do Consulente

## Decisão

No Astrologo, **Anjo Regente do Consulente** é a correspondência do quinário de 5° ocupado pela longitude tropical do Sol no instante natal.

O valor é derivado dos dados posicionais v2 já calculados:

1. localizar a posição cujo identificador interno é `bodyId: "sun"`;
2. ler o objeto `angelicQuinary` dessa posição;
3. apresentar esse anjo como o regente do consulente;
4. manter as correspondências dos dez planetas na Falange Angelical do Mapa.

Não será criado `primaryAngel`, `regenteNatal` ou outro campo persistido. Isso evita duas fontes de verdade: o regente é uma projeção determinística do quinário solar existente.

## Regra matemática

Para uma longitude tropical solar normalizada `λ` no intervalo `[0°, 360°)`:

```text
índice zero-based = floor(λ / 5)
número do anjo = índice zero-based + 1
intervalo = [5 × índice, 5 × (índice + 1))
```

Os intervalos são fechados à esquerda e abertos à direita. Assim, `4,999…°` pertence ao primeiro quinário, `5°` ao segundo e `360°` é normalizado para `0°`.

O catálogo adotado pelo projeto começa com **Vehuiah, nº 1, em 0° de Áries**, prossegue sequencialmente em 72 quinários e termina com **Mumiah, nº 72, antes de 360°**. Essa é a ordem representada no lamen fornecido ao projeto e já protegida pelos testes do catálogo.

## Base documental e limite da afirmação

- A digitalização de _La science cabalistique_ (Lazare Lenain, 1823) preserva a fonte histórica usada pelas tradições posteriores: <https://commons.wikimedia.org/wiki/File:Medical_Heritage_Library_(IA_BIUSante_ms05365).pdf>.
- A síntese contemporânea do sistema de Lenain descreve 72 segmentos de 5°, iniciados em 0° de Áries, e define o anjo de nascimento pela posição do Sol no segmento: <https://kabbalisticnumerology.org/calculators/find-your-kabbalistic-angel/>.
- Um estudo da Societas Rosicruciana in Civitatibus Foederatis documenta os 72 quinários de 5° e Áries como 0° do ano solar: <https://utahsricf.org/wp-content/uploads/2015/10/SHEMHAMPHORASH-ASTROILOGY-PAPER-PRINT-VERSION-SRICF.pdf>.
- Há sequências concorrentes. O Zigurate documenta, por exemplo, que a distribuição Golden Dawn começa com Vehuel nº 49, enquanto a sequência Runyon/Rudd começa com Vehuiah nº 1: <https://ozigurate.com.br/2021/12/02/a-tabela-dos-72-anjos/>.

Portanto, o software não apresenta essa escolha como consenso universal da angelologia. Ele declara a metodologia específica do projeto: **catálogo Vehuiah-em-0°-de-Áries + quinário do Sol tropical natal**. O resultado é uma correspondência simbólica e interpretativa, não uma afirmação científica, determinista, médica ou jurídica.

## Contrato de idioma

- Domínio, APIs, persistência e código podem manter identificadores estáveis em inglês, como `sun`, `moon` e `memberBodyIds`.
- Toda superfície humana deve projetá-los em `pt-BR`: `Sol`, `Lua`, `Mercúrio`, `Vênus`, `Marte`, `Júpiter`, `Saturno`, `Urano`, `Netuno` e `Plutão`.
- IDs internos nunca devem aparecer em tela, texto compartilhável, HTML de e-mail, relatório ou atributos acessíveis destinados ao usuário.
