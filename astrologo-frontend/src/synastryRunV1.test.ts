import { describe, expect, it } from 'vitest';
import type { SynastryRunV1 } from './synastryRunV1';
import { isSynastryRunV1, renderSynastryRunEmailHtml, renderSynastryRunText } from './synastryRunV1';

const run = {
  schemaId: 'urn:astrologo:synastry-run',
  schemaVersion: '1.0.0',
  charts: { A: { calculationId: 'a' }, B: { calculationId: 'b' } },
  models: { aspects: { profileId: 'astrologo-synastry-major-v1', profileVersion: '1.0.0' } },
  presentationPolicy: { timeZone: 'America/Sao_Paulo' },
  aspects: [
    {
      recordId: 'sun-moon',
      pointA: { chartRef: 'A', bodyId: 'sun' },
      pointB: { chartRef: 'B', bodyId: 'moon' },
      displayNamePtBr: 'Trígono',
      separationDeg: 121,
      orbDeg: 1,
    },
  ],
  houseOverlays: {
    aToB: [{ direction: 'A-to-B', sourceBodyId: 'sun', placement: { status: 'available', houseIndex1: 5 } }],
    bToA: [{ direction: 'B-to-A', sourceBodyId: 'moon', placement: { status: 'available', houseIndex1: 7 } }],
  },
  diagnostics: [],
} as unknown as SynastryRunV1;

describe('apresentação da sinastria', () => {
  it('mantém reciprocidade e nomes planetários em pt-BR', () => {
    const text = renderSynastryRunText(run, { A: 'Leonardo', B: 'João' });
    expect(text).toContain('SINASTRIA');
    expect(text).toContain('Trígono — Sol de Leonardo e Lua de João');
    expect(text).toContain('orbe 1,00°');
    expect(text).toContain('Sol de Leonardo na Casa 5 de João');
    expect(text).toContain('Lua de João na Casa 7 de Leonardo');
    expect(text).not.toContain('astrologo-synastry-major-v1');
    expect(text).not.toContain('Perfil metodológico');
  });

  it('gera HTML de e-mail com a cautela relacional', () => {
    const html = renderSynastryRunEmailHtml(run, { A: 'Leonardo', B: 'João' });
    expect(html).toContain('Sinastria');
    expect(html).toContain('Leonardo');
    expect(html).toContain('João');
    expect(html).toContain('não mede compatibilidade científica');
    expect(html).not.toContain('astrologo-synastry-major-v1');
  });

  it('rejeita resposta de rede estruturalmente incompleta antes de renderizar', () => {
    expect(isSynastryRunV1(run)).toBe(true);
    expect(isSynastryRunV1({ ...run, charts: null })).toBe(false);
    expect(isSynastryRunV1({ ...run, houseOverlays: {} })).toBe(false);
    expect(isSynastryRunV1({ ...run, aspects: [{ recordId: 'quebrado' }] })).toBe(false);
  });
});
