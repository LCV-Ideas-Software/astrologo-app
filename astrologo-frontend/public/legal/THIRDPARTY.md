# Third-Party Components

| Componente | Versão | Licença Original | Modificado? | Link de Origem |
|------------|--------|------------------|-------------|----------------|
| @eslint/js | ^9.39.4 | MIT | Não | https://registry.npmjs.org/@eslint/js/-/js-9.39.4.tgz |
| @tailwindcss/vite | ^4.2.2 | MIT | Não | https://registry.npmjs.org/@tailwindcss/vite/-/vite-4.2.2.tgz |
| @types/node | ^25.5.0 | MIT | Não | https://registry.npmjs.org/@types/node/-/node-25.5.0.tgz |
| @types/react | ^19.2.14 | MIT | Não | https://registry.npmjs.org/@types/react/-/react-19.2.14.tgz |
| @types/react-dom | ^19.2.3 | MIT | Não | https://registry.npmjs.org/@types/react-dom/-/react-dom-19.2.3.tgz |
| @vitejs/plugin-react | ^6.0.1 | MIT | Não | https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-6.0.1.tgz |
| dompurify | ^3.3.3 | (MPL-2.0 OR Apache-2.0) | Não | https://registry.npmjs.org/dompurify/-/dompurify-3.3.3.tgz |
| eslint | ^9.39.4 | MIT | Não | https://registry.npmjs.org/eslint/-/eslint-9.39.4.tgz |
| eslint-plugin-react-hooks | ^7.0.1 | MIT | Não | https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-7.0.1.tgz |
| eslint-plugin-react-refresh | ^0.5.2 | MIT | Não | https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.5.2.tgz |
| globals | ^17.4.0 | MIT | Não | https://registry.npmjs.org/globals/-/globals-17.4.0.tgz |
| lucide-react | ^1.7.0 | ISC | Não | https://registry.npmjs.org/lucide-react/-/lucide-react-1.7.0.tgz |
| react | ^19.2.4 | MIT | Não | https://registry.npmjs.org/react/-/react-19.2.4.tgz |
| react-dom | ^19.2.4 | MIT | Não | https://registry.npmjs.org/react-dom/-/react-dom-19.2.4.tgz |
| tailwindcss | ^4.2.2 | MIT | Não | https://registry.npmjs.org/tailwindcss/-/tailwindcss-4.2.2.tgz |
| typescript | ~6.0.3 | Apache-2.0 | Não | https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz |
| typescript-eslint | ^8.66.0 | MIT | Não | https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.66.0.tgz |
| vite | ^8.0.3 | MIT | Não | https://registry.npmjs.org/vite/-/vite-8.0.3.tgz |
| vitest | ^4.1.2 | MIT | Não | https://registry.npmjs.org/vitest/-/vitest-4.1.2.tgz |
| astronomy-engine | 2.1.19 | MIT | Não | https://github.com/cosinekitty/astronomy/tree/v2.1.19 |
| d3-geo | 3.1.1 | ISC; incorpora GeographicLib sob MIT | Não | https://github.com/d3/d3-geo/tree/v3.1.1 |
| d3-array (dependência transitiva de runtime de d3-geo) | 3.2.4 | ISC | Não | https://github.com/d3/d3-array/tree/v3.2.4 |
| internmap (dependência transitiva de runtime de d3-array) | 2.0.3 | ISC | Não | https://github.com/mbostock/internmap/tree/v2.0.3 |
| topojson-client | 3.1.0 | ISC | Não | https://github.com/topojson/topojson-client/tree/v3.1.0 |
| commander (dependência transitiva de runtime de topojson-client) | 2.20.3 | MIT | Não | https://github.com/tj/commander.js/tree/v2.20.3 |
| world-atlas | 2.0.2 | ISC; dados Natural Earth em domínio público | Não | https://github.com/topojson/world-atlas/tree/v2.0.2 |
| @js-temporal/polyfill | 0.5.1 | ISC | Não | https://github.com/js-temporal/temporal-polyfill/tree/v0.5.1 |
| jsbi (dependência transitiva de runtime de @js-temporal/polyfill) | 4.3.2 | Apache-2.0 | Não | https://github.com/GoogleChromeLabs/jsbi/tree/5382367c7e3199858d36bb620977e1f90605bcb9 |
| @fusionstrings/swiss-eph (dependência de build e origem do módulo WASM) | 0.1.1 | AGPL-3.0-only (manifesto upstream: `AGPL-3.0`) | Não; o módulo é consumido sem alteração | https://github.com/fusionstrings/swiss-eph/tree/e7a7a9311d3058f337b73b72f45ea6d80cffa5f0 |
| Swiss Ephemeris incorporada no WASM | `swe_version() = 2.10.03`; fonte `5ae0bce00dbc66c6315c86da20518e3dd138255b` | AGPL-3.0-only, conforme a opção AGPL da licença dual | Não pelo projeto Astrologo | https://github.com/aloistr/swisseph/tree/5ae0bce00dbc66c6315c86da20518e3dd138255b |

## Cartografia local e dados Natural Earth

O mapa planetário de localidade é renderizado no navegador com `d3-geo@3.1.1`, `topojson-client@3.1.0` e o arquivo `countries-110m.json` de `world-atlas@2.0.2`. As três dependências estão fixadas exatamente no manifesto e no lockfile. O arquivo cartográfico deriva dos limites administrativos Natural Earth 4.1.0 em escala 1:110m. Segundo os termos oficiais em https://www.naturalearthdata.com/about/terms-of-use/, os dados vetoriais e raster Natural Earth são de domínio público.

A base é empacotada no aplicativo. A renderização não solicita tiles nem envia dados natais ou de navegação a provedores cartográficos externos. “Natural Earth” identifica a proveniência do mapa-base, não endossa as interpretações ou o aplicativo.

## Integridade e proveniência dos novos artefatos

As versões abaixo são exatas e estão fixadas no `package-lock.json`. Os hashes SRI foram recalculados sobre os tarballs servidos pelo registro npm e conferem com o lockfile.

| Artefato | npm `gitHead` | SHA-512 SRI do tarball | SHA-256 do tarball |
|----------|---------------|------------------------|--------------------|
| astronomy-engine@2.1.19 | `61dc07020aaa6885d2c7f688a4d82beaf6edb9ef` | `sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==` | `605e9e9ebd0a364f1c5b556f10c1f163e4b8aa63b97ada1ab72e960d73189cdd` |
| @js-temporal/polyfill@0.5.1 | `f3c07e503632ddf7ff918066f2eb30a9dcfa06ff` | `sha512-hloP58zRVCRSpgDxmqCWJNlizAlUgJFqG2ypq79DCvyv9tHjRYMDOcPFjzfl/A1/YxDvRCZz8wvZvmapQnKwFQ==` | `c99a4da5678a55a33dfd30c977852dfac9bbe7b8bac73999f1858c167be6b3e3` |
| jsbi@4.3.2 | `5382367c7e3199858d36bb620977e1f90605bcb9` | `sha512-9fqMSQbhJykSeii05nxKl4m6Eqn2P6rOlYiS+C5Dr/HPIU/7yZxu5qzbs40tgaFORiw2Amd0mirjxatXYMkIew==` | `131d13488f0f400a0770eaca495749cddef34d315f7aeb248fc501f7538b378e` |
| @fusionstrings/swiss-eph@0.1.1 | `e7a7a9311d3058f337b73b72f45ea6d80cffa5f0` | `sha512-UGKCfVh5TUygShCNKnh7iauJ109QYgV+e3+8PACOsiIFyiX8z3PIw7etbYDqF0egsJfIArRdDjOwrliAOFGNgA==` | `ef90330d9ed41da5358b47c60b29ad8f3970a7d09c083fd176f8b9833ad9fcbd` |

Arquivos de distribuição efetivamente usados:

| Arquivo | Tamanho | SHA-256 | SHA-512 |
|---------|---------|---------|---------|
| `astronomy-engine/astronomy.js` (distribuição CommonJS de referência) | 421280 bytes | `729c0ce37cc1a8096034a689039a5f04585ee8184177c638e8c74dec4fa3185a` | `0b66b59b02759e68d10ddaf12ba273d6c81e24f22db218f897a5aa8882bc6be8d50ed48760aede3b0fe3e6e3aaec3f24385df18e5d5bbbfcfc33fb3cca071a81` |
| `astronomy-engine/esm/astronomy.js` (entrypoint ESM importado e referenciado pelos metadados de cálculo) | 412025 bytes | `068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7` | `a898baa9deb4c3ae8e80a961155126039ae3eac6a14a9dac9cd8a39a6cddd7adba5975fe0cbf58cfea40fe99dee8c7df5302ea69c3e1477d89c38a4be4caff65` |
| `@js-temporal/polyfill/dist/index.esm.js` | 128868 bytes | `21f067c54fa5f532f20a8e85e3d2401a3ae1cf60d85fafea6502f621dc93b167` | `1805d1e0da3844a1972b0e14d45d65ebceefde523e056b7bb235f41a84eff442752b75ddd9e0c558e06ef962e8d26ecc8f2f486322f5a22739c4ce0d736fb501` |
| `jsbi/dist/jsbi.mjs` | 29207 bytes | `c0d70fb47e0818e31bdf964805a530d9a0fb4ee5bdadb442a13f3691a5f15583` | `66327d5ea608de8dfb8d91125c5bed76d9c93fe865deebd957e97911cb1ff44e4fbaefa704340df2cd5c67f7a7684457f299c37e927d021840cb55c796a3b2d7` |
| `@fusionstrings/swiss-eph/wasm/swiss-eph-wasi.wasm` (materializado localmente sob demanda) | 1275365 bytes | `31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c` | `f0929366006f037e45eb7085234623ec5fdc73f68cea7bf0c2696a038df979e3d346375a3b8123065863666801c234864a61d9042c6af961b7acdb455bad6de3` |

O repositório não rastreia o executável. `scripts/prepare-swiss-wasm.mjs` resolve o export público `./wasm-wasi` de `@fusionstrings/swiss-eph@0.1.1`, confere tamanho e SHA-256 antes e depois da gravação e materializa uma cópia ignorada somente sob demanda para desenvolvimento, testes ou empacotamento do Cloudflare Pages. Os arquivos `wasm/swiss-eph-wasi.wasm` e `wasm/swiss_eph.wasm` do tarball npm são byte a byte idênticos; a carga real retorna `2.10.03` em `swe_version()`.

O tarball é protegido pela integridade SRI do lockfile e tem assinatura do registro npm. O pacote não publica um atestado npm/Sigstore de proveniência; portanto, os hashes provam identidade com o tarball adquirido, não uma correspondência source-to-binary reproduzida independentemente. Os testes do Astrologo validam a versão carregada e um fixture Placidus conhecido.

## Corresponding Source do WASM e obrigações AGPL

Esta distribuição adota a opção AGPL da licença dual da Swiss Ephemeris; ela não pressupõe uma licença profissional. O projeto Astrologo é licenciado como `AGPL-3.0-or-later`; para a obra combinada que incorpora este componente identificado pelo upstream como `AGPL-3.0`, a versão 3 da AGPL é a base compatível aplicável.

O Corresponding Source declarado pelo upstream e fixado pelos metadados do pacote está em:

- wrapper, bindings, scripts e instruções de build: https://github.com/fusionstrings/swiss-eph/tree/e7a7a9311d3058f337b73b72f45ea6d80cffa5f0;
- submódulo C exato usado por esse commit: https://github.com/aloistr/swisseph/tree/5ae0bce00dbc66c6315c86da20518e3dd138255b;
- texto integral da GNU AGPL v3: `LICENSE` neste repositório e https://www.gnu.org/licenses/agpl-3.0.html.

Esses endereços devem continuar disponíveis, gratuitamente e sem autenticação, enquanto o objeto WASM for distribuído ou oferecido pelo serviço. O distribuidor continua responsável por essa disponibilidade mesmo quando o código correspondente estiver hospedado por terceiros. A interface de rede deve manter uma oferta proeminente do código-fonte da versão implantada.

O aviso especial da Swiss Ephemeris deve ser preservado integralmente; ele está reproduzido em `NOTICE`. Os nomes ali contidos não podem ser usados para promover o aplicativo ou o serviço sem autorização escrita.

## Avisos de licenças permissivas

### d3-geo 3.1.1 — ISC e GeographicLib — MIT

```text
Copyright 2010-2024 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

This license applies to GeographicLib, versions 1.12 and later.

Copyright 2008-2012 Charles Karney

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

### topojson-client 3.1.0 — ISC

```text
Copyright 2012-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### d3-array 3.2.4 — ISC

```text
Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### internmap 2.0.3 — ISC

```text
Copyright 2021 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### commander 2.20.3 — MIT

```text
Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>

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

### world-atlas 2.0.2 — ISC

```text
Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### Astronomy Engine 2.1.19 — MIT

```text
MIT License

Copyright (c) 2019-2023 Don Cross

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

### @js-temporal/polyfill 0.5.1 — ISC

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

### jsbi 4.3.2 — Apache License 2.0

A distribuição upstream não contém arquivo `NOTICE`. A cópia exigida da licença acompanha esta distribuição abaixo:

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
