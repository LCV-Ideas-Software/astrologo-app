# Canário da fila de merge nativa

Data do canário original: 09/08/2026

Atualização de governança: 13/08/2026

Escopo: governança do GitHub Actions; nenhuma alteração no aplicativo ou no runtime.

O canário original comprovou a fila de merge nativa do `astrologo-app`. A governança posterior
aposentou o controlador central `native-auto-merge/v2.1.4` e todos os consumidores locais. O
caminho `.github/workflows/native-auto-merge.yml` foi preservado com outra função: ele agora é o
gate `Trusted Dependency Review`, executado por `pull_request_target` a partir da base confiável.

Nenhum bot arma auto-merge. A entrada na fila ocorre por uma única admissão humana, somente depois
de confirmar o head exato, a base `main` corrente, o run confiável de `Dependency Review`, as
revisões dos bots e a resolução de todas as conversas. A admissão usa correspondência do head e não
permite override administrativo, merge direto ou chamada de merge pela API.

No SHA sintético de `merge_group`, `.github/workflows/dependency-review.yml` produz o contexto
`Dependency Review`. O carrier carrega exclusivamente o scanner da base confiável, valida uma
comparação de dependências completa e estável e falha fechado diante de warning, paginação
incompleta, corrida ou saída divergente. Os demais contextos requeridos continuam sendo:

- `Check index.html formatting`;
- `Analyze actions`;
- `Analyze javascript-typescript`;
- `OpenSSF Scorecard`;
- `Reject unverified binary artifacts`;
- `Run zizmor / Run zizmor`.

O waiver `dangerous-triggers` de `.github/zizmor.yml` permanece porque o arquivo
`native-auto-merge.yml` continua existindo como gate base-trusted; ele não autoriza o controlador
aposentado. Sua justificativa e o blob da configuração serão atualizados apenas por uma release
central sucessora do baseline Zizmor, antes da conclusão do Dependabot #289. O rastreamento
organizacional permanece em `.github#147` e na Discussion #150.
