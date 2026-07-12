import { buildNatalWheelGeometry, longitudeToWheelPoint, normalizeWheelLongitude } from './chartGeometry';

export interface NatalWheelPlanet {
  readonly id: string;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly longitudeDeg: number;
  readonly color: string;
}

export interface NatalWheelAspect {
  readonly leftId: string;
  readonly rightId: string;
  readonly aspectId: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx';
  readonly orbDeg: number;
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
  conjunction: { namePtBr: 'Conjunção', color: '#f8fafc', dash: undefined },
  opposition: { namePtBr: 'Oposição', color: '#f87171', dash: undefined },
  trine: { namePtBr: 'Trígono', color: '#60a5fa', dash: undefined },
  square: { namePtBr: 'Quadratura', color: '#fb7185', dash: undefined },
  sextile: { namePtBr: 'Sextil', color: '#34d399', dash: '8 5' },
  quincunx: { namePtBr: 'Quincúncio', color: '#c084fc', dash: '4 6' },
} as const;

const formatDegree = (value: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(
    value,
  );

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
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

export function NatalChartWheel({
  ascendantLongitudeDeg,
  midheavenLongitudeDeg,
  houseCusps,
  planets,
  aspects = [],
}: NatalChartWheelProps) {
  const geometry = buildNatalWheelGeometry({ ascendantLongitudeDeg, houseCusps, planets });
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

  return (
    <figure className="mx-auto w-full max-w-3xl">
      <svg
        className="h-auto w-full drop-shadow-[0_22px_38px_rgba(49,46,129,0.28)]"
        viewBox="0 0 720 720"
        role="img"
        aria-label="Roda natal tropical com Casas Placidus, planetas e aspectos"
      >
        <title>Roda natal tropical com Casas Placidus, planetas e aspectos</title>
        <defs>
          <radialGradient id="natal-wheel-core" cx="50%" cy="45%" r="62%">
            <stop offset="0%" stopColor="#312e81" stopOpacity="0.72" />
            <stop offset="58%" stopColor="#111827" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <filter id="natal-wheel-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="360" cy="360" r="340" fill="url(#natal-wheel-core)" stroke="#c4b5fd" strokeWidth="2" />

        {SIGNS.map((sign, index0) => {
          const label = longitudeToWheelPoint(index0 * 30 + 15, geometry.ascendantLongitudeDeg, 316);
          return (
            <g key={sign.name} aria-label={sign.name}>
              <path
                d={donutSectorPath(index0 * 30, (index0 + 1) * 30, geometry.ascendantLongitudeDeg, 337, 292)}
                fill={sign.color}
                fillOpacity="0.2"
                stroke={sign.color}
                strokeOpacity="0.55"
                strokeWidth="1"
              />
              <text
                x={label.x}
                y={label.y}
                fill={sign.color}
                fontSize="25"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {sign.symbol}
              </text>
            </g>
          );
        })}

        <circle cx="360" cy="360" r="290" fill="none" stroke="#a78bfa" strokeOpacity="0.65" />
        <circle cx="360" cy="360" r="176" fill="#020617" fillOpacity="0.28" stroke="#8b5cf6" strokeOpacity="0.4" />

        {geometry.houseLines.map((line, index0) => {
          const nextCusp = geometry.houseLines[(index0 + 1) % geometry.houseLines.length]?.longitudeDeg ?? 0;
          const forwardArc = normalizeWheelLongitude(nextCusp - line.longitudeDeg);
          const label = longitudeToWheelPoint(line.longitudeDeg + forwardArc / 2, geometry.ascendantLongitudeDeg, 272);
          return (
            <g key={line.houseIndex1}>
              <line
                data-house-line={line.houseIndex1}
                x1={line.start.x}
                y1={line.start.y}
                x2={line.end.x}
                y2={line.end.y}
                stroke={line.houseIndex1 === 1 || line.houseIndex1 === 10 ? '#f8fafc' : '#c4b5fd'}
                strokeOpacity={line.houseIndex1 === 1 || line.houseIndex1 === 10 ? 0.9 : 0.34}
                strokeWidth={line.houseIndex1 === 1 || line.houseIndex1 === 10 ? 2.4 : 1.15}
              />
              <text x={label.x} y={label.y} fill="#ddd6fe" fontSize="12" textAnchor="middle" dominantBaseline="central">
                {line.houseIndex1}
              </text>
            </g>
          );
        })}

        {aspects.map((aspect) => {
          const left = chartPointsById.get(aspect.leftId);
          const right = chartPointsById.get(aspect.rightId);
          if (!left || !right) return null;
          const leftInner = longitudeToWheelPoint(left.longitudeDeg, geometry.ascendantLongitudeDeg, 170);
          const rightInner = longitudeToWheelPoint(right.longitudeDeg, geometry.ascendantLongitudeDeg, 170);
          const definition = ASPECTS[aspect.aspectId];
          const label = `${definition.namePtBr} entre ${left.displayNamePtBr} e ${right.displayNamePtBr}, orbe de ${formatDegree(aspect.orbDeg)} grau`;
          return (
            <line
              key={`${aspect.leftId}-${aspect.aspectId}-${aspect.rightId}`}
              x1={leftInner.x}
              y1={leftInner.y}
              x2={rightInner.x}
              y2={rightInner.y}
              stroke={definition.color}
              strokeWidth="1.8"
              strokeOpacity="0.72"
              strokeDasharray={definition.dash}
              aria-label={label}
            >
              <title>{label}</title>
            </line>
          );
        })}

        {geometry.planetPoints.map((point) => {
          const planet = planetsById.get(point.id);
          if (!planet) return null;
          const label = `${planet.displayNamePtBr} a ${formatDegree(point.longitudeDeg)} graus`;
          return (
            <g key={planet.id} aria-label={label}>
              <circle
                cx={point.x}
                cy={point.y}
                r="16"
                fill="#0f172a"
                stroke={planet.color}
                strokeWidth="2.2"
                filter="url(#natal-wheel-glow)"
              />
              <text
                x={point.x}
                y={point.y}
                fill={planet.color}
                fontSize="24"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {planet.symbol}
              </text>
              <title>{label}</title>
            </g>
          );
        })}

        {[
          { id: 'ASC', longitude: ascendantLongitudeDeg, color: '#f8fafc' },
          { id: 'DSC', longitude: ascendantLongitudeDeg + 180, color: '#c4b5fd' },
          ...(midheavenLongitudeDeg === undefined
            ? []
            : [
                { id: 'MC', longitude: midheavenLongitudeDeg, color: '#f8fafc' },
                { id: 'FC', longitude: midheavenLongitudeDeg + 180, color: '#c4b5fd' },
              ]),
        ].map((angle) => {
          const label = longitudeToWheelPoint(angle.longitude, geometry.ascendantLongitudeDeg, 275);
          return (
            <text
              key={angle.id}
              x={label.x}
              y={label.y}
              fill={angle.color}
              fontSize="13"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {angle.id}
            </text>
          );
        })}
      </svg>
      <figcaption className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-slate-600 md:text-sm">
        A roda usa os 12 signos tropicais para a escala circular. As constelações oficiais da IAU são regiões
        bidimensionais do céu e, por isso, não são transformadas artificialmente em 13 setores iguais.
      </figcaption>
    </figure>
  );
}
