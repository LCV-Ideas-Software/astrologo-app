import { describe, expect, it } from 'vitest';
import { MAX_WHEEL_MODAL_FACTS, visibleWheelModalFacts } from './WheelElementModal';

describe('painel de detalhes da roda natal', () => {
  it('limita os fatos para manter o conteúdo visível abaixo de dez linhas', () => {
    const facts = Array.from({ length: 12 }, (_, index0) => `Fato ${index0 + 1}`);

    expect(MAX_WHEEL_MODAL_FACTS).toBe(5);
    expect(visibleWheelModalFacts(facts)).toEqual(['Fato 1', 'Fato 2', 'Fato 3', 'Fato 4', 'Fato 5']);
    expect(facts).toHaveLength(12);
  });
});
