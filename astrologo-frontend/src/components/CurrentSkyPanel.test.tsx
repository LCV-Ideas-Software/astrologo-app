import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TransitRunV1 } from '../transitRunV1';
import { CurrentSkyPanel } from './CurrentSkyPanel';

const run = {
  schemaId: 'urn:astrologo:transit-run',
  schemaVersion: '1.0.0',
  request: {
    referenceInstantUtc: '2026-07-12T15:00:00.000Z',
    phaseProbeInstantUtc: '2026-07-12T21:00:00.000Z',
    horizonDays: 7,
    horizonEndInstantUtc: '2026-07-19T15:00:00.000Z',
  },
  models: { aspects: { profileId: 'astrologo-transit-major-v1', profileVersion: '1.0.0' } },
  presentationPolicy: { timeZone: 'America/Sao_Paulo', timeZoneLabel: 'Hora oficial de Brasília' },
  positionsAtReference: [
    {
      bodyId: 'sun',
      displayNamePtBr: 'Sol',
      symbol: '☉',
      tropical: { signId: 'cancer', signNamePtBr: 'Câncer', degreeWithinSignDeg: 20 },
      astronomicalReal: {
        status: 'available',
        coordinates: { rightAscensionHours: 7.5, declinationDeg: 22.1, referenceFrame: 'equatorial-j2000' },
        constellation: { iauCode: 'Gem', latinName: 'Gemini', namePtBr: 'Gêmeos' },
        degreeWithinConstellation: {
          status: 'not-defined',
          reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
        },
      },
      natalHousePlacement: { status: 'available', houseIndex1: 8 },
    },
  ],
  natalTargets: [{ status: 'available', pointId: 'moon', displayNamePtBr: 'Lua' }],
  aspects: [
    {
      recordId: 'sun-moon',
      transitPoint: { bodyId: 'sun' },
      natalPoint: { pointId: 'moon' },
      displayNamePtBr: 'Quadratura',
      orbDeg: 0.5,
      phase: { status: 'available', phase: 'applying' },
      exactitude: { status: 'available', exactAtUtc: '2026-07-13T15:00:00.000Z' },
    },
  ],
  diagnostics: [],
} as unknown as TransitRunV1;

describe('painel do céu atual', () => {
  it('apresenta posições, aspectos, Brasília e Saiba Mais', () => {
    const html = renderToStaticMarkup(
      <CurrentSkyPanel mapaId="mapa-1" run={run} onRunChange={vi.fn()} openInfoModal={vi.fn()} notify={vi.fn()} />,
    );
    expect(html).toContain('Céu Atual e Trânsitos');
    expect(html).toContain('Atualizar céu agora');
    expect(html).toContain('Saiba mais');
    expect(html).toContain('12/07/2026 às 12:00:00');
    expect(html).toContain('Hora oficial de Brasília');
    expect(html).toContain('Sol');
    expect(html).toContain('Câncer');
    expect(html).toContain('Constelação: Gêmeos');
    expect(html).not.toContain('sem grau interno');
    expect(html).not.toContain('J2000');
    expect(html).not.toContain('instante do servidor');
    expect(html).toContain('focus-visible:ring-sky-200');
    expect(html).toContain('motion-reduce:transition-none');
    expect(html).toContain('Quadratura');
    expect(html).toContain('fase aplicativa');
    expect(html).toContain('13/07/2026 às 12:00:00');
  });

  it('humaniza em pt-BR quando a constelação está indisponível', () => {
    const boundaryRun = structuredClone(run) as unknown as {
      positionsAtReference: Array<Record<string, unknown>>;
    };
    const firstPosition = boundaryRun.positionsAtReference[0];
    if (!firstPosition) throw new Error('Fixture sem posição.');
    firstPosition.astronomicalReal = {
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
      coordinates: { rightAscensionHours: 1.762, declinationDeg: -30, referenceFrame: 'equatorial-j2000' },
      degreeWithinConstellation: {
        status: 'not-defined',
        reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      },
    };
    const html = renderToStaticMarkup(
      <CurrentSkyPanel
        mapaId="mapa-1"
        run={boundaryRun as unknown as TransitRunV1}
        onRunChange={vi.fn()}
        openInfoModal={vi.fn()}
        notify={vi.fn()}
      />,
    );
    expect(html).toContain('Constelação indisponível');
    expect(html).not.toContain('IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN');
  });
});
