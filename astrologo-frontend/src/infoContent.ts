import { formatTatwaDurationPtBr, type TatwaPresentation } from './tatwaPresentation';

export type InfoTopic =
  | 'tropical'
  | 'astronomica'
  | 'tatwas'
  | 'numerologia'
  | 'detailedMap'
  | 'celestialDistribution'
  | 'mapCorrespondences';

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

const detailedMapContent: InfoContent = {
  title: 'Como ler o quadro detalhado do mapa',
  introduction:
    'Este quadro reúne quatro camadas calculadas para cada um dos dez corpos celestes considerados no mapa. Elas respondem a perguntas diferentes e não devem ser tratadas como se fossem a mesma medida.',
  sections: [
    {
      title: 'O que aparece em cada cartão',
      items: [
        'A posição tropical informa signo, grau e decanato dentro do zodíaco sazonal de 12 setores iguais.',
        'A Casa Placidus informa em qual das 12 divisões astrológicas locais o corpo foi posicionado, usando o instante e o lugar de nascimento.',
        'O céu astronômico informa a região oficial da IAU que contém a coordenada celeste. Essa camada não calcula um grau dentro da constelação, porque as constelações oficiais são áreas bidimensionais de formatos irregulares.',
        'O quinário angelical informa qual intervalo tropical de 5 graus e qual anjo do catálogo do projeto correspondem à longitude do corpo. Essa associação é simbólica, não uma classificação astronômica.',
      ],
    },
    {
      title: 'O destaque pessoal e a lista completa',
      items: [
        'O Anjo Regente do Consulente é sempre a correspondência do quinário ocupado pelo Sol tropical natal. Ele não é escolhido pelo anjo que mais se repete no mapa.',
        'Os cartões seguintes mostram as mesmas quatro camadas para Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão.',
      ],
    },
    {
      title: 'Como o horário é apresentado',
      items: [
        'O sistema resolve a data e a hora civis no fuso histórico do lugar de nascimento para obter um único instante. Na tela, esse mesmo instante é convertido para a Hora oficial de Brasília, sem alterar o momento usado nos cálculos.',
        'As posições celestes são geocêntricas: usam o centro da Terra como referência. Elas não simulam uma fotografia do horizonte nem a aparência local do céu no momento do nascimento.',
        'Quando uma região IAU ou uma Casa Placidus não pode ser determinada com segurança pelo método declarado, o aplicativo informa a indisponibilidade em vez de inventar ou substituir o resultado.',
      ],
    },
  ],
  closing:
    'Use este quadro para comparar camadas posicionais e simbólicas com regras próprias; a interpretação nasce da leitura conjunta, não da mistura de suas unidades.',
};

const celestialDistributionContent: InfoContent = {
  title: 'Como ler as Cúspides das Casas Placidus',
  introduction:
    'Uma cúspide é o ponto de início de uma casa astrológica. O quadro mostra, com duas casas decimais, em qual signo tropical e grau começa cada uma das 12 Casas Placidus.',
  sections: [
    {
      title: 'Casa e signo são divisões diferentes',
      items: [
        'Os 12 signos tropicais são setores iguais de 30 graus. As Casas Placidus dependem do movimento aparente do céu para o instante e o lugar observados e não precisam ter o mesmo tamanho em longitude zodiacal.',
        'O grau da cúspide marca somente o começo da casa. Ele não é o grau de um planeta, não descreve toda a extensão da casa e não é um grau dentro de uma constelação.',
        'A Casa 1 começa no Ascendente e a Casa 10 começa no Meio do Céu. As demais cúspides completam as fronteiras das 12 casas.',
        'Como as casas podem ter extensões diferentes, um mesmo signo pode aparecer em duas cúspides seguidas e outro pode não aparecer em nenhuma. Isso, por si só, não indica erro.',
      ],
    },
    {
      title: 'Por que hora e lugar importam',
      items: [
        'O cálculo usa o horário e o local de nascimento. Alterações nesses dados podem deslocar as cúspides e também mudar a casa atribuída a um corpo celeste.',
        'Em certas latitudes, especialmente além dos círculos polares, o método Placidus pode ficar matematicamente indisponível. Nessa situação, o aplicativo não substitui silenciosamente Placidus por outro sistema: ele informa que as cúspides não estão disponíveis.',
      ],
    },
  ],
  closing:
    'As casas são uma estrutura interpretativa da astrologia. Confira com cuidado hora e local antes de atribuir significado às posições mostradas.',
};

const mapCorrespondencesContent: InfoContent = {
  title: 'Como ler a Falange Angelical do Mapa',
  introduction:
    'A metodologia adotada divide o círculo tropical de 360 graus em 72 intervalos iguais de 5 graus. Cada intervalo, chamado quinário, corresponde a um anjo do catálogo hermético-cabalístico usado pelo projeto.',
  sections: [
    {
      title: 'Como cada correspondência é formada',
      items: [
        'Cada um dos dez corpos celestes é associado separadamente ao anjo do quinário que contém sua longitude tropical. Um ponto exatamente no começo de um novo quinário pertence ao novo intervalo.',
        'Dois ou mais corpos podem ocupar quinários ligados ao mesmo anjo. Por isso, um único cartão pode reunir vários nomes e mostrar mais de uma correspondência.',
        'A tela pode exibir menos de dez cartões, mas o total continua sendo dez correspondências: cada corpo aparece uma única vez em algum grupo.',
        'Nome, triplete hebraico, coro e príncipe vêm do catálogo documentado pelo projeto. A contagem informa quantos corpos foram agrupados; ela não cria uma hierarquia espiritual nem mede força ou dominância.',
      ],
    },
    {
      title: 'Anjo Regente e falange não são a mesma coisa',
      items: [
        'O Anjo Regente do Consulente deriva exclusivamente da posição tropical do Sol. Ele não é escolhido por repetição, maioria ou outro planeta.',
        'A Falange Angelical do Mapa é o conjunto das correspondências dos dez corpos, agrupadas para evitar repetir o mesmo anjo em vários cartões.',
      ],
    },
    {
      title: 'Limite desta metodologia',
      items: [
        'Este sistema angelical usa somente a longitude tropical. Ele ainda não foi adaptado às 13 constelações de referência nem às regiões oficiais da IAU exibidas na camada astronômica.',
        'Trata-se de uma correspondência simbólica de uma tradição específica. O resultado não é medição física, diagnóstico, promessa, sentença sobre a pessoa nem consenso universal entre escolas de angelologia.',
      ],
    },
  ],
  closing:
    'Leia a falange como um mapa de correspondências dentro da metodologia declarada, distinguindo-a tanto da astronomia quanto de outras escolas espirituais.',
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
    case 'detailedMap':
      return detailedMapContent;
    case 'celestialDistribution':
      return celestialDistributionContent;
    case 'mapCorrespondences':
      return mapCorrespondencesContent;
  }
};
