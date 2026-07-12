import { describe, expect, it } from 'vitest';
import {
  type CanonicalArtifactsPatch,
  canonicalArtifactBacklinksMatch,
  isCanonicalHydrationEnvelope,
  mergeCanonicalArtifacts,
} from './savedMapRehydration';

interface TestMap {
  readonly id: string;
  readonly nome: string;
  readonly natalChartAnalysisV1?: unknown;
  readonly transitRunV1?: unknown;
  readonly synastryResult?: unknown;
  readonly localityMapV1?: unknown;
}

const patch = (label: string): CanonicalArtifactsPatch => ({
  natalChartAnalysisV1: { label: `natal-${label}` } as never,
  transitRunV1: { label: `transit-${label}` } as never,
  synastryResult: { label: `synastry-${label}` } as never,
  localityMapV1: { label: `locality-${label}` } as never,
});

describe('reidratação de mapas salvos', () => {
  it('ignora a resposta atrasada de A depois que a pessoa já abriu B', () => {
    const current: TestMap = { id: 'mapa-b', nome: 'Pessoa B' };

    expect(mergeCanonicalArtifacts(current, 'mapa-a', patch('a'))).toBe(current);
  });

  it('mescla os campos canônicos presentes e preserva o snapshot legado quando o bundle traz null', () => {
    const current: TestMap = {
      id: 'mapa-a',
      nome: 'Pessoa A',
      natalChartAnalysisV1: { stale: true },
      transitRunV1: { stale: true },
      synastryResult: { stale: true },
      localityMapV1: { stale: true },
    };
    const artifacts: CanonicalArtifactsPatch = {
      ...patch('novo'),
      transitRunV1: null,
      localityMapV1: null,
    };

    expect(mergeCanonicalArtifacts(current, 'mapa-a', artifacts)).toEqual({
      id: 'mapa-a',
      nome: 'Pessoa A',
      natalChartAnalysisV1: { label: 'natal-novo' },
      transitRunV1: { stale: true },
      synastryResult: { label: 'synastry-novo' },
      localityMapV1: { stale: true },
    });
  });

  it('aceita somente o contrato versionado e pertencente ao mapa solicitado', () => {
    const valid = {
      ok: true,
      schemaId: 'urn:astrologo:saved-map-hydration',
      schemaVersion: '1.0.0',
      calculationId: 'mapa-a',
      artifacts: {
        natalChartAnalysisV1: null,
        transitRunV1: null,
        synastryResult: null,
        localityMapV1: null,
      },
      artifactStates: {
        natalChartAnalysisV1: 'absent',
        transitRunV1: 'absent',
        synastryResult: 'absent',
        localityMapV1: 'absent',
      },
    };

    expect(isCanonicalHydrationEnvelope(valid, 'mapa-a')).toBe(true);
    expect(isCanonicalHydrationEnvelope({ ...valid, schemaVersion: '2.0.0' }, 'mapa-a')).toBe(false);
    expect(isCanonicalHydrationEnvelope({ ...valid, calculationId: 'mapa-b' }, 'mapa-a')).toBe(false);
    expect(isCanonicalHydrationEnvelope({ ...valid, artifacts: { natalChartAnalysisV1: null } }, 'mapa-a')).toBe(false);
    expect(isCanonicalHydrationEnvelope({ ...valid, artifacts: patch('adulterado') }, 'mapa-a')).toBe(false);
    expect(
      isCanonicalHydrationEnvelope(
        {
          ...valid,
          artifactStates: { ...valid.artifactStates, localityMapV1: 'available' },
        },
        'mapa-a',
      ),
    ).toBe(false);
  });

  it('rejeita backlinks internos que apontem para outro mapa ou papel sinástrico', () => {
    const matching = {
      natalChartAnalysisV1: { source: { calculationId: 'mapa-a' } },
      transitRunV1: { source: { natal: { calculationId: 'mapa-a' } } },
      synastryResult: {
        secondaryMapId: 'mapa-b',
        run: { charts: { A: { calculationId: 'mapa-a' }, B: { calculationId: 'mapa-b' } } },
      },
      localityMapV1: { source: { calculationId: 'mapa-a' } },
    };

    expect(canonicalArtifactBacklinksMatch(matching, 'mapa-a')).toBe(true);
    expect(
      canonicalArtifactBacklinksMatch(
        { ...matching, transitRunV1: { source: { natal: { calculationId: 'mapa-alheio' } } } },
        'mapa-a',
      ),
    ).toBe(false);
    expect(
      canonicalArtifactBacklinksMatch(
        {
          ...matching,
          synastryResult: {
            secondaryMapId: 'mapa-b',
            run: { charts: { A: { calculationId: 'mapa-b' }, B: { calculationId: 'mapa-a' } } },
          },
        },
        'mapa-a',
      ),
    ).toBe(false);
  });
});
