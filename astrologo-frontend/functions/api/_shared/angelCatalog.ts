export const ANGEL_CHOIRS = [
  'Serafins',
  'Querubins',
  'Tronos',
  'Dominações',
  'Potências',
  'Virtudes',
  'Principados',
  'Arcanjos',
  'Anjos',
] as const;

export const ANGEL_PRINCES = [
  'Metatron',
  'Ratziel',
  'Tzafquiel',
  'Tzadquiel',
  'Kamael',
  'Rafael',
  'Haniel',
  'Michael',
  'Gabriel',
] as const;

export type AngelChoir = (typeof ANGEL_CHOIRS)[number];
export type AngelPrince = (typeof ANGEL_PRINCES)[number];

const PRINCE_POSTER_NAME_BY_SOURCE_CODE = {
  METATRON: 'Metatron',
  RAZIEL: 'Ratziel',
  TZAPHQUIEL: 'Tzafquiel',
  TZADQUIEL: 'Tzadquiel',
  KAMAEL: 'Kamael',
  RAPHAEL: 'Rafael',
  HANIEL: 'Haniel',
  MICHAEL: 'Michael',
  GABRIEL: 'Gabriel',
} as const satisfies Record<string, AngelPrince>;

type AngelPrinceSourceCode = keyof typeof PRINCE_POSTER_NAME_BY_SOURCE_CODE;

export interface AngelCatalogProvenance {
  readonly identitySourceKind: 'project-primary';
  readonly identitySourceUrl: string;
  readonly summarySourceKind: 'editorial-paraphrase';
  readonly summarySourceRevisionId: number;
  readonly sourcePermalink: string;
  readonly tripletSourceKind: 'official-project-poster-literal';
  readonly tripletSourceUrl: string;
  readonly intervalSourceKind: 'mathematical-derivation-72x5';
}

export interface AngelCatalogEntry {
  readonly id: number;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly tripletHebrewPoster: string;
  readonly choir: AngelChoir;
  readonly prince: AngelPrince;
  readonly startLongitudeDeg: number;
  readonly endLongitudeDegExclusive: number;
  readonly qualitySummaryPtBr: string;
  readonly provenance: AngelCatalogProvenance;
}

interface AngelCatalogRawEntry {
  readonly id: number;
  readonly name: string;
  readonly wikiTitle?: string;
  readonly aliases: readonly string[];
  readonly tripletHebrewPoster: string;
  readonly choir: AngelChoir;
  readonly prince: AngelPrinceSourceCode;
  readonly qualitySummaryPt: string;
  readonly summarySourceRevisionId: number;
}

export const ANGEL_CATALOG_METADATA = Object.freeze({
  version: 'mayhem-72-v1',
  identityIndexUrl: 'https://wiki.deldebbio.com.br/index.php/Anjos_Cabal%C3%ADsticos',
  posterSourceUrl: 'https://www.behance.net/gallery/15162493/Ilustracoes-TdCProjectMayhem',
  intervalNotation: '[startLongitudeDeg, endLongitudeDegExclusive)',
  coordinateSystem: 'tropical-ecliptic-longitude',
  summaryLanguage: 'pt-BR',
  summaryPolicy: 'Paráfrase editorial curta; não é transcrição nem atributo canônico da fonte.',
} as const);

// biome-ignore format: one record per line keeps the 72-entry fixture auditable against the source wheel
const RAW_ANGEL_CATALOG = [
  { id: 1, name: 'Vehuiah', aliases: [], tripletHebrewPoster: 'והו', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Empreendimento e execução de tarefas difíceis', summarySourceRevisionId: 5786 },
  { id: 2, name: 'Jeliel', aliases: ['Jéliel'], tripletHebrewPoster: 'ילי', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Paz e harmonia conjugal', summarySourceRevisionId: 10450 },
  { id: 3, name: 'Sitael', aliases: [], tripletHebrewPoster: 'סיט', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Esperança e proteção nas adversidades', summarySourceRevisionId: 10451 },
  { id: 4, name: 'Elemiah', aliases: [], tripletHebrewPoster: 'עלם', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Reconsideração e descobertas úteis', summarySourceRevisionId: 10452 },
  { id: 5, name: 'Mahasiah', aliases: [], tripletHebrewPoster: 'מהש', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Paz e cultivo das altas ciências', summarySourceRevisionId: 10453 },
  { id: 6, name: 'Lelahel', aliases: [], tripletHebrewPoster: 'ללה', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Iluminação, cura, artes e amor', summarySourceRevisionId: 10454 },
  { id: 7, name: 'Achaiah', aliases: [], tripletHebrewPoster: 'אכא', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Paciência e descoberta da natureza', summarySourceRevisionId: 11981 },
  { id: 8, name: 'Cahethel', aliases: [], tripletHebrewPoster: 'כהת', choir: 'Serafins', prince: 'METATRON', qualitySummaryPt: 'Proteção e produção agrícola', summarySourceRevisionId: 11982 },
  { id: 9, name: 'Haziel', aliases: [], tripletHebrewPoster: 'הזי', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Misericórdia, bondade e reconciliação', summarySourceRevisionId: 11983 },
  { id: 10, name: 'Aladiah', aliases: [], tripletHebrewPoster: 'אלד', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Proteção contra doenças e maldade', summarySourceRevisionId: 10459 },
  { id: 11, name: 'Laoviah', aliases: [], tripletHebrewPoster: 'לאו', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Vitória e valorização do talento', summarySourceRevisionId: 10460 },
  { id: 12, name: 'Hahahiah', aliases: [], tripletHebrewPoster: 'ההע', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Refúgio e revelações em sonhos', summarySourceRevisionId: 10461 },
  { id: 13, name: 'Yesalel', aliases: [], tripletHebrewPoster: 'יזל', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Amizade e felicidade conjugal', summarySourceRevisionId: 10462 },
  { id: 14, name: 'Mebahel', aliases: [], tripletHebrewPoster: 'מבה', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Justiça, verdade e liberdade', summarySourceRevisionId: 10463 },
  { id: 15, name: 'Hariel', aliases: [], tripletHebrewPoster: 'הרי', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Pureza religiosa e descobertas úteis', summarySourceRevisionId: 10464 },
  { id: 16, name: 'Hekamiah', aliases: [], tripletHebrewPoster: 'הקם', choir: 'Querubins', prince: 'RAZIEL', qualitySummaryPt: 'Coragem, fidelidade e libertação dos oprimidos', summarySourceRevisionId: 11980 },
  { id: 17, name: 'Lauviah', aliases: [], tripletHebrewPoster: 'לאו', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Alívio da tristeza e revelações oníricas', summarySourceRevisionId: 10467 },
  { id: 18, name: 'Caliel', aliases: [], tripletHebrewPoster: 'כלי', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Justiça e triunfo dos inocentes', summarySourceRevisionId: 10468 },
  { id: 19, name: 'Leuviah', aliases: [], tripletHebrewPoster: 'לוו', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Memória e inteligência', summarySourceRevisionId: 10469 },
  { id: 20, name: 'Pahaliah', aliases: [], tripletHebrewPoster: 'פהל', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Descoberta religiosa e vocação', summarySourceRevisionId: 10470 },
  { id: 21, name: 'Nelchael', aliases: [], tripletHebrewPoster: 'נלכ', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Ciências exatas e proteção contra calúnias', summarySourceRevisionId: 10471 },
  { id: 22, name: 'Ieiaiel', aliases: [], tripletHebrewPoster: 'ייי', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Fortuna, diplomacia e novos caminhos', summarySourceRevisionId: 10472 },
  { id: 23, name: 'Melahel', aliases: [], tripletHebrewPoster: 'מלה', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Proteção em viagens e conhecimento herbal', summarySourceRevisionId: 10473 },
  { id: 24, name: 'Haheuiah', aliases: [], tripletHebrewPoster: 'חהו', choir: 'Tronos', prince: 'TZAPHQUIEL', qualitySummaryPt: 'Graça e misericórdia', summarySourceRevisionId: 10474 },
  { id: 25, name: 'Nith-Haiah', aliases: [], tripletHebrewPoster: 'נתה', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Sabedoria e verdade esotérica', summarySourceRevisionId: 10480 },
  { id: 26, name: 'Haaiah', aliases: [], tripletHebrewPoster: 'האא', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Justiça favorável e diplomacia', summarySourceRevisionId: 10481 },
  { id: 27, name: 'Ierathel', aliases: [], tripletHebrewPoster: 'ירת', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Libertação social e propagação das luzes', summarySourceRevisionId: 10482 },
  { id: 28, name: 'Seheiah', aliases: [], tripletHebrewPoster: 'שאה', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Cura, proteção e longevidade', summarySourceRevisionId: 10483 },
  { id: 29, name: 'Reyel', aliases: [], tripletHebrewPoster: 'ריי', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Socorro e meditação religiosa', summarySourceRevisionId: 10484 },
  { id: 30, name: 'Omael', aliases: [], tripletHebrewPoster: 'אום', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Paciência e proteção da vida animal', summarySourceRevisionId: 10485 },
  { id: 31, name: 'Lecabel', aliases: [], tripletHebrewPoster: 'לכב', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Inspiração para resolver problemas difíceis', summarySourceRevisionId: 10486 },
  { id: 32, name: 'Vasahiah', aliases: [], tripletHebrewPoster: 'ושר', choir: 'Dominações', prince: 'TZADQUIEL', qualitySummaryPt: 'Justiça, clemência e proteção judicial', summarySourceRevisionId: 10479 },
  { id: 33, name: 'Iehuiah', aliases: [], tripletHebrewPoster: 'יחו', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Discernimento contra traição e inveja', summarySourceRevisionId: 10488 },
  { id: 34, name: 'Lehaiah', aliases: [], tripletHebrewPoster: 'להח', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Harmonia, paz e inteligência', summarySourceRevisionId: 10489 },
  { id: 35, name: 'Chavakiah', aliases: [], tripletHebrewPoster: 'כוק', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Alegria, reconciliação e harmonia familiar', summarySourceRevisionId: 10490 },
  { id: 36, name: 'Menadel', aliases: [], tripletHebrewPoster: 'מנד', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Preservação do trabalho e dos bens', summarySourceRevisionId: 10491 },
  { id: 37, name: 'Aniel', aliases: [], tripletHebrewPoster: 'אני', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Vitória, dignidade e revelações naturais', summarySourceRevisionId: 10492 },
  { id: 38, name: 'Haamiah', aliases: [], tripletHebrewPoster: 'חעם', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Descoberta de segredos e proteção espiritual', summarySourceRevisionId: 10493 },
  { id: 39, name: 'Rehael', aliases: [], tripletHebrewPoster: 'רהע', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Paz, saúde e longevidade', summarySourceRevisionId: 10494 },
  { id: 40, name: 'Ieiazel', aliases: [], tripletHebrewPoster: 'ייז', choir: 'Potências', prince: 'KAMAEL', qualitySummaryPt: 'Alegria, literatura e libertação do pânico', summarySourceRevisionId: 10255 },
  { id: 41, name: 'Hahahel', aliases: [], tripletHebrewPoster: 'ההה', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Fé, verdade e paz', summarySourceRevisionId: 10496 },
  { id: 42, name: 'Mikael', aliases: [], tripletHebrewPoster: 'מיכ', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Segurança em viagens e discernimento político', summarySourceRevisionId: 10245 },
  { id: 43, name: 'Veuliah', aliases: [], tripletHebrewPoster: 'וול', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Libertação e prosperidade empresarial', summarySourceRevisionId: 10246 },
  { id: 44, name: 'Yelaiah', aliases: [], tripletHebrewPoster: 'ילה', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Justiça favorável e proteção', summarySourceRevisionId: 10247 },
  { id: 45, name: 'Sealiah', aliases: [], tripletHebrewPoster: 'סאל', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Esperança e proteção da natureza', summarySourceRevisionId: 10248 },
  { id: 46, name: 'Ariel', aliases: [], tripletHebrewPoster: 'ערי', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Gratidão e descoberta de segredos naturais', summarySourceRevisionId: 10249 },
  { id: 47, name: 'Asaliah', aliases: [], tripletHebrewPoster: 'עשל', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Consciência, verdade e objetivos construtivos', summarySourceRevisionId: 10250 },
  { id: 48, name: 'Mihael', aliases: [], tripletHebrewPoster: 'מיה', choir: 'Virtudes', prince: 'RAPHAEL', qualitySummaryPt: 'Paz, união e fidelidade conjugal', summarySourceRevisionId: 10251 },
  { id: 49, name: 'Vehuel', aliases: [], tripletHebrewPoster: 'והו', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Elevação espiritual e manifestações benéficas', summarySourceRevisionId: 10258 },
  { id: 50, name: 'Daniel', aliases: [], tripletHebrewPoster: 'דני', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Misericórdia, consolação e justiça', summarySourceRevisionId: 10259 },
  { id: 51, name: 'Hahasiah', aliases: [], tripletHebrewPoster: 'החש', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Contemplação e descoberta dos mistérios', summarySourceRevisionId: 10264 },
  { id: 52, name: 'Imamiah', aliases: [], tripletHebrewPoster: 'עמם', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Liberdade, bondade e trabalho honesto', summarySourceRevisionId: 10265 },
  { id: 53, name: 'Nanael', aliases: [], tripletHebrewPoster: 'ננא', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Proteção das ciências e do ensino', summarySourceRevisionId: 10266 },
  { id: 54, name: 'Nithael', aliases: [], tripletHebrewPoster: 'נית', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Misericórdia, longevidade e estabilidade', summarySourceRevisionId: 10267 },
  { id: 55, name: 'Mebaiah', aliases: [], tripletHebrewPoster: 'מבה', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Consolação, vitória e proteção infantil', summarySourceRevisionId: 10268 },
  { id: 56, name: 'Poiel', aliases: [], tripletHebrewPoster: 'פוי', choir: 'Principados', prince: 'HANIEL', qualitySummaryPt: 'Vitória, prestígio e filosofia', summarySourceRevisionId: 10269 },
  { id: 57, name: 'Nemamiah', aliases: [], tripletHebrewPoster: 'נמם', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Causa justa, prosperidade e libertação de vícios', summarySourceRevisionId: 10280 },
  { id: 58, name: 'Ieialel', aliases: [], tripletHebrewPoster: 'ייל', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Alívio da tristeza e proteção', summarySourceRevisionId: 10281 },
  { id: 59, name: 'Harahel', aliases: [], tripletHebrewPoster: 'הרח', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Saúde reprodutiva e longevidade', summarySourceRevisionId: 10282 },
  { id: 60, name: 'Mitzrael', aliases: [], tripletHebrewPoster: 'מצר', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Cura espiritual e libertação', summarySourceRevisionId: 10283 },
  { id: 61, name: 'Umabel', aliases: [], tripletHebrewPoster: 'ומב', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Amizade e estudos esotéricos', summarySourceRevisionId: 10284 },
  { id: 62, name: 'Iah-Hel', aliases: [], tripletHebrewPoster: 'יהה', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Sabedoria, ideias luminosas e pacificação', summarySourceRevisionId: 10285 },
  { id: 63, name: 'Anauel', aliases: [], tripletHebrewPoster: 'ענו', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Espiritualidade, sabedoria e paz familiar', summarySourceRevisionId: 10286 },
  { id: 64, name: 'Mehiel', aliases: [], tripletHebrewPoster: 'מחי', choir: 'Arcanjos', prince: 'MICHAEL', qualitySummaryPt: 'Sabedoria, ensino e leitura', summarySourceRevisionId: 10287 },
  { id: 65, name: 'Damabiah', aliases: [], tripletHebrewPoster: 'דמב', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Triunfo e resultados úteis', summarySourceRevisionId: 10296 },
  { id: 66, name: 'Manakel', aliases: [], tripletHebrewPoster: 'מנק', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Serenidade, música e poesia', summarySourceRevisionId: 10297 },
  { id: 67, name: 'Ayel', aliases: [], tripletHebrewPoster: 'איע', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Consolação, longevidade e preservação patrimonial', summarySourceRevisionId: 10298 },
  { id: 68, name: 'Habuhiah', aliases: [], tripletHebrewPoster: 'חבו', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Paz, cura e fecundidade', summarySourceRevisionId: 10299 },
  { id: 69, name: 'Rochel', aliases: [], tripletHebrewPoster: 'ראה', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Recuperação de objetos e sucesso', summarySourceRevisionId: 10300 },
  { id: 70, name: 'Iabamiah', wikiTitle: 'Yabamiah', aliases: ['Yabamiah'], tripletHebrewPoster: 'יבם', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Regeneração, harmonia e purificação', summarySourceRevisionId: 10301 },
  { id: 71, name: 'Haiaiel', aliases: [], tripletHebrewPoster: 'היי', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Vitória, paz e segurança', summarySourceRevisionId: 10295 },
  { id: 72, name: 'Mumiah', aliases: [], tripletHebrewPoster: 'מום', choir: 'Anjos', prince: 'GABRIEL', qualitySummaryPt: 'Triunfo, descobertas e longevidade', summarySourceRevisionId: 10294 },
] as const satisfies readonly AngelCatalogRawEntry[];

const createCatalogEntry = (raw: AngelCatalogRawEntry): AngelCatalogEntry => {
  const wikiTitle = raw.wikiTitle ?? raw.name;
  const encodedWikiTitle = encodeURIComponent(wikiTitle);
  const identitySourceUrl = `https://wiki.deldebbio.com.br/index.php/${encodedWikiTitle}`;

  return Object.freeze({
    id: raw.id,
    name: raw.name,
    aliases: Object.freeze([...raw.aliases]),
    tripletHebrewPoster: raw.tripletHebrewPoster,
    choir: raw.choir,
    prince: PRINCE_POSTER_NAME_BY_SOURCE_CODE[raw.prince],
    startLongitudeDeg: (raw.id - 1) * 5,
    endLongitudeDegExclusive: raw.id * 5,
    qualitySummaryPtBr: raw.qualitySummaryPt,
    provenance: Object.freeze({
      identitySourceKind: 'project-primary',
      identitySourceUrl,
      summarySourceKind: 'editorial-paraphrase',
      summarySourceRevisionId: raw.summarySourceRevisionId,
      sourcePermalink: `https://wiki.deldebbio.com.br/index.php?title=${encodedWikiTitle}&oldid=${raw.summarySourceRevisionId}`,
      tripletSourceKind: 'official-project-poster-literal',
      tripletSourceUrl: ANGEL_CATALOG_METADATA.posterSourceUrl,
      intervalSourceKind: 'mathematical-derivation-72x5',
    }),
  });
};

export const ANGEL_CATALOG: readonly AngelCatalogEntry[] = Object.freeze(RAW_ANGEL_CATALOG.map(createCatalogEntry));
