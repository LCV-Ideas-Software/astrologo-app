export const USER_ANALYSIS_FUNDAMENTAL_NOTICE =
  'A Coroa calculada pela data de nascimento revela somente a Vibração Original Teórica/Magnética. Por necessidades e cobranças cármicas da encarnação, a entidade que atua de frente pode pertencer a outra Linha. A verdadeira coroa e os guias de frente só podem ser atestados de forma inequívoca e prática no terreiro, por meio da Lei de Pemba e pelo Mestre de Iniciação.';

export const USER_ANALYSIS_CONCEPT_GUIDANCE =
  'Para compreender conceitos, definições, sistemas e métodos citados, consulte os botões “Saiba Mais” dos respectivos quadros. O texto a seguir dedica-se exclusivamente à interpretação dos dados calculados.';

const FUNDAMENTAL_NOTICE_PARAGRAPH = `<p style="text-align:justify;text-indent:2em"><strong>⚠️ Aviso Fundamental:</strong> ${USER_ANALYSIS_FUNDAMENTAL_NOTICE}</p>`;
const CONCEPT_GUIDANCE_PARAGRAPH = `<p style="text-align:justify;text-indent:2em">ℹ️ ${USER_ANALYSIS_CONCEPT_GUIDANCE}</p>`;

const OBSOLETE_POSITIONAL_FALLBACK = /Dados posicionais v2 indisponíveis para este mapa legado\.?/giu;
const GENERATED_FUNDAMENTAL_NOTICE = /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?Aviso Fundamental:(?:(?!<\/p>)[\s\S])*?<\/p>/giu;
const GENERATED_CONCEPT_GUIDANCE =
  /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?consulte os botões [“\"]Saiba Mais[”\"](?:(?!<\/p>)[\s\S])*?<\/p>/giu;
const EMPTY_PARAGRAPH = /<p\b[^>]*>\s*<\/p>/giu;

const INTERNAL_IMPLEMENTATION_PATTERNS: readonly RegExp[] = [
  /ASTROLOGO_PAYLOAD/iu,
  /\bDADOS_(?:ASTROLOGICOS|TATWA|NATAIS|TRANSITOS|SINASTRIA|LOCALIDADE|DA_ETAPA|DA_SINTESE|DA_REDUCAO)[A-Z0-9_]*\b/iu,
  /\b(?:schemaId|schemaVersion|rootInputHash|inputHash|sourceEvidenceIds?|coveredEvidenceIds?|fragmentIds?|promptVersion|payloadId)\b/iu,
  /\b(?:profileId|recordId|bodyId|calculationId|sourceFrame|methodId|reasonCode)\b/iu,
  /\b(?:canonical\.(?:tatwa|v2)|advanced\.(?:natal|transit|synastry|locality)|legacy\.(?:analysis-data|query))\b/iu,
  /\b(?:payload|endpoint|worker|JSON|API|D1)\b/iu,
  /\b(?:prompt|tokens?|SQL|BigData(?:_DB)?|modelo (?:de )?(?:IA|configurado))\b/iu,
  /\b(?:modelo|provedor|SDK) (?:Gemini|Claude)\b/iu,
  /\b(?:Gemini|Claude) (?:API|SDK|modelo)\b/iu,
  /\b(?:Resend|Cloudflare|Wrangler|Swiss Ephemeris|swe_house_pos)\b/iu,
  /\b(?:EQJ|EQD|GAST|J2000|UTC)\b/iu,
  /\bv\d+(?:\.\d+){0,3}\b/iu,
  /\bversão\s+\d+(?:\.\d+)*/iu,
  /\b(?:job|trabalho) de análise\b/iu,
  /\b(?:mapa|registro) legado\b/iu,
  /\bdados posicionais v2\b/iu,
  /\bperfil metodológico(?: versionado)?\b/iu,
  /\bdados (?:avançados )?canônicos\b/iu,
  /\b(?:hash|fragmento) (?:interno|técnico|\d+\s*\/\s*\d+)/iu,
];

export const hasInternalImplementationLeakage = (input: string): boolean =>
  INTERNAL_IMPLEMENTATION_PATTERNS.some((pattern) => pattern.test(input));

export const finalizeUserAnalysisHtml = (input: string): string => {
  const body = input
    .replace(OBSOLETE_POSITIONAL_FALLBACK, '')
    .replace(GENERATED_FUNDAMENTAL_NOTICE, '')
    .replace(GENERATED_CONCEPT_GUIDANCE, '')
    .replace(EMPTY_PARAGRAPH, '')
    .trim();
  return `${FUNDAMENTAL_NOTICE_PARAGRAPH}${CONCEPT_GUIDANCE_PARAGRAPH}${body}`;
};
