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

Este adendo é exclusivamente acumulativo. Preserve literalmente e cumpra integralmente todas as instruções anteriores: não resuma, substitua, simplifique, reordene nem elimine qualquer análise já exigida.

Acrescente uma leitura profunda dos aspectos natais e das Casas Placidus aos módulos Tropical, Astronômico Constelacional e à Síntese. Não crie uma terceira posição planetária nem duas geometrias de aspectos: a separação angular e o orbe são calculados uma única vez nas longitudes eclípticas; cada sistema pode oferecer somente uma perspectiva interpretativa própria sobre esses mesmos fatos geométricos.

Use exclusivamente o perfil, os pontos, movimentos, aspectos, ocupações e diagnósticos fornecidos. Não recalcule orbes. Não acrescente corpos, ângulos ou aspectos ausentes. Se phase.status for unavailable, não invente fase aplicativa ou separativa. Se mundaneDegreeWithinHouse.status for unavailable, não estime grau mundano pelo arco entre cúspides. Diferencie sempre:
- longitude e grau tropical no signo;
- região astronômica oficial da IAU, que não possui “grau dentro da constelação”;
- Casa Placidus ocupada;
- grau mundano, somente quando derivado do hpos Swiss explícito;
- correspondência angelical, que continua exclusivamente tropical e simbólica.

Explique para uma pessoa leiga o que significam ângulo exato, separação, orbe, intensidade metodológica e fase. Ao analisar cada casa ocupada, identifique os corpos presentes, integre seus aspectos relevantes e declare incertezas. Trate todas as interpretações como linguagem simbólica: não faça diagnóstico, não prometa comportamento ou acontecimento e não apresente uma escola como verdade universal.

Toda a resposta visível continua em português do Brasil. Qualquer instante mencionado deve ser apresentado na Hora oficial de Brasília (America/Sao_Paulo), sem alterar o instante UTC canônico do cálculo.

DADOS_NATAIS_AVANCADOS_V1 — INÍCIO
${JSON.stringify(natal)}
DADOS_NATAIS_AVANCADOS_V1 — FIM`;
};

export const buildTransitAnalysisPromptAddendum = (transit: TransitRunV1 | null | undefined): string => {
  if (!transit) return '';

  return `

ADENDO — CÉU ATUAL, TRÂNSITOS E INFLUÊNCIAS VIGENTES

Este adendo também é exclusivamente acumulativo. Preserve integralmente o prompt vigente e o adendo natal anterior, sem resumir, substituir, simplificar, omitir ou reordenar suas entregas.

Acrescente uma seção profunda sobre o céu do instante de referência e os aspectos trânsito–natal fornecidos. Diferencie de modo explícito posição natal, posição transitante e Casa Placidus natal ocupada pelo trânsito. Use somente os dez corpos, os alvos natais, o perfil de orbe, as fases, as exatidões e os diagnósticos presentes no contrato. Não recalcule posições ou orbes.

Se phase.status for unavailable, não invente fase aplicativa ou separativa. Se exactitude.status for unavailable, não invente data de aperfeiçoamento nem afirme que o aspecto ficará exato. Quando exactitude.status for available, apresente exactAtUtc convertido para a Hora oficial de Brasília e deixe claro que se trata do aperfeiçoamento geométrico calculado, não de garantia de acontecimento.

O horizonte declara apenas o intervalo pesquisado pelo motor. Não o converta em duração de influência sem dado explícito. Descreva tendências, tensões, facilidades, temas de atenção e possibilidades dentro da linguagem astrológica, sempre de forma condicional. Não faça profecia determinista, diagnóstico, recomendação médica, jurídica ou financeira, nem prometa fatos externos.

Cada posição transitante traz a projeção tropical e a classificação da região constelacional oficial da IAU, além da sobreposição nas casas natais. Mantenha essas camadas separadas. Quando astronomicalReal.status for available, use somente a constelação fornecida. Quando for unavailable por proximidade de fronteira, declare a incerteza sem escolher uma região. Constelações IAU são áreas bidimensionais do céu: não invente grau dentro da constelação, faixa zodiacal constelacional ou correspondência angelical para o trânsito atual.

Toda saída visível permanece em português do Brasil. Converta todos os instantes exibidos para America/Sao_Paulo e escreva “Hora oficial de Brasília”, preservando os valores UTC canônicos dentro dos dados.

DADOS_TRANSITOS_V1 — INÍCIO
${JSON.stringify(transit)}
DADOS_TRANSITOS_V1 — FIM`;
};

export const buildSynastryAnalysisPromptAddendum = (synastry: SynastryRunV1 | null | undefined): string => {
  if (!synastry) return '';

  return `

ADENDO — SINASTRIA E RECIPROCIDADE ENTRE DOIS MAPAS

Este adendo é exclusivamente acumulativo. Preserve sem qualquer redução o prompt vigente, a análise natal completa e o bloco de trânsitos. Acrescente a sinastria como uma nova seção autônoma e depois integre seus pontos relevantes à Síntese, sem apagar as entregas anteriores.

Trate A e B como identificadores técnicos sem hierarquia. Analise separadamente:
- aspectos dos corpos de A com os corpos de B;
- corpos de A nas Casas de B;
- corpos de B nas Casas de A.

Não troque as duas direções e não trate as casas como intercambiáveis. Use somente os aspectos e sobreposições fornecidos. Não acrescente aspectos, corpos, casas, fase aplicativa/separativa ou porcentagem ausente. O contrato não contém velocidades intermapa; portanto, não invente fase. Explique em linguagem leiga separação, orbe, reciprocidade, afinidades, contrastes e possibilidades simbólicas.

Não atribua porcentagem de compatibilidade, nota, ranking, alma gêmea, vínculo inevitável, diagnóstico relacional ou previsão de duração. Não determine papéis de gênero, poder ou culpa. A leitura não substitui consentimento, comunicação, segurança e contexto real das pessoas.

Os aspectos intermapa comparam as longitudes conforme o perfil metodológico declarado. Não invente constelações IAU, graus constelacionais ou correspondências angelicais para a relação. Se uma direção das Casas Placidus estiver indisponível, declare a limitação sem substituí-la por outro sistema.

Toda resposta visível continua em português do Brasil. Preserve nomes próprios somente quando fornecidos pelo contexto autorizado; no contrato abaixo, use Pessoa A e Pessoa B.

DADOS_SINASTRIA_V1 — INÍCIO
${JSON.stringify(synastry)}
DADOS_SINASTRIA_V1 — FIM`;
};

export const buildLocalityAnalysisPromptAddendum = (locality: LocalityMapV1 | null | undefined): string => {
  if (!locality) return '';

  return `

ADENDO — MAPA PLANETÁRIO DE LOCALIDADE

Este adendo é exclusivamente acumulativo e vem depois de todos os anteriores. Preserve literalmente o prompt vigente e as entregas natal, de trânsitos e de sinastria: não resuma, substitua, simplifique, omita nem reordene qualquer parte já exigida.

Acrescente uma seção autônoma e leiga sobre a cartografia astrológica fornecida. Explique que as linhas registram onde cada corpo estava relacionado aos quatro ângulos geométricos no instante natal:
- Meio do Céu (MC): culminação superior;
- Fundo do Céu (IC): culminação inferior;
- Ascendente (ASC): cruzamento geométrico do horizonte oriental;
- Descendente (DSC): cruzamento geométrico do horizonte ocidental.

Use exclusivamente os corpos, ângulos, disponibilidades, geometrias, diagnósticos, resolução e proveniência declarados no contrato. Diferencie uma linha disponível, parcial ou indisponível e exponha a limitação da grade quando relevante. Não invente cidades, países, cruzamentos, proximidades, parans, órbitas, direções locais, intensidades ou coordenadas que não estejam nos dados. Não invente raio de influência, faixa quilométrica ou redução contínua de efeito pela distância.

Respeite rigorosamente os referenciais: as coordenadas de origem em EQJ/J2000 foram transformadas com precessão e nutação para o EQD verdadeiro da data antes de serem combinadas ao tempo sideral aparente de Greenwich. Não combine EQJ/J2000 diretamente com GAST. Não apresente esta geometria como um segundo mapa tropical ou como um mapa físico das regiões constelacionais da IAU; o contrato cartográfico representa relações angulares terrestres calculadas a partir de posições astronômicas, não “fronteiras zodiacais” sobre a Terra.

Interprete eventuais temas associados a cada linha somente como possibilidades simbólicas condicionais. Não recomende mudança, viagem, investimento, moradia, tratamento ou decisão profissional. Não declare que um lugar é destinado, seguro, perigoso, próspero, curativo ou inevitável. Uma convergência visual de linhas não autoriza, por si só, afirmar maior força. Contexto biográfico, realidade social, segurança e escolha pessoal permanecem indispensáveis.

Toda resposta visível continua em português do Brasil. Se mencionar o instante natal, converta-o para America/Sao_Paulo e escreva “Hora oficial de Brasília”, preservando o instante UTC canônico nos dados.

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
