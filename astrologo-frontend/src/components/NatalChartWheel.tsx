import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { buildNatalWheelGeometry, longitudeToWheelPoint, normalizeWheelLongitude } from './chartGeometry';
import { WheelElementModal } from './WheelElementModal';
import {
  angleMeaningPtBr,
  aspectMeaningPtBr,
  houseMeaningPtBr,
  planetMeaningPtBr,
  signMeaningPtBr,
  type WheelModalContent,
} from './wheelElementContent';

export interface NatalWheelPlanet {
  readonly id: string;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly longitudeDeg: number;
  readonly color: string;
  readonly tropicalSignNamePtBr?: string;
  readonly degreeWithinSignDeg?: number;
  readonly houseIndex1?: number;
  readonly directionPtBr?: string;
  readonly astronomicalConstellationPtBr?: string;
  readonly angelName?: string;
}

export interface NatalWheelAspect {
  readonly recordId?: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly aspectId: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx';
  readonly orbDeg: number;
  readonly separationDeg?: number;
  readonly intensityPercent?: number;
  readonly phasePtBr?: string;
}

interface NatalChartWheelProps {
  readonly ascendantLongitudeDeg: number;
  readonly midheavenLongitudeDeg?: number;
  readonly houseCusps: readonly number[];
  readonly planets: readonly NatalWheelPlanet[];
  readonly aspects?: readonly NatalWheelAspect[];
}

const SIGNS = [
  { name: 'Áries', symbol: '♈', color: '#fb7185' },
  { name: 'Touro', symbol: '♉', color: '#84cc16' },
  { name: 'Gêmeos', symbol: '♊', color: '#facc15' },
  { name: 'Câncer', symbol: '♋', color: '#38bdf8' },
  { name: 'Leão', symbol: '♌', color: '#f97316' },
  { name: 'Virgem', symbol: '♍', color: '#a3e635' },
  { name: 'Libra', symbol: '♎', color: '#fde047' },
  { name: 'Escorpião', symbol: '♏', color: '#0ea5e9' },
  { name: 'Sagitário', symbol: '♐', color: '#ef4444' },
  { name: 'Capricórnio', symbol: '♑', color: '#65a30d' },
  { name: 'Aquário', symbol: '♒', color: '#eab308' },
  { name: 'Peixes', symbol: '♓', color: '#0284c7' },
] as const;

const ASPECTS = {
  conjunction: { namePtBr: 'Conjunção', symbol: '☌', color: '#f8fafc', dash: undefined },
  opposition: { namePtBr: 'Oposição', symbol: '☍', color: '#f87171', dash: undefined },
  trine: { namePtBr: 'Trígono', symbol: '△', color: '#60a5fa', dash: undefined },
  square: { namePtBr: 'Quadratura', symbol: '□', color: '#fb7185', dash: undefined },
  sextile: { namePtBr: 'Sextil', symbol: '⚹', color: '#34d399', dash: '8 5' },
  quincunx: { namePtBr: 'Quincúncio', symbol: '⚻', color: '#c084fc', dash: '4 6' },
} as const;

const ANGLE_BY_HOUSE: Readonly<Partial<Record<number, 'asc' | 'dsc' | 'mc' | 'fc'>>> = Object.freeze({
  1: 'asc',
  4: 'fc',
  7: 'dsc',
  10: 'mc',
});

const DEGREE_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatDegree = (value: number) => DEGREE_FORMATTER.format(value);
const formatDegreeWithSymbol = (value: number) => `${formatDegree(value)}°`;

const signIndexForLongitude = (longitudeDeg: number) => Math.floor(normalizeWheelLongitude(longitudeDeg) / 30) % 12;

const compactFacts = (...facts: (string | undefined)[]) => facts.filter((fact): fact is string => Boolean(fact));

const donutSectorPath = (
  startLongitudeDeg: number,
  endLongitudeDeg: number,
  ascendantLongitudeDeg: number,
  outerRadius: number,
  innerRadius: number,
) => {
  const outerStart = longitudeToWheelPoint(startLongitudeDeg, ascendantLongitudeDeg, outerRadius);
  const outerEnd = longitudeToWheelPoint(endLongitudeDeg, ascendantLongitudeDeg, outerRadius);
  const innerEnd = longitudeToWheelPoint(endLongitudeDeg, ascendantLongitudeDeg, innerRadius);
  const innerStart = longitudeToWheelPoint(startLongitudeDeg, ascendantLongitudeDeg, innerRadius);
  const forwardArc = normalizeWheelLongitude(endLongitudeDeg - startLongitudeDeg);
  const largeArcFlag = forwardArc > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

type WheelSelection =
  | { readonly kind: 'planet'; readonly id: string }
  | { readonly kind: 'aspect'; readonly id: string; readonly leftId: string; readonly rightId: string }
  | { readonly kind: 'house'; readonly index1: number }
  | { readonly kind: 'sign'; readonly index0: number }
  | { readonly kind: 'angle'; readonly id: 'asc' | 'dsc' | 'mc' | 'fc'; readonly pointId?: string };

interface WheelInteractiveElement {
  readonly key: string;
  readonly selection: WheelSelection;
  readonly label: string;
  readonly shortLabel: string;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly content: WheelModalContent;
}

interface WheelAngleDefinition {
  readonly id: 'asc' | 'dsc' | 'mc' | 'fc';
  readonly pointId?: 'ascendant' | 'midheaven';
  readonly shortId: 'ASC' | 'DSC' | 'MC' | 'FC';
  readonly namePtBr: string;
  readonly longitude: number;
  readonly color: string;
}

type FocusableElement = Element & { focus: () => void };

const pointKey = (pointId: string): string => {
  if (pointId === 'ascendant') return 'angle:asc';
  if (pointId === 'midheaven') return 'angle:mc';
  return `planet:${pointId}`;
};

export function NatalChartWheel({
  ascendantLongitudeDeg,
  midheavenLongitudeDeg,
  houseCusps,
  planets,
  aspects = [],
}: NatalChartWheelProps) {
  const rawId = useId();
  const idPrefix = rawId.replaceAll(':', '');
  const coreGradientId = `${idPrefix}-natal-wheel-core`;
  const glowFilterId = `${idPrefix}-natal-wheel-glow`;
  const titleId = `${idPrefix}-natal-wheel-title`;
  const instructionsId = `${idPrefix}-natal-wheel-instructions`;
  const tooltipId = `${idPrefix}-natal-wheel-tooltip`;
  const geometry = useMemo(
    () => buildNatalWheelGeometry({ ascendantLongitudeDeg, houseCusps, planets }),
    [ascendantLongitudeDeg, houseCusps, planets],
  );
  const planetsById = new Map(planets.map((planet) => [planet.id, planet]));
  const chartPointsById = new Map(
    planets.map((planet) => [
      planet.id,
      { longitudeDeg: planet.longitudeDeg, displayNamePtBr: planet.displayNamePtBr },
    ]),
  );
  chartPointsById.set('ascendant', {
    longitudeDeg: ascendantLongitudeDeg,
    displayNamePtBr: 'Ascendente',
  });
  if (midheavenLongitudeDeg !== undefined) {
    chartPointsById.set('midheaven', {
      longitudeDeg: midheavenLongitudeDeg,
      displayNamePtBr: 'Meio do Céu',
    });
  }

  const signElements: WheelInteractiveElement[] = SIGNS.map((sign, index0) => {
    const anchor = longitudeToWheelPoint(index0 * 30 + 15, geometry.ascendantLongitudeDeg, 316);
    const occupants = planets.filter((planet) => signIndexForLongitude(planet.longitudeDeg) === index0);
    const occupantsLabel = occupants.map(({ displayNamePtBr }) => displayNamePtBr).join(', ');
    return {
      key: `sign:${index0}`,
      selection: { kind: 'sign', index0 },
      label: `${sign.name}, signo tropical; ${occupants.length} corpo${occupants.length === 1 ? '' : 's'} nesta faixa`,
      shortLabel: `${sign.symbol} ${sign.name}`,
      anchor,
      content: {
        title: sign.name,
        symbol: sign.symbol,
        color: sign.color,
        subtitle: 'Signo zodiacal',
        summary: signMeaningPtBr(index0),
        facts: compactFacts(
          `Faixa no mapa: ${index0 * 30}° a ${(index0 + 1) * 30}°`,
          occupantsLabel ? `Corpos nesta faixa: ${occupantsLabel}` : 'Nenhum planeta nesta faixa',
        ),
      },
    };
  });

  const houseElements: WheelInteractiveElement[] = geometry.houseLines.map((line, index0) => {
    const nextCusp = geometry.houseLines[(index0 + 1) % geometry.houseLines.length]?.longitudeDeg ?? line.longitudeDeg;
    const forwardArc = normalizeWheelLongitude(nextCusp - line.longitudeDeg);
    const anchor = longitudeToWheelPoint(line.longitudeDeg + forwardArc / 2, geometry.ascendantLongitudeDeg, 272);
    const cuspSignIndex = signIndexForLongitude(line.longitudeDeg);
    const cuspSign = SIGNS[cuspSignIndex];
    const cuspDegree = normalizeWheelLongitude(line.longitudeDeg) % 30;
    const occupants = planets.filter(({ houseIndex1 }) => houseIndex1 === line.houseIndex1);
    const occupantsLabel = occupants.map(({ displayNamePtBr }) => displayNamePtBr).join(', ');
    return {
      key: `house:${line.houseIndex1}`,
      selection: { kind: 'house', index1: line.houseIndex1 },
      label: `Casa ${line.houseIndex1}; ${houseMeaningPtBr(line.houseIndex1)}`,
      shortLabel: `Casa ${line.houseIndex1}`,
      anchor,
      content: {
        title: `Casa ${line.houseIndex1}`,
        symbol: String(line.houseIndex1),
        color: '#a78bfa',
        subtitle: houseMeaningPtBr(line.houseIndex1),
        summary: `Este setor destaca ${houseMeaningPtBr(line.houseIndex1).toLocaleLowerCase('pt-BR')}.`,
        facts: compactFacts(
          `Cúspide: ${formatDegreeWithSymbol(cuspDegree)} de ${cuspSign?.name ?? 'signo não identificado'}`,
          occupantsLabel ? `Corpos presentes: ${occupantsLabel}` : 'Sem planetas neste setor',
        ),
      },
    };
  });

  const aspectElements = aspects.flatMap((aspect, index0): WheelInteractiveElement[] => {
    const left = chartPointsById.get(aspect.leftId);
    const right = chartPointsById.get(aspect.rightId);
    if (!left || !right) return [];
    const leftInner = longitudeToWheelPoint(left.longitudeDeg, geometry.ascendantLongitudeDeg, 170);
    const rightInner = longitudeToWheelPoint(right.longitudeDeg, geometry.ascendantLongitudeDeg, 170);
    const definition = ASPECTS[aspect.aspectId];
    const id = aspect.recordId ?? `${aspect.leftId}-${aspect.aspectId}-${aspect.rightId}-${index0}`;
    const label = `${definition.namePtBr} entre ${left.displayNamePtBr} e ${right.displayNamePtBr}, orbe de ${formatDegree(aspect.orbDeg)} grau`;
    return [
      {
        key: `aspect:${id}`,
        selection: { kind: 'aspect', id, leftId: aspect.leftId, rightId: aspect.rightId },
        label,
        shortLabel: `${definition.symbol} ${left.displayNamePtBr}–${right.displayNamePtBr}`,
        anchor: { x: (leftInner.x + rightInner.x) / 2, y: (leftInner.y + rightInner.y) / 2 },
        content: {
          title: definition.namePtBr,
          symbol: definition.symbol,
          color: definition.color,
          subtitle: `${left.displayNamePtBr} e ${right.displayNamePtBr}`,
          summary: aspectMeaningPtBr(aspect.aspectId),
          facts: compactFacts(
            aspect.separationDeg === undefined
              ? undefined
              : `Separação: ${formatDegreeWithSymbol(aspect.separationDeg)}`,
            `Orbe: ${formatDegreeWithSymbol(aspect.orbDeg)}`,
            aspect.intensityPercent === undefined
              ? undefined
              : `Intensidade: ${PERCENT_FORMATTER.format(aspect.intensityPercent)}%`,
            aspect.phasePtBr ? `Fase: ${aspect.phasePtBr.replace(/^fase\s+/u, '')}` : undefined,
          ),
        },
      },
    ];
  });
  const aspectsByElementId = new Map(
    aspects.map((aspect, index0) => [
      aspect.recordId ?? `${aspect.leftId}-${aspect.aspectId}-${aspect.rightId}-${index0}`,
      aspect,
    ]),
  );

  const planetElements: WheelInteractiveElement[] = geometry.planetPoints.flatMap(
    (point): WheelInteractiveElement[] => {
      const planet = planetsById.get(point.id);
      if (!planet) return [];
      const signIndex = signIndexForLongitude(point.longitudeDeg);
      const sign = SIGNS[signIndex];
      const degreeWithinSign = planet.degreeWithinSignDeg ?? normalizeWheelLongitude(point.longitudeDeg) % 30;
      const signName = planet.tropicalSignNamePtBr ?? sign?.name ?? 'signo não identificado';
      const label = `${planet.displayNamePtBr} a ${formatDegree(degreeWithinSign)} graus de ${signName}${
        planet.houseIndex1 ? `, Casa ${planet.houseIndex1}` : ''
      }`;
      return [
        {
          key: `planet:${planet.id}`,
          selection: { kind: 'planet', id: planet.id },
          label,
          shortLabel: `${planet.symbol} ${planet.displayNamePtBr}`,
          anchor: { x: point.x, y: point.y },
          content: {
            title: planet.displayNamePtBr,
            symbol: planet.symbol,
            color: planet.color,
            subtitle: `${formatDegreeWithSymbol(degreeWithinSign)} de ${signName}`,
            summary: planetMeaningPtBr(planet.id),
            facts: compactFacts(
              planet.houseIndex1 ? `Presente na Casa ${planet.houseIndex1}` : undefined,
              planet.directionPtBr ? `Movimento: ${planet.directionPtBr}` : undefined,
              planet.astronomicalConstellationPtBr
                ? `Constelação observada: ${planet.astronomicalConstellationPtBr}`
                : undefined,
              planet.angelName ? `Anjo associado: ${planet.angelName}` : undefined,
            ),
          },
        },
      ];
    },
  );

  const angleDefinitions: readonly WheelAngleDefinition[] = [
    {
      id: 'asc',
      pointId: 'ascendant',
      shortId: 'ASC',
      namePtBr: 'Ascendente',
      longitude: ascendantLongitudeDeg,
      color: '#f8fafc',
    },
    {
      id: 'dsc',
      shortId: 'DSC',
      namePtBr: 'Descendente',
      longitude: ascendantLongitudeDeg + 180,
      color: '#c4b5fd',
    },
    ...(midheavenLongitudeDeg === undefined
      ? []
      : [
          {
            id: 'mc',
            pointId: 'midheaven',
            shortId: 'MC',
            namePtBr: 'Meio do Céu',
            longitude: midheavenLongitudeDeg,
            color: '#f8fafc',
          },
          {
            id: 'fc',
            shortId: 'FC',
            namePtBr: 'Fundo do Céu',
            longitude: midheavenLongitudeDeg + 180,
            color: '#c4b5fd',
          },
        ]),
  ];

  const angleElements: WheelInteractiveElement[] = angleDefinitions.map((angle) => {
    const anchor = longitudeToWheelPoint(angle.longitude, geometry.ascendantLongitudeDeg, 275);
    const signIndex = signIndexForLongitude(angle.longitude);
    const sign = SIGNS[signIndex];
    const degreeWithinSign = normalizeWheelLongitude(angle.longitude) % 30;
    return {
      key: `angle:${angle.id}`,
      selection: { kind: 'angle', id: angle.id, ...(angle.pointId ? { pointId: angle.pointId } : {}) },
      label: `${angle.namePtBr}, ${formatDegree(degreeWithinSign)} graus de ${sign?.name ?? 'signo não identificado'}`,
      shortLabel: angle.shortId,
      anchor,
      content: {
        title: angle.namePtBr,
        symbol: angle.shortId,
        color: angle.color,
        subtitle: `${formatDegreeWithSymbol(degreeWithinSign)} de ${sign?.name ?? 'signo não identificado'}`,
        summary: angleMeaningPtBr(angle.id),
        facts: [`Posição no mapa: ${formatDegreeWithSymbol(normalizeWheelLongitude(angle.longitude))}`],
      },
    };
  });

  const interactiveElements = [
    ...planetElements,
    ...angleElements,
    ...signElements,
    ...houseElements,
    ...aspectElements,
  ];
  const elementsByKey = new Map(interactiveElements.map((element) => [element.key, element]));
  const [hoveredElement, setHoveredElement] = useState<WheelInteractiveElement | null>(null);
  const [focusedElement, setFocusedElement] = useState<WheelInteractiveElement | null>(null);
  const [rovingKey, setRovingKey] = useState(interactiveElements[0]?.key ?? '');
  const [selectedContent, setSelectedContent] = useState<WheelModalContent | null>(null);
  const [modalTrigger, setModalTrigger] = useState<FocusableElement | null>(null);
  const elementRefs = useRef(new Map<string, SVGGElement>());
  const activeElement = focusedElement ?? hoveredElement;
  const effectiveRovingKey = elementsByKey.has(rovingKey) ? rovingKey : (interactiveElements[0]?.key ?? '');

  const closeModal = useCallback(() => setSelectedContent(null), []);

  const openElement = (element: WheelInteractiveElement, trigger: Element) => {
    if ('focus' in trigger && typeof (trigger as FocusableElement).focus === 'function') {
      setModalTrigger(trigger as FocusableElement);
    }
    setSelectedContent(element.content);
  };

  const handleElementKeyDown = (event: ReactKeyboardEvent<SVGGElement>, element: WheelInteractiveElement) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openElement(element, event.currentTarget);
      return;
    }
    const currentIndex = interactiveElements.findIndex(({ key }) => key === element.key);
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = currentIndex + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = currentIndex - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = interactiveElements.length - 1;
    if (nextIndex === undefined || interactiveElements.length === 0) return;
    event.preventDefault();
    const normalizedIndex = (nextIndex + interactiveElements.length) % interactiveElements.length;
    const nextElement = interactiveElements[normalizedIndex];
    if (!nextElement) return;
    setRovingKey(nextElement.key);
    elementRefs.current.get(nextElement.key)?.focus();
  };

  const interactionProps = (element: WheelInteractiveElement) => ({
    role: 'button' as const,
    tabIndex: effectiveRovingKey === element.key ? 0 : -1,
    'aria-label': element.label,
    'aria-describedby': activeElement?.key === element.key ? tooltipId : undefined,
    ref: (node: SVGGElement | null) => {
      if (node) elementRefs.current.set(element.key, node);
      else elementRefs.current.delete(element.key);
    },
    onPointerEnter: () => setHoveredElement(element),
    onPointerLeave: () => setHoveredElement((current) => (current?.key === element.key ? null : current)),
    onFocus: () => {
      setRovingKey(element.key);
      setFocusedElement(element);
    },
    onBlur: () => setFocusedElement((current) => (current?.key === element.key ? null : current)),
    onClick: (event: ReactMouseEvent<SVGGElement>) => openElement(element, event.currentTarget),
    onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => handleElementKeyDown(event, element),
  });

  const relatedKeys = new Set<string>();
  if (activeElement) {
    relatedKeys.add(activeElement.key);
    const selection = activeElement.selection;
    if (selection.kind === 'planet' || selection.kind === 'angle') {
      const activePointId = selection.kind === 'planet' ? selection.id : selection.pointId;
      if (selection.kind === 'planet') {
        const planet = planetsById.get(selection.id);
        if (planet?.houseIndex1) relatedKeys.add(`house:${planet.houseIndex1}`);
        if (planet) relatedKeys.add(`sign:${signIndexForLongitude(planet.longitudeDeg)}`);
      }
      if (selection.kind === 'angle') {
        const angleHouse = { asc: 1, dsc: 7, mc: 10, fc: 4 }[selection.id];
        relatedKeys.add(`house:${angleHouse}`);
      }
      if (activePointId) {
        for (const aspectElement of aspectElements) {
          if (aspectElement.selection.kind !== 'aspect') continue;
          if (aspectElement.selection.leftId === activePointId || aspectElement.selection.rightId === activePointId) {
            relatedKeys.add(aspectElement.key);
            relatedKeys.add(pointKey(aspectElement.selection.leftId));
            relatedKeys.add(pointKey(aspectElement.selection.rightId));
          }
        }
      }
    }
    if (selection.kind === 'aspect') {
      relatedKeys.add(pointKey(selection.leftId));
      relatedKeys.add(pointKey(selection.rightId));
    }
    if (selection.kind === 'house') {
      const angleId = ANGLE_BY_HOUSE[selection.index1];
      if (angleId) relatedKeys.add(`angle:${angleId}`);
      for (const planet of planets) {
        if (planet.houseIndex1 === selection.index1) relatedKeys.add(`planet:${planet.id}`);
      }
    }
    if (selection.kind === 'sign') {
      for (const planet of planets) {
        if (signIndexForLongitude(planet.longitudeDeg) === selection.index0) relatedKeys.add(`planet:${planet.id}`);
      }
    }
  }

  const opacityFor = (key: string, baseOpacity = 1) =>
    !activeElement || relatedKeys.has(key) ? baseOpacity : Math.min(baseOpacity, 0.24);
  const isActive = (key: string) => activeElement?.key === key;
  const tooltipAnchor = activeElement
    ? {
        x: Math.min(660, Math.max(60, activeElement.anchor.x)),
        y: Math.min(660, Math.max(60, activeElement.anchor.y)),
      }
    : null;

  return (
    <figure className="mx-auto w-full max-w-3xl">
      <div className="relative">
        <svg
          className="h-auto w-full drop-shadow-[0_22px_38px_rgba(49,46,129,0.28)]"
          viewBox="0 0 720 720"
          role="group"
          aria-labelledby={titleId}
          aria-describedby={instructionsId}
        >
          <title id={titleId}>Roda natal tropical com Casas Placidus, planetas e aspectos interativos</title>
          <defs>
            <radialGradient id={coreGradientId} cx="50%" cy="45%" r="62%">
              <stop offset="0%" stopColor="#312e81" stopOpacity="0.72" />
              <stop offset="58%" stopColor="#111827" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
            <filter id={glowFilterId} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="360" cy="360" r="340" fill={`url(#${coreGradientId})`} stroke="#c4b5fd" strokeWidth="2" />

          {signElements.map((element, index0) => {
            const sign = SIGNS[index0];
            if (!sign) return null;
            return (
              <g
                key={element.key}
                {...interactionProps(element)}
                className="cursor-pointer transition-[opacity,filter] duration-200 focus:outline-none motion-reduce:transition-none"
                style={{ opacity: opacityFor(element.key) }}
              >
                <path
                  d={donutSectorPath(index0 * 30, (index0 + 1) * 30, geometry.ascendantLongitudeDeg, 337, 292)}
                  fill={sign.color}
                  fillOpacity={isActive(element.key) ? 0.38 : 0.2}
                  stroke={sign.color}
                  strokeOpacity={isActive(element.key) ? 1 : 0.55}
                  strokeWidth={isActive(element.key) ? 2.4 : 1}
                  filter={isActive(element.key) ? `url(#${glowFilterId})` : undefined}
                />
                <text
                  x={element.anchor.x}
                  y={element.anchor.y}
                  fill={sign.color}
                  fontSize={isActive(element.key) ? 30 : 25}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {sign.symbol}
                </text>
              </g>
            );
          })}

          <circle cx="360" cy="360" r="290" fill="none" stroke="#a78bfa" strokeOpacity="0.65" />
          <circle cx="360" cy="360" r="176" fill="#020617" fillOpacity="0.28" stroke="#8b5cf6" strokeOpacity="0.4" />

          {houseElements.map((element, index0) => {
            const line = geometry.houseLines[index0];
            const nextLine = geometry.houseLines[(index0 + 1) % geometry.houseLines.length];
            if (!line || !nextLine) return null;
            return (
              <g
                key={element.key}
                {...interactionProps(element)}
                className="cursor-pointer transition-[opacity,filter] duration-200 focus:outline-none motion-reduce:transition-none"
                style={{ opacity: opacityFor(element.key) }}
              >
                <path
                  d={donutSectorPath(
                    line.longitudeDeg,
                    nextLine.longitudeDeg,
                    geometry.ascendantLongitudeDeg,
                    290,
                    176,
                  )}
                  fill="#a78bfa"
                  fillOpacity={isActive(element.key) ? 0.2 : 0.001}
                  stroke="none"
                  pointerEvents="all"
                />
                <line
                  data-house-line={line.houseIndex1}
                  x1={line.start.x}
                  y1={line.start.y}
                  x2={line.end.x}
                  y2={line.end.y}
                  stroke={line.houseIndex1 === 1 || line.houseIndex1 === 10 ? '#f8fafc' : '#c4b5fd'}
                  strokeOpacity={
                    line.houseIndex1 === 1 || line.houseIndex1 === 10 || isActive(element.key) ? 0.95 : 0.34
                  }
                  strokeWidth={
                    isActive(element.key) ? 3.4 : line.houseIndex1 === 1 || line.houseIndex1 === 10 ? 2.4 : 1.15
                  }
                  filter={isActive(element.key) ? `url(#${glowFilterId})` : undefined}
                  aria-hidden="true"
                />
                <text
                  x={element.anchor.x}
                  y={element.anchor.y}
                  fill="#ddd6fe"
                  fontSize={isActive(element.key) ? 16 : 12}
                  fontWeight={isActive(element.key) ? 900 : 400}
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {line.houseIndex1}
                </text>
              </g>
            );
          })}

          {aspectElements.map((element) => {
            if (element.selection.kind !== 'aspect') return null;
            const aspect = aspectsByElementId.get(element.selection.id);
            if (!aspect) return null;
            const left = chartPointsById.get(aspect.leftId);
            const right = chartPointsById.get(aspect.rightId);
            if (!left || !right) return null;
            const leftInner = longitudeToWheelPoint(left.longitudeDeg, geometry.ascendantLongitudeDeg, 170);
            const rightInner = longitudeToWheelPoint(right.longitudeDeg, geometry.ascendantLongitudeDeg, 170);
            const definition = ASPECTS[aspect.aspectId];
            return (
              <g
                key={element.key}
                {...interactionProps(element)}
                className="cursor-pointer transition-opacity duration-200 focus:outline-none motion-reduce:transition-none"
                style={{ opacity: opacityFor(element.key, isActive(element.key) ? 1 : 0.72) }}
              >
                <line
                  x1={leftInner.x}
                  y1={leftInner.y}
                  x2={rightInner.x}
                  y2={rightInner.y}
                  stroke={definition.color}
                  strokeWidth={isActive(element.key) ? 4 : 1.8}
                  strokeOpacity={isActive(element.key) ? 1 : 0.72}
                  strokeDasharray={definition.dash}
                  filter={isActive(element.key) ? `url(#${glowFilterId})` : undefined}
                  aria-hidden="true"
                />
                <line
                  x1={leftInner.x}
                  y1={leftInner.y}
                  x2={rightInner.x}
                  y2={rightInner.y}
                  stroke="transparent"
                  strokeWidth="18"
                  pointerEvents="stroke"
                  aria-hidden="true"
                />
              </g>
            );
          })}

          {planetElements.map((element) => {
            if (element.selection.kind !== 'planet') return null;
            const point = geometry.planetPoints.find(({ id }) => id === element.selection.id);
            const planet = planetsById.get(element.selection.id);
            if (!point || !planet) return null;
            return (
              <g
                key={element.key}
                {...interactionProps(element)}
                className={`cursor-pointer transition-[opacity,transform,filter] duration-200 focus:outline-none motion-reduce:transform-none motion-reduce:transition-none ${
                  isActive(element.key) ? 'scale-110' : ''
                }`}
                style={{ opacity: opacityFor(element.key), transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <circle cx={point.x} cy={point.y} r="27" fill="transparent" pointerEvents="all" aria-hidden="true" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isActive(element.key) ? 19 : 16}
                  fill="#0f172a"
                  stroke={planet.color}
                  strokeWidth={isActive(element.key) ? 3.6 : 2.2}
                  filter={`url(#${glowFilterId})`}
                  aria-hidden="true"
                />
                <text
                  x={point.x}
                  y={point.y}
                  fill={planet.color}
                  fontSize={isActive(element.key) ? 28 : 24}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="central"
                  aria-hidden="true"
                >
                  {planet.symbol}
                </text>
              </g>
            );
          })}

          {angleElements.map((element, index0) => {
            const angle = angleDefinitions[index0];
            if (!angle) return null;
            return (
              <g
                key={element.key}
                {...interactionProps(element)}
                className="cursor-pointer transition-[opacity,transform,filter] duration-200 focus:outline-none motion-reduce:transform-none motion-reduce:transition-none"
                style={{
                  opacity: opacityFor(element.key),
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: isActive(element.key) ? 'scale(1.12)' : undefined,
                }}
              >
                <circle cx={element.anchor.x} cy={element.anchor.y} r="24" fill="transparent" pointerEvents="all" />
                <text
                  x={element.anchor.x}
                  y={element.anchor.y}
                  fill={angle.color}
                  fontSize={isActive(element.key) ? 16 : 13}
                  fontWeight="800"
                  textAnchor="middle"
                  dominantBaseline="central"
                  filter={isActive(element.key) ? `url(#${glowFilterId})` : undefined}
                  aria-hidden="true"
                >
                  {angle.shortId}
                </text>
              </g>
            );
          })}
        </svg>

        {activeElement && tooltipAnchor ? (
          <div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none absolute z-20 max-w-64 -translate-x-1/2 -translate-y-[calc(100%+0.75rem)] rounded-xl border border-white/25 bg-slate-950/92 px-3 py-2 text-center text-xs font-bold leading-snug text-white shadow-xl backdrop-blur-xl"
            style={{ left: `${(tooltipAnchor.x / 720) * 100}%`, top: `${(tooltipAnchor.y / 720) * 100}%` }}
          >
            {activeElement.label}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 md:hidden" aria-label="Explorar elementos da roda natal">
        {interactiveElements.map((element) => (
          <button
            key={`mobile:${element.key}`}
            type="button"
            onClick={(event) => openElement(element, event.currentTarget)}
            onFocus={() => setFocusedElement(element)}
            onBlur={() => setFocusedElement((current) => (current?.key === element.key ? null : current))}
            className="min-h-11 shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs font-black text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          >
            {element.shortLabel}
          </button>
        ))}
      </div>

      <figcaption
        id={instructionsId}
        className="mx-auto mt-4 max-w-2xl text-center text-xs font-semibold leading-relaxed text-white md:text-sm"
      >
        <span className="block text-white">
          A roda usa os 12 signos tropicais para a escala circular. As constelações oficiais da IAU são regiões
          bidimensionais do céu e, por isso, não são transformadas artificialmente em 13 setores iguais.
        </span>
        <span className="mt-2 block text-white">
          Passe o cursor sobre um elemento ou use Tab e as setas para explorá-lo. Clique, toque ou pressione Enter para
          abrir uma explicação breve.
        </span>
      </figcaption>

      <WheelElementModal content={selectedContent} onClose={closeModal} returnFocusTo={modalTrigger} />
    </figure>
  );
}
