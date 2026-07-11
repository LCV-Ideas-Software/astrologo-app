import { describe, expect, it } from 'vitest';
import { formatDegreePtBrTruncated, formatInstantInBrasilia } from './astrologyV2';

describe('formatação pública v2', () => {
  it('é independente do timezone implícito do processo e usa Brasília explicitamente', () => {
    expect(formatInstantInBrasilia('2026-07-11T03:04:05Z')).toBe('11/07/2026 às 00:04:05');
  });

  it('trunca graus e não arredonda para o próximo quinário', () => {
    expect(formatDegreePtBrTruncated(4.99999, 2)).toBe('4,99°');
  });
});
