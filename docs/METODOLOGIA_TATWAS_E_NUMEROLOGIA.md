# Metodologia de Tatwas e Numerologia

## Escopo e postura interpretativa

Este documento registra o que o `astrologo-app` calcula, quais fontes sustentam cada regra e quais escolhas pertencem ao produto. Tatwas e Numerologia são apresentados como sistemas simbólicos: os resultados são reproduzíveis dentro da metodologia declarada, mas não constituem medições físicas, diagnósticos ou verdades universais.

## Tatwas ocidentais

### Base documentada

O ciclo adotado possui cinco Tatwas na ordem Akasha, Vayu, Tejas, Apas e Prithvi. Uma instrução da Golden Dawn dirigida ao grau Philosophus em 1894 descreve essa ordem, o ciclo de duas horas e cinco subdivisões dentro de cada período de 24 minutos. Ao exemplificar Akasha, ela lista Akasha-Akasha, Akasha-Vayu, Akasha-Tejas, Akasha-Apas e Akasha-Prithvi e manda proceder de modo semelhante com os demais Tatwas. Essa é a leitura operacional adotada pelo produto para a sequência interna fixa dos mapas novos.

Outra compilação da tradição Golden Dawn, publicada por Israel Regardie, declara que cada Tatwa começa por um subtatwa de sua própria natureza. Essa passagem sustenta a ordem iniciada pelo regente, mas não estabelece sozinha a mesma grade de 24 minutos e 4 minutos e 48 segundos. Aplicar as duas ordens sobre uma grade temporal comum é uma decisão comparativa do produto e reproduz a metodologia histórica do aplicativo.

O projeto não tenta resolver essa divergência como se uma das leituras fosse universalmente correta:

- `fixed` — **Ordem fixa — Akasha primeiro**: cada bloco principal usa Akasha, Vayu, Tejas, Apas e Prithvi;
- `legacy-rulingFirst` — **Ordem pelo principal — Tatwa principal primeiro**: cada bloco começa pelo próprio Tatwa principal e continua circularmente.

`fixed` é a decisão de produto para novos mapas. Resultados anteriores não são recalculados: a ausência do marcador de método identifica um registro legado, e a interface informa essa condição.

### Algoritmo implementado

O cálculo usa intervalos semiabertos, nos quais o instante exato de uma fronteira pertence ao período que começa nela:

1. determina o instante UTC do nascimento a partir da data, hora, local e fuso histórico IANA;
2. calcula astronomicamente o nascer aparente convencional do Sol na coordenada exata do município selecionado;
3. se o nascimento ocorreu antes desse nascer do Sol, usa o nascer do Sol do dia civil anterior;
4. calcula os segundos inteiros transcorridos desde a âncora;
5. aplica módulo de `7.200 s` para obter a posição no ciclo de duas horas;
6. divide o ciclo em cinco períodos principais de `1.440 s` (24 minutos);
7. divide cada período em cinco subtatwas de `288 s` (4 minutos e 48 segundos);
8. aplica a ordem interna selecionada e grava simultaneamente as duas perspectivas para comparação auditável.

Não existe fallback para `06:00`. Se o nascer do Sol não puder ser determinado, a API retorna erro tipado em vez de produzir um Tatwa com uma âncora inventada.

### Âncora solar calculada e proveniência

O nascer aparente convencional do Sol é calculado localmente por `astronomy-engine` 2.1.19, fixado no lockfile. O motor procura a passagem do limbo superior pelo horizonte e aplica refração atmosférica nominal; isso não equivale a observar o horizonte topográfico real. O resultado persiste:

- instante UTC do nascimento;
- instante UTC e data local do nascer do Sol usado;
- fuso IANA, offset histórico e escolha explícita em horários civis repetidos;
- latitude, longitude e elevações de entrada e efetivamente usadas pelo motor;
- precisão de minuto do horário informado e regra de quantização dos instantes;
- motor e versão do modelo solar;
- segundos intermediários e margens de fronteira.

O navegador não fornece coordenadas nem fuso autoritativos: a API reidrata esses dados a partir do identificador da localidade escolhido no geocodificador. Isso evita substituir silenciosamente um município pela capital do estado.

### Incerteza comunicada ao usuário

Um registro civil pode ter sido arredondado, enquanto um subtatwa dura apenas 288 segundos. Por isso:

- o subtatwa é sempre identificado como indicativo;
- a menor distância até uma transição principal é persistida em segundos;
- resultados a menos de cinco minutos de uma transição recebem aviso;
- a combinação principal/subtatwa do bloco adjacente é mostrada como possibilidade, sem substituir o resultado selecionado.

O limiar de cinco minutos é uma política explícita de comunicação, não uma propriedade astronômica nem uma estimativa da precisão de toda certidão de nascimento.

### Fixtures de regressão

Os testes automatizados fixam os dados fornecidos para esta investigação:

| Caso | Nascimento civil | Local | Resultado `fixed` | Resultado legado | Margem principal |
| --- | --- | --- | --- | --- | ---: |
| A | 20/05/1993 21:12 | Rio de Janeiro, RJ | Tejas / Akasha | Tejas / Tejas | 197 s |
| B | 26/03/1979 16:45 | Cachoeiras de Macacu, RJ | Tejas / Akasha | Tejas / Tejas | 44 s |

Há também um teste negativo com as coordenadas da cidade do Rio de Janeiro aplicadas incorretamente ao nascimento em Cachoeiras de Macacu. Ele produz Vayu / Prithvi no método `fixed` e demonstra por que a coordenada exata não pode ser substituída por um fallback regional.

As diferenças de poucos segundos entre tabelas externas e o teste do aplicativo podem decorrer do motor solar, da refração nominal, da elevação e das coordenadas efetivamente usadas. O modelo não conhece obstáculos nem a topografia do horizonte local. Por isso, o contrato guarda a proveniência completa em vez de declarar um horário sem fonte.

## Numerologia

### Convenção adotada

O aplicativo usa, por decisão de produto, uma tabela alfabética pitagórica contemporânea de 1 a 9. A expressão “pitagórica” identifica a família moderna da convenção; ela não afirma que a tabela latina atual tenha sido escrita pessoalmente por Pitágoras nem que a fonte histórica geral abaixo determine esta tabela exata.

A redução soma os algarismos repetidamente até chegar a um número de 0 a 9, preservando `11`, `22` e `33` quando surgem como resultado de uma etapa. O valor `0` ocorre, por exemplo, na Vibração da Hora de `00:00`. O mesmo redutor é usado nos três campos:

- **Expressão** — normaliza o nome completo para letras latinas minúsculas, remove diacríticos e sinais, converte as letras pela tabela de 1 a 9, reduz cada palavra e depois reduz a soma das palavras;
- **Caminho da Vida** — soma todos os algarismos da data de nascimento e aplica a redução;
- **Vibração da Hora** — soma todos os algarismos da hora de nascimento em formato de 24 horas e aplica a redução.

Essa definição é intencionalmente exata porque outras escolas podem somar nomes, datas e números mestres de formas diferentes. O aplicativo não mistura métodos sem identificá-los.

## Contrato e compatibilidade

O objeto Tatwa novo é armazenado dentro de `dados_globais`, que já é uma coluna JSON serializada em `TEXT`. Portanto, esta mudança não requer `ALTER TABLE`.

O contrato `2.0.0` mantém `principal` e `sub` no topo para consumidores existentes e acrescenta `calculationMode`, ambas as variantes, intermediários, incerteza e âncora. O frontend público, os relatórios, o e-mail, o agente de IA e o `admin-app/Astrologo` devem usar os mesmos rótulos em português do Brasil. Chaves técnicas permanecem em inglês.

## Fontes consultadas

- Golden Dawn, *The Tattwas of the Eastern School* (1894), especialmente “Course of the Tattwas”: <https://www.tarrdaniel.com/documents/Thelemagick/gd/publication/english/Tattwas.html>
- Golden Dawn, *Flying Roll XXX — Tattvas*, nota sobre início no nascer do Sol e períodos de 24 minutos: <https://www.tarrdaniel.com/documents/Thelemagick/gd/publication/english/Flying_Rolls.html>
- Israel Regardie, *The Complete Golden Dawn System of Magic*, passagem sobre o subtatwa iniciado pela natureza regente: <https://scriptaetveritas.com.br/wp-content/uploads/2016/04/ISRAEL_REGARDIE_COMPLETE_GOLDEN_DAWN_SYSTEM_OF_MAGIC.pdf>
- Astronomy Engine, documentação e implementação de `SearchRiseSet`: <https://github.com/cosinekitty/astronomy>
- U.S. Naval Observatory, definições e limitações observacionais de nascer e pôr: <https://aa.usno.navy.mil/faq/RST_defs>
- IAU, referência contextual para a ajuda do módulo astronômico sobre constelações como áreas delimitadas no céu: <https://www.iau.org/Iau/Science/What-we-do/The-Constellations.aspx>
- Visão histórica geral da aritmologia e da influência pitagórica sobre numerologias posteriores: <https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/numbers-overview>
- Rayudu, referência do sistema jyotish Aroha/Avaroha citado apenas como fora do escopo: <https://rayuduastrology.com/tatwaantar-tatwa-siddhanta/>

## Fora do escopo desta versão

Esta entrega não implementa a variante gnóstica que troca Apas e Prithvi, o sistema jyotish de Aroha/Avaroha com passagens de 90 minutos e ciclo completo de 180 minutos, seleção de escola pelo usuário nem retificação automática do horário natal. Cada opção exigirá contrato próprio, fontes próprias e novos casos de teste antes de entrar no produto.
