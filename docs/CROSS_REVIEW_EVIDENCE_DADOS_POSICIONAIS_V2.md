# Evidence packet — dados posicionais v2

Veredito proposto: `READY` para a primeira entrega local; `NOT DEPLOYED`.

## Saídas brutas dos gates

```text
COMMAND: npm test
CWD: astrologo-app/astrologo-frontend
EXIT_CODE: 0

> astrologo-frontend@2.17.25 test
> vitest run
RUN v4.1.10 C:/Users/leona/lcv-workspace/astrologo-app/astrologo-frontend
Test Files 13 passed (13)
Tests 74 passed (74)
Duration 3.71s
```

```text
COMMAND: npm run lint; npm run biome; npm run build
CWD: astrologo-app/astrologo-frontend
EXIT_CODE: 0

> eslint .
> biome check .
Checked 38 files in 167ms. No fixes applied.
> tsc -b && vite build
1779 modules transformed.
✓ built in 963ms
```

```text
COMMAND: wrangler pages functions build functions
CWD: astrologo-app/astrologo-frontend
EXIT_CODE: 0

wrangler 4.108.0
✨ Compiled Worker successfully
```

```text
COMMAND: with_server Pages dev -- astrologo_v2_worker_smoke.py
CWD: astrologo-app/astrologo-frontend
EXIT_CODE: 0

Server ready on port 8799
astrologo-v2-worker-smoke-ok eb998964-21fd-4e4f-a57d-b9e3eea75b8c
```

O script do smoke verificou HTTP 200, `success=true`, dez posições, 12 cúspides, Swiss `2.10.03`, WASM SHA-256 `31d3406560fd39b91bc9dbfdff6c9111f170fde2db62ebe92581ae14e878744c`, timezone `America/Sao_Paulo`, ausência de `primaryAngel`/`regenteNatal` e persistência D1.

```text
COMMAND: npm test; npm run test:admin-motor; npm run typecheck:admin-motor; npm run lint; npm run biome; npm run build
CWD: admin-app
EXIT_CODE: 0

Test Files 9 passed (9)
Tests 42 passed (42)
admin motor Test Files 13 passed (13)
Tests 175 passed (175)
admin-motor typecheck baseline clean: 0/0 error(s).
eslint exit 0
biome: Checked 194 files. No fixes applied.
tsc -b && vite build: ✓ built in 1.51s
```

```text
COMMAND: git diff --check
CWD: astrologo-app e admin-app
EXIT_CODE: 0
STDOUT: vazio
```

```text
COMMAND: rg --pcre2 <secret-patterns> <changed-source>
EXIT_CODE: 1
INTERPRETATION: rg não encontrou correspondências
NORMALIZED_RESULT: NO_SECRET_LITERALS_FOUND
```

```text
COMMAND: npx vitest run swissRuntime.test.ts externalFetch.test.ts location.test.ts calcular.v2.test.ts
CWD: astrologo-app/astrologo-frontend
EXIT_CODE: 0

Test Files 4 passed (4)
Tests 7 passed (7)
Duration 2.00s
```

## Referências de implementação e testes

- `functions/api/_shared/positionV2.ts:21`: guarda IAU de 20 minutos de arco.
- `functions/api/_shared/positionV2.ts:387`: índice angélico `floor(longitude / 5)`.
- `functions/api/_shared/positionV2.ts:392`: quinário tropical semiaberto de 5 graus.
- `functions/api/_shared/positionV2.ts:422`: grau dentro de constelação IAU sempre `not-defined`.
- `functions/api/_shared/positionV2.ts:468`: `swe_house_pos` Placidus e intervalo válido `[1,13)`.
- `functions/api/_shared/positionV2.ts:620`: agregação da falange.
- `functions/api/_shared/positionV2Schema.ts:25`: proibição de `primaryAngel` e `regenteNatal`.
- `functions/api/_shared/positionV2Schema.ts:725`: cobertura e consistência da falange.
- `functions/api/_shared/positionV2.test.ts:90`: dez ocorrências e prova negativa de anjo dominante.
- `functions/api/_shared/positionV2.test.ts:141`: borda IAU indisponível.
- `functions/api/_shared/positionV2.test.ts:178`: Placidus polar indisponível, sem fallback.
- `functions/api/calcular.ts:481`: validação do schema antes da persistência.
- `functions/api/calcular.ts:497`: `INSERT` com nove bindings, incluindo o JSON v2.
- `functions/api/analisar.ts:209`: reidratação canônica pelo ID no D1.
- `functions/api/_shared/birthTime.ts:3` e `src/astrologyV2.ts:94`: `pt-BR`, `America/Sao_Paulo` e `h23` explícitos.
- `functions/api/_shared/analysisPrompt.test.ts:140`: integridade byte a byte do prompt legado.
- `functions/api/_shared/externalFetch.ts:1`: timeout de 8 segundos com `AbortSignal`.
- `functions/api/_shared/location.ts:73`: resolução server-side do ID por `/v1/get`.
- `functions/api/_shared/swissRuntime.ts:115`: ambiente `PATH=.` e descritor pré-aberto 3.
- `functions/api/_shared/swissRuntime.test.ts:19`: fixture real do WASM Placidus.
- `admin-app/src/lib/astrological-position-v2.ts:490`: vínculo `calculationId`/mapa.
- `admin-app/src/modules/astrologo/AstrologoModule.tsx:326`, `:340` e `:385`: ownership do relatório.
- `functions/api/_shared/requestSecurity.ts:38` e `:55`: allowlist de origem HTTPS da LCV Ideas & Software.
- `THIRDPARTY.md:27` a `:61` e `NOTICE:11` a `:81`: hashes, commits, licenças e oferta de fonte.

## Evidência numérica e catálogos

- Catálogo: 72 entradas × 5 graus, SHA-256 `a8c2d5f175c874a1fdea0640f927655ea3b73eedc47089dc88321fff95e77062`.
- Comparação Astronomy Engine/JPL: 15.410 posições, erro máximo `18,874742` segundos de arco, p99 `16,194461`, zero acima de 60 segundos de arco.
- Divergência máxima observada junto a bordas IAU: `17,25` minutos de arco; guarda fail-closed: 20 minutos.
- Prompt legado: UTF-16 2173, UTF-8 2345, LF 14, MD5 `c44a9fee011fd50148bdca975cb61025`, SHA-256 `8e5ece407c7edc97b6903abddf21a36601f1a216ce711f7912d480ee3a598611`.
- Chromium: locale `pt-BR`, timezone do navegador `Asia/Tokyo`; renderização em Brasília `11/07/2026 às 12:30:45`, dez linhas, 12 cúspides e falange; exit code 0.

## Gate de implantação

Nenhum deploy ou migration remota foi executado. Ordem exigida:

1. aplicar migrations 003 e 014;
2. publicar o corresponding source AGPL exato;
3. implantar o app público;
4. implantar o admin;
5. executar smoke no preview.
