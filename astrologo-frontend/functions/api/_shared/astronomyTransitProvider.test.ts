import { describe, expect, it } from 'vitest';
import { classifyTransitIauProjection, createAstronomyEngineTransitProvider } from './astronomyTransitProvider';
import { angularSeparationDeg } from './synastryRunV1';

describe('provedor real de trânsitos Astronomy Engine', () => {
  it('produz os dez corpos na ordem canônica e um probe posterior explícito', () => {
    const provider = createAstronomyEngineTransitProvider();
    const reference = provider.getSnapshot('2026-07-12T15:00:00.000Z');
    const probe = provider.getPhaseProbeSnapshot(reference.instantUtc);

    expect(reference.positions.map(({ bodyId }) => bodyId)).toEqual([
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ]);
    expect(Date.parse(probe.instantUtc) - Date.parse(reference.instantUtc)).toBe(6 * 60 * 60 * 1000);
    expect(provider.provenance).toMatchObject({
      providerId: 'astrologo-astronomy-engine-transits-v1',
      engineId: 'astronomy-engine',
      engineVersion: '2.1.19',
      observerOrigin: 'geocentric',
      apparentOrAstrometric: 'apparent',
      equatorialReference: 'equator-j2000',
    });
    expect(provider.provenance.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(
      reference.positions.every(
        ({ astronomicalReal }) =>
          astronomicalReal.degreeWithinConstellation.status === 'not-defined' &&
          astronomicalReal.degreeWithinConstellation.reasonCode === 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      ),
    ).toBe(true);
  });

  it('classifica RA/Dec aparentes na IAU e falha fechado dentro da guarda de fronteira de 20 minutos', () => {
    expect(classifyTransitIauProjection(0, 0)).toMatchObject({
      status: 'available',
      coordinates: {
        rightAscensionHours: 0,
        declinationDeg: 0,
        referenceFrame: 'equatorial-j2000',
      },
      constellation: { iauCode: 'Psc', latinName: 'Pisces', namePtBr: 'Peixes' },
      degreeWithinConstellation: {
        status: 'not-defined',
        reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      },
    });
    expect(classifyTransitIauProjection(1.762, -30)).toEqual({
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
      coordinates: {
        rightAscensionHours: 1.762,
        declinationDeg: -30,
        referenceFrame: 'equatorial-j2000',
      },
      degreeWithinConstellation: {
        status: 'not-defined',
        reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
      },
    });
  });

  it('só declara aperfeiçoamento quando o snapshot encontrado prova o ângulo', () => {
    const provider = createAstronomyEngineTransitProvider();
    const startInstantUtc = '2026-07-12T15:00:00.000Z';
    const expectedInstantUtc = '2026-07-13T15:00:00.000Z';
    const expectedLongitude = provider.getSnapshot(expectedInstantUtc).positions[0]?.eclipticLongitudeDeg;
    if (expectedLongitude === undefined) throw new Error('Snapshot solar incompleto.');

    const result = provider.searchExactAspect?.({
      startInstantUtc,
      endInstantUtc: '2026-07-14T15:00:00.000Z',
      transitBodyId: 'sun',
      natalPointId: 'sun',
      natalLongitudeDeg: expectedLongitude,
      aspectId: 'conjunction',
      exactAngleDeg: 0,
    });
    expect(result?.status).toBe('found');
    if (result?.status !== 'found') throw new Error('Aperfeiçoamento solar não encontrado.');
    const foundLongitude = provider
      .getSnapshot(result.exactAtUtc)
      .positions.find(({ bodyId }) => bodyId === 'sun')?.eclipticLongitudeDeg;
    expect(foundLongitude).toBeDefined();
    expect(angularSeparationDeg(foundLongitude ?? Number.NaN, expectedLongitude)).toBeLessThan(1e-7);
  });
});
