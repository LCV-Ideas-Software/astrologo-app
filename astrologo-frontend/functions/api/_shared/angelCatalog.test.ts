import { describe, expect, it } from 'vitest';
import { ANGEL_CATALOG, ANGEL_CHOIRS, ANGEL_PRINCES } from './angelCatalog';

const EXPECTED_NAMES =
  'Vehuiah|Jeliel|Sitael|Elemiah|Mahasiah|Lelahel|Achaiah|Cahethel|Haziel|Aladiah|Laoviah|Hahahiah|Yesalel|Mebahel|Hariel|Hekamiah|Lauviah|Caliel|Leuviah|Pahaliah|Nelchael|Ieiaiel|Melahel|Haheuiah|Nith-Haiah|Haaiah|Ierathel|Seheiah|Reyel|Omael|Lecabel|Vasahiah|Iehuiah|Lehaiah|Chavakiah|Menadel|Aniel|Haamiah|Rehael|Ieiazel|Hahahel|Mikael|Veuliah|Yelaiah|Sealiah|Ariel|Asaliah|Mihael|Vehuel|Daniel|Hahasiah|Imamiah|Nanael|Nithael|Mebaiah|Poiel|Nemamiah|Ieialel|Harahel|Mitzrael|Umabel|Iah-Hel|Anauel|Mehiel|Damabiah|Manakel|Ayel|Habuhiah|Rochel|Iabamiah|Haiaiel|Mumiah';

const EXPECTED_POSTER_TRIPLETS =
  'והו|ילי|סיט|עלם|מהש|ללה|אכא|כהת|הזי|אלד|לאו|ההע|יזל|מבה|הרי|הקם|לאו|כלי|לוו|פהל|נלכ|ייי|מלה|חהו|נתה|האא|ירת|שאה|ריי|אום|לכב|ושר|יחו|להח|כוק|מנד|אני|חעם|רהע|ייז|ההה|מיכ|וול|ילה|סאל|ערי|עשל|מיה|והו|דני|החש|עמם|ננא|נית|מבה|פוי|נמם|ייל|הרח|מצר|ומב|יהה|ענו|מחי|דמב|מנק|איע|חבו|ראה|יבם|היי|מום';

const EXPECTED_SOURCE_REVISIONS = [
  5786, 10450, 10451, 10452, 10453, 10454, 11981, 11982, 11983, 10459, 10460, 10461, 10462, 10463, 10464, 11980, 10467,
  10468, 10469, 10470, 10471, 10472, 10473, 10474, 10480, 10481, 10482, 10483, 10484, 10485, 10486, 10479, 10488, 10489,
  10490, 10491, 10492, 10493, 10494, 10255, 10496, 10245, 10246, 10247, 10248, 10249, 10250, 10251, 10258, 10259, 10264,
  10265, 10266, 10267, 10268, 10269, 10280, 10281, 10282, 10283, 10284, 10285, 10286, 10287, 10296, 10297, 10298, 10299,
  10300, 10301, 10295, 10294,
] as const;

const ALLOWED_ENTRY_KEYS = [
  'aliases',
  'choir',
  'endLongitudeDegExclusive',
  'id',
  'name',
  'prince',
  'provenance',
  'qualitySummaryPtBr',
  'startLongitudeDeg',
  'tripletHebrewPoster',
];

const ALLOWED_PROVENANCE_KEYS = [
  'identitySourceKind',
  'identitySourceUrl',
  'intervalSourceKind',
  'sourcePermalink',
  'summarySourceKind',
  'summarySourceRevisionId',
  'tripletSourceKind',
  'tripletSourceUrl',
];

describe('catálogo angelical Mayhem 72', () => {
  it('mantém exatamente os IDs 1..72 e os nomes na ordem documentada', () => {
    expect(ANGEL_CATALOG).toHaveLength(72);
    expect(ANGEL_CATALOG.map(({ id }) => id)).toEqual(Array.from({ length: 72 }, (_, index) => index + 1));
    expect(ANGEL_CATALOG.map(({ name }) => name).join('|')).toBe(EXPECTED_NAMES);
    expect(new Set(ANGEL_CATALOG.map(({ name }) => name)).size).toBe(72);
  });

  it('cobre [0, 360) sem lacunas nem sobreposições em quinários de 5 graus', () => {
    expect(ANGEL_CATALOG[0]?.startLongitudeDeg).toBe(0);
    expect(ANGEL_CATALOG.at(-1)?.endLongitudeDegExclusive).toBe(360);

    ANGEL_CATALOG.forEach((angel, index) => {
      expect(angel.startLongitudeDeg).toBe(index * 5);
      expect(angel.endLongitudeDegExclusive).toBe((index + 1) * 5);
      expect(angel.endLongitudeDegExclusive - angel.startLongitudeDeg).toBe(5);

      const next = ANGEL_CATALOG[index + 1];
      if (next) expect(angel.endLongitudeDegExclusive).toBe(next.startLongitudeDeg);
    });
  });

  it('preserva literalmente os 72 tripletes hebraicos do pôster', () => {
    expect(ANGEL_CATALOG.map(({ tripletHebrewPoster }) => tripletHebrewPoster).join('|')).toBe(
      EXPECTED_POSTER_TRIPLETS,
    );

    ANGEL_CATALOG.forEach(({ tripletHebrewPoster }) => {
      expect(Array.from(tripletHebrewPoster)).toHaveLength(3);
      expect(tripletHebrewPoster).toMatch(/^[א-ת]{3}$/u);
    });
  });

  it('atribui oito anjos a cada par coro/príncipe', () => {
    expect(ANGEL_CHOIRS).toHaveLength(9);
    expect(ANGEL_PRINCES).toHaveLength(9);
    expect(ANGEL_PRINCES).toEqual([
      'Metatron',
      'Ratziel',
      'Tzafquiel',
      'Tzadquiel',
      'Kamael',
      'Rafael',
      'Haniel',
      'Michael',
      'Gabriel',
    ]);

    ANGEL_CHOIRS.forEach((choir, index) => {
      const entries = ANGEL_CATALOG.slice(index * 8, index * 8 + 8);
      expect(entries).toHaveLength(8);
      expect(new Set(entries.map((entry) => entry.choir))).toEqual(new Set([choir]));
      expect(new Set(entries.map((entry) => entry.prince))).toEqual(new Set([ANGEL_PRINCES[index]]));
    });
  });

  it('documenta aliases sem criar identidades duplicadas', () => {
    expect(
      ANGEL_CATALOG.filter(({ aliases }) => aliases.length > 0).map(({ id, name, aliases }) => ({
        id,
        name,
        aliases,
      })),
    ).toEqual([
      { id: 2, name: 'Jeliel', aliases: ['Jéliel'] },
      { id: 70, name: 'Iabamiah', aliases: ['Yabamiah'] },
    ]);

    ANGEL_CATALOG.forEach(({ name, aliases }) => {
      expect(new Set(aliases).size).toBe(aliases.length);
      expect(aliases).not.toContain(name);
    });

    expect(ANGEL_CATALOG[31]?.provenance.identitySourceUrl).toBe('https://wiki.deldebbio.com.br/index.php/Vasahiah');
    expect(ANGEL_CATALOG[69]?.provenance.identitySourceUrl).toBe('https://wiki.deldebbio.com.br/index.php/Yabamiah');
  });

  it('mantém sínteses curtas e rastreáveis, sem campos incompletos', () => {
    expect(ANGEL_CATALOG.map(({ provenance }) => provenance.summarySourceRevisionId)).toEqual(
      EXPECTED_SOURCE_REVISIONS,
    );

    ANGEL_CATALOG.forEach((angel) => {
      const wordCount = angel.qualitySummaryPtBr.split(/[\s,]+/u).filter(Boolean).length;
      expect(wordCount).toBeGreaterThanOrEqual(3);
      expect(wordCount).toBeLessThanOrEqual(8);
      expect(angel.qualitySummaryPtBr).not.toMatch(/[\r\n]/u);

      expect(Object.keys(angel).sort()).toEqual(ALLOWED_ENTRY_KEYS);
      expect(Object.keys(angel.provenance).sort()).toEqual(ALLOWED_PROVENANCE_KEYS);
      expect(angel.provenance.identitySourceKind).toBe('project-primary');
      expect(angel.provenance.summarySourceKind).toBe('editorial-paraphrase');
      expect(angel.provenance.summarySourceRevisionId).toBeGreaterThan(0);
      expect(angel.provenance.sourcePermalink).toContain(`oldid=${angel.provenance.summarySourceRevisionId}`);
      expect(angel.provenance.tripletSourceKind).toBe('official-project-poster-literal');
      expect(angel.provenance.intervalSourceKind).toBe('mathematical-derivation-72x5');
    });
  });
});
