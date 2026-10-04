# Cloudflare Pages Functions — snapshot de licenças mantido no repositório

Snapshot revisado em 03/10/2026 (LCV-211), a partir do metafile e do artefato preservados pela mesma execução oficial de produção. Este documento estático identifica os componentes dessa execução; alterações futuras nas Functions, no lockfile ou no empacotador exigem nova revisão.

## Proveniência do bundle

- Fonte: commit `82c5880742183394d5f1e6e5032eec141c908480`, incorporado pela [PR #449](https://github.com/LCV-Ideas-Software/astrologo-app/pull/449).
- Execução oficial: [Deploy 37139402029, tentativa 1](https://github.com/LCV-Ideas-Software/astrologo-app/actions/runs/37139402029), concluída com sucesso em 03/10/2026; artefato nativo `11279823159`.
- Comando oficial de captura: `npm exec -- wrangler pages functions build functions --outdir=dist/_worker.js --metafile=.wrangler/pages-custody/metafile.json --output-config-path=.wrangler/pages-custody/functions-config.json --output-routes-path=dist/_routes.json --build-output-directory=dist --project-directory=. --build-metadata-path=.wrangler/pages-custody/build-metadata.json`.
- O workflow envia o diretório capturado com `pages deploy . --cwd dist --no-bundle`; a mesma execução preserva worker, módulo WASM, rotas, metafile, configuração e lockfile.
- Metafile SHA-256: `43a144113f22a92b052d83629465d4aaa8ce317b288b3782518df5dfc2d6b8a6`; 144 inputs, incluindo módulos removidos por tree shaking e placeholders gerados; 23 identidades reais de pacotes npm selecionados.
- Output: `../dist/_worker.js/index.js`; 1468323 bytes; SHA-256 `1b5659c4342f6a4f1f8869ac0b07ed3f55f6f3846ed84139128b721352218fa2`.
- O módulo externo Swiss Ephemeris tem 1275365 bytes e SHA-256 `31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c`; sua licença e a oferta de fonte permanecem no NOTICE.
- A produção nativa `56914401-895a-4497-a62f-6c4bdb316bf6` informa esse commit e sucesso. A cadeia de custódia acima não representa um download do worker pela hospedagem opaca.
- `launder` 1.7.2 publica MIT integral no próprio tarball. O texto do titular abaixo não afirma concessão retroativa para 1.7.1.

## Pacotes npm selecionados pelo build

A resolução usa o diretório de pacote mais específico de cada caminho do metafile e o lockfile da mesma execução. Os descendentes de `sanitize-html/node_modules` conservam suas próprias versões. “Inputs selecionados” inclui entradas examinadas pelo empacotador; a coluna “Com código no output” conta apenas entradas com `bytesInOutput` positivo. Um input com zero bytes foi removido do output. Placeholders `(disabled)` não são tratados como código do pacote cujo nome aparece no caminho.

| Pacote | Licença declarada | Inputs selecionados | Com código no output | Tarball oficial | SRI do lock |
| --- | --- | ---: | ---: | --- | --- |
| @cloudflare/unenv-preset@2.16.2 | MIT OR Apache-2.0 | 3 | 3 | https://registry.npmjs.org/@cloudflare/unenv-preset/-/unenv-preset-2.16.2.tgz | sha512-JBP1+Z7ZSNG/d4mRP+y8VC5dka3tZVMLEZRvS+rzQ4DGV1EoxRFQckcJTTkXbHSQiTj0DtNI01Zwb/V2fX0mvQ== |
| @js-temporal/polyfill@0.5.1 | ISC | 1 | 1 | https://registry.npmjs.org/@js-temporal/polyfill/-/polyfill-0.5.1.tgz | sha512-hloP58zRVCRSpgDxmqCWJNlizAlUgJFqG2ypq79DCvyv9tHjRYMDOcPFjzfl/A1/YxDvRCZz8wvZvmapQnKwFQ== |
| astronomy-engine@2.1.19 | MIT | 1 | 1 | https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz | sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w== |
| dayjs@1.11.23 | MIT | 1 | 1 | https://registry.npmjs.org/dayjs/-/dayjs-1.11.23.tgz | sha512-QDTCU0M0MxR3hQfnlDJfwekQiaanm1ubOD231u73WBckQ/fsamwRLiE2GBz6D3a/xF1NgfiDLJjXBa1hYOYTtQ== |
| deepmerge@4.3.1 | MIT | 1 | 1 | https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz | sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A== |
| dom-serializer@3.1.1 | MIT | 2 | 2 | https://registry.npmjs.org/dom-serializer/-/dom-serializer-3.1.1.tgz | sha512-4MEa38/QexBob6gFNwu+EGdWvhJ1OKuNwdYY3Y3NyeWDQfnGeDYQUDfIRzWu5B5gsv03so2Uxd28YC6zrsx3Lw== |
| domelementtype@3.0.0 | BSD-2-Clause | 1 | 1 | https://registry.npmjs.org/domelementtype/-/domelementtype-3.0.0.tgz | sha512-umCQid3jKbDmVjx8jGaW7uUykm4DEUeyV21hPxNMo2nV955DhUThwqyOIDtreepP31hl84X7G5U9ZfsWvIB3Pg== |
| domhandler@6.0.1 | BSD-2-Clause | 2 | 2 | https://registry.npmjs.org/domhandler/-/domhandler-6.0.1.tgz | sha512-gYzvtM72ZtxQO0T048kd6HWSbbGCNOUwcnfQ01cqIJ4X2IYKFFHZ5mKvrQETcFXxsRObZulDaKmy//R7TPtsBg== |
| domutils@4.0.2 | BSD-2-Clause | 8 | 8 | https://registry.npmjs.org/domutils/-/domutils-4.0.2.tgz | sha512-qI4JLRKnSzqFqr7hAlS5xQDusBCjKSEG4t4+7aNrIQMHBcsC2TGEhuyABJdYkgSewL57PNLYEiibY2iPKhKpaA== |
| entities@8.0.0 | BSD-2-Clause | 11 | 8 | https://registry.npmjs.org/entities/-/entities-8.0.0.tgz | sha512-zwfzJecQ/Uej6tusMqwAqU/6KL2XaB2VZ2Jg54Je6ahNBGNH6Ek6g3jjNCF0fG9EWQKGZNddNjU5F1ZQn/sBnA== |
| escape-string-regexp@4.0.0 | MIT | 1 | 1 | https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz | sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA== |
| htmlparser2@12.0.0 | MIT | 3 | 3 | https://registry.npmjs.org/htmlparser2/-/htmlparser2-12.0.0.tgz | sha512-Tz7u1i95/g2x2jz81+x0FBVhBhY5aRTvD3tXXdFaljuNdzDLJ8UGNRrTcj2cgQvAg3iW/h77Fz15nLW0L0CrZw== |
| is-plain-object@5.0.0 | MIT | 1 | 1 | https://registry.npmjs.org/is-plain-object/-/is-plain-object-5.0.0.tgz | sha512-VRSzKkbMm5jMDoKLbltAkFQ5Qr7VDiTFGXxYFXXowVj387GeGNOCsOH6Msy00SGZ3Fp84b1Naa1psqgcCIEP5Q== |
| jsbi@4.3.2 | Apache-2.0 | 1 | 1 | https://registry.npmjs.org/jsbi/-/jsbi-4.3.2.tgz | sha512-9fqMSQbhJykSeii05nxKl4m6Eqn2P6rOlYiS+C5Dr/HPIU/7yZxu5qzbs40tgaFORiw2Amd0mirjxatXYMkIew== |
| launder@1.7.2 | MIT | 1 | 1 | https://registry.npmjs.org/launder/-/launder-1.7.2.tgz | sha512-DLg3HPnHUfBi5/MxMLmJD12dmlMpFEC2HgMW6vkZ/9JR0RU00kXoRGvDxAvFmdO0o610OA77i4FgNTLucmhDVg== |
| nanoid@3.3.18 | MIT | 1 | 1 | https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz | sha512-DTg4MJbGMWkfi6VZFdNt2/caMbQy4Ou+Op/hJQvGEWcnVfoA1QA+xzRKAzw9jD6+GVOOeYr/mIcuDSdug6F6+w== |
| parse-srcset@1.0.2 | MIT | 1 | 1 | https://registry.npmjs.org/parse-srcset/-/parse-srcset-1.0.2.tgz | sha512-/2qh0lav6CmI15FzA3i/2Bzk2zCgQhGMkvhOhKNcBVQ1ldgpbfiNTVslmooUmWJcADi1f1kIeynbDRVzNlfR6Q== |
| path-to-regexp@6.3.0 | MIT | 1 | 1 | https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-6.3.0.tgz | sha512-Yhpw4T9C6hPpgPeA28us07OJeqZ5EzQTkbfwuhsUg0c237RomFoETJgmp2sa3F/41gfLE6G5cqcYwznmeEeOlQ== |
| picocolors@1.1.1 | ISC | 1 | 1 | https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz | sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA== |
| postcss@8.5.28 | MIT | 27 | 27 | https://registry.npmjs.org/postcss/-/postcss-8.5.28.tgz | sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A== |
| sanitize-html@2.17.7 | MIT | 1 | 1 | https://registry.npmjs.org/sanitize-html/-/sanitize-html-2.17.7.tgz | sha512-PGtEkc9cbnedU3s9TmzDbpsZ8w086g/0Q8k8/oIO1NLNU3i5k9yn835CrjJSajp1KMmkisbO1qPXxNKO3welAg== |
| unenv@2.0.0-rc.24 | MIT | 19 | 17 | https://registry.npmjs.org/unenv/-/unenv-2.0.0-rc.24.tgz | sha512-i7qRCmY42zmCwnYlh9H2SvLEypEFGye5iRmEMKjcGi7zk9UquigRjFtTLz0TYqr0ZGLZhaMHl/foy1bZR+Cwlw== |
| wrangler@4.147.0 | MIT OR Apache-2.0 | 3 | 3 | https://registry.npmjs.org/wrangler/-/wrangler-4.147.0.tgz | sha512-pQYRoiq8PTAxphaG69z8+GC1DkSGd19EDZehQ8zxjo/Ko3mRB6Qs1mTrd8ZuKAarLklIjTqr1lUdCK9r4q2hUg== |

## Inputs do metafile

| Caminho | Bytes da entrada | Bytes incorporados | Componente ou origem |
| --- | ---: | ---: | --- |
| `(disabled):../node_modules/postcss/lib/terminal-highlight` | 0 | 349 | Placeholder gerado pelo empacotador; não incorpora o pacote indicado |
| `(disabled):../node_modules/source-map-js/source-map.js` | 0 | 338 | Placeholder gerado pelo empacotador; não incorpora o pacote indicado |
| `../.wrangler/tmp/pages-PNGRRK/functionsRoutes-0.352187871194107.mjs` | 5687 | 3392 | Aplicação / rota gerada / referência externa WASM |
| `../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs` | 880 | 1617 | @cloudflare/unenv-preset@2.16.2 |
| `../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs` | 3689 | 6194 | @cloudflare/unenv-preset@2.16.2 |
| `../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs` | 971 | 988 | @cloudflare/unenv-preset@2.16.2 |
| `../node_modules/@js-temporal/polyfill/dist/index.esm.js` | 128868 | 194996 | @js-temporal/polyfill@0.5.1 |
| `../node_modules/astronomy-engine/esm/astronomy.js` | 412025 | 120502 | astronomy-engine@2.1.19 |
| `../node_modules/dayjs/dayjs.min.js` | 7161 | 13438 | dayjs@1.11.23 |
| `../node_modules/deepmerge/dist/cjs.js` | 4048 | 5036 | deepmerge@4.3.1 |
| `../node_modules/escape-string-regexp/index.js` | 461 | 595 | escape-string-regexp@4.0.0 |
| `../node_modules/is-plain-object/dist/is-plain-object.js` | 850 | 1028 | is-plain-object@5.0.0 |
| `../node_modules/jsbi/dist/jsbi-umd.js` | 35301 | 62202 | jsbi@4.3.2 |
| `../node_modules/launder/index.js` | 16649 | 11874 | launder@1.7.2 |
| `../node_modules/nanoid/non-secure/index.cjs` | 518 | 1024 | nanoid@3.3.18 |
| `../node_modules/parse-srcset/src/parse-srcset.js` | 10540 | 5975 | parse-srcset@1.0.2 |
| `../node_modules/path-to-regexp/dist.es2015/index.js` | 15454 | 10883 | path-to-regexp@6.3.0 |
| `../node_modules/picocolors/picocolors.browser.js` | 598 | 1149 | picocolors@1.1.1 |
| `../node_modules/postcss/lib/at-rule.js` | 471 | 945 | postcss@8.5.28 |
| `../node_modules/postcss/lib/comment.js` | 203 | 646 | postcss@8.5.28 |
| `../node_modules/postcss/lib/container.js` | 12350 | 14192 | postcss@8.5.28 |
| `../node_modules/postcss/lib/css-syntax-error.js` | 3402 | 4129 | postcss@8.5.28 |
| `../node_modules/postcss/lib/declaration.js` | 495 | 947 | postcss@8.5.28 |
| `../node_modules/postcss/lib/document.js` | 654 | 1072 | postcss@8.5.28 |
| `../node_modules/postcss/lib/fromJSON.js` | 2810 | 3275 | postcss@8.5.28 |
| `../node_modules/postcss/lib/input.js` | 7274 | 8179 | postcss@8.5.28 |
| `../node_modules/postcss/lib/lazy-result.js` | 16273 | 17641 | postcss@8.5.28 |
| `../node_modules/postcss/lib/list.js` | 1325 | 1894 | postcss@8.5.28 |
| `../node_modules/postcss/lib/map-generator.js` | 10099 | 11875 | postcss@8.5.28 |
| `../node_modules/postcss/lib/no-work-result.js` | 2619 | 3412 | postcss@8.5.28 |
| `../node_modules/postcss/lib/node.js` | 12643 | 13966 | postcss@8.5.28 |
| `../node_modules/postcss/lib/parse.js` | 1147 | 1462 | postcss@8.5.28 |
| `../node_modules/postcss/lib/parser.js` | 15310 | 17704 | postcss@8.5.28 |
| `../node_modules/postcss/lib/postcss.js` | 2898 | 3486 | postcss@8.5.28 |
| `../node_modules/postcss/lib/previous-map.js` | 5130 | 5711 | postcss@8.5.28 |
| `../node_modules/postcss/lib/processor.js` | 1739 | 2277 | postcss@8.5.28 |
| `../node_modules/postcss/lib/result.js` | 738 | 1270 | postcss@8.5.28 |
| `../node_modules/postcss/lib/root.js` | 1606 | 2208 | postcss@8.5.28 |
| `../node_modules/postcss/lib/rule.js` | 569 | 1045 | postcss@8.5.28 |
| `../node_modules/postcss/lib/stringifier.js` | 12142 | 13162 | postcss@8.5.28 |
| `../node_modules/postcss/lib/stringify.js` | 213 | 619 | postcss@8.5.28 |
| `../node_modules/postcss/lib/symbols.js` | 91 | 470 | postcss@8.5.28 |
| `../node_modules/postcss/lib/tokenize.js` | 6700 | 7926 | postcss@8.5.28 |
| `../node_modules/postcss/lib/warn-once.js` | 256 | 637 | postcss@8.5.28 |
| `../node_modules/postcss/lib/warning.js` | 1151 | 1426 | postcss@8.5.28 |
| `../node_modules/sanitize-html/index.js` | 40672 | 36082 | sanitize-html@2.17.7 |
| `../node_modules/sanitize-html/node_modules/dom-serializer/dist/foreign-names.js` | 1792 | 1773 | dom-serializer@3.1.1 |
| `../node_modules/sanitize-html/node_modules/dom-serializer/dist/index.js` | 7202 | 4203 | dom-serializer@3.1.1 |
| `../node_modules/sanitize-html/node_modules/domelementtype/dist/index.js` | 2222 | 1640 | domelementtype@3.0.0 |
| `../node_modules/sanitize-html/node_modules/domhandler/dist/index.js` | 4800 | 4976 | domhandler@6.0.1 |
| `../node_modules/sanitize-html/node_modules/domhandler/dist/node.js` | 9626 | 9168 | domhandler@6.0.1 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/feeds.js` | 5811 | 4664 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/helpers.js` | 5024 | 2978 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/index.js` | 250 | 1784 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/legacy.js` | 5320 | 3105 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/manipulation.js` | 3676 | 2991 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/querying.js` | 4703 | 2545 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/stringify.js` | 2562 | 1617 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/domutils/dist/traversal.js` | 3076 | 1823 | domutils@4.0.2 |
| `../node_modules/sanitize-html/node_modules/entities/dist/decode-codepoint.js` | 1160 | 1238 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/decode.js` | 22923 | 16564 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/encode.js` | 3272 | 0 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/escape.js` | 4740 | 2626 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/generated/decode-data-html.js` | 32453 | 32669 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/generated/decode-data-xml.js` | 314 | 529 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/generated/encode-html.js` | 13401 | 0 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/index.js` | 3604 | 950 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/internal/bin-trie-flags.js` | 942 | 747 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/internal/decode-shared.js` | 617 | 768 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/entities/dist/internal/encode-shared.js` | 3618 | 0 | entities@8.0.0 |
| `../node_modules/sanitize-html/node_modules/htmlparser2/dist/Parser.js` | 21036 | 20160 | htmlparser2@12.0.0 |
| `../node_modules/sanitize-html/node_modules/htmlparser2/dist/Tokenizer.js` | 40603 | 36989 | htmlparser2@12.0.0 |
| `../node_modules/sanitize-html/node_modules/htmlparser2/dist/index.js` | 1923 | 1633 | htmlparser2@12.0.0 |
| `../node_modules/unenv/dist/runtime/_internal/utils.mjs` | 1181 | 1340 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/mock/noop.mjs` | 61 | 406 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/console.mjs` | 2273 | 2063 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/fs.mjs` | 2681 | 2554 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/fs/promises.mjs` | 730 | 917 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/fs/classes.mjs` | 524 | 835 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/fs/constants.mjs` | 1970 | 4365 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/fs/fs.mjs` | 6525 | 6943 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/fs/promises.mjs` | 2140 | 2406 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/perf_hooks/constants.mjs` | 1544 | 0 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/perf_hooks/histogram.mjs` | 1046 | 0 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs` | 6162 | 7346 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs` | 653 | 1008 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs` | 64 | 399 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/process/process.mjs` | 5494 | 6854 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs` | 162 | 639 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs` | 795 | 1470 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/perf_hooks.mjs` | 2767 | 354 | unenv@2.0.0-rc.24 |
| `../node_modules/unenv/dist/runtime/node/tty.mjs` | 356 | 365 | unenv@2.0.0-rc.24 |
| `../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console` | 117 | 259 | wrangler@4.147.0 |
| `../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process` | 117 | 259 | wrangler@4.147.0 |
| `../node_modules/wrangler/templates/pages-template-worker.ts` | 5788 | 3992 | wrangler@4.147.0 |
| `../src/analysisOutput.ts` | 1058 | 1331 | Aplicação / rota gerada / referência externa WASM |
| `_middleware.ts` | 379 | 599 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/advancedAnalysisPrompt.ts` | 15196 | 15596 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/analysisEditorial.ts` | 3154 | 3937 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/analysisJobRepository.ts` | 21238 | 18409 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/analysisPrompt.ts` | 30299 | 29740 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/angelCatalog.ts` | 18738 | 18893 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/artifactPersistence.ts` | 1668 | 1472 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/astroCore.ts` | 3187 | 2617 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/astronomyTransitProvider.ts` | 11049 | 12037 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/birthTime.ts` | 4640 | 2921 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/canonicalArtifactBundle.ts` | 11482 | 9151 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/externalFetch.ts` | 490 | 800 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/localityMapV1.ts` | 27024 | 20531 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/localityMapV1Schema.ts` | 30598 | 31974 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/location.ts` | 3811 | 2814 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/longAnalysisContracts.ts` | 13218 | 12830 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/longAnalysisPlanner.ts` | 42358 | 36213 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/mapOwnershipClaim.ts` | 4796 | 5115 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/modelAvailability.ts` | 2288 | 1518 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/modelConfig.ts` | 1700 | 1757 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/natalChartAnalysisV1.ts` | 24913 | 19050 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/natalChartAnalysisV1Schema.ts` | 30374 | 31928 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/positionV2.ts` | 25798 | 18736 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/positionV2Schema.ts` | 26215 | 27920 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/requestSecurity.ts` | 5260 | 5126 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/solarTimes.ts` | 2468 | 2144 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/swissRuntime.ts` | 9841 | 10467 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/synastryRunV1.ts` | 14158 | 10870 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/synastryRunV1Schema.ts` | 14815 | 14722 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/tatwa.ts` | 4944 | 4198 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/tatwaBirth.ts` | 5029 | 3474 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/tatwaPrompt.ts` | 8678 | 7499 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/tatwaSchema.ts` | 10415 | 9907 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/transitRunV1.ts` | 37018 | 29648 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/transitRunV1Schema.ts` | 35924 | 36614 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/vertex.ts` | 13118 | 10513 | Aplicação / rota gerada / referência externa WASM |
| `api/_shared/vertexModelCapabilities.ts` | 3419 | 2481 | Aplicação / rota gerada / referência externa WASM |
| `api/analisar.ts` | 107098 | 81588 | Aplicação / rota gerada / referência externa WASM |
| `api/astrologo-auth.ts` | 20573 | 19457 | Aplicação / rota gerada / referência externa WASM |
| `api/calcular.ts` | 21971 | 21576 | Aplicação / rota gerada / referência externa WASM |
| `api/contato.ts` | 4932 | 4934 | Aplicação / rota gerada / referência externa WASM |
| `api/enviar-email.ts` | 4969 | 5197 | Aplicação / rota gerada / referência externa WASM |
| `api/localidade.ts` | 7190 | 6809 | Aplicação / rota gerada / referência externa WASM |
| `api/sinastria.ts` | 13341 | 12515 | Aplicação / rota gerada / referência externa WASM |
| `api/transitos.ts` | 7017 | 6567 | Aplicação / rota gerada / referência externa WASM |
| `node-built-in-modules:fs` | 57 | 364 | Aplicação / rota gerada / referência externa WASM |
| `node-built-in-modules:path` | 59 | 383 | Aplicação / rota gerada / referência externa WASM |
| `node-built-in-modules:url` | 58 | 382 | Aplicação / rota gerada / referência externa WASM |

## Textos integrais

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

### dayjs@1.11.23

- Fonte: https://registry.npmjs.org/dayjs/-/dayjs-1.11.23.tgz
- Integridade: `sha512-QDTCU0M0MxR3hQfnlDJfwekQiaanm1ubOD231u73WBckQ/fsamwRLiE2GBz6D3a/xF1NgfiDLJjXBa1hYOYTtQ==`

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

### launder@1.7.2

- Fonte: https://registry.npmjs.org/launder/-/launder-1.7.2.tgz
- Integridade: `sha512-DLg3HPnHUfBi5/MxMLmJD12dmlMpFEC2HgMW6vkZ/9JR0RU00kXoRGvDxAvFmdO0o610OA77i4FgNTLucmhDVg==`

#### LICENSE.md

```text
Copyright (c) 2021 Apostrophe Technologies, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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

### wrangler@4.147.0

- Fonte: https://registry.npmjs.org/wrangler/-/wrangler-4.147.0.tgz
- Integridade: `sha512-pQYRoiq8PTAxphaG69z8+GC1DkSGd19EDZehQ8zxjo/Ko3mRB6Qs1mTrd8ZuKAarLklIjTqr1lUdCK9r4q2hUg==`

#### LICENSE-APACHE

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

#### LICENSE-MIT

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
### unenv@2.0.0-rc.24

Texto integral do `LICENSE` presente no [tarball oficial da versão selecionada](https://registry.npmjs.org/unenv/-/unenv-2.0.0-rc.24.tgz), cuja integridade SHA-512 coincide com o lockfile de produção. O texto identifica Pooya Parsa; não se acrescenta ano ausente no aviso original.

#### LICENSE

```text
MIT License

Copyright (c) Pooya Parsa <pooya@pi0.io>

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

### @cloudflare/unenv-preset@2.16.2

O tarball selecionado declara `MIT OR Apache-2.0`, mas não inclui os arquivos de licença. A proveniência publicada no registro npm relaciona o digest SHA-512 desse tarball ao commit `6e7712725698df46db9ec25ac738dd155ff8d39e` do workers-sdk, produzido pelo workflow oficial `changesets.yml`, [execução 35627616973, tentativa 1](https://github.com/cloudflare/workers-sdk/actions/runs/35627616973/attempts/1). A comparação preservada confirma o digest do sujeito; esta leitura documental não afirma verificação criptográfica da attestation. Os textos integrais abaixo vêm desse mesmo commit e cobrem o código do workers-sdk. A expressão OR é preservada, sem nova eleição. O código importado de `unenv` tem seu aviso separado acima.

#### LICENSE-MIT

Fonte exata: <https://github.com/cloudflare/workers-sdk/blob/6e7712725698df46db9ec25ac738dd155ff8d39e/LICENSE-MIT>.

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

#### LICENSE-APACHE

Fonte exata: <https://github.com/cloudflare/workers-sdk/blob/6e7712725698df46db9ec25ac738dd155ff8d39e/LICENSE-APACHE>.

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

### @cloudflare/unenv-preset 2.16.2 — texto MIT específico do pacote

Fonte: <https://github.com/cloudflare/workers-sdk/blob/6e7712725698df46db9ec25ac738dd155ff8d39e/packages/unenv-preset/LICENSE-MIT>.

O aviso a seguir é o texto integral do pacote no mesmo commit de origem do artefato de runtime já identificado. A expressão `MIT OR Apache-2.0` permanece preservada; este complemento de atribuição não estabelece uma nova eleição.

```text
Copyright (c) 2024 Pooya Parsa <pooya@pi0.io> & Cloudflare, Inc. <wrangler@cloudflare.com>

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
