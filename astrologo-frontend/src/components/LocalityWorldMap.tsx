import { geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo';
import type { FeatureCollection, GeometryObject, MultiLineString } from 'geojson';
import { useState } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldTopologyJson from 'world-atlas/countries-110m.json';
import type { LocalityAngleId, LocalityMapV1 } from '../localityMapV1';

interface LocalityWorldMapProps {
  readonly data: LocalityMapV1;
}

const topology = worldTopologyJson as unknown as Topology<{
  countries: GeometryCollection;
}>;
const countries = feature(topology, topology.objects.countries) as FeatureCollection<GeometryObject>;

const BODY_COLORS: Readonly<Record<string, string>> = Object.freeze({
  sun: '#f59e0b',
  moon: '#60a5fa',
  mercury: '#a78bfa',
  venus: '#ec4899',
  mars: '#ef4444',
  jupiter: '#f97316',
  saturn: '#64748b',
  uranus: '#06b6d4',
  neptune: '#2563eb',
  pluto: '#9333ea',
});

const ANGLE_STYLES: Readonly<Record<LocalityAngleId, { dash?: string; width: number }>> = Object.freeze({
  mc: { width: 3 },
  ic: { width: 2, dash: '10 6' },
  ascendant: { width: 2.4 },
  descendant: { width: 2.4, dash: '4 5' },
});

export function LocalityWorldMap({ data }: LocalityWorldMapProps) {
  const bodies = [...new Map(data.lines.map((line) => [line.bodyId, line])).values()];
  const [selectedBodyId, setSelectedBodyId] = useState<string>(bodies[0]?.bodyId ?? 'all');
  const projection = geoEquirectangular().fitExtent(
    [
      [18, 18],
      [1182, 582],
    ],
    { type: 'Sphere' },
  );
  const path = geoPath(projection);
  const visibleLines =
    selectedBodyId === 'all' ? data.lines : data.lines.filter(({ bodyId }) => bodyId === selectedBodyId);

  return (
    <figure className="w-full">
      <div className="mb-4 flex flex-wrap justify-center gap-2" aria-label="Filtro de corpos do mapa de localidade">
        <button
          type="button"
          onClick={() => setSelectedBodyId('all')}
          className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
            selectedBodyId === 'all'
              ? 'border-slate-800 bg-slate-800 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Todos
        </button>
        {bodies.map((body) => (
          <button
            key={body.bodyId}
            type="button"
            onClick={() => setSelectedBodyId(body.bodyId)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition ${
              selectedBodyId === body.bodyId
                ? 'border-amber-300 bg-amber-50 text-amber-950 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span style={{ color: BODY_COLORS[body.bodyId] ?? '#7c3aed' }}>{body.bodySymbol}</span>
            {body.bodyDisplayNamePtBr}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 1200 600"
        role="img"
        aria-label="Mapa-múndi com linhas planetárias de localidade"
        className="h-auto w-full rounded-[1.6rem] border border-slate-700 bg-slate-950 shadow-[0_20px_45px_rgba(15,23,42,0.3)]"
      >
        <title>Mapa-múndi com linhas planetárias de localidade</title>
        <defs>
          <linearGradient id="locality-ocean" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#172554" />
            <stop offset="55%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <filter id="locality-line-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={path({ type: 'Sphere' }) ?? undefined} fill="url(#locality-ocean)" stroke="#334155" />
        <path
          d={path(geoGraticule10()) ?? undefined}
          fill="none"
          stroke="#64748b"
          strokeOpacity="0.22"
          strokeWidth="0.7"
        />
        <path
          data-world-land="natural-earth-110m"
          d={path(countries) ?? undefined}
          fill="#cbd5e1"
          fillOpacity="0.72"
          stroke="#f8fafc"
          strokeOpacity="0.5"
          strokeWidth="0.55"
        />

        {visibleLines.map((line) => {
          const definition = ANGLE_STYLES[line.angleId];
          const geometry = line.geometry as unknown as MultiLineString;
          const label = `${line.bodyDisplayNamePtBr} · ${line.angleDisplayNamePtBr}`;
          return (
            <path
              key={line.recordId}
              data-locality-line={line.recordId}
              d={path(geometry) ?? undefined}
              fill="none"
              stroke={BODY_COLORS[line.bodyId] ?? '#a78bfa'}
              strokeWidth={definition.width}
              strokeDasharray={definition.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={line.availability.status === 'unavailable' ? 0.25 : 0.9}
              filter="url(#locality-line-glow)"
              aria-label={label}
            >
              <title>{label}</title>
            </path>
          );
        })}
      </svg>

      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
        {(
          [
            ['mc', 'Meio do Céu', 'linha contínua forte'],
            ['ic', 'Fundo do Céu', 'traços longos'],
            ['ascendant', 'Ascendente', 'linha contínua'],
            ['descendant', 'Descendente', 'traços curtos'],
          ] as const
        ).map(([angleId, label, style]) => (
          <span key={angleId}>
            <strong>{label}:</strong> {style}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 text-center text-[0.68rem] leading-relaxed text-slate-500 md:text-xs">
        Base cartográfica: Natural Earth 1:110m, distribuída pelo pacote World Atlas. Linhas calculadas localmente; sem
        tiles, rastreamento ou chamadas cartográficas externas.
      </figcaption>
    </figure>
  );
}
