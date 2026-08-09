# Canário da fila de merge nativa

Data: 9 de agosto de 2026
Escopo: governança do GitHub Actions; nenhuma alteração no aplicativo ou no runtime.

Esta alteração exclusivamente documental é a carga inerte usada para validar a fila de merge
nativa do `astrologo-app`. O canário somente será considerado bem-sucedido se o controlador
central habilitar o auto-merge por squash para o SHA exato deste pull request e o GitHub criar um
commit sintético de `merge_group` no qual todos os contextos declarados concluam com sucesso:

- `Dependency Review`;
- `Check index.html formatting`;
- `Analyze actions`;
- `Analyze javascript-typescript`;
- `OpenSSF Scorecard`;
- `Reject unverified binary artifacts`;
- `Run zizmor / Run zizmor`.

Os rulesets permanecem fail-closed: o canário não pode contornar a fila, usar override de
administrador nem realizar merge por chamada direta à API.
