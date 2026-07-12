import { Compass, HelpCircle, MapPinned, RefreshCw, Sparkles } from 'lucide-react';
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
      notify('Mapa de localidade gerado com segurança.', 'success');
    } catch {
      notify('Falha de conexão ao gerar o mapa de localidade.', 'error');
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
              Projeta no globo as linhas angulares de cada planeta no instante natal, com geometria reproduzível e
              proveniência declarada.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900">
            Resolução
            <select
              value={resolutionDeg}
              onChange={(event) => setResolutionDeg(Number(event.target.value))}
              className="bg-transparent font-black outline-none"
              aria-label="Resolução latitudinal do mapa de localidade"
            >
              {RESOLUTIONS.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(resolution)}°
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
            Instante natal: <strong>{formatInstantInBrasilia(data.source.birthInstantUtc)}</strong> —{' '}
            <strong>Hora oficial de Brasília</strong> · resolução latitudinal de{' '}
            {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(
              data.models.sampling.latitudeResolutionDeg,
            )}
            °.
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

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2 font-black text-indigo-950">
                <Compass className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                Referência astronômica explícita
              </div>
              <p className="mt-2 text-xs leading-relaxed text-indigo-900">
                As coordenadas planetárias de origem em <strong>EQJ/J2000</strong> são transformadas, com precessão e
                nutação, para o <strong>EQD verdadeiro da data</strong> antes do cálculo com o tempo sideral aparente de
                Greenwich.
              </p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="font-black text-emerald-950">Base cartográfica e privacidade</p>
              <p className="mt-2 text-xs leading-relaxed text-emerald-900">
                O desenho usa a base pública <strong>Natural Earth</strong> em escala 1:110m, empacotada no aplicativo,
                sem tiles externos, rastreamento ou envio de dados a serviços cartográficos.
              </p>
            </article>
          </div>

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
