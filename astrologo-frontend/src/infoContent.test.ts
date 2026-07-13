import { describe, expect, it } from 'vitest';
import { getInfoContent } from './infoContent';
import { presentTatwa } from './tatwaPresentation';

const flatten = (topic: Parameters<typeof getInfoContent>[0], context?: Parameters<typeof getInfoContent>[1]) => {
  const content = getInfoContent(topic, context);
  return [
    content.title,
    content.introduction,
    ...content.sections.flatMap((section) => [section.title, ...section.items]),
  ].join(' ');
};

describe('conteúdo leigo dos botões Saiba mais', () => {
  it('explica a perspectiva tropical sem declará-la verdadeira ou falsa', () => {
    const text = flatten('tropical');
    expect(text).toContain('12 setores iguais de 30 graus');
    expect(text).toContain('equinócio');
    expect(text).toContain('não é uma fotografia das constelações');
    expect(text).toContain('perspectiva');
  });

  it('explica a classificação constelacional sem transformar Ofiúco em signo', () => {
    const text = flatten('astronomica');
    expect(text).toContain('13 constelações');
    expect(text).toContain('Ofiúco');
    expect(text).toContain('limites oficiais da IAU');
    expect(text).toContain('não transforma automaticamente uma constelação em signo');
  });

  it('explica as duas ordens de subtatwas e contextualiza o resultado atual', () => {
    const tatwa = presentTatwa({
      schemaVersion: '2.0.0',
      calculationMode: 'fixed',
      principal: 'Tejas (Fogo)',
      sub: 'Akasha (Éter)',
      nearMainBoundary: true,
      mainBoundaryMarginSec: 44,
      adjacentMain: {
        principal: 'Vayu (Ar)',
        sub: 'Prithvi (Terra)',
        relation: 'previous',
        secondsToBoundary: 44,
      },
    });
    const text = flatten('tatwas', { tatwa });
    expect(text).toContain('24 minutos');
    expect(text).toContain('4 minutos e 48 segundos');
    expect(text).toContain('Ordem fixa — Akasha primeiro');
    expect(text).toContain('Ordem pelo principal');
    expect(text).toContain('Tejas (Fogo)');
    expect(text).toContain('44 s');
    expect(text).toContain('tema elementar dominante');
    expect(text).toContain('Akasha sugere abertura');
    expect(text).toContain('Tejas–Akasha');
  });

  it('explica exatamente os três cálculos numerológicos usados pelo aplicativo', () => {
    const text = flatten('numerologia', {
      numerologia: { expressao: 7, caminhoVida: 11, vibracaoHora: 6 },
    });
    expect(text).toContain('tabela pitagórica de 1 a 9');
    expect(text).toContain('11, 22 e 33');
    expect(text).toContain('nome completo');
    expect(text).toContain('data de nascimento');
    expect(text).toContain('hora de nascimento');
  });

  it('ensina a separar as quatro camadas da leitura detalhada do mapa', () => {
    const text = flatten('detailedMap');
    expect(text).toContain('quatro camadas');
    expect(text).toContain('posição tropical');
    expect(text).toContain('Casa Placidus');
    expect(text).toContain('região oficial da IAU');
    expect(text).toContain('quinário angelical');
    expect(text).toContain('três faixas de 10 graus');
    expect(text).toContain('Hora oficial de Brasília');
    expect(text).toContain('não calcula um grau dentro da constelação');
    expect(text).toContain('posições celestes são geocêntricas');
  });

  it('explica o que são cúspides e as limitações das Casas Placidus', () => {
    const text = flatten('celestialDistribution');
    expect(text).toContain('cúspide é o ponto de início');
    expect(text).toContain('horário e o local de nascimento');
    expect(text).toContain('não precisam ter o mesmo tamanho');
    expect(text).toContain('Casa 1');
    expect(text).toContain('Casa 10');
    expect(text).toContain('duas cúspides seguidas');
    expect(text).toContain('não substitui silenciosamente');
  });

  it('distingue a falange angelical do regente solar e declara a base tropical', () => {
    const text = flatten('mapCorrespondences');
    expect(text).toContain('72 intervalos iguais de 5 graus');
    expect(text).toContain('longitude tropical');
    expect(text).toContain('posição tropical do Sol');
    expect(text).toContain('não é escolhido por repetição');
    expect(text).toContain('menos de dez cartões');
    expect(text).toContain('dez correspondências');
    expect(text).toContain('não foi adaptado às 13 constelações');
    expect(text).toContain('correspondência simbólica');
    expect(text).toContain('triplete hebraico');
    expect(text).toContain('função simbólica do planeta');
  });

  it('explica a roda natal sem desenhar constelações IAU como setores iguais', () => {
    const text = flatten('natalWheel');
    expect(text).toContain('Ascendente');
    expect(text).toContain('12 signos tropicais');
    expect(text).toContain('Casas Placidus');
    expect(text).toContain('não são 13 setores iguais');
    expect(text).toContain('alternativa textual');
  });

  it('explica aspectos, ângulos exatos e orbes em linguagem leiga', () => {
    const text = flatten('natalAspects');
    expect(text).toContain('distância angular');
    expect(text).toContain('orbe');
    expect(text).toContain('Conjunção');
    expect(text).toContain('Quadratura cria atrito');
    expect(text).toContain('aspecto aplicativo');
    expect(text).toContain('Ascendente e Meio do Céu');
    expect(text).not.toContain('perfil metodológico versionado');
  });

  it('distingue casa, cúspide e grau mundano', () => {
    const text = flatten('houseInfluences');
    expect(text).toContain('grau mundano');
    expect(text).not.toContain('swe_house_pos');
    expect(text).toContain('não é estimado pelo tamanho do arco');
    expect(text).toContain('indisponível');
  });

  it('explica céu atual e trânsitos sem prometer acontecimentos', () => {
    const text = flatten('currentSky');
    expect(text).toContain('instante de referência');
    expect(text).toContain('Hora oficial de Brasília');
    expect(text).toContain('trânsito–natal');
    expect(text).toContain('não é uma previsão inevitável');
  });

  it('explica sinastria como comparação recíproca e não como sentença relacional', () => {
    const text = flatten('synastry');
    expect(text).toContain('dois mapas natais completos');
    expect(text).toContain('A nas Casas de B');
    expect(text).toContain('B nas Casas de A');
    expect(text).toContain('não mede compatibilidade');
    expect(text).toContain('Tensões não significam incompatibilidade');
    expect(text).toContain('Sol, Lua, Mercúrio, Vênus e Marte');
  });

  it('explica linhas astrocartográficas e seus limites geográficos', () => {
    const text = flatten('localityMap');
    expect(text).toContain('Ascendente, Descendente, Meio do Céu e Fundo do Céu');
    expect(text).toContain('instante natal');
    expect(text).toContain('antimeridiano');
    expect(text).toContain('não recomenda mudança');
  });

  it('oferece poucos links de aprofundamento em fontes institucionais e do sistema adotado', () => {
    const topics = [
      'tropical',
      'astronomica',
      'tatwas',
      'mapCorrespondences',
      'natalAspects',
      'synastry',
      'localityMap',
    ] as const;
    for (const topic of topics) {
      const sources = getInfoContent(topic).sources ?? [];
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.length).toBeLessThanOrEqual(2);
      for (const source of sources) expect(source.url).toMatch(/^https:\/\//u);
    }
  });
});
