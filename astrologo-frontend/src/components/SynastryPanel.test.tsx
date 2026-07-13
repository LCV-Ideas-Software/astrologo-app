import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SynastryRunV1 } from '../synastryRunV1';
import { SynastryPanel, type SynastryViewResult } from './SynastryPanel';

const view = {
  run: {
    schemaId: 'urn:astrologo:synastry-run',
    schemaVersion: '1.0.0',
    models: { aspects: { profileId: 'astrologo-synastry-major-v1', profileVersion: '1.0.0' } },
    aspects: [
      {
        recordId: 'sun-moon',
        pointA: { bodyId: 'sun' },
        pointB: { bodyId: 'moon' },
        displayNamePtBr: 'Trígono',
        separationDeg: 120.5,
        orbDeg: 0.5,
      },
    ],
    houseOverlays: {
      aToB: [{ sourceBodyId: 'sun', placement: { status: 'available', houseIndex1: 5 } }],
      bToA: [{ sourceBodyId: 'moon', placement: { status: 'available', houseIndex1: 7 } }],
    },
    diagnostics: [],
  } as unknown as SynastryRunV1,
  names: { A: 'Leonardo', B: 'João' },
} as SynastryViewResult;

describe('painel de sinastria', () => {
  it('explica consentimento, reciprocidade e resultados em pt-BR', () => {
    const html = renderToStaticMarkup(
      <SynastryPanel
        primaryMapId="mapa-a"
        primaryName="Leonardo"
        result={view}
        onResultChange={vi.fn()}
        openInfoModal={vi.fn()}
        notify={vi.fn()}
      />,
    );
    expect(html).toContain('Sinastria');
    expect(html).toContain('Data de nascimento (DD/MM/AAAA)');
    expect(html).toContain('Hora de nascimento (HH:MM)');
    expect(html).toContain('autorização para usar os dados da Pessoa B');
    expect(html).toContain('Saiba mais');
    expect(html).toContain('Trígono');
    expect(html).toContain('Sol de Leonardo');
    expect(html).toContain('Lua de João');
    expect(html).toContain('Casa 5 de João');
    expect(html).toContain('Casa 7 de Leonardo');
    expect(html).toContain('não é uma pontuação científica de compatibilidade');
    expect(html).toContain('serão salvos junto ao resultado');
    expect(html).not.toContain('persistido com segurança');
    expect(html).not.toContain('auditável');
    expect(html).toContain('focus-visible:ring-pink-200');
    expect(html).toContain('focus-visible:ring-violet-200');
    expect(html).toContain('motion-reduce:transition-none');
  });
});
