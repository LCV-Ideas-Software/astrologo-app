import { Compass, Hash, HelpCircle, Sparkles } from 'lucide-react';
import type { DadosPosicionaisV2 } from '../astrologyV2';
import type { InfoTopic } from '../infoContent';
import {
  aspectPhaseLabelPtBr,
  formatNatalDegreePtBr,
  HOUSE_THEMES_PT_BR,
  type NatalChartAnalysisV1,
} from '../natalAnalysisV1';
import { NatalChartWheel, type NatalWheelAspect, type NatalWheelPlanet } from './NatalChartWheel';

interface NatalAnalysisPanelProps {
  readonly positional: DadosPosicionaisV2;
  readonly analysis: NatalChartAnalysisV1;
  readonly openInfoModal: (topic: InfoTopic) => void;
}

const PLANET_COLORS: Readonly<Record<string, string>> = Object.freeze({
  sun: '#f59e0b',
  moon: '#60a5fa',
  mercury: '#a78bfa',
  venus: '#f472b6',
  mars: '#ef4444',
  jupiter: '#fb923c',
  saturn: '#94a3b8',
  uranus: '#22d3ee',
  neptune: '#3b82f6',
  pluto: '#c084fc',
});

const PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const pointName = (analysis: NatalChartAnalysisV1, pointId: string): string =>
  analysis.points.find(({ id }) => id === pointId)?.displayNamePtBr ?? 'Ponto não identificado';

const movementLabelPtBr = (direction: 'direct' | 'retrograde' | 'stationary' | undefined): string | undefined => {
  if (direction === 'direct') return 'direto';
  if (direction === 'retrograde') return 'retrógrado';
  if (direction === 'stationary') return 'estacionário';
  return undefined;
};

export function NatalAnalysisPanel({ positional, analysis, openInfoModal }: NatalAnalysisPanelProps) {
  const ascendant = positional.angles.find(({ angleId }) => angleId === 'ascendant');
  const midheaven = positional.angles.find(({ angleId }) => angleId === 'midheaven');
  const canRenderWheel = positional.houses.status === 'available' && positional.houses.cusps && ascendant;
  const movementByBody = new Map(analysis.movements.map((movement) => [movement.bodyId, movement]));
  const wheelPlanets: NatalWheelPlanet[] = positional.positions.map((position) => {
    const movement = movementByBody.get(position.bodyId);
    const directionPtBr = movement?.status === 'available' ? movementLabelPtBr(movement.direction) : undefined;
    return {
      id: position.bodyId,
      displayNamePtBr: position.displayNamePtBr,
      symbol: position.symbol,
      longitudeDeg: position.coordinates.eclipticLongitudeDeg,
      color: PLANET_COLORS[position.bodyId] ?? '#a78bfa',
      tropicalSignNamePtBr: position.tropical.sign.namePtBr,
      degreeWithinSignDeg: position.tropical.degreeWithinSignDeg,
      ...(position.housePlacement.status === 'available' && position.housePlacement.houseIndex1
        ? { houseIndex1: position.housePlacement.houseIndex1 }
        : {}),
      ...(directionPtBr ? { directionPtBr } : {}),
      ...(position.astronomicalReal.status === 'available' && position.astronomicalReal.constellation
        ? { astronomicalConstellationPtBr: position.astronomicalReal.constellation.namePtBr }
        : {}),
      angelName: position.angelicQuinary.angel.canonicalName,
    };
  });
  const wheelAspects: NatalWheelAspect[] = analysis.aspects.map((aspect) => ({
    recordId: aspect.recordId,
    leftId: aspect.pointA.id,
    rightId: aspect.pointB.id,
    aspectId: aspect.aspectId,
    orbDeg: aspect.orbDeg,
    separationDeg: aspect.separationDeg,
    intensityPercent: aspect.intensityPercent,
    phasePtBr: aspectPhaseLabelPtBr(aspect.phase),
  }));
  const positionByBody = new Map(positional.positions.map((position) => [position.bodyId, position]));
  const occupantsByHouse = new Map<number, NatalChartAnalysisV1['houseOccupancies']>();
  for (const occupancy of analysis.houseOccupancies) {
    if (occupancy.occupancy.status !== 'available') continue;
    const entries = occupantsByHouse.get(occupancy.occupancy.houseIndex1) ?? [];
    occupantsByHouse.set(occupancy.occupancy.houseIndex1, [...entries, occupancy]);
  }

  return (
    <section aria-label="Mapa natal completo" className="mx-auto mt-8 w-full max-w-6xl space-y-7">
      <article className="overflow-hidden rounded-[2.25rem] border border-indigo-100 bg-white/90 shadow-[0_18px_55px_rgba(79,70,229,0.13)] backdrop-blur-2xl">
        <header className="flex flex-col gap-4 border-b border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-violet-50 px-5 py-7 sm:flex-row sm:items-start sm:justify-between md:px-8">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-700 text-white shadow-lg shadow-indigo-200"
            >
              <Compass className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-700">Desenho do céu natal</p>
              <h3 className="mt-1 text-xl font-black text-slate-900 md:text-3xl">Roda do Mapa Natal</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Uma leitura visual das longitudes tropicais, das Casas Placidus e dos aspectos calculados. O Ascendente
                permanece orientado à esquerda.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Saiba mais sobre a Roda do Mapa Natal"
            onClick={() => openInfoModal('natalWheel')}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-indigo-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </header>
        <div className="bg-linear-to-b from-slate-950 via-indigo-950 to-slate-950 px-3 py-6 md:px-8 md:py-9">
          {canRenderWheel ? (
            <NatalChartWheel
              ascendantLongitudeDeg={ascendant.eclipticLongitudeDeg}
              {...(midheaven ? { midheavenLongitudeDeg: midheaven.eclipticLongitudeDeg } : {})}
              houseCusps={positional.houses.cusps.map(({ eclipticLongitudeDeg }) => eclipticLongitudeDeg)}
              planets={wheelPlanets}
              aspects={wheelAspects}
            />
          ) : (
            <p className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
              A roda completa está indisponível porque as Casas Placidus ou o Ascendente não puderam ser determinados
              com segurança.
            </p>
          )}
        </div>
      </article>

      <article className="rounded-[2.25rem] border border-rose-100 bg-white/90 p-5 shadow-[0_18px_48px_rgba(225,29,72,0.09)] backdrop-blur-2xl md:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-rose-400 to-fuchsia-600 text-white shadow-lg shadow-rose-100"
            >
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Relações angulares</p>
              <h3 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">Aspectos Natais</h3>
              <p className="mt-2 text-sm text-slate-600">
                {analysis.aspects.length} relações angulares identificadas neste mapa.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Saiba mais sobre os Aspectos Natais"
            onClick={() => openInfoModal('natalAspects')}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-rose-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-rose-700 shadow-sm transition hover:bg-rose-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </header>

        {analysis.aspects.length > 0 ? (
          <ul className="mt-6 grid gap-3 md:grid-cols-2" aria-label="Aspectos do mapa natal">
            {analysis.aspects.map((aspect) => (
              <li
                key={aspect.recordId}
                className="rounded-2xl border border-rose-100 bg-linear-to-br from-white to-rose-50/60 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-rose-200 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:scale-[1.01] focus-visible:border-rose-300 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-rose-700">
                      {aspect.displayNamePtBr}
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {pointName(analysis, aspect.pointA.id)} ↔ {pointName(analysis, aspect.pointB.id)}
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">
                    {PERCENT_FORMATTER.format(aspect.intensityPercent)}%
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-white/85 p-2">
                    <dt className="font-bold text-slate-500">Separação</dt>
                    <dd className="mt-1 font-black text-slate-800">{formatNatalDegreePtBr(aspect.separationDeg)}</dd>
                  </div>
                  <div className="rounded-xl bg-white/85 p-2">
                    <dt className="font-bold text-slate-500">Orbe</dt>
                    <dd className="mt-1 font-black text-slate-800">{formatNatalDegreePtBr(aspect.orbDeg)}</dd>
                  </div>
                  <div className="rounded-xl bg-white/85 p-2">
                    <dt className="font-bold text-slate-500">Fase</dt>
                    <dd className="mt-1 font-black text-slate-800">{aspectPhaseLabelPtBr(aspect.phase)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Nenhuma relação angular foi identificada dentro dos limites desta leitura.
          </p>
        )}
      </article>

      <article className="rounded-[2.25rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_48px_rgba(5,150,105,0.09)] backdrop-blur-2xl md:p-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-100"
            >
              <Hash className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Setores de experiência</p>
              <h3 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">Análise das Casas</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Temas das 12 Casas Placidus, seus planetas ocupantes e a posição de cada corpo dentro da casa quando
                disponível.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Saiba mais sobre a Análise das Casas e o grau mundano"
            onClick={() => openInfoModal('houseInfluences')}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </header>

        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Análise das doze Casas Placidus">
          {HOUSE_THEMES_PT_BR.map((theme, index0) => {
            const houseIndex1 = index0 + 1;
            const occupants = occupantsByHouse.get(houseIndex1) ?? [];
            return (
              <li
                key={houseIndex1}
                className="rounded-[1.6rem] border border-emerald-100 bg-linear-to-br from-white to-emerald-50/55 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-emerald-200 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:scale-[1.01] focus-visible:border-emerald-300 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 motion-reduce:transform-none motion-reduce:transition-none"
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Casa {houseIndex1}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{theme}</p>
                <div className="mt-4 space-y-2">
                  {occupants.length > 0 ? (
                    occupants.map((occupancy) => {
                      const position = positionByBody.get(occupancy.bodyId);
                      const mundane = occupancy.mundaneDegreeWithinHouse;
                      return (
                        <div
                          key={occupancy.bodyId}
                          className="flex items-center gap-3 rounded-xl border border-white bg-white/90 p-2.5 shadow-sm"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-2xl font-black"
                            style={{
                              color: PLANET_COLORS[occupancy.bodyId] ?? '#7c3aed',
                              backgroundColor: `${PLANET_COLORS[occupancy.bodyId] ?? '#7c3aed'}18`,
                            }}
                          >
                            {position?.symbol ?? '✦'}
                          </span>
                          <p className="min-w-0 text-xs leading-relaxed text-slate-600">
                            <strong className="block text-sm text-slate-900">
                              {position?.displayNamePtBr ?? 'Corpo celeste'}
                            </strong>
                            {mundane.status === 'available'
                              ? `grau mundano ${formatNatalDegreePtBr(mundane.degreeWithinHouseDeg)}`
                              : 'posição dentro da casa indisponível'}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                      Nenhum planeta nesta casa.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </article>
    </section>
  );
}
