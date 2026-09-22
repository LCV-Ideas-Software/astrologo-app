# Cloudflare Pages Functions — snapshot de licenças mantido no repositório

Snapshot revisado em 22/09/2026 (LCV-213), a partir do build local de validação com Wrangler 4.136.2. Não é regenerado automaticamente pelo build e não comprova a cobertura de versões futuras. O relatório nativo do Vite cobre somente o bundle do navegador.

O registro anterior permanece no [histórico do arquivo](https://github.com/LCV-Ideas-Software/astrologo-app/blob/b2e43aafc0d5feab6c45ab15eca248aa0ceae4c4/astrologo-frontend/public/legal/FUNCTIONS-BUNDLED-LICENSES.md).

## Proveniência do bundle

- Comando oficial: `wrangler pages functions build --outdir=.wrangler/functions-license-audit --metafile=<arquivo de evidência>`.
- Inputs efetivos (`bytesInOutput > 0`): 117.
- Pacotes npm efetivamente incorporados: 22.
- Metafile SHA-256: `de9181854d79b6ec1359df83e369362c02cfc23b990bdbbfa60351ecfd4c7442`.
- Output JavaScript: `index.js` (1395088 bytes; SHA-256 `df798d8d362e86ad2a462f4eb219cb82d03430e0039cd48df34b505e1cc153bb`).
- Artefato WASM externo homologado: `595db39d8d39b41a16bc05a847e498bfb1f228fd-swiss_eph.wasm`; SHA-256 `31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c`.
- Escopo: build local de validação; `wrangler pages deploy` recompila as Functions. Este hash não comprova igualdade byte a byte com a produção.
- Os textos previamente publicados dos pacotes sem mudança de versão foram preservados. Wrangler e PostCSS foram conferidos nas fontes da versão exata. A proveniência incompleta do texto de `launder@1.7.1` continua registrada em LCV-183; preservar o aviso existente não encerra essa pendência.

## Pacotes npm efetivamente incorporados

| Pacote | Licença declarada | Inputs efetivos | Tarball oficial | SRI do lock |
| --- | --- | ---: | --- | --- |
| @js-temporal/polyfill@0.5.1 | ISC | 1 | https://registry.npmjs.org/@js-temporal/polyfill/-/polyfill-0.5.1.tgz | sha512-hloP58zRVCRSpgDxmqCWJNlizAlUgJFqG2ypq79DCvyv9tHjRYMDOcPFjzfl/A1/YxDvRCZz8wvZvmapQnKwFQ== |
| astronomy-engine@2.1.19 | MIT | 1 | https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz | sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w== |
| dayjs@1.11.20 | MIT | 1 | https://registry.npmjs.org/dayjs/-/dayjs-1.11.20.tgz | sha512-YbwwqR/uYpeoP4pu043q+LTDLFBLApUP6VxRihdfNTqu4ubqMlGDLd6ErXhEgsyvY0K6nCs7nggYumAN+9uEuQ== |
| deepmerge@4.3.1 | MIT | 1 | https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz | sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A== |
| dom-serializer@3.1.1 | MIT | 2 | https://registry.npmjs.org/dom-serializer/-/dom-serializer-3.1.1.tgz | sha512-4MEa38/QexBob6gFNwu+EGdWvhJ1OKuNwdYY3Y3NyeWDQfnGeDYQUDfIRzWu5B5gsv03so2Uxd28YC6zrsx3Lw== |
| domelementtype@3.0.0 | BSD-2-Clause | 1 | https://registry.npmjs.org/domelementtype/-/domelementtype-3.0.0.tgz | sha512-umCQid3jKbDmVjx8jGaW7uUykm4DEUeyV21hPxNMo2nV955DhUThwqyOIDtreepP31hl84X7G5U9ZfsWvIB3Pg== |
| domhandler@6.0.1 | BSD-2-Clause | 2 | https://registry.npmjs.org/domhandler/-/domhandler-6.0.1.tgz | sha512-gYzvtM72ZtxQO0T048kd6HWSbbGCNOUwcnfQ01cqIJ4X2IYKFFHZ5mKvrQETcFXxsRObZulDaKmy//R7TPtsBg== |
| domutils@4.0.2 | BSD-2-Clause | 8 | https://registry.npmjs.org/domutils/-/domutils-4.0.2.tgz | sha512-qI4JLRKnSzqFqr7hAlS5xQDusBCjKSEG4t4+7aNrIQMHBcsC2TGEhuyABJdYkgSewL57PNLYEiibY2iPKhKpaA== |
| entities@8.0.0 | BSD-2-Clause | 8 | https://registry.npmjs.org/entities/-/entities-8.0.0.tgz | sha512-zwfzJecQ/Uej6tusMqwAqU/6KL2XaB2VZ2Jg54Je6ahNBGNH6Ek6g3jjNCF0fG9EWQKGZNddNjU5F1ZQn/sBnA== |
| escape-string-regexp@4.0.0 | MIT | 1 | https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz | sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA== |
| htmlparser2@12.0.0 | MIT | 3 | https://registry.npmjs.org/htmlparser2/-/htmlparser2-12.0.0.tgz | sha512-Tz7u1i95/g2x2jz81+x0FBVhBhY5aRTvD3tXXdFaljuNdzDLJ8UGNRrTcj2cgQvAg3iW/h77Fz15nLW0L0CrZw== |
| is-plain-object@5.0.0 | MIT | 1 | https://registry.npmjs.org/is-plain-object/-/is-plain-object-5.0.0.tgz | sha512-VRSzKkbMm5jMDoKLbltAkFQ5Qr7VDiTFGXxYFXXowVj387GeGNOCsOH6Msy00SGZ3Fp84b1Naa1psqgcCIEP5Q== |
| jsbi@4.3.2 | Apache-2.0 | 1 | https://registry.npmjs.org/jsbi/-/jsbi-4.3.2.tgz | sha512-9fqMSQbhJykSeii05nxKl4m6Eqn2P6rOlYiS+C5Dr/HPIU/7yZxu5qzbs40tgaFORiw2Amd0mirjxatXYMkIew== |
| launder@1.7.1 | MIT | 1 | https://registry.npmjs.org/launder/-/launder-1.7.1.tgz | sha512-mU6WRz5EusL9ZZuiZ5SO4Y6C0P9PAUR9iwdb6bzj4KDihm28DiHFw+/yk9DBH4f+Pv1wuzQ4e2jV3oQ7mkIqvw== |
| nanoid@3.3.18 | MIT | 1 | https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz | sha512-DTg4MJbGMWkfi6VZFdNt2/caMbQy4Ou+Op/hJQvGEWcnVfoA1QA+xzRKAzw9jD6+GVOOeYr/mIcuDSdug6F6+w== |
| parse-srcset@1.0.2 | MIT | 1 | https://registry.npmjs.org/parse-srcset/-/parse-srcset-1.0.2.tgz | sha512-/2qh0lav6CmI15FzA3i/2Bzk2zCgQhGMkvhOhKNcBVQ1ldgpbfiNTVslmooUmWJcADi1f1kIeynbDRVzNlfR6Q== |
| path-to-regexp@6.3.0 | MIT | 1 | https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-6.3.0.tgz | sha512-Yhpw4T9C6hPpgPeA28us07OJeqZ5EzQTkbfwuhsUg0c237RomFoETJgmp2sa3F/41gfLE6G5cqcYwznmeEeOlQ== |
| picocolors@1.1.1 | ISC | 1 | https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz | sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA== |
| postcss@8.5.28 | MIT | 28 | https://registry.npmjs.org/postcss/-/postcss-8.5.28.tgz | sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A== |
| sanitize-html@2.17.7 | MIT | 1 | https://registry.npmjs.org/sanitize-html/-/sanitize-html-2.17.7.tgz | sha512-PGtEkc9cbnedU3s9TmzDbpsZ8w086g/0Q8k8/oIO1NLNU3i5k9yn835CrjJSajp1KMmkisbO1qPXxNKO3welAg== |
| source-map-js@1.2.1 | BSD-3-Clause | 1 | https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz | sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA== |
| wrangler@4.136.2 | MIT OR Apache-2.0 | 1 | https://registry.npmjs.org/wrangler/-/wrangler-4.136.2.tgz | sha512-BeWkkU7leFyalKi++LDHUaWSumwLVNeBeY2Ma+CqylT/hxs2sKT5e/q88MvXUl4Ng4iPS90H9H1qlb5oK3uhhQ== |

## Inventário de inputs efetivos

| Input efetivo | Bytes no output | Pacote |
| --- | ---: | --- |
| `../node_modules/sanitize-html/node_modules/entities/dist/decode-codepoint.js` | 1056 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/internal/decode-shared.js` | 586 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/generated/decode-data-html.js` | 32487 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/generated/decode-data-xml.js` | 347 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/internal/bin-trie-flags.js` | 565 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/decode.js` | 16382 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/htmlparser2/dist/Tokenizer.js` | 36802 | htmlparser2@12.0.0 |
| `../node_modules/sanitize-html/node_modules/htmlparser2/dist/Parser.js` | 19974 | htmlparser2@12.0.0 |
| `../node_modules/sanitize-html/node_modules/domelementtype/dist/index.js` | 1458 | domelementtype@3.0.0 |
| `../node_modules/sanitize-html/node_modules/domhandler/dist/node.js` | 8986 | domhandler@6.0.1 |
| `../node_modules/sanitize-html/node_modules/domhandler/dist/index.js` | 4788 | domhandler@6.0.1 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/querying.js` | 2363 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/legacy.js` | 2923 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/entities/dist/escape.js` | 2441 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/index.js` | 768 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/dom-serializer/dist/foreign-names.js` | 1591 | dom-serializer@3.1.1 |
| `../node_modules/sanitize-html/node_modules/dom-serializer/dist/index.js` | 4021 | dom-serializer@3.1.1 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/stringify.js` | 1435 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/feeds.js` | 4482 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/helpers.js` | 2796 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/manipulation.js` | 2809 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/traversal.js` | 1641 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/index.js` | 1602 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/htmlparser2/dist/index.js` | 1449 | htmlparser2@12.0.0 |
| `../node_modules/escape-string-regexp/index.js` | 413 | escape-string-regexp@4.0.0 |
| `../node_modules/is-plain-object/dist/is-plain-object.js` | 846 | is-plain-object@5.0.0 |
| `../node_modules/deepmerge/dist/cjs.js` | 4854 | deepmerge@4.3.1 |
| `../node_modules/parse-srcset/src/parse-srcset.js` | 5793 | parse-srcset@1.0.2 |
| `../node_modules/picocolors/picocolors.browser.js` | 967 | picocolors@1.1.1 |
| `(disabled):../node_modules/postcss/lib/terminal-highlight` | 167 | postcss@8.5.28 |
| `../node_modules/postcss/lib/css-syntax-error.js` | 3947 | postcss@8.5.28 |
| `../node_modules/postcss/lib/stringifier.js` | 12977 | postcss@8.5.28 |
| `../node_modules/postcss/lib/stringify.js` | 437 | postcss@8.5.28 |
| `../node_modules/postcss/lib/symbols.js` | 288 | postcss@8.5.28 |
| `../node_modules/postcss/lib/node.js` | 13777 | postcss@8.5.28 |
| `../node_modules/postcss/lib/comment.js` | 464 | postcss@8.5.28 |
| `../node_modules/postcss/lib/declaration.js` | 765 | postcss@8.5.28 |
| `../node_modules/postcss/lib/container.js` | 14010 | postcss@8.5.28 |
| `../node_modules/postcss/lib/at-rule.js` | 763 | postcss@8.5.28 |
| `../node_modules/postcss/lib/document.js` | 890 | postcss@8.5.28 |
| `../node_modules/nanoid/non-secure/index.cjs` | 842 | nanoid@3.3.18 |
| `(disabled):path` | 111 | primeira parte, gerado ou stub Node.js |
| `(disabled):../node_modules/source-map-js/source-map.js` | 156 | source-map-js@1.2.1 |
| `(disabled):url` | 109 | primeira parte, gerado ou stub Node.js |
| `(disabled):fs` | 107 | primeira parte, gerado ou stub Node.js |
| `../node_modules/postcss/lib/previous-map.js` | 5483 | postcss@8.5.28 |
| `../node_modules/postcss/lib/input.js` | 7997 | postcss@8.5.28 |
| `../node_modules/postcss/lib/root.js` | 2026 | postcss@8.5.28 |
| `../node_modules/postcss/lib/list.js` | 1712 | postcss@8.5.28 |
| `../node_modules/postcss/lib/rule.js` | 863 | postcss@8.5.28 |
| `../node_modules/postcss/lib/fromJSON.js` | 3093 | postcss@8.5.28 |
| `../node_modules/postcss/lib/map-generator.js` | 11693 | postcss@8.5.28 |
| `../node_modules/postcss/lib/tokenize.js` | 7744 | postcss@8.5.28 |
| `../node_modules/postcss/lib/parser.js` | 17519 | postcss@8.5.28 |
| `../node_modules/postcss/lib/parse.js` | 1280 | postcss@8.5.28 |
| `../node_modules/postcss/lib/warning.js` | 1244 | postcss@8.5.28 |
| `../node_modules/postcss/lib/result.js` | 1088 | postcss@8.5.28 |
| `../node_modules/postcss/lib/warn-once.js` | 455 | postcss@8.5.28 |
| `../node_modules/postcss/lib/lazy-result.js` | 17445 | postcss@8.5.28 |
| `../node_modules/postcss/lib/no-work-result.js` | 3228 | postcss@8.5.28 |
| `../node_modules/postcss/lib/processor.js` | 2095 | postcss@8.5.28 |
| `../node_modules/postcss/lib/postcss.js` | 3304 | postcss@8.5.28 |
| `../node_modules/dayjs/dayjs.min.js` | 13255 | dayjs@1.11.20 |
| `../node_modules/launder/index.js` | 11686 | launder@1.7.1 |
| `../node_modules/sanitize-html/index.js` | 35892 | sanitize-html@2.17.7 |
| `../src/analysisOutput.ts` | 1149 | primeira parte, gerado ou stub Node.js |
| `../node_modules/astronomy-engine/esm/astronomy.js` | 120142 | astronomy-engine@2.1.19 |
| `api/_shared/angelCatalog.ts` | 18711 | primeira parte, gerado ou stub Node.js |
| `api/_shared/positionV2.ts` | 18554 | primeira parte, gerado ou stub Node.js |
| `api/_shared/positionV2Schema.ts` | 27738 | primeira parte, gerado ou stub Node.js |
| `api/_shared/localityMapV1.ts` | 20343 | primeira parte, gerado ou stub Node.js |
| `api/_shared/localityMapV1Schema.ts` | 31792 | primeira parte, gerado ou stub Node.js |
| `api/_shared/natalChartAnalysisV1.ts` | 18861 | primeira parte, gerado ou stub Node.js |
| `api/_shared/natalChartAnalysisV1Schema.ts` | 31743 | primeira parte, gerado ou stub Node.js |
| `api/_shared/synastryRunV1.ts` | 10686 | primeira parte, gerado ou stub Node.js |
| `api/_shared/synastryRunV1Schema.ts` | 14540 | primeira parte, gerado ou stub Node.js |
| `api/_shared/transitRunV1.ts` | 29444 | primeira parte, gerado ou stub Node.js |
| `api/_shared/transitRunV1Schema.ts` | 36432 | primeira parte, gerado ou stub Node.js |
| `api/_shared/advancedAnalysisPrompt.ts` | 15414 | primeira parte, gerado ou stub Node.js |
| `api/_shared/analysisEditorial.ts` | 3755 | primeira parte, gerado ou stub Node.js |
| `api/_shared/requestSecurity.ts` | 4944 | primeira parte, gerado ou stub Node.js |
| `api/_shared/analysisJobRepository.ts` | 18221 | primeira parte, gerado ou stub Node.js |
| `../node_modules/jsbi/dist/jsbi-umd.js` | 62020 | jsbi@4.3.2 |
| `../node_modules/@js-temporal/polyfill/dist/index.esm.js` | 194807 | @js-temporal/polyfill@0.5.1 |
| `api/_shared/birthTime.ts` | 2739 | primeira parte, gerado ou stub Node.js |
| `api/_shared/solarTimes.ts` | 1962 | primeira parte, gerado ou stub Node.js |
| `api/_shared/tatwa.ts` | 4016 | primeira parte, gerado ou stub Node.js |
| `api/_shared/tatwaSchema.ts` | 9725 | primeira parte, gerado ou stub Node.js |
| `api/_shared/tatwaPrompt.ts` | 7317 | primeira parte, gerado ou stub Node.js |
| `api/_shared/analysisPrompt.ts` | 29558 | primeira parte, gerado ou stub Node.js |
| `api/_shared/longAnalysisContracts.ts` | 12637 | primeira parte, gerado ou stub Node.js |
| `api/_shared/longAnalysisPlanner.ts` | 35973 | primeira parte, gerado ou stub Node.js |
| `api/_shared/vertex.ts` | 10317 | primeira parte, gerado ou stub Node.js |
| `api/_shared/vertexModelCapabilities.ts` | 2299 | primeira parte, gerado ou stub Node.js |
| `api/_shared/modelAvailability.ts` | 1308 | primeira parte, gerado ou stub Node.js |
| `api/_shared/modelConfig.ts` | 1570 | primeira parte, gerado ou stub Node.js |
| `api/analisar.ts` | 81277 | primeira parte, gerado ou stub Node.js |
| `api/_shared/canonicalArtifactBundle.ts` | 8969 | primeira parte, gerado ou stub Node.js |
| `api/_shared/mapOwnershipClaim.ts` | 4929 | primeira parte, gerado ou stub Node.js |
| `api/astrologo-auth.ts` | 19255 | primeira parte, gerado ou stub Node.js |
| `api/_shared/artifactPersistence.ts` | 1290 | primeira parte, gerado ou stub Node.js |
| `api/_shared/astroCore.ts` | 2435 | primeira parte, gerado ou stub Node.js |
| `api/_shared/externalFetch.ts` | 618 | primeira parte, gerado ou stub Node.js |
| `api/_shared/location.ts` | 2632 | primeira parte, gerado ou stub Node.js |
| `api/_shared/swissRuntime.ts` | 10285 | primeira parte, gerado ou stub Node.js |
| `api/_shared/tatwaBirth.ts` | 3292 | primeira parte, gerado ou stub Node.js |
| `api/calcular.ts` | 21375 | primeira parte, gerado ou stub Node.js |
| `api/contato.ts` | 4737 | primeira parte, gerado ou stub Node.js |
| `api/enviar-email.ts` | 5000 | primeira parte, gerado ou stub Node.js |
| `api/localidade.ts` | 6609 | primeira parte, gerado ou stub Node.js |
| `api/sinastria.ts` | 12313 | primeira parte, gerado ou stub Node.js |
| `api/_shared/astronomyTransitProvider.ts` | 11852 | primeira parte, gerado ou stub Node.js |
| `api/transitos.ts` | 6367 | primeira parte, gerado ou stub Node.js |
| `_middleware.ts` | 414 | primeira parte, gerado ou stub Node.js |
| `../.wrangler/tmp/[wrangler-generated]/functionsRoutes.mjs` | 3394 | primeira parte, gerado ou stub Node.js |
| `../node_modules/wrangler/templates/pages-template-worker.ts` | 3809 | wrangler@4.136.2 |
| `../node_modules/path-to-regexp/dist.es2015/index.js` | 10706 | path-to-regexp@6.3.0 |

## Textos integrais das licenças

### @js-temporal/polyfill@0.5.1

- Licença declarada: `ISC`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright 2017, 2018, 2019, 2020 ECMA International

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

### astronomy-engine@2.1.19

- Licença declarada: `MIT`
- Origem do texto: https://github.com/cosinekitty/astronomy/blob/v2.1.19/LICENSE
- Justificativa do fallback pinado: O tarball npm não inclui LICENSE; texto pinado do tag oficial.

#### astronomy-engine-mit.txt

```text
MIT License

Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### dayjs@1.11.20

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
MIT License

Copyright (c) 2018-present, iamkun

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### deepmerge@4.3.1

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (license.txt)

#### license.txt

```text
The MIT License (MIT)

Copyright (c) 2012 James Halliday, Josh Duff, and other contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### dom-serializer@3.1.1

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright © 2022 The Cheerio contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### domelementtype@3.0.0

- Licença declarada: `BSD-2-Clause`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### domhandler@6.0.1

- Licença declarada: `BSD-2-Clause`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### domutils@4.0.2

- Licença declarada: `BSD-2-Clause`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### entities@8.0.0

- Licença declarada: `BSD-2-Clause`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### escape-string-regexp@4.0.0

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (license)

#### license

```text
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### htmlparser2@12.0.0

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright 2010, 2011, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
 
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
```

### is-plain-object@5.0.0

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
The MIT License (MIT)

Copyright (c) 2014-2017, Jon Schlinkert.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### jsbi@4.3.2

- Licença declarada: `Apache-2.0`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
                                 Apache License
                           Version 2.0, January 2004
                        https://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
```

### launder@1.7.1

- Licença declarada: `MIT`
- Origem do texto: https://spdx.org/licenses/MIT.html
- Justificativa do fallback pinado: O tarball e o tag oficial não incluem LICENSE; texto MIT canônico com atribuição do package.json instalado.

#### launder-mit.txt

```text
MIT License

Copyright (c) Apostrophe Technologies, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### nanoid@3.3.18

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
The MIT License (MIT)

Copyright 2017 Andrey Sitnik <andrey@sitnik.ru>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### parse-srcset@1.0.2

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
The MIT License (MIT)

Copyright (c) 2014 Alex Bell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### path-to-regexp@6.3.0

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
The MIT License (MIT)

Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### picocolors@1.1.1

- Licença declarada: `ISC`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
ISC License

Copyright (c) 2021-2024 Oleksii Raspopov, Kostiantyn Denysov, Anton Verinov

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### postcss@8.5.28

- Licença declarada: `MIT`.

- Origem do texto: https://registry.npmjs.org/postcss/-/postcss-8.5.28.tgz (arquivo package/LICENSE)
- SHA-256 do texto: `5be1f3465bba68a626777f984878814aaf35e7ef8e9fd314d469bcf887050fb8`.

#### 4c9655af81-package_LICENSE

```text
The MIT License (MIT)

Copyright 2013 Andrey Sitnik <andrey@sitnik.es>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### sanitize-html@2.17.7

- Licença declarada: `MIT`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text
Copyright (c) 2013, 2014, 2015 P'unk Avenue LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### source-map-js@1.2.1

- Licença declarada: `BSD-3-Clause`
- Origem do texto: tarball npm oficial (LICENSE)

#### LICENSE

```text

Copyright (c) 2009-2011, Mozilla Foundation and contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the names of the Mozilla Foundation nor the names of project
  contributors may be used to endorse or promote products derived from this
  software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### wrangler@4.136.2

- Licença declarada: `MIT OR Apache-2.0`.

- Origem do texto: https://github.com/cloudflare/workers-sdk/blob/51ad2b8db39e26d09204a7a6d39282b01cb9e98e/LICENSE-APACHE
- SHA-256 do texto: `62c7a1e35f56406896d7aa7ca52d0cc0d272ac022b5d2796e7d6905db8a3636a`.

#### 1b5ec8b78e237b5c3b3d812a7c0a6589d0f7161d-LICENSE-APACHE

```text
                              Apache License
                        Version 2.0, January 2004
                     http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity. For the purposes of this definition,
   "control" means (i) the power, direct or indirect, to cause the
   direction or management of such entity, whether by contract or
   otherwise, or (ii) ownership of fifty percent (50%) or more of the
   outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form, including but
   not limited to compiled object code, generated documentation,
   and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or
   Object form, made available under the License, as indicated by a
   copyright notice that is included in or attached to the work
   (an example is provided in the Appendix below).

   "Derivative Works" shall mean any work, whether in Source or Object
   form, that is based on (or derived from) the Work and for which the
   editorial revisions, annotations, elaborations, or other modifications
   represent, as a whole, an original work of authorship. For the purposes
   of this License, Derivative Works shall not include works that remain
   separable from, or merely link (or bind by name) to the interfaces of,
   the Work and Derivative Works thereof.

   "Contribution" shall mean any work of authorship, including
   the original version of the Work and any modifications or additions
   to that Work or Derivative Works thereof, that is intentionally
   submitted to Licensor for inclusion in the Work by the copyright owner
   or by an individual or Legal Entity authorized to submit on behalf of
   the copyright owner. For the purposes of this definition, "submitted"
   means any form of electronic, verbal, or written communication sent
   to the Licensor or its representatives, including but not limited to
   communication on electronic mailing lists, source code control systems,
   and issue tracking systems that are managed by, or on behalf of, the
   Licensor for the purpose of discussing and improving the Work, but
   excluding communication that is conspicuously marked or otherwise
   designated in writing by the copyright owner as "Not a Contribution."

   "Contributor" shall mean Licensor and any individual or Legal Entity
   on behalf of whom a Contribution has been received by Licensor and
   subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of,
   publicly display, publicly perform, sublicense, and distribute the
   Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   (except as stated in this section) patent license to make, have made,
   use, offer to sell, sell, import, and otherwise transfer the Work,
   where such license applies only to those patent claims licensable
   by such Contributor that are necessarily infringed by their
   Contribution(s) alone or by combination of their Contribution(s)
   with the Work to which such Contribution(s) was submitted. If You
   institute patent litigation against any entity (including a
   cross-claim or counterclaim in a lawsuit) alleging that the Work
   or a Contribution incorporated within the Work constitutes direct
   or contributory patent infringement, then any patent licenses
   granted to You under this License for that Work shall terminate
   as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
   Work or Derivative Works thereof in any medium, with or without
   modifications, and in Source or Object form, provided that You
   meet the following conditions:

   (a) You must give any other recipients of the Work or
       Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices
       stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works
       that You distribute, all copyright, patent, trademark, and
       attribution notices from the Source form of the Work,
       excluding those notices that do not pertain to any part of
       the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its
       distribution, then any Derivative Works that You distribute must
       include a readable copy of the attribution notices contained
       within such NOTICE file, excluding those notices that do not
       pertain to any part of the Derivative Works, in at least one
       of the following places: within a NOTICE text file distributed
       as part of the Derivative Works; within the Source form or
       documentation, if provided along with the Derivative Works; or,
       within a display generated by the Derivative Works, if and
       wherever such third-party notices normally appear. The contents
       of the NOTICE file are for informational purposes only and
       do not modify the License. You may add Your own attribution
       notices within Derivative Works that You distribute, alongside
       or as an addendum to the NOTICE text from the Work, provided
       that such additional attribution notices cannot be construed
       as modifying the License.

   You may add Your own copyright statement to Your modifications and
   may provide additional or different license terms and conditions
   for use, reproduction, or distribution of Your modifications, or
   for any such Derivative Works as a whole, provided Your use,
   reproduction, and distribution of the Work otherwise complies with
   the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
   any Contribution intentionally submitted for inclusion in the Work
   by You to the Licensor shall be under the terms and conditions of
   this License, without any additional terms or conditions.
   Notwithstanding the above, nothing herein shall supersede or modify
   the terms of any separate license agreement you may have executed
   with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
   names, trademarks, service marks, or product names of the Licensor,
   except as required for reasonable and customary use in describing the
   origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
   agreed to in writing, Licensor provides the Work (and each
   Contributor provides its Contributions) on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
   implied, including, without limitation, any warranties or conditions
   of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
   PARTICULAR PURPOSE. You are solely responsible for determining the
   appropriateness of using or redistributing the Work and assume any
   risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
   whether in tort (including negligence), contract, or otherwise,
   unless required by applicable law (such as deliberate and grossly
   negligent acts) or agreed to in writing, shall any Contributor be
   liable to You for damages, including any direct, indirect, special,
   incidental, or consequential damages of any character arising as a
   result of this License or out of the use or inability to use the
   Work (including but not limited to damages for loss of goodwill,
   work stoppage, computer failure or malfunction, or any and all
   other commercial damages or losses), even if such Contributor
   has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
   the Work or Derivative Works thereof, You may choose to offer,
   and charge a fee for, acceptance of support, warranty, indemnity,
   or other liability obligations and/or rights consistent with this
   License. However, in accepting such obligations, You may act only
   on Your own behalf and on Your sole responsibility, not on behalf
   of any other Contributor, and only if You agree to indemnify,
   defend, and hold each Contributor harmless for any liability
   incurred by, or claims asserted against, such Contributor by reason
   of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS
```

- Origem do texto: https://github.com/cloudflare/workers-sdk/blob/51ad2b8db39e26d09204a7a6d39282b01cb9e98e/LICENSE-MIT
- SHA-256 do texto: `9bb3b077cc8628334bab25961223dd8207252c8a56aa054195be38f1c042aaf4`.

#### a0e7ebf133868d6c1759cfb09f3c05d4cce430c8-LICENSE-MIT

```text
Copyright (c) 2020 Cloudflare, Inc. <wrangler@cloudflare.com>

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```
