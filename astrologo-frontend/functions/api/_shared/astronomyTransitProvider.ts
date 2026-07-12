import { Body, Constellation, Ecliptic, EquatorFromVector, GeoVector } from 'astronomy-engine';
import { ASTRONOMY_ENGINE_SOURCE_SHA256, normalizeLongitude, type PlanetBodyId } from './positionV2';
import {
  TRANSIT_IAU_BOUNDARY_GUARD_ARCMINUTES,
  TRANSIT_PLANET_BODY_IDS,
  type TransitAstronomicalRealProjectionV1,
  type TransitExactSearchQueryV1,
  type TransitExactSearchResultV1,
  type TransitSnapshotPositionV1,
  type TransitSnapshotProviderV1,
} from './transitRunV1';

const BODY_BY_ID: Readonly<Record<PlanetBodyId, Body>> = Object.freeze({
  sun: Body.Sun,
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
});

const PHASE_PROBE_MILLISECONDS = 6 * 60 * 60 * 1000;
const SEARCH_STEP_MILLISECONDS = 6 * 60 * 60 * 1000;
const ROOT_TOLERANCE_DEG = 2e-8;

const CONSTELLATION_NAMES_PT_BR: Readonly<Record<string, string>> = Object.freeze({
  And: 'Andrômeda',
  Ant: 'Máquina Pneumática',
  Aps: 'Ave do Paraíso',
  Aqr: 'Aquário',
  Aql: 'Águia',
  Ara: 'Altar',
  Ari: 'Áries',
  Aur: 'Cocheiro',
  Boo: 'Boieiro',
  Cae: 'Cinzel',
  Cam: 'Girafa',
  Cnc: 'Câncer',
  CVn: 'Cães de Caça',
  CMa: 'Cão Maior',
  CMi: 'Cão Menor',
  Cap: 'Capricórnio',
  Car: 'Quilha',
  Cas: 'Cassiopeia',
  Cen: 'Centauro',
  Cep: 'Cefeu',
  Cet: 'Baleia',
  Cha: 'Camaleão',
  Cir: 'Compasso',
  Col: 'Pomba',
  Com: 'Cabeleira de Berenice',
  CrA: 'Coroa Austral',
  CrB: 'Coroa Boreal',
  Crv: 'Corvo',
  Crt: 'Taça',
  Cru: 'Cruzeiro do Sul',
  Cyg: 'Cisne',
  Del: 'Golfinho',
  Dor: 'Dourado',
  Dra: 'Dragão',
  Equ: 'Potro',
  Eri: 'Erídano',
  For: 'Fornalha',
  Gem: 'Gêmeos',
  Gru: 'Grou',
  Her: 'Hércules',
  Hor: 'Relógio',
  Hya: 'Hidra',
  Hyi: 'Hidra Macho',
  Ind: 'Índio',
  Lac: 'Lagarto',
  Leo: 'Leão',
  LMi: 'Leão Menor',
  Lep: 'Lebre',
  Lib: 'Libra',
  Lup: 'Lobo',
  Lyn: 'Lince',
  Lyr: 'Lira',
  Men: 'Mesa',
  Mic: 'Microscópio',
  Mon: 'Unicórnio',
  Mus: 'Mosca',
  Nor: 'Esquadro',
  Oct: 'Oitante',
  Oph: 'Ofiúco (Serpentário)',
  Ori: 'Órion',
  Pav: 'Pavão',
  Peg: 'Pégaso',
  Per: 'Perseu',
  Phe: 'Fênix',
  Pic: 'Cavalete do Pintor',
  Psc: 'Peixes',
  PsA: 'Peixe Austral',
  Pup: 'Popa',
  Pyx: 'Bússola',
  Ret: 'Retículo',
  Sge: 'Flecha',
  Sgr: 'Sagitário',
  Sco: 'Escorpião',
  Scl: 'Escultor',
  Sct: 'Escudo',
  Ser: 'Serpente',
  Sex: 'Sextante',
  Tau: 'Touro',
  Tel: 'Telescópio',
  Tri: 'Triângulo',
  TrA: 'Triângulo Austral',
  Tuc: 'Tucano',
  UMa: 'Ursa Maior',
  UMi: 'Ursa Menor',
  Vel: 'Vela',
  Vir: 'Virgem',
  Vol: 'Peixe Voador',
  Vul: 'Raposa',
});

const parseInstant = (instantUtc: string): number => {
  const milliseconds = Date.parse(instantUtc);
  if (!Number.isFinite(milliseconds)) throw new RangeError('O instante do provedor de trânsitos é inválido.');
  return milliseconds;
};

const longitudeAt = (bodyId: PlanetBodyId, milliseconds: number): number =>
  normalizeLongitude(Ecliptic(GeoVector(BODY_BY_ID[bodyId], new Date(milliseconds), true)).elon);

const isWithinIauBoundaryGuard = (rightAscensionHours: number, declinationDeg: number, iauCode: string): boolean => {
  const angularRadiusDeg = TRANSIT_IAU_BOUNDARY_GUARD_ARCMINUTES / 60;
  const cosineDeclination = Math.max(0.1, Math.abs(Math.cos((declinationDeg * Math.PI) / 180)));
  const rightAscensionRadiusHours = angularRadiusDeg / (15 * cosineDeclination);
  const samples: ReadonlyArray<readonly [number, number]> = [
    [rightAscensionRadiusHours, 0],
    [-rightAscensionRadiusHours, 0],
    [0, angularRadiusDeg],
    [0, -angularRadiusDeg],
    [rightAscensionRadiusHours / Math.SQRT2, angularRadiusDeg / Math.SQRT2],
    [rightAscensionRadiusHours / Math.SQRT2, -angularRadiusDeg / Math.SQRT2],
    [-rightAscensionRadiusHours / Math.SQRT2, angularRadiusDeg / Math.SQRT2],
    [-rightAscensionRadiusHours / Math.SQRT2, -angularRadiusDeg / Math.SQRT2],
  ];
  return samples.some(([rightAscensionDelta, declinationDelta]) => {
    const sampledRightAscension = (((rightAscensionHours + rightAscensionDelta) % 24) + 24) % 24;
    const sampledDeclination = Math.max(-90, Math.min(90, declinationDeg + declinationDelta));
    return Constellation(sampledRightAscension, sampledDeclination).symbol !== iauCode;
  });
};

export function classifyTransitIauProjection(
  rightAscensionHours: number,
  declinationDeg: number,
): TransitAstronomicalRealProjectionV1 {
  if (!Number.isFinite(rightAscensionHours) || rightAscensionHours < 0 || rightAscensionHours >= 24) {
    throw new RangeError('A ascensão reta para classificação IAU deve permanecer em [0, 24) horas.');
  }
  if (!Number.isFinite(declinationDeg) || declinationDeg < -90 || declinationDeg > 90) {
    throw new RangeError('A declinação para classificação IAU deve permanecer em [-90, 90] graus.');
  }
  const coordinates = {
    rightAscensionHours,
    declinationDeg,
    referenceFrame: 'equatorial-j2000' as const,
  };
  const degreeWithinConstellation = {
    status: 'not-defined' as const,
    reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS' as const,
  };
  const constellation = Constellation(rightAscensionHours, declinationDeg);
  if (isWithinIauBoundaryGuard(rightAscensionHours, declinationDeg, constellation.symbol)) {
    return {
      status: 'unavailable',
      reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
      coordinates,
      degreeWithinConstellation,
    };
  }
  return {
    status: 'available',
    coordinates,
    constellation: {
      iauCode: constellation.symbol,
      latinName: constellation.name,
      namePtBr: CONSTELLATION_NAMES_PT_BR[constellation.symbol] ?? constellation.name,
    },
    degreeWithinConstellation,
  };
}

const positionAt = (bodyId: PlanetBodyId, milliseconds: number): TransitSnapshotPositionV1 => {
  const vector = GeoVector(BODY_BY_ID[bodyId], new Date(milliseconds), true);
  const ecliptic = Ecliptic(vector);
  const equatorial = EquatorFromVector(vector);
  return {
    bodyId,
    eclipticLongitudeDeg: normalizeLongitude(ecliptic.elon),
    astronomicalReal: classifyTransitIauProjection(equatorial.ra, equatorial.dec),
  };
};

const signedAngularDelta = (valueDeg: number, targetDeg: number): number => {
  const normalized = normalizeLongitude(valueDeg - targetDeg + 180) - 180;
  return normalized === -180 ? 180 : normalized;
};

const orientedDifferenceAt = (
  query: TransitExactSearchQueryV1,
  targetDirectedDifferenceDeg: number,
  milliseconds: number,
): number => {
  const transitLongitudeDeg = longitudeAt(query.transitBodyId, milliseconds);
  const directedDifferenceDeg = normalizeLongitude(transitLongitudeDeg - query.natalLongitudeDeg);
  return signedAngularDelta(directedDifferenceDeg, targetDirectedDifferenceDeg);
};

const refineRoot = (
  query: TransitExactSearchQueryV1,
  targetDirectedDifferenceDeg: number,
  leftMilliseconds: number,
  rightMilliseconds: number,
): number | null => {
  let left = leftMilliseconds;
  let right = rightMilliseconds;
  let leftValue = orientedDifferenceAt(query, targetDirectedDifferenceDeg, left);
  const rightValue = orientedDifferenceAt(query, targetDirectedDifferenceDeg, right);
  if (Math.abs(leftValue) <= ROOT_TOLERANCE_DEG) return left;
  if (Math.abs(rightValue) <= ROOT_TOLERANCE_DEG) return right;
  if (Math.sign(leftValue) === Math.sign(rightValue) || Math.abs(rightValue - leftValue) >= 180) return null;

  for (let iteration = 0; iteration < 64 && right - left > 1; iteration += 1) {
    const middle = Math.round((left + right) / 2);
    const middleValue = orientedDifferenceAt(query, targetDirectedDifferenceDeg, middle);
    if (Math.abs(middleValue) <= ROOT_TOLERANCE_DEG) return middle;
    if (Math.sign(leftValue) === Math.sign(middleValue)) {
      left = middle;
      leftValue = middleValue;
    } else {
      right = middle;
    }
  }

  const candidates = [left, right, Math.round((left + right) / 2)];
  let best = candidates[0] ?? left;
  let bestError = Math.abs(orientedDifferenceAt(query, targetDirectedDifferenceDeg, best));
  for (const candidate of candidates.slice(1)) {
    const error = Math.abs(orientedDifferenceAt(query, targetDirectedDifferenceDeg, candidate));
    if (error < bestError) {
      best = candidate;
      bestError = error;
    }
  }
  return bestError <= 1e-7 ? best : null;
};

const searchExactAspect = (query: TransitExactSearchQueryV1): TransitExactSearchResultV1 => {
  const start = parseInstant(query.startInstantUtc);
  const end = parseInstant(query.endInstantUtc);
  if (end < start) throw new RangeError('A busca de aperfeiçoamento recebeu horizonte invertido.');
  const mirroredTarget = normalizeLongitude(360 - query.exactAngleDeg);
  const targets = [...new Set([normalizeLongitude(query.exactAngleDeg), mirroredTarget])];
  let earliest: number | null = null;

  for (const target of targets) {
    let left = start;
    let leftValue = orientedDifferenceAt(query, target, left);
    if (Math.abs(leftValue) <= ROOT_TOLERANCE_DEG) earliest = earliest === null ? left : Math.min(earliest, left);

    while (left < end) {
      const right = Math.min(end, left + SEARCH_STEP_MILLISECONDS);
      const rightValue = orientedDifferenceAt(query, target, right);
      if (Math.abs(rightValue) <= ROOT_TOLERANCE_DEG) {
        earliest = earliest === null ? right : Math.min(earliest, right);
        break;
      }
      if (Math.sign(leftValue) !== Math.sign(rightValue) && Math.abs(rightValue - leftValue) < 180) {
        const root = refineRoot(query, target, left, right);
        if (root !== null) {
          earliest = earliest === null ? root : Math.min(earliest, root);
          break;
        }
      }
      left = right;
      leftValue = rightValue;
    }
  }

  return earliest === null
    ? { status: 'not-found', reasonCode: 'NO_EXACTITUDE_WITHIN_HORIZON' }
    : { status: 'found', exactAtUtc: new Date(earliest).toISOString() };
};

export function createAstronomyEngineTransitProvider(): TransitSnapshotProviderV1 {
  const getSnapshot = (instantUtc: string) => {
    const milliseconds = parseInstant(instantUtc);
    const positions: TransitSnapshotPositionV1[] = TRANSIT_PLANET_BODY_IDS.map((bodyId) =>
      positionAt(bodyId, milliseconds),
    );
    return { instantUtc, positions };
  };

  return {
    provenance: {
      providerId: 'astrologo-astronomy-engine-transits-v1',
      providerVersion: '1.0.0',
      engineId: 'astronomy-engine',
      engineVersion: '2.1.19',
      sourceRef: 'https://github.com/cosinekitty/astronomy',
      sourceSha256: ASTRONOMY_ENGINE_SOURCE_SHA256,
      observerOrigin: 'geocentric',
      apparentOrAstrometric: 'apparent',
      eclipticReference: 'true-ecliptic-of-date',
      equatorialReference: 'equator-j2000',
    },
    getSnapshot,
    getPhaseProbeSnapshot: (referenceInstantUtc: string) =>
      getSnapshot(new Date(parseInstant(referenceInstantUtc) + PHASE_PROBE_MILLISECONDS).toISOString()),
    searchExactAspect,
  };
}
