import { describe, expect, it } from 'vitest';
import { buildNatalWheelGeometry, longitudeToWheelPoint } from './chartGeometry';

describe('geometria da roda natal', () => {
  it('orienta o Ascendente no lado esquerdo da roda', () => {
    const point = longitudeToWheelPoint(123, 123, 100, 200, 200);
    expect(point.x).toBeCloseTo(100, 8);
    expect(point.y).toBeCloseTo(200, 8);
  });

  it('preserva a ordem das doze cúspides mesmo ao cruzar 360°', () => {
    const model = buildNatalWheelGeometry({
      ascendantLongitudeDeg: 350,
      houseCusps: [350, 22, 54, 86, 118, 150, 182, 214, 246, 278, 310, 338],
      planets: [
        { id: 'sun', longitudeDeg: 359 },
        { id: 'moon', longitudeDeg: 1 },
      ],
    });

    expect(model.houseLines.map((line) => line.houseIndex1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(model.planetPoints.map((point) => point.id)).toEqual(['sun', 'moon']);
    expect(model.planetPoints.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(true);
  });

  it('separa visualmente corpos em conjunção sem alterar suas longitudes', () => {
    const model = buildNatalWheelGeometry({
      ascendantLongitudeDeg: 0,
      houseCusps: Array.from({ length: 12 }, (_, index) => index * 30),
      planets: [
        { id: 'sun', longitudeDeg: 10 },
        { id: 'mercury', longitudeDeg: 10.4 },
        { id: 'venus', longitudeDeg: 10.8 },
      ],
    });

    expect(new Set(model.planetPoints.map((point) => point.radius))).toEqual(new Set([238, 220, 202]));
    expect(model.planetPoints.map((point) => point.longitudeDeg)).toEqual([10, 10.4, 10.8]);
  });
});
