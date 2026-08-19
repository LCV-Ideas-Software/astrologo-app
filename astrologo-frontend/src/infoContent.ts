import { formatTatwaDurationPtBr, type TatwaPresentation } from './tatwaPresentation';

export type InfoTopic =
  | 'tropical'
  | 'astronomica'
  | 'tatwas'
  | 'numerologia'
  | 'detailedMap'
  | 'celestialDistribution'
  | 'mapCorrespondences'
  | 'natalWheel'
  | 'natalAspects'
  | 'houseInfluences'
  | 'currentSky'
  | 'synastry'
  | 'localityMap';

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

export interface InfoSource {
  readonly label: string;
  readonly url: string;
}

export interface InfoContent {
  readonly title: string;
  readonly introduction: string;
  readonly sections: readonly InfoSection[];
  readonly closing: string;
  readonly sources?: readonly InfoSource[];
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
  sources: [
    {
      label: 'Astrodienst — Zodíaco tropical, signos e constelações',
      url: 'https://www.astro.com/astrowiki/en/Zodiac',
    },
  ],
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
  sources: [
    {
      label: 'União Astronômica Internacional — As constelações oficiais',
      url: 'https://www.iau.org/Iau/Science/What-we-do/The-Constellations.aspx',
    },
    {
      label: 'União Astronômica Internacional — Ofiúco e o caminho aparente do Sol',
      url: 'https://www.iau.org/Iau/Iau/Science/What-we-do/FAQs.aspx',
    },
  ],
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
        'Ordem pelo principal — Tatwa principal primeiro: cada período começa pelo próprio Tatwa principal e continua circularmente. Alguns mapas calculados anteriormente usam essa ordem e preservam o resultado originalmente apresentado.',
        'As duas ordens são apresentadas como convenções interpretativas. O aplicativo não declara que uma delas seja uma verdade física ou universal.',
      ],
    },
    {
      title: 'O que o seu mapa informa',
      items: [formatBoundaryContext(tatwa)],
    },
    {
      title: 'Como interpretar a combinação',
      items: [
        'O Tatwa principal apresenta o tema elementar dominante do instante; o subtatwa acrescenta uma nuance que modifica a maneira como esse tema tende a se expressar.',
        'Akasha sugere abertura, integração e potencial; Vayu, movimento, ideias e comunicação; Tejas, impulso, transformação e decisão; Apas, sensibilidade, vínculo e adaptação; Prithvi, estabilidade, forma e concretização.',
        'Leia os dois nomes juntos. Por exemplo, Tejas–Akasha combina iniciativa transformadora com busca de sentido e amplitude, enquanto Vayu–Prithvi aproxima ideias e movimento da necessidade de organização prática.',
      ],
    },
  ],
  closing:
    'Horários aproximados, arredondados ou próximos de uma transição pedem cautela: o aplicativo sinaliza essa incerteza em vez de ocultá-la.',
  sources: [{ label: 'Rama Prasad — Nature’s Finer Forces', url: 'https://books.google.com/books?vid=bYOh6nZo9vAC' }],
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
        'O decanato é uma das três faixas de 10 graus que subdividem cada signo. Ele oferece uma camada adicional de leitura dentro do mesmo signo.',
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
  sources: [
    { label: 'Astrodienst — Decanatos', url: 'https://www.astro.com/astrowiki/en/Decans' },
    { label: 'Astrodienst — Casas Placidus', url: 'https://www.astro.com/astrowiki/en/Placidus' },
  ],
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
  sources: [{ label: 'Astrodienst — Sistemas de casas', url: 'https://www.astro.com/astrowiki/en/House_System' }],
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
      title: 'Como ler os campos angelicais',
      items: [
        'O triplete hebraico identifica graficamente o nome dentro da tradição adotada. Coro e príncipe mostram o agrupamento hierárquico usado pelo catálogo; não são medidas de força pessoal.',
        'A síntese tradicional reúne qualidades associadas ao anjo. Na leitura do mapa, essas qualidades são relacionadas à função simbólica do planeta correspondente: identidade no Sol, emoções na Lua, comunicação em Mercúrio, vínculos em Vênus e assim por diante.',
        'Quando o mesmo anjo aparece ligado a mais de um planeta, a repetição sugere um tema simbólico recorrente em diferentes áreas do mapa, sem transformar esse anjo em um segundo regente.',
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
  sources: [
    {
      label: 'Wiki de Ocultismo de Marcelo Del Debbio — Anjos Cabalísticos',
      url: 'https://wiki.deldebbio.com.br/index.php/Anjos_Cabal%C3%ADsticos',
    },
    {
      label: 'Ilustrações TdC/Project Mayhem — roda de correspondências',
      url: 'https://www.behance.net/gallery/15162493/Ilustracoes-TdCProjectMayhem',
    },
  ],
};

const natalWheelContent: InfoContent = {
  title: 'Como ler a Roda do Mapa Natal',
  introduction:
    'A roda é uma representação visual do mesmo cálculo detalhado. Ela coloca o Ascendente à esquerda e organiza, em camadas, os 12 signos tropicais, as Casas Placidus, os planetas e as linhas de aspectos.',
  sections: [
    {
      title: 'Do lado de fora para o centro',
      items: [
        'A faixa externa mostra símbolos e cores dos 12 signos tropicais. As linhas numeradas marcam o início e a extensão visual das 12 Casas Placidus.',
        'Os símbolos planetários mantêm a longitude calculada. Quando vários corpos estão muito próximos, eles podem ocupar anéis ligeiramente diferentes para continuar legíveis; essa separação gráfica não muda os graus do mapa.',
        'As linhas no centro ligam os pares que atendem aos critérios de aspectos adotados. Cor e tracejado ajudam a distinguir cada tipo, mas a lista textual continua sendo a referência para valores exatos e acessibilidade.',
      ],
    },
    {
      title: 'Por que o céu IAU não aparece como outro disco',
      items: [
        'As constelações oficiais são áreas bidimensionais irregulares e não são 13 setores iguais. Desenhar um segundo zodíaco regular daria uma impressão geométrica falsa.',
        'A classificação astronômica real permanece disponível nos cartões e na alternativa textual, corpo por corpo, sem ser convertida artificialmente em fatias iguais.',
      ],
    },
  ],
  closing:
    'Use a roda para reconhecer relações espaciais e consulte a alternativa textual para graus, orbes, indisponibilidades e metodologia completa.',
  sources: [
    {
      label: 'Astro.com — exemplo de roda astrológica interativa',
      url: 'https://www.astro.com/cgi/aclch.cgi',
    },
  ],
};

const natalAspectsContent: InfoContent = {
  title: 'Como ler os Aspectos do Mapa Natal',
  introduction:
    'Um aspecto compara a distância angular entre dois pontos da roda. O aplicativo calcula essa geometria uma única vez nas longitudes eclípticas e depois oferece leituras simbólicas pelas perspectivas declaradas.',
  sections: [
    {
      title: 'Ângulo exato, separação e orbe',
      items: [
        'Conjunção aproxima e funde funções; Sextil favorece cooperação e oportunidade; Quadratura cria atrito e exige ação; Trígono facilita circulação e talento; Quincúncio pede ajuste entre linguagens diferentes; Oposição coloca duas forças frente a frente e pede integração.',
        'O orbe é a diferença entre a separação observada e o ângulo exato. Quanto menor o orbe, mais próxima está a geometria do aspecto; isso não é uma medida científica de destino, personalidade ou intensidade psicológica.',
        'Os limites aceitos seguem critérios estáveis adotados pelo projeto. Assim é possível compreender por que um par entrou ou não na lista sem trocar regras silenciosamente.',
        'Um aspecto aplicativo caminha simbolicamente em direção à exatidão; um separativo já passou por ela. Quando essa fase não pode ser estabelecida com segurança, o aplicativo simplesmente não a atribui.',
      ],
    },
    {
      title: 'Corpos e ângulos considerados',
      items: [
        'A leitura compara os dez corpos presentes no mapa e os ângulos Ascendente e Meio do Céu. Descendente e Fundo do Céu são desenhados como eixos opostos, sem duplicar automaticamente todos os aspectos.',
        'Tropical e Astronômico Constelacional não criam duas geometrias diferentes: os mesmos aspectos podem receber leituras distintas, mas conservam a separação angular calculada.',
      ],
    },
  ],
  closing:
    'Leia aspectos como relações simbólicas entre posições, nunca como diagnóstico, garantia de comportamento ou acontecimento inevitável.',
  sources: [
    { label: 'Astrodienst — Aspectos', url: 'https://www.astro.com/astrowiki/en/Aspect' },
    { label: 'Astrodienst — Orbe', url: 'https://www.astro.com/astrowiki/en/Orb' },
  ],
};

const houseInfluencesContent: InfoContent = {
  title: 'Como ler as Casas e o grau mundano',
  introduction:
    'As casas descrevem uma divisão local do movimento aparente do céu. Para cada corpo, o aplicativo distingue a Casa Placidus ocupada, a longitude zodiacal e, quando o motor fornece o dado, a posição proporcional dentro da própria casa.',
  sections: [
    {
      title: 'Três números que não devem ser confundidos',
      items: [
        'O grau no signo vem da longitude tropical. O grau da cúspide marca o começo zodiacal de uma casa. O grau mundano indica o avanço do corpo dentro da divisão Placidus e usa uma escala própria de 0 a menos de 30 graus.',
        'A posição proporcional dentro da casa vem do mesmo cálculo das Casas Placidus. Ela não é estimada pelo tamanho do arco entre duas cúspides, porque essa aproximação confundiria referências diferentes.',
        'Mapas antigos podem não ter esse dado. Nesses casos, o grau mundano não é exibido nem estimado. Quando o mapa possui a análise das casas, mas o motor não pode calcular a posição com segurança, o grau mundano aparece como indisponível em vez de ser inventado.',
      ],
    },
    {
      title: 'O que a análise interpreta',
      items: [
        'O painel agrupa os corpos por casa e apresenta temas simbólicos tradicionalmente associados a cada setor, sempre junto dos dados que sustentam a leitura.',
        'Hora e lugar afetam fortemente as casas. Se o horário natal for aproximado, interprete ocupações próximas de cúspides com cautela.',
      ],
    },
  ],
  closing:
    'Casa, signo e constelação respondem a referências diferentes; a leitura fica mais clara quando cada medida conserva seu próprio significado.',
};

const currentSkyContent: InfoContent = {
  title: 'Como ler o Céu Atual e os Trânsitos',
  introduction:
    'O céu atual é calculado para um instante de referência explícito. Os trânsitos comparam essas posições móveis às posições fixadas no mapa natal, sem alterar nem sobrescrever o nascimento.',
  sections: [
    {
      title: 'O que é comparado',
      items: [
        'Um aspecto trânsito–natal liga um corpo no instante atual a um corpo ou ângulo natal. A lista informa o aspecto, a separação, o orbe e o intervalo de tempo considerado.',
        'As posições do céu usam um instante de referência claramente informado. Na interface, datas e horários são sempre apresentados na Hora oficial de Brasília.',
        'Quando houver uma janela futura, ela é limitada e declarada. O sistema não completa datas ausentes nem transforma uma aproximação num momento exato.',
      ],
    },
    {
      title: 'Limites da linguagem preditiva',
      items: [
        'A análise descreve temas e possibilidades dentro da tradição astrológica. Ela não é uma previsão inevitável, não garante eventos e não substitui decisões médicas, jurídicas, financeiras ou pessoais.',
        'Um trânsito pode ser lido de formas diferentes conforme a escola. O aplicativo mantém critérios estáveis para que resultados possam ser comparados com coerência.',
      ],
    },
  ],
  closing:
    'Use os trânsitos como um calendário reflexivo de influências simbólicas, mantendo espaço para contexto, escolha e incerteza.',
  sources: [{ label: 'Astrodienst — Aspectos e orbes', url: 'https://www.astro.com/astrowiki/en/Aspect' }],
};

const synastryContent: InfoContent = {
  title: 'Como ler a Sinastria',
  introduction:
    'A sinastria compara dois mapas natais completos, calculados separadamente com data, hora e local de cada pessoa. Ela não reduz a relação a uma soma de signos solares.',
  sections: [
    {
      title: 'Uma comparação em duas direções',
      items: [
        'Os aspectos intermapa medem a distância angular entre um corpo de A e um corpo de B, usando critérios próprios para relações entre dois mapas.',
        'As sobreposições mostram os corpos de A nas Casas de B e os corpos de B nas Casas de A. As duas direções são mantidas porque as casas e os contextos natais não são intercambiáveis.',
        'Os nomes A e B servem apenas para identificar os sujeitos no cálculo; não criam hierarquia nem atribuem automaticamente papéis na relação.',
      ],
    },
    {
      title: 'O que o resultado não decide',
      items: [
        'A sinastria não mede compatibilidade como porcentagem científica, não diagnostica vínculos e não determina sucesso, fracasso, segurança ou duração de uma relação.',
        'Dados da segunda pessoa exigem conhecimento e consentimento apropriados. O aplicativo preserva a origem dos dados e não deve expor informações pessoais desnecessárias no relatório.',
      ],
    },
    {
      title: 'Como priorizar a leitura',
      items: [
        'Comece pelos contatos mais próximos da exatidão e pelos que envolvem Sol, Lua, Mercúrio, Vênus e Marte. Eles costumam tornar mais visíveis identidade, necessidades emocionais, comunicação, afeto e desejo.',
        'Depois observe em quais casas esses planetas caem no mapa da outra pessoa. A direção importa: A pode ativar uma área de B de maneira diferente daquela com que B ativa a área correspondente de A.',
        'Tensões não significam incompatibilidade, assim como harmonias não garantem uma relação saudável. O sentido nasce da combinação entre recursos, desafios, escolhas, comunicação e contexto real.',
      ],
    },
  ],
  closing:
    'Leia o resultado como um vocabulário simbólico de afinidades, contrastes e experiências possíveis, não como sentença sobre duas pessoas.',
  sources: [
    { label: 'Astrodienst — Interaspectos e sinastria', url: 'https://www.astro.com/astrowiki/en/Interaspect' },
    { label: 'Astro.com — tipos de mapas relacionais', url: 'https://www.astro.com/faq/fq_fh_owtype_r.htm' },
  ],
};

const localityMapContent: InfoContent = {
  title: 'Como ler o Mapa Planetário de Localidade',
  introduction:
    'O mapa de localidade projeta sobre a Terra onde cada corpo estava angular no instante natal: nascendo, se pondo, culminando ou no ponto oposto da culminação.',
  sections: [
    {
      title: 'Quatro famílias de linhas',
      items: [
        'Cada corpo pode gerar linhas de Ascendente, Descendente, Meio do Céu e Fundo do Céu. Elas derivam do mesmo instante natal; mudar o local de exibição não recalcula outra data de nascimento.',
        'As linhas são geometrias globais. Segmentos podem ser interrompidos no antimeridiano para que a passagem entre 180° leste e 180° oeste não desenhe um risco falso atravessando todo o mapa.',
        'A legenda identifica corpo, ângulo e eventuais regiões onde uma linha não aparece. Aproximar o mapa melhora a visualização, mas não muda o significado original do traçado.',
      ],
    },
    {
      title: 'Como usar com cautela',
      items: [
        'A proximidade de uma linha é apresentada como referência interpretativa, não como fronteira física nem campo mensurável.',
        'O mapa não recomenda mudança, viagem, investimento ou escolha de moradia. Decisões reais também dependem de segurança, saúde, vínculos, legislação, custo e condições locais.',
      ],
    },
  ],
  closing:
    'Use a cartografia como uma lente simbólica adicional e confira sempre a escala, o ângulo e a origem da linha selecionada.',
  sources: [
    {
      label: 'Astrodienst — Introdução à astrocartografia',
      url: 'https://www.astro.com/astrowiki/en/Astrocartography',
    },
    { label: 'Astro.com — mapa de localidade interativo', url: 'https://www.astro.com/cgi/aclch.cgi?btyp=acm' },
  ],
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
    case 'natalWheel':
      return natalWheelContent;
    case 'natalAspects':
      return natalAspectsContent;
    case 'houseInfluences':
      return houseInfluencesContent;
    case 'currentSky':
      return currentSkyContent;
    case 'synastry':
      return synastryContent;
    case 'localityMap':
      return localityMapContent;
  }
};
