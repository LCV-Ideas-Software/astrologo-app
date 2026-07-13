import { Clock, HelpCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { formatInstantInBrasilia } from '../astrologyV2';
import type { InfoTopic } from '../infoContent';
import { formatTransitDegreePtBr, isTransitRunV1, type TransitRunV1, transitPhaseLabelPtBr } from '../transitRunV1';

interface CurrentSkyPanelProps {
  readonly mapaId: string;
  readonly run: TransitRunV1 | null;
  readonly onRunChange: (run: TransitRunV1) => void;
  readonly openInfoModal: (topic: InfoTopic) => void;
  readonly notify: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PLANET_COLORS: Readonly<Record<string, string>> = Object.freeze({
  sun: '#f59e0b',
  moon: '#60a5fa',
  mercury: '#8b5cf6',
  venus: '#ec4899',
  mars: '#ef4444',
  jupiter: '#f97316',
  saturn: '#64748b',
  uranus: '#06b6d4',
  neptune: '#2563eb',
  pluto: '#9333ea',
});

export function CurrentSkyPanel({ mapaId, run, onRunChange, openInfoModal, notify }: CurrentSkyPanelProps) {
  const [loading, setLoading] = useState(false);
  const [horizonDays, setHorizonDays] = useState(run?.request.horizonDays ?? 7);

  const calculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/transitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapaId, horizonDays }),
      });
      const payload = (await response.json()) as { success?: boolean; transitRunV1?: unknown; error?: string };
      if (!response.ok || !payload.success || !isTransitRunV1(payload.transitRunV1)) {
        notify(payload.error ?? 'Não foi possível calcular o céu atual.', 'error');
        return;
      }
      onRunChange(payload.transitRunV1);
      notify('Céu atual calculado com sucesso.', 'success');
    } catch {
      notify('Não foi possível calcular o céu atual agora. Tente novamente em alguns instantes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const natalTargetName = (pointId: string) =>
    run?.natalTargets.find(({ pointId: candidate }) => candidate === pointId)?.displayNamePtBr ?? 'Ponto natal';
  const transitName = (bodyId: string) =>
    run?.positionsAtReference.find(({ bodyId: candidate }) => candidate === bodyId)?.displayNamePtBr ??
    'Corpo em trânsito';

  return (
    <section
      aria-labelledby="ceu-atual-titulo"
      className="mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-[2.25rem] border border-sky-100 bg-white/90 shadow-[0_18px_55px_rgba(2,132,199,0.12)] backdrop-blur-2xl"
    >
      <header className="flex flex-col gap-5 border-b border-sky-100 bg-linear-to-br from-sky-50 via-white to-indigo-50 px-5 py-7 lg:flex-row lg:items-start lg:justify-between md:px-8">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-200"
          >
            <Clock className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">Influências vigentes</p>
            <h3 id="ceu-atual-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-3xl">
              Céu Atual e Trânsitos
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Compara o céu do momento da consulta ao mapa natal e destaca as influências vigentes no período escolhido.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-800">
            Horizonte
            <select
              value={horizonDays}
              onChange={(event) => setHorizonDays(Number(event.target.value))}
              className="bg-transparent font-black outline-none"
              aria-label="Horizonte dos trânsitos"
            >
              <option value={1}>1 dia</option>
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </label>
          <button
            type="button"
            onClick={calculate}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-linear-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
          >
            {loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? 'Calculando...' : 'Atualizar céu agora'}
          </button>
          <button
            type="button"
            aria-label="Saiba mais sobre o Céu Atual e os Trânsitos"
            onClick={() => openInfoModal('currentSky')}
            className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-sky-700 shadow-sm transition hover:bg-sky-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </div>
      </header>

      {run ? (
        <div className="space-y-7 px-4 py-6 md:px-8 md:py-8">
          <p className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
            Referência: <strong>{formatInstantInBrasilia(run.request.referenceInstantUtc)}</strong> —{' '}
            <strong>Hora oficial de Brasília</strong> · horizonte de {run.request.horizonDays} dia(s).
          </p>

          <div>
            <h4 className="font-black text-slate-900 md:text-lg">Posições do céu no instante de referência</h4>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Posições planetárias atuais">
              {run.positionsAtReference.map((position) => (
                <li
                  key={position.bodyId}
                  className="rounded-2xl border border-sky-100 bg-linear-to-br from-white to-sky-50/60 p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-sky-200 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:scale-[1.01] focus-visible:border-sky-300 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-3xl font-black"
                      style={{
                        color: PLANET_COLORS[position.bodyId] ?? '#2563eb',
                        backgroundColor: `${PLANET_COLORS[position.bodyId] ?? '#2563eb'}18`,
                      }}
                    >
                      {position.symbol}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900">{position.displayNamePtBr}</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {formatTransitDegreePtBr(position.tropical.degreeWithinSignDeg)} de{' '}
                        {position.tropical.signNamePtBr}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-sky-800">
                    {position.natalHousePlacement.status === 'available'
                      ? `Casa natal ${position.natalHousePlacement.houseIndex1}`
                      : 'Casa natal indisponível'}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-indigo-700">
                    {position.astronomicalReal.status === 'available'
                      ? `Constelação: ${position.astronomicalReal.constellation.namePtBr}`
                      : 'Constelação indisponível'}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-black text-slate-900 md:text-lg">Aspectos trânsito–natal vigentes</h4>
            {run.aspects.length > 0 ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2" aria-label="Aspectos de trânsito vigentes">
                {run.aspects.map((aspect) => (
                  <li
                    key={aspect.recordId}
                    className="rounded-2xl border border-indigo-100 bg-linear-to-br from-white to-indigo-50/60 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-indigo-200 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:scale-[1.01] focus-visible:border-indigo-300 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-indigo-700">
                      {aspect.displayNamePtBr}
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {transitName(aspect.transitPoint.bodyId)} em trânsito ↔{' '}
                      {natalTargetName(aspect.natalPoint.pointId)} natal
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      Orbe <strong>{formatTransitDegreePtBr(aspect.orbDeg)}</strong> ·{' '}
                      <strong>{transitPhaseLabelPtBr(aspect.phase)}</strong>
                    </p>
                    <p className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-indigo-800">
                      {aspect.exactitude.status === 'available'
                        ? `Aperfeiçoamento: ${formatInstantInBrasilia(aspect.exactitude.exactAtUtc)} — Hora oficial de Brasília`
                        : 'Momento exato não identificado no período escolhido.'}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Nenhum aspecto trânsito–natal ficou dentro do orbe de 2,00° neste instante.
              </p>
            )}
          </div>

          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            A leitura descreve influências simbólicas vigentes e possibilidades; não é uma previsão inevitável nem uma
            garantia de acontecimentos.
          </p>
        </div>
      ) : (
        <div className="px-5 py-8 text-center md:px-8">
          <p className="text-sm leading-relaxed text-slate-600">
            Clique em <strong>Atualizar céu agora</strong> para calcular as influências vigentes sem alterar o mapa
            natal.
          </p>
        </div>
      )}
    </section>
  );
}
