import { HelpCircle, MapPinned, RefreshCw, Sparkles } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { formatInstantInBrasilia } from '../astrologyV2';
import type { InfoTopic } from '../infoContent';
import { isLocalityMapV1, type LocalityMapV1 } from '../localityMapV1';

const LocalityWorldMap = lazy(() =>
  import('./LocalityWorldMap').then((module) => ({ default: module.LocalityWorldMap })),
);

interface LocalityPanelProps {
  readonly mapaId: string;
  readonly data: LocalityMapV1 | null;
  readonly onDataChange: (data: LocalityMapV1) => void;
  readonly openInfoModal: (topic: InfoTopic) => void;
  readonly notify: (message: string, type: 'success' | 'error' | 'info') => void;
}

const RESOLUTIONS = [0.5, 1, 2, 5] as const;
const RESOLUTION_LABELS: Readonly<Record<(typeof RESOLUTIONS)[number], string>> = {
  0.5: 'Muito alto',
  1: 'Alto',
  2: 'Médio',
  5: 'Essencial',
};

export function LocalityPanel({ mapaId, data, onDataChange, openInfoModal, notify }: LocalityPanelProps) {
  const [loading, setLoading] = useState(false);
  const [resolutionDeg, setResolutionDeg] = useState(data?.models.sampling.latitudeResolutionDeg ?? 1);

  const calculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/localidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapaId, resolutionDeg }),
      });
      const payload = (await response.json()) as { success?: boolean; localityMapV1?: unknown; error?: string };
      if (!response.ok || !payload.success || !isLocalityMapV1(payload.localityMapV1)) {
        notify(payload.error ?? 'Não foi possível gerar o mapa de localidade.', 'error');
        return;
      }
      onDataChange(payload.localityMapV1);
      notify('Mapa de localidade gerado com sucesso.', 'success');
    } catch {
      notify('Não foi possível gerar o mapa de localidade agora. Tente novamente em alguns instantes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="mapa-localidade-titulo"
      className="mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-[2.25rem] border border-amber-100 bg-white/90 shadow-[0_18px_55px_rgba(180,83,9,0.12)] backdrop-blur-2xl"
    >
      <header className="flex flex-col gap-5 border-b border-amber-100 bg-linear-to-br from-amber-50 via-white to-orange-50 px-5 py-7 lg:flex-row lg:items-start lg:justify-between md:px-8">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200"
          >
            <MapPinned className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Cartografia astrológica</p>
            <h3 id="mapa-localidade-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-3xl">
              Mapa Planetário de Localidade
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Projeta no globo as linhas angulares de cada planeta no momento do nascimento.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900">
            Detalhamento
            <select
              value={resolutionDeg}
              onChange={(event) => setResolutionDeg(Number(event.target.value))}
              className="bg-transparent font-black outline-none"
              aria-label="Detalhamento do mapa de localidade"
            >
              {RESOLUTIONS.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {RESOLUTION_LABELS[resolution]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={calculate}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-linear-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
          >
            {loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? 'Gerando...' : 'Gerar mapa de localidade'}
          </button>
          <button
            type="button"
            aria-label="Saiba mais sobre o Mapa Planetário de Localidade"
            onClick={() => openInfoModal('localityMap')}
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-amber-800 shadow-sm transition hover:bg-amber-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </div>
      </header>

      {data ? (
        <div className="space-y-6 px-4 py-6 md:px-8 md:py-8">
          <p className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            Nascimento: <strong>{formatInstantInBrasilia(data.source.birthInstantUtc)}</strong> —{' '}
            <strong>Hora oficial de Brasília</strong>.
          </p>

          <Suspense
            fallback={
              <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-8 text-center text-sm font-semibold text-amber-900">
                Preparando a cartografia interativa...
              </p>
            }
          >
            <LocalityWorldMap data={data} />
          </Suspense>

          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-900">
            Esta projeção é uma referência simbólica e exploratória: <strong>não recomenda mudança</strong>, viagem,
            investimento, moradia ou qualquer decisão de alto impacto. As linhas mostram relações geométricas, não
            garantias de acontecimentos.
          </p>
        </div>
      ) : (
        <div className="px-5 py-8 text-center md:px-8">
          <p className="text-sm leading-relaxed text-slate-600">
            Clique em <strong>Gerar mapa de localidade</strong> para calcular as linhas planetárias do instante natal.
          </p>
        </div>
      )}
    </section>
  );
}
