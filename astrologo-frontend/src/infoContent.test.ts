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
  });
});
