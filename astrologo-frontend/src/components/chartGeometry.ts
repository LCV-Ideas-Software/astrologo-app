export interface WheelPlanetInput {
  readonly id: string;
  readonly longitudeDeg: number;
}

export interface NatalWheelGeometryInput {
  readonly ascendantLongitudeDeg: number;
  readonly houseCusps: readonly number[];
  readonly planets: readonly WheelPlanetInput[];
}

export interface WheelPoint {
  readonly x: number;
  readonly y: number;
}

const CENTER = 360;
const HOUSE_RADIUS = 300;
const PLANET_RADII = [238, 220, 202] as const;
const COLLISION_THRESHOLD_DEG = 3;

export const normalizeWheelLongitude = (longitudeDeg: number): number => {
  if (!Number.isFinite(longitudeDeg)) throw new RangeError('Longitude inválida para a roda natal.');
  const remainder = longitudeDeg % 360;
  if (Object.is(remainder, -0)) return 0;
  return remainder < 0 ? remainder + 360 : remainder;
};

const circularSeparation = (leftDeg: number, rightDeg: number): number => {
  const difference = Math.abs(normalizeWheelLongitude(leftDeg) - normalizeWheelLongitude(rightDeg));
  return Math.min(difference, 360 - difference);
};

/**
 * Converte longitude eclíptica em coordenada SVG. A rotação mantém o
 * Ascendente a 9 horas, convenção visual adotada na roda do aplicativo.
 */
export function longitudeToWheelPoint(
  longitudeDeg: number,
  ascendantLongitudeDeg: number,
  radius: number,
  centerX = CENTER,
  centerY = CENTER,
): WheelPoint {
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Raio inválido para a roda natal.');
  const displayAngleDeg = normalizeWheelLongitude(longitudeDeg - ascendantLongitudeDeg + 180);
  const radians = (displayAngleDeg * Math.PI) / 180;
  return {
    x: centerX + Math.cos(radians) * radius,
    y: centerY + Math.sin(radians) * radius,
  };
}

export function buildNatalWheelGeometry(input: NatalWheelGeometryInput) {
  if (input.houseCusps.length !== 12) throw new RangeError('A roda natal exige exatamente doze cúspides.');

  const ascendantLongitudeDeg = normalizeWheelLongitude(input.ascendantLongitudeDeg);
  const houseLines = input.houseCusps.map((longitudeDeg, index0) => ({
    houseIndex1: index0 + 1,
    longitudeDeg: normalizeWheelLongitude(longitudeDeg),
    start: longitudeToWheelPoint(longitudeDeg, ascendantLongitudeDeg, 86),
    end: longitudeToWheelPoint(longitudeDeg, ascendantLongitudeDeg, HOUSE_RADIUS),
  }));

  const placedLongitudes: number[] = [];
  const planetPoints = input.planets.map((planet) => {
    const longitudeDeg = normalizeWheelLongitude(planet.longitudeDeg);
    const collisionCount = placedLongitudes.filter(
      (placedLongitude) => circularSeparation(placedLongitude, longitudeDeg) < COLLISION_THRESHOLD_DEG,
    ).length;
    const radius = PLANET_RADII[Math.min(collisionCount, PLANET_RADII.length - 1)] ?? 202;
    placedLongitudes.push(longitudeDeg);
    return {
      id: planet.id,
      longitudeDeg,
      radius,
      ...longitudeToWheelPoint(longitudeDeg, ascendantLongitudeDeg, radius),
    };
  });

  return { center: { x: CENTER, y: CENTER }, ascendantLongitudeDeg, houseLines, planetPoints };
}
