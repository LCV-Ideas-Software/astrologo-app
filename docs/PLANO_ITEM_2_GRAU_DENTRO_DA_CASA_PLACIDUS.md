# Plano do item 2 — grau dentro da Casa Placidus

> **⛔ SUPERADO (18/08/2026).** A substância deste plano foi entregue na
> v02.21.00 (12/07/2026) por uma arquitetura diferente da proposta abaixo: o
> grau mundano derivado do `swe_house_pos` vive no suplemento
> `natalChartAnalysisV1` (`rawSwissHousePosition`, `degreeWithinHouseDeg`,
> `mundaneLongitudeDeg`), persistido à parte e, quando o suplemento existe,
> exposto no painel, no e-mail, no prompt de IA e na ajuda contextual. Mapas
> anteriores sem esse suplemento continuam legíveis pelo `dadosPosicionaisV2`,
> mas não exibem nem estimam o grau mundano; o rótulo "indisponível" só aparece
> quando um suplemento presente registra o campo como `unavailable` — sem evoluir
> o `housePlacement` do payload posicional `2.0.0` para `2.1.0` como este plano
> propunha. O contrato abaixo permanece apenas como registro histórico;
> reintroduzir o grau dentro do próprio `dados_posicionais_v2` seria decisão nova,
> fora deste plano. Rastreio: issue #276.

## Objetivo

Acrescentar, em uma segunda entrega, a coordenada fracionária que indica quanto o planeta avançou dentro de sua Casa Placidus. A primeira entrega já calcula as 12 cúspides e a casa de cada planeta; o item 2 preservará esse resultado e passará a expor também o “grau mundano” da casa com semântica inequívoca.

## Base técnica

O contrato oficial da Swiss Ephemeris define que `swe_house_pos()` retorna um valor de `1.0` a `12.999999`: a parte inteira identifica a casa e a parte fracionária informa a distância normalizada desde a cúspide. A documentação também define a longitude mundana como `(hpos - 1) × 30` e esclarece que, em sistemas de casas desiguais, esse valor pertence a um “house horoscope” no qual cada casa é normalizada para 30 graus.

Fontes de referência:

- [Swiss Ephemeris — `swe_house_pos()`](https://www.astro.com/swisseph/swephprg.htm#_Toc11294927)
- [Swiss Ephemeris — posição de casa e house horoscope](https://www.astro.com/swisseph/swisseph.htm#_Toc11294926)
- [Fundamentos astronômicos das casas e cúspides intermediárias](https://www.astro.com/astrology/cw_astro_houses_e.htm)

Consequência editorial: “12° dentro da Casa 5” não significa 12 graus de arco na eclíptica. Significa 12 graus na coordenada mundana normalizada da Casa 5. O produto deverá mostrar essa distinção em toda superfície.

## Contrato proposto

Criar uma nova versão discriminada do payload, sem reescrever registros `2.0.0`:

```text
housePlacement.status = available
housePlacement.houseIndex1 = floor(hpos)
housePlacement.rawSwissHousePosition = hpos
housePlacement.degreeWithinHouseDeg = frac(hpos) * 30
housePlacement.mundaneLongitudeDeg = (hpos - 1) * 30
housePlacement.coordinateSystem = placidus-house-horoscope
housePlacement.degreeSemantics = normalized-semiarc-house-degree
```

Regras numéricas:

- `hpos` deve permanecer no intervalo `[1, 13)`.
- `houseIndex1` deve permanecer em `[1, 12]`.
- `degreeWithinHouseDeg` deve permanecer em `[0, 30)`.
- `mundaneLongitudeDeg` deve permanecer em `[0, 360)`.
- Os valores persistidos conservam precisão de máquina; frontend, e-mail e admin truncam para exibição e nunca arredondam para a casa seguinte.
- O quinário e o anjo continuam derivados exclusivamente da longitude tropical. Grau de casa não altera correspondência angélica.

## Etapas de implementação

1. **Especificação e corpus de referência**

   - Fixar a nomenclatura pública em português: “grau mundano dentro da Casa Placidus”.
   - Gerar fixtures com o wrapper upstream e o WASM fixado pelo lockfile, validado e materializado localmente sob demanda, para casas 1, 6, 12 e para posições imediatamente antes/depois de uma cúspide.
   - Documentar a diferença entre longitude tropical, arco eclíptico desde a cúspide e coordenada mundana normalizada.

2. **Testes vermelhos antes do código**

   - Exigir a preservação do retorno fracionário de `swe_house_pos()`.
   - Cobrir `hpos = 1`, proximidade de `2`, proximidade de `13`, latitude eclíptica não nula e indisponibilidade polar.
   - Rejeitar casa, grau ou longitude mundana matematicamente incoerentes no schema público e no parser do admin.

3. **Motor e schema**

   - Evoluir `housePlacement` para uma versão `2.1.0` discriminada.
   - Manter leitores compatíveis com `2.0.0`; não adicionar campos obrigatórios retroativamente ao schema antigo.
   - Persistir o payload novo na mesma coluna JSON `dados_posicionais_v2`; não é necessária nova coluna D1.

4. **Frontend, e-mail e admin**

   - Mostrar, por exemplo, `Casa 5 — 12°20'44" mundanos desde a cúspide`.
   - Acrescentar explicação curta de que cada Casa Placidus foi normalizada para 30 graus.
   - Usar os mesmos formatadores `pt-BR`; qualquer instante relacionado continua em `America/Sao_Paulo`.
   - Manter bidi explícito para hebraico e a atual falange sem ranking.

5. **Prompt do agente de IA**

   - Acrescentar o campo somente ao adendo v2, preservando novamente o corpo legado byte a byte.
   - Instruir o agente a chamar o valor de grau mundano normalizado e proibi-lo de descrevê-lo como distância angular física ou grau dentro de constelação IAU.

6. **Validação e rollout**

   - Repetir suítes completas dos dois repositórios, teste do WASM real, build Pages Functions e Chromium em timezone não brasileiro.
   - Fazer cross-review com fixtures numéricos e diff bruto.
   - Publicar leitores `2.0.0`/`2.1.0` no admin antes ou junto do produtor `2.1.0`.

## Critérios de aceite

- Os dez planetas têm casa e grau mundano coerentes com o valor bruto da Swiss Ephemeris.
- Nenhuma superfície confunde grau de signo, grau mundano de casa e constelação IAU.
- Registros `2.0.0` continuam legíveis e recebem o rótulo atual, sem grau inventado.
- Casos polares permanecem `unavailable`; não há fallback silencioso para Porphyry.
- Anjo e quinário não mudam quando somente a coordenada de casa muda.
- Frontend, e-mail, prompt e admin exibem o mesmo valor truncado e a mesma explicação semântica.

## Fora do escopo

- Criar um “grau dentro da constelação IAU”; regiões IAU são áreas bidimensionais e não fornecem essa coordenada.
- Alterar o catálogo angelical, criar ranking de dominância na falange ou persistir um campo redundante de regente. O Anjo Regente do Consulente permanece derivado do quinário tropical do Sol, conforme decisão metodológica própria.
- Trocar Placidus por outro sistema em latitudes onde ele é indisponível.
- Reinterpretar ou migrar destrutivamente mapas `2.0.0`.
