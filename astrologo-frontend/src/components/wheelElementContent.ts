import { HOUSE_THEMES_PT_BR } from '../natalAnalysisV1';

export interface WheelModalContent {
  readonly title: string;
  readonly symbol: string;
  readonly color: string;
  readonly subtitle?: string;
  readonly summary: string;
  readonly facts: readonly string[];
}

const PLANET_MEANINGS_PT_BR: Readonly<Record<string, string>> = Object.freeze({
  sun: 'Representa identidade, vitalidade, propósito e a maneira de irradiar presença.',
  moon: 'Representa emoções, necessidades de acolhimento, memória e respostas instintivas.',
  mercury: 'Representa pensamento, comunicação, aprendizado e circulação de ideias.',
  venus: 'Representa afetos, valores, prazer, vínculos e senso de harmonia.',
  mars: 'Representa iniciativa, desejo, coragem, afirmação e modo de agir.',
  jupiter: 'Representa expansão, confiança, busca de sentido e desenvolvimento.',
  saturn: 'Representa limites, responsabilidade, maturação e construção duradoura.',
  uranus: 'Representa liberdade, inovação, mudanças e ruptura de padrões.',
  neptune: 'Representa imaginação, sensibilidade, inspiração e dissolução de fronteiras.',
  pluto: 'Representa intensidade, transformação, poder de regeneração e profundidade.',
});

const SIGN_MEANINGS_PT_BR = [
  'Impulso, iniciativa, coragem e abertura de caminhos.',
  'Estabilidade, constância, valores e experiência sensorial.',
  'Curiosidade, comunicação, mobilidade e multiplicidade de ideias.',
  'Acolhimento, memória, sensibilidade e proteção emocional.',
  'Expressão, criatividade, generosidade e afirmação da identidade.',
  'Discernimento, cuidado, organização e aperfeiçoamento.',
  'Equilíbrio, reciprocidade, diplomacia e construção de acordos.',
  'Intensidade, investigação, transformação e profundidade emocional.',
  'Expansão, descoberta, convicções e busca de horizontes.',
  'Responsabilidade, estrutura, perseverança e realização.',
  'Originalidade, visão coletiva, autonomia e renovação.',
  'Imaginação, empatia, integração e percepção do invisível.',
] as const;

const ASPECT_MEANINGS_PT_BR: Readonly<Record<string, string>> = Object.freeze({
  conjunction: 'Concentra as forças dos dois pontos, tornando sua atuação especialmente interligada.',
  opposition: 'Coloca duas forças em polaridade e convida à percepção, ao equilíbrio e à integração.',
  trine: 'Favorece uma circulação fluida entre as forças relacionadas e evidencia recursos naturais.',
  square: 'Cria tensão dinâmica, mobilizando esforço, consciência e desenvolvimento.',
  sextile: 'Indica cooperação e oportunidades que ganham força quando são reconhecidas e cultivadas.',
  quincunx: 'Aponta diferenças de funcionamento que pedem ajustes, adaptação e refinamento.',
});

const ANGLE_MEANINGS_PT_BR: Readonly<Record<string, string>> = Object.freeze({
  asc: 'O Ascendente descreve a maneira de chegar ao mundo, iniciar experiências e ser percebido de imediato.',
  dsc: 'O Descendente ilumina encontros, parcerias e qualidades percebidas por meio do outro.',
  mc: 'O Meio do Céu se relaciona à vocação, direção pública, responsabilidades e contribuição social.',
  fc: 'O Fundo do Céu se relaciona às raízes, à intimidade, ao lar e às bases emocionais.',
});

export const planetMeaningPtBr = (bodyId: string): string =>
  PLANET_MEANINGS_PT_BR[bodyId] ??
  'Representa uma força simbólica cuja expressão depende de sua posição e relações no mapa.';

export const signMeaningPtBr = (index0: number): string =>
  SIGN_MEANINGS_PT_BR[index0] ?? 'Expressa uma qualidade simbólica da experiência zodiacal.';

export const houseMeaningPtBr = (index1: number): string =>
  HOUSE_THEMES_PT_BR[index1 - 1] ?? 'Setor de experiência representado no mapa natal.';

export const aspectMeaningPtBr = (aspectId: string): string =>
  ASPECT_MEANINGS_PT_BR[aspectId] ?? 'Relaciona simbolicamente dois pontos do mapa natal.';

export const angleMeaningPtBr = (angleId: string): string =>
  ANGLE_MEANINGS_PT_BR[angleId] ?? 'Marca um eixo pessoal importante do mapa natal.';
