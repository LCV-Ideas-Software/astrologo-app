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
});
