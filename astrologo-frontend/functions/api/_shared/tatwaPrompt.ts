import type { D1DatabaseLike } from './requestSecurity';
import { validateWesternTatwaBirthResult } from './tatwaSchema';

const TATWA_NAMES = new Set(['Akasha (Éter)', 'Vayu (Ar)', 'Tejas (Fogo)', 'Apas (Água)', 'Prithvi (Terra)']);

interface PromptTatwaPair {
  readonly principal: string;
  readonly sub: string;
}

export type TatwaPromptDto =
  | {
      readonly schemaVersion: 'legacy';
      readonly calculationMode: 'legacy-rulingFirst';
      readonly selected: PromptTatwaPair;
      readonly provenanceAvailable: false;
    }
  | {
      readonly schemaVersion: '2.0.0';
      readonly system: 'westernGoldenDawn120';
      readonly calculationMode: 'fixed';
      readonly selected: PromptTatwaPair;
      readonly perspectives: {
        readonly fixed: PromptTatwaPair;
        readonly legacyRulingFirst: PromptTatwaPair;
      };
      readonly timing: {
        readonly elapsedSec: number;
        readonly cyclePositionSec: number;
        readonly mainPositionSec: number;
        readonly subPositionSec: number;
      };
      readonly uncertainty: {
        readonly nearMainBoundary: boolean;
        readonly mainBoundaryMarginSec: number;
        readonly subBoundaryMarginSec: number;
        readonly subIsIndicative: true;
        readonly adjacentMain: PromptTatwaPair | null;
      };
      readonly provenance: {
        readonly birthInstantUtc: string;
        readonly birthCivilLocal: string;
        readonly birthOffset: string;
        readonly birthTimeDisambiguation: 'exact' | 'earlier' | 'later';
        readonly inputTimePrecision: 'minute';
        readonly sunriseInstantUtc: string;
        readonly sunriseLocalDate: string;
        readonly sunriseRelation: 'same-civil-date' | 'previous-civil-date';
        readonly timeZoneIana: string;
        readonly latitudeDeg: number;
        readonly longitudeDeg: number;
        readonly elevationMeters: number;
        readonly solarEngine: 'astronomy-engine';
        readonly solarEngineVersion: '2.1.19';
      };
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonNegativeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

const projectPair = (value: unknown): PromptTatwaPair | null => {
  if (!isRecord(value) || !TATWA_NAMES.has(String(value.principal)) || !TATWA_NAMES.has(String(value.sub))) {
    return null;
  }
  return { principal: String(value.principal), sub: String(value.sub) };
};

const isBoundedString = (value: unknown, maxLength = 128): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLength;

export const projectCanonicalTatwa = (value: unknown): TatwaPromptDto | null => {
  if (!isRecord(value)) return null;
  const selected = projectPair(value);
  if (!selected) return null;

  if (!Object.hasOwn(value, 'schemaVersion') && !Object.hasOwn(value, 'calculationMode')) {
    return {
      schemaVersion: 'legacy',
      calculationMode: 'legacy-rulingFirst',
      selected,
      provenanceAvailable: false,
    };
  }

  if (
    value.schemaVersion !== '2.0.0' ||
    value.system !== 'westernGoldenDawn120' ||
    value.algorithmVersion !== '2.0.0' ||
    value.calculationMode !== 'fixed' ||
    !isRecord(value.variants) ||
    !isRecord(value.anchor) ||
    !validateWesternTatwaBirthResult(value).valid
  ) {
    return null;
  }

  const fixed = projectPair(value.variants.fixed);
  const legacyRulingFirst = projectPair(value.variants['legacy-rulingFirst']);
  const adjacentMain = projectPair(value.adjacentMain);
  const solarModel = isRecord(value.anchor.solarModel) ? value.anchor.solarModel : null;
  if (
    !fixed ||
    !legacyRulingFirst ||
    fixed.principal !== selected.principal ||
    fixed.sub !== selected.sub ||
    !nonNegativeInteger(value.elapsedSec) ||
    !nonNegativeInteger(value.cyclePositionSec) ||
    !nonNegativeInteger(value.mainPositionSec) ||
    !nonNegativeInteger(value.subPositionSec) ||
    !nonNegativeInteger(value.mainBoundaryMarginSec) ||
    !nonNegativeInteger(value.subBoundaryMarginSec) ||
    !isBoundedString(value.anchor.birthInstantUtc) ||
    !isBoundedString(value.anchor.sunriseInstantUtc) ||
    !isBoundedString(value.anchor.sunriseLocalDate, 10) ||
    !isBoundedString(value.anchor.timeZoneIana) ||
    solarModel?.engineId !== 'astronomy-engine' ||
    solarModel.engineVersion !== '2.1.19'
  ) {
    return null;
  }

  return {
    schemaVersion: '2.0.0',
    system: 'westernGoldenDawn120',
    calculationMode: 'fixed',
    selected,
    perspectives: { fixed, legacyRulingFirst },
    timing: {
      elapsedSec: value.elapsedSec,
      cyclePositionSec: value.cyclePositionSec,
      mainPositionSec: value.mainPositionSec,
      subPositionSec: value.subPositionSec,
    },
    uncertainty: {
      nearMainBoundary: value.nearMainBoundary === true,
      mainBoundaryMarginSec: value.mainBoundaryMarginSec,
      subBoundaryMarginSec: value.subBoundaryMarginSec,
      subIsIndicative: true,
      adjacentMain,
    },
    provenance: {
      birthInstantUtc: value.anchor.birthInstantUtc,
      birthCivilLocal: String(value.anchor.birthCivilLocal),
      birthOffset: String(value.anchor.birthOffset),
      birthTimeDisambiguation: value.anchor.birthTimeDisambiguation as 'exact' | 'earlier' | 'later',
      inputTimePrecision: 'minute',
      sunriseInstantUtc: value.anchor.sunriseInstantUtc,
      sunriseLocalDate: value.anchor.sunriseLocalDate,
      sunriseRelation: value.anchor.sunriseRelation as 'same-civil-date' | 'previous-civil-date',
      timeZoneIana: value.anchor.timeZoneIana,
      latitudeDeg: Number(value.anchor.latitudeDeg),
      longitudeDeg: Number(value.anchor.longitudeDeg),
      elevationMeters: Number(value.anchor.elevationMeters),
      solarEngine: 'astronomy-engine',
      solarEngineVersion: '2.1.19',
    },
  };
};

export const buildAnalysisGlobalsWithCanonicalTatwa = (
  submittedGlobals: Record<string, unknown>,
  canonicalTatwa: TatwaPromptDto | null,
): Record<string, unknown> => {
  const globalsWithoutTatwa = Object.fromEntries(Object.entries(submittedGlobals).filter(([key]) => key !== 'tatwa'));
  if (!canonicalTatwa) return globalsWithoutTatwa;
  return {
    ...globalsWithoutTatwa,
    tatwa: {
      principal: canonicalTatwa.selected.principal,
      sub: canonicalTatwa.selected.sub,
    },
  };
};

export const buildTatwaPromptAddendum = (dto: TatwaPromptDto | null): string => {
  if (!dto) return '';
  return `

ADENDO — TATWAS E PERSPECTIVAS DE CÁLCULO

Este adendo é exclusivamente acumulativo. Preserve integralmente todas as instruções anteriores, sem resumir, substituir, omitir ou reordenar as análises exigidas.

Trate os Tatwas como um sistema simbólico tradicional, não como fato físico, diagnóstico ou verdade universal. A recepção ocidental documenta mais de uma forma de ordenar os subtatwas; apresente a perspectiva informada nos dados e não declare uma delas superior, definitiva ou universalmente correta.

Mantenha a mesma postura ao comparar os sistemas astrológicos: Tropical e Astronômico Constelacional são perspectivas construídas por referências diferentes. Não chame o Tropical de máscara, ilusão ou falsidade, nem o Constelacional de verdade absoluta ou assinatura verdadeira. Explique com precisão o que cada método mede e interprete-o dentro das regras declaradas, sem apagar as demais instruções analíticas.

Explique em linguagem simples, sempre em português do Brasil:
- Tatwa principal: corrente simbólica de 24 minutos dentro de um ciclo de 120 minutos alinhado ao nascer do Sol local.
- Subtatwa: subdivisão de 4 minutos e 48 segundos que acrescenta uma nuance ao Tatwa principal e é especialmente sensível à precisão do horário natal.
- Ordem fixa — Akasha primeiro: cada Tatwa principal subdivide-se sempre em Akasha, Vayu, Tejas, Apas e Prithvi.
- Ordem pelo principal — Tatwa principal primeiro: cada bloco começa pelo próprio Tatwa principal e prossegue circularmente.

Use somente o resultado selecionado em selected. Não recalcule, não troque o método e não misture as duas perspectivas. Se uncertainty.nearMainBoundary for verdadeiro, diga com clareza que o horário está próximo de uma transição e apresente adjacentMain apenas como possibilidade adjacente, sem substituir o resultado selecionado. Para registros legacy-rulingFirst, informe que se trata de um mapa legado e não invente nascer do Sol, margens ou proveniência ausentes.

Nos mapas v2, diferencie resolução do cálculo de precisão do registro: os eventos solares e intermediários são calculados em segundos, mas o horário natal informado possui precisão de minuto. Não apresente essa resolução matemática como prova de que o nascimento foi registrado no segundo exato.

DADOS_TATWA_CANONICOS — INÍCIO
${JSON.stringify(dto)}
DADOS_TATWA_CANONICOS — FIM`;
};

export const loadCanonicalTatwa = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<TatwaPromptDto | null> => {
  if (!db || typeof calculationId !== 'string' || !/^[A-Za-z0-9-]{1,128}$/.test(calculationId)) return null;
  try {
    const row = await db
      .prepare<{ dados_globais?: string | null }>('SELECT dados_globais FROM astrologo_mapas WHERE id = ? LIMIT 1')
      .bind(calculationId)
      .first();
    const serialized = row?.dados_globais;
    if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > 262_144) return null;
    const parsed = JSON.parse(serialized) as unknown;
    return isRecord(parsed) ? projectCanonicalTatwa(parsed.tatwa) : null;
  } catch {
    return null;
  }
};
