import { describe, expect, it } from 'vitest';
import {
  angleMeaningPtBr,
  aspectMeaningPtBr,
  houseMeaningPtBr,
  planetMeaningPtBr,
  signMeaningPtBr,
} from './wheelElementContent';

describe('conteúdo interativo da roda natal', () => {
  it('mantém explicações concisas em pt-BR para todos os tipos de elemento', () => {
    expect(planetMeaningPtBr('sun')).toContain('identidade');
    expect(signMeaningPtBr(0)).toContain('iniciativa');
    expect(houseMeaningPtBr(7)).toContain('Parcerias');
    expect(aspectMeaningPtBr('trine')).toContain('fluida');
    expect(angleMeaningPtBr('mc')).toContain('vocação');
  });

  it('oferece alternativas seguras para identificadores desconhecidos', () => {
    expect(planetMeaningPtBr('unknown')).toContain('força simbólica');
    expect(signMeaningPtBr(99)).toContain('qualidade simbólica');
    expect(houseMeaningPtBr(99)).toContain('Setor de experiência');
    expect(aspectMeaningPtBr('unknown')).toContain('Relaciona simbolicamente');
    expect(angleMeaningPtBr('unknown')).toContain('eixo pessoal');
  });
});
