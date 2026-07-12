import { Heart, HelpCircle, Sparkles, Users } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { formatInstantInBrasilia } from '../astrologyV2';
import type { InfoTopic } from '../infoContent';
import {
  formatSynastryDegreePtBr,
  isSynastryRunV1,
  type SynastryRunV1,
  type SynastrySubjectNames,
  synastryPlanetNamePtBr,
} from '../synastryRunV1';
import { LocationAutocomplete } from './LocationAutocomplete';

export interface SynastryViewResult {
  readonly run: SynastryRunV1;
  readonly names: SynastrySubjectNames;
  readonly secondaryMapId?: string;
}

interface SynastryPanelProps {
  readonly primaryMapId: string;
  readonly primaryName: string;
  readonly result: SynastryViewResult | null;
  readonly onResultChange: (result: SynastryViewResult) => void;
  readonly openInfoModal: (topic: InfoTopic) => void;
  readonly notify: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface AmbiguousCandidate {
  readonly disambiguation: 'earlier' | 'later';
  readonly instantUtc: string;
  readonly offsetAtBirth: string;
}

const maskBrazilianDate = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const maskBrazilianTime = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const brazilianDateToIso = (value: string): string => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const PLANET_SYMBOLS: Readonly<Record<string, string>> = Object.freeze({
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
});

export function SynastryPanel({
  primaryMapId,
  primaryName,
  result,
  onResultChange,
  openInfoModal,
  notify,
}: SynastryPanelProps) {
  const [form, setForm] = useState({
    nome: '',
    dataNascimento: '',
    horaNascimento: '',
    localNascimento: '',
    localNascimentoId: undefined as number | undefined,
    timeDisambiguation: undefined as 'earlier' | 'later' | undefined,
  });
  const [consentRecorded, setConsentRecorded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ambiguousCandidates, setAmbiguousCandidates] = useState<AmbiguousCandidate[]>([]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const isoDate = brazilianDateToIso(form.dataNascimento);
    if (!isoDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.horaNascimento)) {
      notify('Confira a data e a hora da Pessoa B no padrão brasileiro.', 'error');
      return;
    }
    if (!consentRecorded) {
      notify('Confirme a autorização para usar os dados da Pessoa B.', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/sinastria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryMapId,
          consentRecorded,
          subjectB: {
            ...form,
            dataNascimento: isoDate,
          },
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        code?: string;
        candidates?: AmbiguousCandidate[];
        secondaryMapId?: string;
        subjects?: SynastrySubjectNames;
        synastryRunV1?: unknown;
      };
      if (payload.code === 'LOCAL_TIME_AMBIGUOUS' && Array.isArray(payload.candidates)) {
        setAmbiguousCandidates(payload.candidates);
        notify('Escolha qual ocorrência do horário consta no registro da Pessoa B.', 'info');
        return;
      }
      if (!response.ok || !payload.success || !payload.subjects || !isSynastryRunV1(payload.synastryRunV1)) {
        notify(payload.error ?? 'Não foi possível calcular a sinastria.', 'error');
        return;
      }
      setAmbiguousCandidates([]);
      onResultChange({
        run: payload.synastryRunV1,
        names: payload.subjects,
        ...(payload.secondaryMapId ? { secondaryMapId: payload.secondaryMapId } : {}),
      });
      notify('Sinastria calculada e persistida com segurança.', 'success');
    } catch {
      notify('Falha de conexão ao calcular a sinastria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const overlayCard = (
    bodyId: string,
    placement: SynastryRunV1['houseOverlays']['aToB'][number]['placement'],
    sourceName: string,
    targetName: string,
  ) => (
    <li
      key={`${sourceName}-${targetName}-${bodyId}`}
      className="flex items-center gap-3 rounded-xl border border-white bg-white/90 p-3 shadow-sm"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-100 text-2xl text-pink-700">
        {PLANET_SYMBOLS[bodyId] ?? '✦'}
      </span>
      <p className="text-xs leading-relaxed text-slate-600">
        <strong className="block text-sm text-slate-900">
          {synastryPlanetNamePtBr(bodyId)} de {sourceName}
        </strong>
        {placement.status === 'available'
          ? `Casa ${placement.houseIndex1} de ${targetName}`
          : `Casas de ${targetName} indisponíveis`}
      </p>
    </li>
  );

  return (
    <section
      aria-labelledby="sinastria-titulo"
      className="mx-auto mt-8 w-full max-w-6xl overflow-hidden rounded-[2.25rem] border border-pink-100 bg-white/90 shadow-[0_18px_55px_rgba(219,39,119,0.11)] backdrop-blur-2xl"
    >
      <header className="flex flex-col gap-4 border-b border-pink-100 bg-linear-to-br from-pink-50 via-white to-violet-50 px-5 py-7 sm:flex-row sm:items-start sm:justify-between md:px-8">
        <div className="flex items-start gap-4">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-200">
            <Users className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-700">Comparação recíproca</p>
            <h3 id="sinastria-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-3xl">
              Sinastria
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Compara dois mapas natais completos: aspectos entre os corpos e sobreposições de cada pessoa nas casas da
              outra.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Saiba mais sobre a Sinastria"
          onClick={() => openInfoModal('synastry')}
          className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-pink-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-pink-700 shadow-sm transition hover:bg-pink-50 hover:shadow-md"
        >
          <HelpCircle className="h-4 w-4" /> Saiba mais
        </button>
      </header>

      <form
        onSubmit={submit}
        className="grid gap-4 border-b border-pink-100 px-5 py-6 md:grid-cols-2 md:px-8 lg:grid-cols-4"
      >
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Nome completo da Pessoa B
          <input
            required
            value={form.nome}
            onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-pink-300"
          />
        </label>
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Data de nascimento (DD/MM/AAAA)
          <input
            required
            inputMode="numeric"
            placeholder="20/05/1993"
            value={form.dataNascimento}
            onChange={(event) =>
              setForm((current) => ({ ...current, dataNascimento: maskBrazilianDate(event.target.value) }))
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-pink-300"
          />
        </label>
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Hora de nascimento (HH:MM)
          <input
            required
            inputMode="numeric"
            placeholder="21:12"
            value={form.horaNascimento}
            onChange={(event) =>
              setForm((current) => ({ ...current, horaNascimento: maskBrazilianTime(event.target.value) }))
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:ring-2 focus:ring-pink-300"
          />
        </label>
        <div className="text-xs font-black uppercase tracking-wider text-slate-600">
          <span>Local de nascimento</span>
          <div className="mt-2 normal-case tracking-normal">
            <LocationAutocomplete
              inputId="sinastria-local-nascimento"
              ariaLabel="Local de nascimento da Pessoa B"
              value={form.localNascimento}
              onChange={(value, providerResultId) =>
                setForm((current) => ({
                  ...current,
                  localNascimento: value,
                  localNascimentoId: providerResultId,
                }))
              }
            />
          </div>
        </div>

        {ambiguousCandidates.length > 0 && (
          <fieldset className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:col-span-2 lg:col-span-4">
            <legend className="px-2 text-xs font-black uppercase tracking-wider text-amber-900">
              Escolha a ocorrência do horário da Pessoa B
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ambiguousCandidates.map((candidate) => (
                <button
                  key={candidate.disambiguation}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, timeDisambiguation: candidate.disambiguation }))}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                    form.timeDisambiguation === candidate.disambiguation
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-amber-300 bg-white text-amber-900'
                  }`}
                >
                  {candidate.disambiguation === 'earlier' ? 'Primeira ocorrência' : 'Segunda ocorrência'} ·{' '}
                  {formatInstantInBrasilia(candidate.instantUtc)} · UTC{candidate.offsetAtBirth}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <label className="flex items-start gap-3 rounded-2xl border border-pink-200 bg-pink-50/80 p-4 text-xs leading-relaxed text-pink-950 md:col-span-2 lg:col-span-3">
          <input
            type="checkbox"
            checked={consentRecorded}
            onChange={(event) => setConsentRecorded(event.target.checked)}
            className="mt-1 h-4 w-4 accent-pink-600"
          />
          Confirmo que possuo autorização para usar os dados da Pessoa B nesta comparação e compreendo que um segundo
          mapa será persistido com segurança para tornar o cálculo auditável.
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-pink-600 to-violet-600 px-5 py-4 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
        >
          {loading ? <Sparkles className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" />}
          {loading ? 'Calculando...' : 'Calcular sinastria'}
        </button>
      </form>

      {result ? (
        <div className="space-y-7 px-5 py-7 md:px-8">
          <div>
            <h4 className="font-black text-slate-900 md:text-lg">
              Aspectos entre {result.names.A} e {result.names.B}
            </h4>
            {result.run.aspects.length > 0 ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {result.run.aspects.map((aspect) => (
                  <li
                    key={aspect.recordId}
                    className="rounded-2xl border border-pink-100 bg-linear-to-br from-white to-pink-50/65 p-4 shadow-sm"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-pink-700">
                      {aspect.displayNamePtBr}
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {synastryPlanetNamePtBr(aspect.pointA.bodyId)} de {result.names.A} ↔{' '}
                      {synastryPlanetNamePtBr(aspect.pointB.bodyId)} de {result.names.B}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      Separação {formatSynastryDegreePtBr(aspect.separationDeg)} · orbe{' '}
                      <strong>{formatSynastryDegreePtBr(aspect.orbDeg)}</strong>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                Nenhum aspecto ficou dentro dos orbes declarados.
              </p>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-[1.6rem] border border-violet-100 bg-violet-50/60 p-4">
              <h4 className="font-black text-violet-900">
                {result.names.A} nas Casas de {result.names.B}
              </h4>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {result.run.houseOverlays.aToB.map((overlay) =>
                  overlayCard(overlay.sourceBodyId, overlay.placement, result.names.A, result.names.B),
                )}
              </ul>
            </article>
            <article className="rounded-[1.6rem] border border-fuchsia-100 bg-fuchsia-50/60 p-4">
              <h4 className="font-black text-fuchsia-900">
                {result.names.B} nas Casas de {result.names.A}
              </h4>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {result.run.houseOverlays.bToA.map((overlay) =>
                  overlayCard(overlay.sourceBodyId, overlay.placement, result.names.B, result.names.A),
                )}
              </ul>
            </article>
          </div>

          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            A sinastria não é uma pontuação científica de compatibilidade e não determina segurança, duração ou destino
            de uma relação.
          </p>
        </div>
      ) : (
        <p className="px-5 py-7 text-center text-sm text-slate-600 md:px-8">
          Preencha os dados da Pessoa B para iniciar uma comparação recíproca com o mapa de {primaryName}.
        </p>
      )}
    </section>
  );
}
