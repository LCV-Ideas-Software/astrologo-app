import { describe, expect, it } from 'vitest';
import {
  type DadosPosicionaisV2,
  findConsultantRulingPosition,
  formatDegreePtBrTruncated,
  formatInstantInBrasilia,
  getPlanetPresentationPtBr,
  type PositionalV2Planet,
  renderPositionalV2EmailHtml,
  renderPositionalV2Text,
} from './astrologyV2';

const makePlanet = (
  bodyId: string,
  angel: { id: number; canonicalName: string; hebrewTriplet: string },
): PositionalV2Planet => ({
  bodyId,
  displayNamePtBr: bodyId,
  symbol: 'x',
  coordinates: { eclipticLongitudeDeg: angel.id === 1 ? 1.25 : 6.25, eclipticLatitudeDeg: 0 },
  tropical: {
    sign: { id: 'aries', namePtBr: 'Áries' },
    degreeWithinSignDeg: angel.id === 1 ? 1.25 : 6.25,
    decan: { index1: 1 },
  },
  astronomicalReal: {
    status: 'available',
    constellation: { iauCode: 'Ari', latinName: 'Aries', namePtBr: 'Áries' },
  },
  housePlacement: { status: 'available', houseIndex1: angel.id },
  angelicQuinary: {
    basisSystem: 'tropical',
    quinary: {
      index1: angel.id,
      globalStartLongitudeDeg: (angel.id - 1) * 5,
      globalEndLongitudeDegExclusive: angel.id * 5,
    },
    angel: {
      ...angel,
      aliases: [],
      choir: 'Serafins',
      prince: 'Metatron',
      qualitySummaryPtBr: 'Iniciativa e transformação.',
      sourcePermalink: 'https://wiki.deldebbio.com.br/index.php/Vehuiah',
    },
  },
});

const makeData = (): DadosPosicionaisV2 => {
  const moon = makePlanet('moon', { id: 2, canonicalName: 'Jeliel', hebrewTriplet: 'ילי' });
  const sun = makePlanet('sun', { id: 1, canonicalName: 'Vehuiah', hebrewTriplet: 'והו' });
  return {
    schemaId: 'urn:astrologo:dados-posicionais',
    schemaVersion: '2.0.0',
    calculationId: 'teste-regente-solar',
    calculatedAtUtc: '2026-07-11T03:04:05Z',
    birthContext: {
      place: { sourceLabel: 'Brasília, DF, Brasil' },
      timeResolution: {
        status: 'resolved',
        instantUtc: '1990-01-01T15:00:00Z',
        timeZoneIana: 'America/Sao_Paulo',
        offsetAtBirth: '-02:00',
        historicalConfidence: 'certified-1970-plus',
      },
    },
    presentationPolicy: {
      locale: 'pt-BR',
      timeZone: 'America/Sao_Paulo',
      timeZoneLabel: 'Hora oficial de Brasília',
    },
    houses: { systemId: 'placidus', status: 'available', cusps: [] },
    angles: [],
    positions: [moon, sun],
    aggregates: {
      angelicFalange: [
        { angelId: 2, memberBodyIds: ['moon'], occurrenceCount: 1 },
        { angelId: 1, memberBodyIds: ['sun'], occurrenceCount: 1 },
      ],
    },
    diagnostics: [],
  };
};

describe('formatação pública v2', () => {
  it('é independente do timezone implícito do processo e usa Brasília explicitamente', () => {
    expect(formatInstantInBrasilia('2026-07-11T03:04:05Z')).toBe('11/07/2026 às 00:04:05');
  });

  it('trunca graus e não arredonda para o próximo quinário', () => {
    expect(formatDegreePtBrTruncated(4.99999, 2)).toBe('4,99°');
  });

  it('mantém ids internos em inglês sem permitir que eles vazem para a apresentação pt-BR', () => {
    expect(getPlanetPresentationPtBr('sun')).toMatchObject({ label: 'Sol', symbol: '☉' });
    expect(getPlanetPresentationPtBr('moon')).toMatchObject({ label: 'Lua', symbol: '☽' });
    expect(getPlanetPresentationPtBr('mercury')).toMatchObject({ label: 'Mercúrio', symbol: '☿' });
    expect(getPlanetPresentationPtBr('unknown')).toMatchObject({ label: 'Corpo celeste' });
  });

  it('elege o anjo regente do consulente exclusivamente pela posição tropical natal do Sol', () => {
    const moon = { bodyId: 'moon' } as PositionalV2Planet;
    const sun = { bodyId: 'sun' } as PositionalV2Planet;

    expect(findConsultantRulingPosition([moon, sun])).toBe(sun);
    expect(findConsultantRulingPosition([moon])).toBeUndefined();
  });

  it('destaca no relatório textual o anjo regente solar e traduz os membros da falange', () => {
    const report = renderPositionalV2Text(makeData());

    expect(report).toContain('*👼 ANJO REGENTE DO CONSULENTE*');
    expect(report).toContain('#1 Vehuiah');
    expect(report).toContain('*Posição do Sol:* 1,25° de Áries');
    expect(report).toContain('#2 Jeliel: Lua.');
    expect(report).toContain('#1 Vehuiah: Sol.');
    expect(report).not.toContain(': moon.');
    expect(report).not.toContain(': sun.');
    expect(report).not.toContain('Base do cálculo');
    expect(report).not.toContain('Mapa calculado');
    expect(report).not.toContain('método');
  });

  it('destaca o regente solar e lista a falange agregada no HTML do e-mail em pt-BR', () => {
    const html = renderPositionalV2EmailHtml(makeData());

    expect(html).toContain('Anjo Regente do Consulente');
    expect(html).toContain('#1 Vehuiah');
    expect(html).toContain('<strong>Posição do Sol:</strong>');
    expect(html).toContain('Falange Angelical do Mapa');
    expect(html).toContain('#2 Jeliel');
    expect(html).toContain('Lua');
    expect(html).not.toContain('>moon<');
    expect(html).not.toContain('>sun<');
    expect(html).not.toContain('Base do cálculo');
    expect(html).not.toContain('derivada exclusivamente');
  });
});
