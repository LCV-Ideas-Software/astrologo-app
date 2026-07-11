import { formatTatwaDurationPtBr, type TatwaPresentation } from './tatwaPresentation';

export type InfoTopic = 'tropical' | 'astronomica' | 'tatwas' | 'numerologia';

export interface NumerologyInfoContext {
  readonly expressao: number;
  readonly caminhoVida: number;
  readonly vibracaoHora: number;
}

export interface InfoContentContext {
  readonly tatwa?: TatwaPresentation;
  readonly numerologia?: NumerologyInfoContext;
}

export interface InfoSection {
  readonly title: string;
  readonly items: readonly string[];
}

export interface InfoContent {
  readonly title: string;
  readonly introduction: string;
  readonly sections: readonly InfoSection[];
  readonly closing: string;
}

const tropicalContent: InfoContent = {
  title: 'Como ler a Astrologia Tropical',
  introduction:
    'Este módulo apresenta uma perspectiva astrológica sazonal. Ele organiza a eclíptica em 12 setores iguais de 30 graus, tomando o equinócio de março como ponto inicial.',
  sections: [
    {
      title: 'O que o resultado representa',
      items: [
        'Os signos tropicais acompanham o ciclo anual das estações e dos equinócios. Por isso, Áries sempre começa no equinócio de março, independentemente da constelação visível ao fundo.',
        'O signo e o grau mostram uma posição dentro desse círculo simbólico de 360 graus. As Casas Placidus são calculadas separadamente, usando horário e local de nascimento.',
      ],
    },
    {
      title: 'O que ele não representa',
      items: [
        'O zodíaco tropical não é uma fotografia das constelações atuais. Seus 12 setores têm o mesmo tamanho, enquanto as constelações astronômicas ocupam regiões desiguais do céu.',
        'O aplicativo mantém esta perspectiva porque ela possui tradição e linguagem interpretativa próprias; não a apresenta como superior nem inferior ao modelo constelacional.',
      ],
    },
  ],
  closing: 'Leia este módulo como uma referência sazonal e simbólica, válida dentro das regras que adota.',
};

const astronomicalContent: InfoContent = {
  title: 'Como ler o Céu Astronômico Constelacional',
  introduction:
    'O aplicativo oferece duas camadas constelacionais. O resumo organiza a faixa da eclíptica — o caminho central aparente do Sol — em referências de 13 constelações; o quadro posicional detalhado compara as coordenadas calculadas com as regiões oficiais do céu.',
  sections: [
    {
      title: 'Como a classificação é feita',
      items: [
        'No resumo de 13 constelações, a longitude ao longo da eclíptica é comparada a faixas de referência desiguais, que incluem Ofiúco entre Escorpião e Sagitário.',
        'No quadro posicional detalhado, a coordenada celeste completa é comparada aos limites oficiais da IAU. Como Lua e planetas podem se afastar da linha central da eclíptica, essa camada também pode identificar uma das demais regiões entre as 88 constelações oficiais.',
        'A precessão dos equinócios faz a relação entre os setores tropicais e o céu constelacional mudar lentamente ao longo dos séculos.',
      ],
    },
    {
      title: 'Constelação e signo não são sinônimos',
      items: [
        'A IAU define constelações como áreas usadas para localizar objetos no céu. Essa classificação não transforma automaticamente uma constelação em signo astrológico nem determina, por si só, uma interpretação esotérica.',
        'O resultado constelacional é uma referência posicional. Qualquer significado simbólico atribuído a ele continua sendo uma leitura interpretativa.',
      ],
    },
  ],
  closing:
    'Compare os dois módulos como perspectivas construídas com regras diferentes, sem precisar descartar uma para compreender a outra.',
};

const formatBoundaryContext = (tatwa: TatwaPresentation | undefined): string => {
  if (!tatwa) return 'O resultado do mapa aparecerá aqui depois do cálculo.';

  const result = `Neste mapa: Tatwa principal ${tatwa.principal}, subtatwa ${tatwa.sub}, pelo método “${tatwa.modeLabelPtBr}”.`;
  if (!tatwa.nearMainBoundary || tatwa.mainBoundaryMarginSec === null) return result;

  const adjacent = tatwa.adjacent
    ? ` A possibilidade adjacente é ${tatwa.adjacent.principal}, com subtatwa ${tatwa.adjacent.sub}.`
    : '';
  return `${result} O nascimento ficou a ${formatTatwaDurationPtBr(tatwa.mainBoundaryMarginSec)} de uma transição principal; pequenas diferenças no horário registrado podem alterar a classificação.${adjacent}`;
};

const tatwaContent = (tatwa: TatwaPresentation | undefined): InfoContent => ({
  title: 'Como são calculados os Tatwas',
  introduction:
    'O aplicativo usa o ciclo ocidental dos cinco Tatwas como uma convenção simbólica de tempo. O ciclo começa no nascer aparente convencional do Sol, calculado astronomicamente para o local de nascimento, e recomeça a cada 2 horas.',
  sections: [
    {
      title: 'Do ciclo principal ao subtatwa',
      items: [
        'Cada Tatwa principal dura 24 minutos. Dentro dele, os cinco subtatwas ocupam intervalos iguais de 4 minutos e 48 segundos.',
        'O cálculo resolve o instante a partir do horário registrado e usa o nascer do Sol correspondente. Quando o nascimento ocorre antes desse evento, usa-se o nascer do Sol do dia civil anterior como início do ciclo vigente.',
      ],
    },
    {
      title: 'Duas ordens tradicionais documentadas',
      items: [
        'Ordem fixa — Akasha primeiro: todo Tatwa principal divide-se na sequência Akasha, Vayu, Tejas, Apas e Prithvi. Este é o padrão adotado nos novos mapas.',
        'Ordem pelo principal — Tatwa principal primeiro: cada período começa pelo próprio Tatwa principal e continua circularmente. Mapas antigos são preservados e identificados como registros legados desse método.',
        'As duas ordens são apresentadas como convenções interpretativas. O aplicativo não declara que uma delas seja uma verdade física ou universal.',
      ],
    },
    {
      title: 'O que o seu mapa informa',
      items: [formatBoundaryContext(tatwa)],
    },
  ],
  closing:
    'Horários aproximados, arredondados ou próximos de uma transição pedem cautela: o aplicativo sinaliza essa incerteza em vez de ocultá-la.',
});

const numerologyContent = (numerologia: NumerologyInfoContext | undefined): InfoContent => {
  const current = numerologia
    ? `Neste mapa: Expressão ${numerologia.expressao}, Caminho da Vida ${numerologia.caminhoVida} e Vibração da Hora ${numerologia.vibracaoHora}.`
    : 'Os três resultados aparecerão aqui depois do cálculo.';

  return {
    title: 'Como é calculada a Numerologia',
    introduction:
      'O aplicativo adota uma convenção numerológica pitagórica contemporânea. As letras são associadas à tabela pitagórica de 1 a 9, e as somas são reduzidas até um algarismo, preservando 11, 22 e 33 como números mestres.',
    sections: [
      {
        title: 'Os três números apresentados',
        items: [
          'Expressão: normaliza o nome completo, desconsidera acentos e símbolos, converte cada letra em número, reduz a soma de cada palavra e, por fim, reduz a soma total.',
          'Caminho da Vida: soma todos os algarismos da data de nascimento e reduz o resultado pela mesma regra.',
          'Vibração da Hora: soma os algarismos da hora de nascimento, no formato de 24 horas, e reduz o resultado pela mesma regra.',
        ],
      },
      {
        title: 'Como interpretar',
        items: [
          current,
          'Esses números pertencem a um sistema simbólico de interpretação. Eles não são diagnóstico científico, psicológico, médico nem previsão inevitável.',
        ],
      },
    ],
    closing:
      'Use os resultados como linguagem de reflexão e confira sempre se nome, data e hora foram informados corretamente.',
  };
};

export const getInfoContent = (topic: InfoTopic, context: InfoContentContext = {}): InfoContent => {
  switch (topic) {
    case 'tropical':
      return tropicalContent;
    case 'astronomica':
      return astronomicalContent;
    case 'tatwas':
      return tatwaContent(context.tatwa);
    case 'numerologia':
      return numerologyContent(context.numerologia);
  }
};
