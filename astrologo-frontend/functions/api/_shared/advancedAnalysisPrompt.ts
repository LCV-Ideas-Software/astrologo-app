import type { LocalityMapV1 } from './localityMapV1';
import { validateLocalityMapV1 } from './localityMapV1Schema';
import type { NatalChartAnalysisV1 } from './natalChartAnalysisV1';
import { validateNatalChartAnalysisV1 } from './natalChartAnalysisV1Schema';
import type { D1DatabaseLike } from './requestSecurity';
import type { SynastryRunV1 } from './synastryRunV1';
import { validateSynastryRunV1 } from './synastryRunV1Schema';
import type { TransitRunV1 } from './transitRunV1';
import { validateTransitRunV1 } from './transitRunV1Schema';

export interface AdvancedAnalysisContracts {
  readonly natal?: NatalChartAnalysisV1 | null;
  readonly transit?: TransitRunV1 | null;
  readonly synastry?: SynastryRunV1 | null;
  readonly locality?: LocalityMapV1 | null;
}

const CALCULATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

export const buildNatalAnalysisPromptAddendum = (natal: NatalChartAnalysisV1 | null | undefined): string => {
  if (!natal) return '';

  return `

ADENDO — MAPA NATAL COMPLETO, ASPECTOS E CASAS

Este adendo fornece fatos natais adicionais. Preserve o contrato editorial e gere interpretação, não explicação metodológica.

Acrescente duas seções <h2> autônomas, “Aspectos Natais” e “Análise das Casas”, aos módulos Tropical, Astronômico Constelacional e à Síntese. Priorize os aspectos de menor orbe e maior intensidade fornecida, os luminares, planetas pessoais, padrões repetidos e relações que estruturam o mapa. Integre planeta, aspecto e casa para revelar como as dinâmicas se apoiam, tensionam ou compensam.

Use exclusivamente os pontos, movimentos, aspectos e ocupações fornecidos. Não recalcule orbes. Não acrescente corpos, ângulos ou aspectos ausentes. Se phase.status for unavailable, não invente fase aplicativa ou separativa. Se mundaneDegreeWithinHouse.status for unavailable, não estime grau mundano.

Não explique ângulo exato, separação, orbe, intensidade, fase, longitude, constelação, casa ou grau mundano. Essas definições pertencem aos botões “Saiba Mais”. Cite números somente quando necessários para justificar a prioridade interpretativa. Ao analisar casas ocupadas, integre os corpos e seus aspectos relevantes. Trate tudo como linguagem simbólica: não faça diagnóstico nem prometa comportamento ou acontecimento.

Toda a resposta visível continua em português do Brasil. Qualquer instante mencionado deve ser apresentado na Hora oficial de Brasília, sem expor o valor técnico de origem.

DADOS_NATAIS_AVANCADOS_V1 — INÍCIO
${JSON.stringify(natal)}
DADOS_NATAIS_AVANCADOS_V1 — FIM`;
};

export const buildTransitAnalysisPromptAddendum = (transit: TransitRunV1 | null | undefined): string => {
  if (!transit) return '';

  return `

ADENDO — CÉU ATUAL, TRÂNSITOS E INFLUÊNCIAS VIGENTES

Este adendo fornece os trânsitos calculados. Preserve o contrato editorial e acrescente somente interpretação personalizada.

Acrescente uma seção <h2> “Céu Atual e Trânsitos” profunda sobre as influências vigentes e os aspectos trânsito–natal fornecidos. Priorize os contatos de menor orbe, os que envolvem luminares, planetas pessoais, ângulos e Casas mais ativadas. Integre facilidades, tensões, temas recorrentes e possibilidades de resposta consciente. Use somente os corpos, alvos, fases e exatidões presentes. Não recalcule posições ou orbes.

Se phase.status for unavailable, não invente fase aplicativa ou separativa. Se exactitude.status for unavailable, não invente data nem afirme que o aspecto ficará exato. Quando exactitude.status for available e a data for relevante à interpretação, apresente-a na Hora oficial de Brasília sem explicar a mecânica do cálculo.

Não explique horizonte, perfil, separação, orbe, fase, coordenadas ou classificação constelacional. Essas definições pertencem aos botões “Saiba Mais”. Descreva tendências, tensões, facilidades, temas de atenção e possibilidades de forma condicional. Não faça profecia determinista, diagnóstico, recomendação médica, jurídica ou financeira, nem prometa fatos externos.

Mantenha internamente separadas as posições tropicais, as constelações fornecidas e as casas natais. Não invente grau constelacional nem correspondência angelical para o trânsito atual. Só mencione uma indisponibilidade quando ela afetar materialmente a interpretação e use linguagem humana, sem códigos.

Toda saída visível permanece em português do Brasil. Converta todos os instantes exibidos para a Hora oficial de Brasília e nunca exponha valores ou identificadores técnicos de origem.

DADOS_TRANSITOS_V1 — INÍCIO
${JSON.stringify(transit)}
DADOS_TRANSITOS_V1 — FIM`;
};

export const buildSynastryAnalysisPromptAddendum = (synastry: SynastryRunV1 | null | undefined): string => {
  if (!synastry) return '';

  return `

ADENDO — SINASTRIA E RECIPROCIDADE ENTRE DOIS MAPAS

Este adendo fornece a sinastria calculada. Preserve o contrato editorial, acrescente uma seção <h2> autônoma “Sinastria” e integre seus eixos centrais à Síntese.

Trate Pessoa A e Pessoa B sem hierarquia. Analise e depois integre:
- aspectos dos corpos de A com os corpos de B;
- corpos de A nas Casas de B;
- corpos de B nas Casas de A.

Não troque as duas direções e não trate as casas como intercambiáveis. Use somente os aspectos e sobreposições fornecidos. Não acrescente aspectos, corpos, casas, fase ou porcentagem ausente. Priorize luminares, planetas pessoais e menores orbes; identifique padrões dominantes de comunicação, afetividade, desejo, apoio, tensão, limites e crescimento. Cruze aspectos com sobreposições nas duas direções e explicite reciprocidades e assimetrias. Não ensine o cálculo de separação, orbe ou casas.

Não atribua porcentagem de compatibilidade, nota, ranking, alma gêmea, vínculo inevitável, diagnóstico relacional ou previsão de duração. Não determine papéis de gênero, poder ou culpa. A leitura não substitui consentimento, comunicação, segurança e contexto real das pessoas.

Não exponha perfil, versão, nomes de campos ou limitações técnicas. Não invente constelações, graus constelacionais ou correspondências angelicais para a relação. Se uma direção das casas estiver ausente, interprete apenas o que existe sem anunciar detalhes internos.

Toda resposta visível continua em português do Brasil. Preserve nomes próprios somente quando fornecidos pelo contexto autorizado; no contrato abaixo, use Pessoa A e Pessoa B.

DADOS_SINASTRIA_V1 — INÍCIO
${JSON.stringify(synastry)}
DADOS_SINASTRIA_V1 — FIM`;
};

export const buildLocalityAnalysisPromptAddendum = (locality: LocalityMapV1 | null | undefined): string => {
  if (!locality) return '';

  return `

ADENDO — MAPA PLANETÁRIO DE LOCALIDADE

Este adendo fornece o mapa planetário de localidade. Preserve o contrato editorial e acrescente uma única seção <h2> consolidada “Mapa Planetário de Localidade”.

Interprete as linhas mais relevantes, agrupando temas convergentes e contrastantes por planeta e ângulo. Não crie uma introdução sobre cartografia, não defina MC, IC, ASC ou DSC e não repita a mesma cautela a cada linha.

Use exclusivamente os corpos, ângulos e linhas fornecidos. Não invente cidades, países, cruzamentos, proximidades, intensidades, coordenadas ou raio de influência. Não descreva disponibilidade de grade, resolução, proveniência ou outras características internas.

Respeite internamente os referenciais e as geometrias fornecidas, sem reexplicar a geometria, os sistemas de coordenadas, transformações, siglas ou funcionamento do motor.

Interprete eventuais temas associados a cada linha somente como possibilidades simbólicas condicionais. Não recomende mudança, viagem, investimento, moradia, tratamento ou decisão profissional. Não declare que um lugar é destinado, seguro, perigoso, próspero, curativo ou inevitável. Uma convergência visual de linhas não autoriza, por si só, afirmar maior força. Contexto biográfico, realidade social, segurança e escolha pessoal permanecem indispensáveis.

Toda resposta visível continua em português do Brasil. Se mencionar um instante, apresente-o na Hora oficial de Brasília sem expor o valor técnico de origem.

DADOS_LOCALIDADE_V1 — INÍCIO
${JSON.stringify(locality)}
DADOS_LOCALIDADE_V1 — FIM`;
};

export const appendAdvancedAnalysisPrompt = (basePrompt: string, contracts: AdvancedAnalysisContracts): string =>
  basePrompt +
  buildNatalAnalysisPromptAddendum(contracts.natal) +
  buildTransitAnalysisPromptAddendum(contracts.transit) +
  buildSynastryAnalysisPromptAddendum(contracts.synastry) +
  buildLocalityAnalysisPromptAddendum(contracts.locality);

export const loadCanonicalNatalAnalysisV1 = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<NatalChartAnalysisV1 | null> => {
  if (!db || typeof calculationId !== 'string' || !CALCULATION_ID_PATTERN.test(calculationId)) return null;
  try {
    const row = await db
      .prepare<{ payload_json?: string | null }>(
        `SELECT payload_json
         FROM astrologo_artifacts
         WHERE mapa_id = ?
           AND artifact_type = 'natal_chart_analysis'
           AND schema_id = 'urn:astrologo:natal-chart-analysis'
           AND schema_version = '1.0.0'
           AND status = 'ready'
         ORDER BY updated_at DESC
         LIMIT 1`,
      )
      .bind(calculationId)
      .first();
    const serialized = row?.payload_json;
    if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > 524_288) return null;
    const parsed: unknown = JSON.parse(serialized);
    const validation = validateNatalChartAnalysisV1(parsed);
    return validation.valid && validation.value.source.calculationId === calculationId ? validation.value : null;
  } catch {
    return null;
  }
};

export const loadCanonicalTransitRunV1 = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<TransitRunV1 | null> => {
  if (!db || typeof calculationId !== 'string' || !CALCULATION_ID_PATTERN.test(calculationId)) return null;
  try {
    const row = await db
      .prepare<{ payload_json?: string | null }>(
        `SELECT artifact.payload_json
         FROM astrologo_transit_runs AS run
         INNER JOIN astrologo_artifacts AS artifact
           ON artifact.id = run.result_artifact_id
          AND artifact.transit_run_id = run.id
         WHERE run.mapa_id = ?
           AND artifact.mapa_id = ?
           AND run.status = 'ready'
           AND artifact.status = 'ready'
           AND artifact.artifact_type = 'transit_result'
           AND artifact.schema_id = 'urn:astrologo:transit-run'
           AND artifact.schema_version = '1.0.0'
         ORDER BY run.reference_instant_utc DESC, run.updated_at DESC, run.id DESC
         LIMIT 1`,
      )
      .bind(calculationId, calculationId)
      .first();
    const serialized = row?.payload_json;
    if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > 1_048_576) return null;
    const parsed: unknown = JSON.parse(serialized);
    const validation = validateTransitRunV1(parsed);
    return validation.valid && validation.value.source.natal.calculationId === calculationId ? validation.value : null;
  } catch {
    return null;
  }
};

export const loadCanonicalSynastryRunV1 = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<SynastryRunV1 | null> => {
  if (!db || typeof calculationId !== 'string' || !CALCULATION_ID_PATTERN.test(calculationId)) return null;
  try {
    const row = await db
      .prepare<{ payload_json?: string | null }>(
        `SELECT artifact.payload_json
         FROM astrologo_synastry_runs AS run
         INNER JOIN astrologo_artifacts AS artifact
           ON artifact.id = run.result_artifact_id
          AND artifact.synastry_run_id = run.id
         WHERE (run.primary_mapa_id = ? OR run.secondary_mapa_id = ?)
           AND artifact.mapa_id = run.primary_mapa_id
           AND run.status = 'ready'
           AND artifact.status = 'ready'
           AND artifact.artifact_type = 'synastry_result'
           AND artifact.schema_id = 'urn:astrologo:synastry-run'
           AND artifact.schema_version = '1.0.0'
         ORDER BY run.created_at DESC, run.updated_at DESC, run.id DESC
         LIMIT 1`,
      )
      .bind(calculationId, calculationId)
      .first();
    const serialized = row?.payload_json;
    if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > 1_048_576) return null;
    const parsed: unknown = JSON.parse(serialized);
    const validation = validateSynastryRunV1(parsed);
    return validation.valid &&
      (validation.value.charts.A.calculationId === calculationId ||
        validation.value.charts.B.calculationId === calculationId)
      ? validation.value
      : null;
  } catch {
    return null;
  }
};

export const loadCanonicalLocalityMapV1 = async (
  db: D1DatabaseLike | undefined,
  calculationId: unknown,
): Promise<LocalityMapV1 | null> => {
  if (!db || typeof calculationId !== 'string' || !CALCULATION_ID_PATTERN.test(calculationId)) return null;
  try {
    const row = await db
      .prepare<{ payload_json?: string | null }>(
        `SELECT artifact.payload_json
         FROM astrologo_locality_runs AS run
         INNER JOIN astrologo_artifacts AS artifact
           ON artifact.id = run.result_artifact_id
          AND artifact.locality_run_id = run.id
         WHERE run.mapa_id = ?
           AND artifact.mapa_id = ?
           AND run.status = 'ready'
           AND artifact.status = 'ready'
           AND artifact.artifact_type = 'locality_map'
           AND artifact.schema_id = 'urn:astrologo:locality-map'
           AND artifact.schema_version = '1.0.0'
         ORDER BY run.created_at DESC, run.updated_at DESC, run.id DESC
         LIMIT 1`,
      )
      .bind(calculationId, calculationId)
      .first();
    const serialized = row?.payload_json;
    if (typeof serialized !== 'string' || serialized.length === 0 || serialized.length > 4_194_304) return null;
    const parsed: unknown = JSON.parse(serialized);
    const validation = validateLocalityMapV1(parsed);
    return validation.valid && validation.value.source.calculationId === calculationId ? validation.value : null;
  } catch {
    return null;
  }
};
