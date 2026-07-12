/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Módulo: astrologo-frontend/src/App.tsx
// Versão: v02.22.00
// Descrição: Frontend principal do Oráculo Celestial com análise astrológica via Gemini.

import DOMPurify from 'dompurify';
import {
  Book,
  BrainCircuit,
  Calendar,
  Clock,
  Compass,
  Copy,
  Download,
  Hash,
  HelpCircle,
  Info,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  RotateCcw,
  Save,
  Send,
  Share2,
  Sparkles,
  Star,
  Sun,
  Trash2,
  User,
  Wind,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type DadosPosicionaisV2,
  findConsultantRulingPosition,
  formatDegreePtBrTruncated,
  formatInstantInBrasilia,
  getPlanetPresentationPtBr,
  renderPositionalV2EmailHtml,
  renderPositionalV2Text,
} from './astrologyV2';
import { ComplianceBanner } from './components/ComplianceBanner';
import { CurrentSkyPanel } from './components/CurrentSkyPanel';
import { LocalityPanel } from './components/LocalityPanel';
import { NatalAnalysisPanel } from './components/NatalAnalysisPanel';
import { useNotification } from './components/Notification';
import { SavedMapArchiveButton } from './components/SavedMapArchiveButton';
import { SynastryPanel, type SynastryViewResult } from './components/SynastryPanel';
import { getInfoContent, type InfoContentContext, type InfoTopic } from './infoContent';
import {
  isLocalityMapV1,
  type LocalityMapV1,
  renderLocalityMapEmailHtml,
  renderLocalityMapText,
} from './localityMapV1';
import { LicencasModule } from './modules/compliance/LicencasModule';
import {
  isNatalChartAnalysisV1,
  type NatalChartAnalysisV1,
  renderNatalChartAnalysisEmailHtml,
  renderNatalChartAnalysisText,
} from './natalAnalysisV1';
import { isCanonicalHydrationEnvelope, mergeCanonicalArtifacts } from './savedMapRehydration';
import { isSynastryRunV1, renderSynastryRunEmailHtml, renderSynastryRunText } from './synastryRunV1';
import { formatTatwaDurationPtBr, presentTatwa, renderTatwaEmailCautionHtml } from './tatwaPresentation';
import { isTransitRunV1, renderTransitRunEmailHtml, renderTransitRunText, type TransitRunV1 } from './transitRunV1';

const APP_VERSION = 'APP v02.22.00';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string): boolean => emailRegex.test(value.trim());

const formatPhone = (val: string) => {
  const v = val.replace(/\D/g, '').substring(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 3) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 7) return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
};

const isSynastryViewResult = (value: unknown): value is SynastryViewResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Partial<SynastryViewResult>;
  return (
    isSynastryRunV1(candidate.run) &&
    typeof candidate.names?.A === 'string' &&
    candidate.names.A.trim().length > 0 &&
    typeof candidate.names?.B === 'string' &&
    candidate.names.B.trim().length > 0 &&
    (candidate.secondaryMapId === undefined || typeof candidate.secondaryMapId === 'string')
  );
};
const sanitizeRichHtml = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'strong', 'ul', 'li', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'br'],
    ALLOWED_ATTR: ['style'],
  });

const htmlToPlainText = (html: string): string => {
  if (typeof DOMParser === 'undefined') {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\u00a0/g, ' ');
};

interface AstroData {
  astro: string;
  signo: string;
  simbolo: string;
}
interface UmbandaData {
  posicao: string;
  orixa: string;
  simbolo: string;
}
interface DadosGlobais {
  tatwa: unknown;
  numerologia: { expressao: number; caminhoVida: number; vibracaoHora: number };
}
interface DadosSistema {
  astrologia: AstroData[];
  umbanda: UmbandaData[];
}
interface ResultData {
  id: string;
  saveClaim?: string;
  query: { nome: string; localNascimento: string; dataNascimento: string; horaNascimento: string };
  dadosGlobais: DadosGlobais;
  dadosAstronomica: DadosSistema;
  dadosTropical: DadosSistema;
  dadosPosicionaisV2?: DadosPosicionaisV2;
  natalChartAnalysisV1?: NatalChartAnalysisV1;
  transitRunV1?: TransitRunV1;
  synastryResult?: SynastryViewResult;
  localityMapV1?: LocalityMapV1;
  analiseIa?: string;
}
interface ModalProps {
  type: InfoTopic | null;
  context: InfoContentContext;
  onClose: () => void;
}
interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  isSending: boolean;
}
interface AutocompleteProps {
  value: string;
  onChange: (value: string, providerResultId?: number) => void;
}
interface BlocoProps {
  titulo: string;
  dadosAstrologia: AstroData[];
  dadosUmbanda: UmbandaData[];
  icon: React.ElementType;
  isTropical: boolean;
  onInfoClick: () => void;
}
interface ResultViewProps {
  result: ResultData;
  analiseIa: string;
  onSolicitarAnalise?: () => void;
  loadingAi?: boolean;
  openInfoModal: (topic: InfoTopic) => void;
  onResultEnhance?: (patch: Partial<ResultData>) => void;
}
interface GeoResult {
  id?: number;
  name?: string;
  admin1?: string;
  country?: string;
}

interface CalculationFormData {
  nome: string;
  dataNascimento: string;
  horaNascimento: string;
  localNascimento: string;
  localNascimentoId?: number;
  timeDisambiguation?: 'earlier' | 'later';
}

interface AmbiguousTimeCandidate {
  disambiguation: 'earlier' | 'later';
  instantUtc: string;
  offsetAtBirth: string;
}

type AuthMode = 'save' | 'retrieve' | 'delete' | null;
type AuthStep = 'email' | 'token';
type SavedMapHydrationFailureKind = 'session-expired' | 'invalid-canonical-data' | 'temporarily-unavailable';

class SavedMapHydrationError extends Error {
  override readonly name = 'SavedMapHydrationError';
  readonly kind: SavedMapHydrationFailureKind;

  constructor(kind: SavedMapHydrationFailureKind) {
    super(kind);
    this.kind = kind;
  }
}

const formatarData = (dataStr: string): string => {
  if (!dataStr) return '';
  const p = dataStr.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataStr;
};

const maskBrazilianDate = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const brazilianDateToIso = (value: string): string => {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const maskBrazilianTime = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const formatBirthForDisplay = (result: ResultData): string =>
  result.dadosPosicionaisV2
    ? `${formatInstantInBrasilia(result.dadosPosicionaisV2.birthContext.timeResolution.instantUtc)} — Hora oficial de Brasília`
    : `${formatarData(result.query.dataNascimento)} — horário legado sem fuso verificável`;

// Conversor visual para garantir a exibição estética tanto de mapas antigos quanto dos recém-calculados
const formatPosicaoLabel = (pos: string): string => {
  const p = pos.toUpperCase();
  if (p.includes('FAIXA') || p.includes('PERÍODO')) return 'FAIXA HORÁRIA (3H)';
  if (p.startsWith('HORA PLANETÁRIA')) return p;
  if (p.includes('ASTRO')) {
    const match = p.match(/\((.*?)\)/);
    return match?.[1] ? `HORA PLANETÁRIA (${match[1].trim()})` : 'HORA PLANETÁRIA (ASTRO)';
  }
  return p;
};

const formatSignNamePtBr = (value: string): string => (value === 'Ophiuchus' ? 'Ofiúco' : value);

const INFO_MODAL_THEME: Record<
  InfoTopic,
  { icon: React.ReactNode; borderColor: string; titleColor: string; sectionColor: string }
> = {
  tropical: {
    icon: <Sun className="h-7 w-7 text-orange-500" />,
    borderColor: 'border-orange-300',
    titleColor: 'text-orange-700',
    sectionColor: 'text-orange-700',
  },
  astronomica: {
    icon: <Star className="h-7 w-7 text-indigo-500" />,
    borderColor: 'border-indigo-300',
    titleColor: 'text-indigo-700',
    sectionColor: 'text-indigo-700',
  },
  tatwas: {
    icon: <Wind className="h-7 w-7 text-sky-500" />,
    borderColor: 'border-sky-300',
    titleColor: 'text-sky-700',
    sectionColor: 'text-sky-700',
  },
  numerologia: {
    icon: <Hash className="h-7 w-7 text-violet-500" />,
    borderColor: 'border-violet-300',
    titleColor: 'text-violet-700',
    sectionColor: 'text-violet-700',
  },
  detailedMap: {
    icon: <Compass className="h-7 w-7 text-violet-500" />,
    borderColor: 'border-violet-300',
    titleColor: 'text-violet-700',
    sectionColor: 'text-violet-700',
  },
  celestialDistribution: {
    icon: <Hash className="h-7 w-7 text-emerald-500" />,
    borderColor: 'border-emerald-300',
    titleColor: 'text-emerald-700',
    sectionColor: 'text-emerald-700',
  },
  mapCorrespondences: {
    icon: <Sparkles className="h-7 w-7 text-fuchsia-500" />,
    borderColor: 'border-fuchsia-300',
    titleColor: 'text-fuchsia-700',
    sectionColor: 'text-fuchsia-700',
  },
  natalWheel: {
    icon: <Compass className="h-7 w-7 text-indigo-500" />,
    borderColor: 'border-indigo-300',
    titleColor: 'text-indigo-700',
    sectionColor: 'text-indigo-700',
  },
  natalAspects: {
    icon: <Sparkles className="h-7 w-7 text-rose-500" />,
    borderColor: 'border-rose-300',
    titleColor: 'text-rose-700',
    sectionColor: 'text-rose-700',
  },
  houseInfluences: {
    icon: <Hash className="h-7 w-7 text-emerald-500" />,
    borderColor: 'border-emerald-300',
    titleColor: 'text-emerald-700',
    sectionColor: 'text-emerald-700',
  },
  currentSky: {
    icon: <Clock className="h-7 w-7 text-sky-500" />,
    borderColor: 'border-sky-300',
    titleColor: 'text-sky-700',
    sectionColor: 'text-sky-700',
  },
  synastry: {
    icon: <User className="h-7 w-7 text-pink-500" />,
    borderColor: 'border-pink-300',
    titleColor: 'text-pink-700',
    sectionColor: 'text-pink-700',
  },
  localityMap: {
    icon: <MapPin className="h-7 w-7 text-amber-500" />,
    borderColor: 'border-amber-300',
    titleColor: 'text-amber-700',
    sectionColor: 'text-amber-700',
  },
};

const InfoModal: React.FC<ModalProps> = ({ type, context, onClose }) => {
  useEffect(() => {
    if (!type) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [type, onClose]);

  if (!type) return null;
  const content = getInfoContent(type, context);
  const theme = INFO_MODAL_THEME[type];

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      aria-describedby="info-modal-introduction"
      onClick={onClose}
    >
      <div
        className={`md3-glass bg-white/95 backdrop-blur-2xl border ${theme.borderColor} p-6 md:p-8 rounded-3xl max-w-2xl w-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-y-auto max-h-[90vh]`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar explicação"
          title="Fechar explicação"
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
        <h2
          id="info-modal-title"
          className={`pr-10 text-2xl md:text-3xl font-black ${theme.titleColor} flex items-start gap-3 mb-5 border-b border-slate-200 pb-4`}
        >
          <span className="mt-1 shrink-0" aria-hidden="true">
            {theme.icon}
          </span>{' '}
          {content.title}
        </h2>
        <p id="info-modal-introduction" className="text-sm leading-relaxed text-slate-700 md:text-base">
          {content.introduction}
        </p>
        <div className="mt-6 space-y-6">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h3 className={`text-base font-black md:text-lg ${theme.sectionColor}`}>{section.title}</h3>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700 md:text-base">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full bg-current ${theme.sectionColor}`}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-relaxed text-slate-700">
          {content.closing}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar explicação e voltar ao mapa"
          className="mt-8 w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider transition shadow-lg text-base"
        >
          Entendi
        </button>
      </div>
    </div>
  );
};

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSend, isSending }) => {
  const [email, setEmail] = useState('');
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
    >
      <div className="md3-glass bg-white/90 backdrop-blur-2xl border border-white p-6 md:p-8 rounded-3xl max-w-md w-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative">
        <button
          onClick={onClose}
          disabled={isSending}
          aria-label="Fechar Modal E-mail"
          title="Fechar"
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition disabled:opacity-50"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
        <h2
          id="email-modal-title"
          className="text-xl md:text-2xl font-black text-blue-600 flex items-center gap-3 mb-4"
        >
          <Mail className="w-6 h-6" /> Enviar Dossiê Celestial
        </h2>
        <p className="text-slate-600 text-sm md:text-base mb-6 leading-relaxed">
          Insira o endereço de e-mail para receber o relatório astrológico completo e a análise da IA.
        </p>
        <label htmlFor="emailConsulente" className="sr-only">
          Endereço de E-mail
        </label>
        <input
          type="email"
          id="emailConsulente"
          name="email"
          autoComplete="email"
          placeholder="usuario@email.com"
          className="w-full p-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner mb-6 text-base"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSending}
        />
        <button
          onClick={() => {
            if (isValidEmail(email)) onSend(email.trim());
          }}
          disabled={isSending || !isValidEmail(email)}
          aria-label="Disparar E-mail"
          className="w-full bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold p-4 rounded-xl flex justify-center items-center gap-3 transition-all disabled:opacity-50 uppercase tracking-wider shadow-md text-sm md:text-base"
        >
          {isSending ? <Sparkles className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}{' '}
          {isSending ? 'Transmitindo...' : 'Disparar E-mail'}
        </button>
      </div>
    </div>
  );
};

const LocationAutocomplete: React.FC<AutocompleteProps> = ({ value, onChange }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing prop-to-state sync; flagged for follow-up refactor
    setQuery(value);
  }, [value]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val, undefined);
    if (val.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    const searchQuery = (val.split(',')[0] ?? val).trim();
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=pt&format=json`,
    )
      .then((res) => res.json())
      .then((data) => {
        const d = data as { results?: GeoResult[] };
        setSuggestions(d.results || []);
        if (d.results && d.results.length > 0) setIsOpen(true);
      })
      .finally(() => setLoading(false));
  };

  const handleSelect = (s: GeoResult) => {
    const locName = [s.name, s.admin1, s.country].filter(Boolean).join(', ');
    setQuery(locName);
    onChange(locName, s.id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        id="localNascimentoInput"
        name="birthLocation"
        required
        type="text"
        placeholder="Ex: Rio de Janeiro, RJ"
        autoComplete="off"
        className="w-full p-4 pl-12 bg-white/80 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition shadow-sm backdrop-blur-sm text-base font-medium placeholder-slate-400"
        value={query || value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
      />
      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
      {loading && (
        <Sparkles className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-blue-500" />
      )}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-100 w-full bg-white/95 backdrop-blur-xl border border-slate-200 mt-2 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.id ?? i}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors"
            >
              <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-sm text-slate-700 font-medium">
                {[s.name, s.admin1, s.country].filter(Boolean).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const RenderBlocoAstrologico: React.FC<BlocoProps> = ({
  titulo,
  dadosAstrologia,
  dadosUmbanda,
  icon: Icon,
  isTropical,
  onInfoClick,
}) => {
  const colorTheme = isTropical ? 'orange' : 'indigo';
  const colorHex = isTropical ? 'text-orange-600' : 'text-indigo-600';
  const bgSoft = isTropical ? 'bg-orange-50' : 'bg-indigo-50';
  return (
    <div className={`mt-10 pt-10 border-t border-${colorTheme}-200 animate-in slide-in-from-top-4 duration-700 w-full`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 className={`text-2xl md:text-3xl font-black flex items-center gap-3 ${colorHex}`}>
          <Icon className="w-8 h-8 shrink-0" /> <span className="leading-tight text-balance">{titulo}</span>
        </h2>
        <button
          type="button"
          aria-label={`Saiba mais sobre ${titulo}`}
          onClick={onInfoClick}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border transition-all text-xs font-bold uppercase tracking-wider shadow-sm bg-white hover:shadow-md border-${colorTheme}-200 ${colorHex} hover:bg-${colorTheme}-50`}
        >
          <HelpCircle className="w-4 h-4" /> Saiba mais
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-xl p-5 md:p-8 rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full mb-8">
        <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3">
          I. Astrologia ({isTropical ? '12 signos' : '13 constelações'})
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {dadosAstrologia.map((a, i) => (
            <div
              key={i}
              className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 flex flex-col justify-center shadow-sm"
            >
              <p className="text-[10px] md:text-xs text-slate-500 mb-1 truncate font-medium">{a.astro}</p>
              <p className="font-bold flex items-center gap-2 text-slate-800 text-xs sm:text-sm md:text-base truncate">
                {a.simbolo} {formatSignNamePtBr(a.signo)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-xl p-5 md:p-8 rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full overflow-hidden">
        <h3
          className={`text-xl md:text-2xl font-bold ${colorHex} mb-6 flex items-center gap-2 border-b border-slate-200 pb-4`}
        >
          <Moon className="inline w-6 h-6" /> II. Umbanda ({isTropical ? 'Tropical' : 'Astronômica'})
        </h3>
        <div className="grid grid-cols-3 gap-2 md:gap-4 w-full">
          {dadosUmbanda.map((u, i) => (
            <div
              key={i}
              className={`flex flex-col items-center justify-between p-3 md:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow min-w-0 w-full h-full`}
            >
              <span className="text-2xl md:text-4xl mb-2 md:mb-3 mt-1 drop-shadow-sm shrink-0">{u.simbolo}</span>
              <div className="flex items-center justify-center w-full mb-2 md:mb-3 h-8 sm:h-10">
                <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs text-slate-500 font-bold uppercase tracking-wider text-center leading-tight line-clamp-2 px-0.5 w-full text-balance">
                  {formatPosicaoLabel(u.posicao)}
                </p>
              </div>
              <div
                className={`flex items-center justify-center w-full mt-auto ${bgSoft} py-2 md:py-2.5 px-1 rounded-xl border border-${colorTheme}-200 min-w-0`}
              >
                <p
                  className={`text-[9px] sm:text-[10px] md:text-sm lg:text-base font-black ${colorHex} uppercase tracking-widest text-center truncate w-full`}
                >
                  {u.orixa}
                </p>
              </div>
            </div>
          ))}
        </div>
        {!isTropical && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] md:text-sm text-emerald-900 leading-relaxed shadow-sm">
            <Info className="w-6 h-6 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex flex-col gap-2 w-full">
              <p className="italic">
                O aplicativo revela a Tríplice Coroa Teórica. A verdadeira entidade regente e seu Orixá definitivo só
                podem ser atestados inequivocamente através da <strong>Lei de Pemba</strong> pelo Mestre de Iniciação.
              </p>
              <div className="text-[10px] md:text-xs text-emerald-700/80 border-t border-emerald-200/50 pt-2 mt-1 not-italic">
                <strong>* Entendendo as Horas:</strong> O <strong>Período (3h)</strong> indica o Orixá que rege a faixa
                de horas do seu nascimento. O <strong>Astro</strong> revela o planeta astrológico que regia o seu minuto
                exato de nascimento.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AstrologicalGlyphPresentation {
  readonly symbol: string;
  readonly badgeClassName: string;
}

const PLANET_BADGE_CLASS_NAMES: Readonly<Record<string, string>> = Object.freeze({
  sun: 'from-amber-300 via-yellow-300 to-orange-400 text-amber-950 ring-amber-200',
  moon: 'from-slate-200 via-blue-100 to-indigo-300 text-indigo-950 ring-indigo-200',
  mercury: 'from-cyan-200 via-sky-200 to-blue-400 text-sky-950 ring-sky-200',
  venus: 'from-rose-200 via-pink-200 to-fuchsia-400 text-rose-950 ring-rose-200',
  mars: 'from-orange-300 via-red-300 to-rose-500 text-red-950 ring-red-200',
  jupiter: 'from-violet-200 via-purple-300 to-indigo-500 text-violet-950 ring-violet-200',
  saturn: 'from-stone-200 via-amber-200 to-yellow-500 text-stone-950 ring-amber-200',
  uranus: 'from-teal-200 via-cyan-300 to-sky-500 text-teal-950 ring-cyan-200',
  neptune: 'from-sky-300 via-blue-400 to-indigo-600 text-white ring-blue-200',
  pluto: 'from-fuchsia-300 via-purple-400 to-violet-700 text-white ring-purple-200',
});

const ZODIAC_PRESENTATIONS: Readonly<Record<string, AstrologicalGlyphPresentation>> = Object.freeze({
  aries: {
    symbol: '♈',
    badgeClassName: 'from-orange-300 via-red-300 to-rose-500 text-red-950 ring-red-200',
  },
  taurus: {
    symbol: '♉',
    badgeClassName: 'from-lime-200 via-emerald-300 to-green-500 text-emerald-950 ring-emerald-200',
  },
  gemini: {
    symbol: '♊',
    badgeClassName: 'from-yellow-200 via-amber-300 to-orange-400 text-amber-950 ring-amber-200',
  },
  cancer: {
    symbol: '♋',
    badgeClassName: 'from-sky-200 via-blue-300 to-indigo-500 text-blue-950 ring-blue-200',
  },
  leo: {
    symbol: '♌',
    badgeClassName: 'from-amber-200 via-orange-300 to-red-500 text-orange-950 ring-orange-200',
  },
  virgo: {
    symbol: '♍',
    badgeClassName: 'from-emerald-200 via-teal-300 to-cyan-500 text-emerald-950 ring-teal-200',
  },
  libra: {
    symbol: '♎',
    badgeClassName: 'from-pink-200 via-rose-300 to-fuchsia-500 text-rose-950 ring-rose-200',
  },
  scorpio: {
    symbol: '♏',
    badgeClassName: 'from-fuchsia-300 via-purple-400 to-violet-700 text-white ring-purple-200',
  },
  sagittarius: {
    symbol: '♐',
    badgeClassName: 'from-violet-200 via-indigo-300 to-blue-500 text-indigo-950 ring-indigo-200',
  },
  capricorn: {
    symbol: '♑',
    badgeClassName: 'from-stone-200 via-amber-200 to-lime-500 text-stone-950 ring-stone-200',
  },
  aquarius: {
    symbol: '♒',
    badgeClassName: 'from-cyan-200 via-sky-300 to-blue-500 text-sky-950 ring-sky-200',
  },
  pisces: {
    symbol: '♓',
    badgeClassName: 'from-blue-200 via-indigo-300 to-violet-500 text-indigo-950 ring-indigo-200',
  },
});

const FALLBACK_BADGE_CLASS_NAME = 'from-slate-200 via-violet-200 to-purple-400 text-slate-950 ring-violet-200';

const getPlanetBadgeClassName = (bodyId: string): string =>
  PLANET_BADGE_CLASS_NAMES[bodyId] ?? FALLBACK_BADGE_CLASS_NAME;

const getZodiacPresentation = (signId: string): AstrologicalGlyphPresentation =>
  ZODIAC_PRESENTATIONS[signId] ?? { symbol: '✦', badgeClassName: FALLBACK_BADGE_CLASS_NAME };

const PositionalV2Panel: React.FC<{
  data: DadosPosicionaisV2;
  openInfoModal: (topic: InfoTopic) => void;
}> = ({ data, openInfoModal }) => {
  const rulingPosition = findConsultantRulingPosition(data.positions);
  const rulingZodiac = rulingPosition ? getZodiacPresentation(rulingPosition.tropical.sign.id) : undefined;
  const angelForId = (angelId: number) =>
    data.positions.find((position) => position.angelicQuinary.angel.id === angelId)?.angelicQuinary.angel;

  return (
    <section aria-labelledby="posicoes-astrologicas-titulo" className="mt-12 w-full max-w-6xl mx-auto space-y-7">
      <div className="overflow-hidden rounded-[2.25rem] border border-violet-100 bg-white/85 shadow-[0_18px_55px_rgba(76,29,149,0.12)] backdrop-blur-2xl">
        <header className="relative isolate overflow-hidden border-b border-violet-100 bg-linear-to-br from-white via-violet-50/80 to-fuchsia-50/70 px-5 py-7 md:px-9 md:py-9">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl"
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-200 ring-4 ring-white"
              >
                <Compass className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
                  Leitura detalhada do mapa
                </p>
                <h3 id="posicoes-astrologicas-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-3xl">
                  Posições, Casas Placidus e Falange Angelical
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Nascimento convertido: {formatInstantInBrasilia(data.birthContext.timeResolution.instantUtc)} —{' '}
                  <strong className="text-violet-800">Hora oficial de Brasília</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Saiba mais sobre a leitura detalhada do mapa"
              onClick={() => openInfoModal('detailedMap')}
              className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-violet-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-violet-700 shadow-sm transition hover:bg-violet-50 hover:shadow-md"
            >
              <HelpCircle className="h-4 w-4" /> Saiba mais
            </button>
          </div>
          {data.birthContext.timeResolution.historicalConfidence === 'best-effort-1900-1969' && (
            <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-900">
              Fuso histórico de 1900–1969: melhor esforço conforme a base histórica de fusos disponível no sistema.
            </p>
          )}
        </header>

        {rulingPosition && rulingZodiac && (
          <article
            aria-labelledby="anjo-regente-titulo"
            className="relative mx-4 mt-6 overflow-hidden rounded-[2rem] border border-amber-200 bg-linear-to-br from-amber-50 via-white to-violet-50 p-5 shadow-[0_14px_40px_rgba(217,119,6,0.12)] md:mx-8 md:mt-8 md:p-7"
          >
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-200/40 blur-3xl"
            />
            <div className="relative grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <span
                aria-hidden="true"
                className={`flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-linear-to-br text-5xl shadow-xl ring-4 ring-white ${getPlanetBadgeClassName(rulingPosition.bodyId)}`}
              >
                {getPlanetPresentationPtBr(rulingPosition.bodyId).symbol}
              </span>
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  <Sparkles aria-hidden="true" className="h-4 w-4" /> Destaque pessoal do mapa
                </p>
                <h4 id="anjo-regente-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-2xl">
                  Anjo Regente do Consulente
                </h4>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <strong className="text-2xl text-violet-900 md:text-3xl">
                    #{rulingPosition.angelicQuinary.angel.id} {rulingPosition.angelicQuinary.angel.canonicalName}
                  </strong>
                  <bdi lang="he" dir="rtl" className="font-serif text-2xl text-violet-700">
                    {rulingPosition.angelicQuinary.angel.hebrewTriplet}
                  </bdi>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {rulingPosition.angelicQuinary.angel.choir} · Príncipe {rulingPosition.angelicQuinary.angel.prince}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {rulingPosition.angelicQuinary.angel.qualitySummaryPtBr}.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/75 p-3 shadow-sm lg:max-w-58">
                <span
                  aria-hidden="true"
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-3xl shadow-md ring-2 ring-white ${rulingZodiac.badgeClassName}`}
                >
                  {rulingZodiac.symbol}
                </span>
                <p className="text-sm leading-snug text-slate-700">
                  Sol a <strong>{formatDegreePtBrTruncated(rulingPosition.tropical.degreeWithinSignDeg)}</strong> de{' '}
                  <strong>{rulingPosition.tropical.sign.namePtBr}</strong>
                </p>
              </div>
            </div>
            <p className="relative mt-5 border-t border-amber-200/70 pt-4 text-xs leading-relaxed text-slate-600 md:text-sm">
              <strong className="text-amber-800">Base do cálculo:</strong> o anjo regente do consulente corresponde ao
              quinário de 5° que contém a longitude tropical do Sol natal. Esta é uma correspondência simbólica da
              Cabala Hermética aplicada ao mapa.
            </p>
          </article>
        )}

        <div className="px-4 py-6 md:px-8 md:py-8">
          <div className="mb-5 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"
            >
              <Star className="h-5 w-5" />
            </span>
            <div>
              <h4 className="font-black text-slate-900 md:text-lg">Posições dos Planetas</h4>
              <p className="text-xs text-slate-500 md:text-sm">
                Graus tropicais, casas, céu astronômico e correspondências angelicais.
              </p>
            </div>
          </div>

          <ul className="grid gap-4 md:grid-cols-2" aria-label="Posições dos planetas no mapa">
            {data.positions.map((planet) => {
              const planetPresentation = getPlanetPresentationPtBr(planet.bodyId);
              const zodiacPresentation = getZodiacPresentation(planet.tropical.sign.id);

              return (
                <li
                  key={planet.bodyId}
                  aria-label={`Posição de ${planetPresentation.label}`}
                  className="group rounded-[1.6rem] border border-slate-200/80 bg-linear-to-br from-white to-slate-50/70 p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg motion-reduce:transform-none md:p-5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-4xl shadow-md ring-2 ring-white ${getPlanetBadgeClassName(planet.bodyId)}`}
                    >
                      {planetPresentation.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-lg font-black text-slate-900">{planetPresentation.label}</h5>
                      <p className="text-xs font-semibold text-slate-500">
                        {planet.housePlacement.status === 'available'
                          ? `Casa ${planet.housePlacement.houseIndex1}`
                          : 'Casa indisponível pelo método Placidus'}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-3xl shadow-md ring-2 ring-white ${zodiacPresentation.badgeClassName}`}
                    >
                      {zodiacPresentation.symbol}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-violet-50/80 p-3">
                      <dt className="text-[0.68rem] font-black uppercase tracking-wider text-violet-600">
                        Posição tropical
                      </dt>
                      <dd className="mt-1 font-semibold leading-snug text-slate-800">
                        {formatDegreePtBrTruncated(planet.tropical.degreeWithinSignDeg)} de{' '}
                        {planet.tropical.sign.namePtBr} · {planet.tropical.decan.index1}º decanato
                      </dd>
                    </div>
                    <div className="rounded-xl bg-sky-50/80 p-3">
                      <dt className="text-[0.68rem] font-black uppercase tracking-wider text-sky-700">
                        Céu astronômico
                      </dt>
                      <dd className="mt-1 font-semibold leading-snug text-slate-800">
                        {planet.astronomicalReal.status === 'available' && planet.astronomicalReal.constellation
                          ? `${planet.astronomicalReal.constellation.namePtBr} (${planet.astronomicalReal.constellation.iauCode})`
                          : 'Indisponível junto ao limite da constelação'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-sm text-slate-700">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Sparkles aria-hidden="true" className="h-4 w-4 text-amber-600" />
                      <strong className="text-violet-900">
                        #{planet.angelicQuinary.angel.id} {planet.angelicQuinary.angel.canonicalName}
                      </strong>
                      <bdi lang="he" dir="rtl" className="font-serif text-lg text-violet-700">
                        {planet.angelicQuinary.angel.hebrewTriplet}
                      </bdi>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {planet.angelicQuinary.angel.choir} · Príncipe {planet.angelicQuinary.angel.prince} · Quinário{' '}
                      {formatDegreePtBrTruncated(planet.angelicQuinary.quinary.globalStartLongitudeDeg, 0)}–
                      {formatDegreePtBrTruncated(planet.angelicQuinary.quinary.globalEndLongitudeDegExclusive, 0)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            A classificação da União Astronômica Internacional usa áreas bidimensionais no céu e não define “grau dentro
            da constelação”. A correspondência angelical é simbólica e deriva exclusivamente da longitude tropical em
            quinários de 5°.
          </p>
        </div>
      </div>

      <section
        aria-labelledby="cuspides-casas-titulo"
        className="rounded-[2.25rem] border border-emerald-100 bg-white/85 p-5 shadow-[0_16px_45px_rgba(5,150,105,0.09)] backdrop-blur-2xl md:p-8"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-100"
            >
              <Hash className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Distribuição celeste</p>
              <h4 id="cuspides-casas-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-2xl">
                Cúspides das 12 Casas Placidus
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                O signo e o grau de cada cúspide, apresentados com duas casas decimais.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Saiba mais sobre a distribuição celeste e as Casas Placidus"
            onClick={() => openInfoModal('celestialDistribution')}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </header>

        {data.houses.status === 'available' && data.houses.cusps ? (
          <ol
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            aria-label="Cúspides das doze casas"
          >
            {data.houses.cusps.map((cusp) => {
              const zodiacPresentation = getZodiacPresentation(cusp.tropical.signId);

              return (
                <li
                  key={cusp.houseIndex1}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-100 bg-linear-to-br from-white to-emerald-50/60 p-3 shadow-sm md:p-4"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-3xl shadow-md ring-2 ring-white ${zodiacPresentation.badgeClassName}`}
                  >
                    {zodiacPresentation.symbol}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                      Casa {cusp.houseIndex1}
                    </p>
                    <p className="mt-1 text-sm font-bold leading-snug text-slate-800">
                      {formatDegreePtBrTruncated(cusp.tropical.degreeWithinSignDeg)} de {cusp.tropical.signNamePtBr}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            As cúspides não estão disponíveis para este mapa pelo método Placidus.
          </p>
        )}
      </section>

      <section
        aria-labelledby="falange-angelical-titulo"
        className="relative overflow-hidden rounded-[2.25rem] border border-fuchsia-100 bg-linear-to-br from-white via-violet-50/65 to-fuchsia-50/70 p-5 shadow-[0_16px_45px_rgba(147,51,234,0.11)] md:p-8"
      >
        <div
          aria-hidden="true"
          className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-fuchsia-200/30 blur-3xl"
        />
        <header className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-200"
            >
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600">
                Correspondências do mapa
              </p>
              <h4 id="falange-angelical-titulo" className="mt-1 text-xl font-black text-slate-900 md:text-2xl">
                Falange Angelical do Mapa
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Os anjos associados aos quinários tropicais ocupados pelos dez corpos celestes do mapa.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Saiba mais sobre as correspondências e a Falange Angelical do Mapa"
            onClick={() => openInfoModal('mapCorrespondences')}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-fuchsia-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-fuchsia-700 shadow-sm transition hover:bg-fuchsia-50 hover:shadow-md"
          >
            <HelpCircle className="h-4 w-4" /> Saiba mais
          </button>
        </header>

        <ul className="relative mt-6 grid gap-4 md:grid-cols-2" aria-label="Anjos e planetas da falange angelical">
          {data.aggregates.angelicFalange.map((group) => {
            const angel = angelForId(group.angelId);

            return (
              <li
                key={group.angelId}
                className="rounded-[1.6rem] border border-violet-100 bg-white/85 p-4 shadow-sm md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-violet-700">Anjo #{group.angelId}</p>
                    <p className="mt-1 flex flex-wrap items-baseline gap-2 text-lg font-black text-violet-950">
                      {angel?.canonicalName ?? `Anjo ${group.angelId}`}
                      {angel && (
                        <bdi lang="he" dir="rtl" className="font-serif text-xl font-normal text-violet-700">
                          {angel.hebrewTriplet}
                        </bdi>
                      )}
                    </p>
                    {angel && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {angel.choir} · Príncipe {angel.prince}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                    {group.occurrenceCount} {group.occurrenceCount === 1 ? 'correspondência' : 'correspondências'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2" aria-label="Planetas correspondentes">
                  {group.memberBodyIds.map((bodyId) => {
                    const presentation = getPlanetPresentationPtBr(bodyId);

                    return (
                      <span
                        key={bodyId}
                        className="inline-flex items-center gap-2 rounded-full border border-white bg-slate-50 py-1.5 pl-1.5 pr-3 text-sm font-bold text-slate-800 shadow-sm"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br text-xl shadow-sm ring-1 ring-white ${getPlanetBadgeClassName(bodyId)}`}
                        >
                          {presentation.symbol}
                        </span>
                        {presentation.label}
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
};

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  analiseIa,
  onSolicitarAnalise,
  loadingAi,
  openInfoModal,
  onResultEnhance,
}) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const transitRun = isTransitRunV1(result.transitRunV1) ? result.transitRunV1 : null;
  const synastryResult = isSynastryViewResult(result.synastryResult) ? result.synastryResult : null;
  const localityMap = isLocalityMapV1(result.localityMapV1) ? result.localityMapV1 : null;
  const natalAnalysis = isNatalChartAnalysisV1(result.natalChartAnalysisV1) ? result.natalChartAnalysisV1 : null;
  const { showNotification } = useNotification();
  const tatwaPresentation = presentTatwa(result.dadosGlobais.tatwa);

  const gerarTextoRelatorio = (): string => {
    if (!result) return '';

    const divider = `\n${'─'.repeat(28)}\n`;

    let t = `*🌌 MAPEAMENTO ASTROLÓGICO E ESOTÉRICO 🌌*\n\n`;
    t += `*Consulente:* ${result.query.nome}\n`;
    t += `*Local:* ${result.query.localNascimento}\n`;
    t += `*Nascimento:* ${formatBirthForDisplay(result)}\n`;

    t += divider;
    t += `*🌬️ FORÇAS GLOBAIS*\n\n`;
    t += `*Tatwas:*\n`;
    t += `  • Principal: *${tatwaPresentation.principal}*\n`;
    t += `  • Subtatwa: *${tatwaPresentation.sub}*\n`;
    t += `  • Método: *${tatwaPresentation.modeLabelPtBr}*\n`;
    if (tatwaPresentation.nearMainBoundary && tatwaPresentation.mainBoundaryMarginSec !== null) {
      t += `  • Atenção: resultado próximo de uma transição (${formatTatwaDurationPtBr(tatwaPresentation.mainBoundaryMarginSec)}).\n`;
      if (tatwaPresentation.adjacent) {
        t += `  • Possibilidade adjacente: *${tatwaPresentation.adjacent.principal} / ${tatwaPresentation.adjacent.sub}*\n`;
      }
    }
    if (tatwaPresentation.subIsIndicative)
      t += `  • O subtatwa é uma indicação sensível à precisão do horário natal.\n`;
    t += `\n`;
    t += `*Numerologia:*\n`;
    t += `  • Expressão: *${result.dadosGlobais.numerologia.expressao}*\n`;
    t += `  • Caminho da Vida: *${result.dadosGlobais.numerologia.caminhoVida}*\n`;
    t += `  • Vibração da Hora: *${result.dadosGlobais.numerologia.vibracaoHora}*\n`;

    const blocoTexto = (dados: DadosSistema) => {
      let texto = `\n*Astrologia:*\n`;
      texto += `  • ☀️ Sol: *${formatSignNamePtBr(dados.astrologia[0]?.signo ?? 'N/D')}*\n`;
      texto += `  • ⬆️ Ascendente: *${formatSignNamePtBr(dados.astrologia[1]?.signo ?? 'N/D')}*\n`;
      texto += `  • 🌙 Lua: *${formatSignNamePtBr(dados.astrologia[2]?.signo ?? 'N/D')}*\n`;
      texto += `  • 🔭 Meio do Céu: *${formatSignNamePtBr(dados.astrologia[3]?.signo ?? 'N/D')}*\n\n`;
      texto += `*Umbanda:*\n`;
      texto += `  • 👑 Coroa (Orixá Ancestral): *${dados.umbanda[0]?.orixa ?? 'N/D'}*\n`;
      texto += `  • 🌊 Adjuntó (Orixá de Frente): *${dados.umbanda[1]?.orixa ?? 'N/D'}*\n`;
      texto += `  • 🏹 Frente (Orixá de Trabalho): *${dados.umbanda[2]?.orixa ?? 'N/D'}*\n`;
      texto += `  • 🌟 Decanato (Regente Secundário): *${dados.umbanda[3]?.orixa ?? 'N/D'}*\n`;
      texto += `  • ⏳ Faixa Horária (Regente da Hora): *${dados.umbanda[4]?.orixa ?? 'N/D'}*\n`;
      texto += `  • 🪐 ${formatPosicaoLabel(dados.umbanda[5]?.posicao ?? '')}: *${dados.umbanda[5]?.orixa ?? 'N/D'}*\n`;
      return texto;
    };

    t += divider;
    t += `*🌞 MÓDULO I: ASTROLÓGICO TROPICAL*\n`;
    t += blocoTexto(result.dadosTropical);

    t += divider;
    t += `*✨ DUAS PERSPECTIVAS, UM MESMO NASCIMENTO ✨*\n\n`;
    t += `_O módulo tropical organiza o zodíaco pelo ciclo sazonal; o resumo constelacional usa 13 faixas de referência aproximadas ao longo da eclíptica. Os dados posicionais detalhados fazem a classificação pelas regiões oficiais da IAU._\n`;
    t += divider;

    t += `*⭐ MÓDULO II: ASTRONÔMICO CONSTELACIONAL*\n`;
    t += blocoTexto(result.dadosAstronomica);

    if (result.dadosPosicionaisV2) {
      t += divider;
      t += `${renderPositionalV2Text(result.dadosPosicionaisV2)}\n`;
    }

    if (natalAnalysis) {
      t += divider;
      t += `${renderNatalChartAnalysisText(natalAnalysis)}\n`;
    }

    if (transitRun) {
      t += divider;
      t += `${renderTransitRunText(transitRun)}\n`;
    }

    if (synastryResult) {
      t += divider;
      t += `${renderSynastryRunText(synastryResult.run, synastryResult.names)}\n`;
    }

    if (localityMap) {
      t += divider;
      t += `${renderLocalityMapText(localityMap)}\n`;
    }

    if (analiseIa) {
      const iaTxt = htmlToPlainText(analiseIa);
      t += divider;
      t += `*🧠 SÍNTESE DO MESTRE (IA)*\n\n${iaTxt.replace(/\n{3,}/g, '\n\n').trim()}\n`;
    }

    t += divider;
    t += `✨ _Gerado via Oráculo Celestial ${APP_VERSION}_ ✨`;
    return t;
  };

  const gerarHtmlRelatorio = (): string => {
    if (!result) return '';

    const fontFamily =
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;";
    const boxShadow = 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.05);';

    const blocoAstrologiaHtml = (dados: AstroData[]) =>
      dados
        .map(
          (a) => `
      <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; ${boxShadow} text-align: left;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">${a.astro}</p>
        <p style="font-size: 15px; color: #1e293b; margin: 0; font-weight: bold;">${a.simbolo} ${formatSignNamePtBr(a.signo)}</p>
      </div>
    `,
        )
        .join('');

    const blocoUmbandaHtml = (dados: UmbandaData[], isTropical: boolean) => {
      const color = isTropical ? '#ea580c' : '#4f46e5';
      const bgColor = isTropical ? 'rgba(251, 146, 60, 0.1)' : 'rgba(99, 102, 241, 0.1)';
      const borderColor = isTropical ? '#fed7aa' : '#c7d2fe';

      return dados
        .map(
          (u) => `
        <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; ${boxShadow} display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; text-align: center;">
          <span style="font-size: 32px; margin-bottom: 8px;">${u.simbolo}</span>
          <p style="font-size: 10px; color: #64748b; margin: 0 0 8px 0; font-weight: bold; text-transform: uppercase; line-height: 1.2;">${formatPosicaoLabel(u.posicao)}</p>
          <div style="background-color: ${bgColor}; color: ${color}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 8px 4px; width: 100%; margin-top: auto;">
            <p style="margin: 0; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${u.orixa}</p>
          </div>
        </div>
      `,
        )
        .join('');
    };

    const renderBlocoAstrologicoEmail = (
      titulo: string,
      dadosAstrologia: AstroData[],
      dadosUmbanda: UmbandaData[],
      isTropical: boolean,
    ) => {
      const titleColor = isTropical ? '#f97316' : '#4338ca';
      const borderColor = isTropical ? '#fb923c' : '#6366f1';
      return `
            <div style="margin-top: 40px; padding-top: 40px; border-top: 1px solid ${borderColor};">
                <h2 style="font-size: 28px; font-weight: 900; color: ${titleColor}; margin: 0 0 32px 0;">${titulo}</h2>
                
                <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 32px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow} margin-bottom: 32px;">
                    <h3 style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">I. Astrologia (${isTropical ? '12 signos' : '13 constelações'})</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px;">
                        ${blocoAstrologiaHtml(dadosAstrologia)}
                    </div>
                </div>

                <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 32px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
                    <h3 style="font-size: 20px; font-weight: bold; color: ${titleColor}; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">II. Umbanda</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                        ${blocoUmbandaHtml(dadosUmbanda, isTropical)}
                    </div>
                </div>
            </div>
        `;
    };

    const analiseSanitizada = analiseIa ? sanitizeRichHtml(analiseIa) : '';

    const h = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dossiê Astrológico</title>
        <style>
          @media (max-width: 600px) {
            .container { padding: 15px !important; }
            .grid-2 { grid-template-columns: 1fr !important; }
          }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; ${fontFamily}">
        <div class="container" style="background-color: #f1f5f9; background-image: radial-gradient(ellipse at top, #e0e7ff 0%, #f1f5f9 50%, #fdf4ff 100%); max-width: 800px; margin: auto; padding: 40px;">
            
            <header style="text-align: center; margin-bottom: 40px;">
                <h1 style="font-size: 36px; font-weight: 900; letter-spacing: -1px; color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(to right, #3b82f6, #6366f1); margin: 0 0 8px 0;">Mapeamento Astrológico</h1>
                <p style="font-size: 18px; color: #475569; margin: 0;">Investigue as Influências Astrológicas</p>
            </header>

            <div style="background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 32px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow} text-align: center; margin-bottom: 40px;">
                <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0;">${result.query.nome}</h2>
                <p style="font-size: 16px; color: #475569; margin: 0;">${result.query.localNascimento}</p>
                <p style="font-size: 16px; color: #475569; margin: 0;">${formatBirthForDisplay(result)}</p>
            </div>

            <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px;">
                <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 24px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
                    <h3 style="font-size: 20px; font-weight: bold; color: #2563eb; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">🌬️ Forças Globais: Tatwas</h3>
                    <div style="font-size: 16px; color: #334155;">
                        <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Principal</span> <strong style="color: #1e293b;">${tatwaPresentation.principal}</strong></div>
                        <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Subtatwa</span> <strong style="color: #1e293b;">${tatwaPresentation.sub}</strong></div>
                        <div style="padding: 10px 12px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e40af;"><strong>Método:</strong> ${tatwaPresentation.modeLabelPtBr}</div>
                        ${renderTatwaEmailCautionHtml(tatwaPresentation)}
                    </div>
                </div>
                <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 24px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
                    <h3 style="font-size: 20px; font-weight: bold; color: #2563eb; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">#️⃣ Forças Globais: Numerologia</h3>
                     <div style="font-size: 16px; color: #334155;">
                        <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Expressão</span> <strong style="color: #1e293b;">${result.dadosGlobais.numerologia.expressao}</strong></div>
                        <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Caminho</span> <strong style="color: #1e293b;">${result.dadosGlobais.numerologia.caminhoVida}</strong></div>
                        <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px;"><span>Hora</span> <strong style="color: #1e293b;">${result.dadosGlobais.numerologia.vibracaoHora}</strong></div>
                    </div>
                </div>
            </div>

            ${renderBlocoAstrologicoEmail('Módulo I: Astrológico Tropical', result.dadosTropical.astrologia, result.dadosTropical.umbanda, true)}
            
            <div style="margin: 60px 0; text-align: center; position: relative;">
              <div style="position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(251, 146, 60, 0.2), rgba(99, 102, 241, 0.2), rgba(52, 211, 153, 0.2)); border-radius: 24px; filter: blur(20px);"></div>
              <div style="position: relative; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); padding: 40px; border-radius: 24px; ${boxShadow}">
                  <p style="font-size: 32px; margin: 0 0 12px 0;">✨</p>
                  <h3 style="font-size: 24px; font-weight: 900; color: #4f46e5; margin: 0 0 8px 0;">Duas perspectivas, um mesmo nascimento</h3>
                  <p style="font-size: 16px; color: #475569; margin: 0; max-width: 500px; margin-left: auto; margin-right: auto;">O módulo tropical organiza o zodíaco pelo ciclo sazonal. O resumo constelacional usa 13 faixas de referência aproximadas ao longo da eclíptica; os dados posicionais detalhados classificam pelas regiões oficiais da IAU.</p>
              </div>
            </div>

            ${renderBlocoAstrologicoEmail('Módulo II: Astronômico Constelacional', result.dadosAstronomica.astrologia, result.dadosAstronomica.umbanda, false)}

            ${result.dadosPosicionaisV2 ? renderPositionalV2EmailHtml(result.dadosPosicionaisV2) : ''}
            ${natalAnalysis ? renderNatalChartAnalysisEmailHtml(natalAnalysis) : ''}
            ${transitRun ? renderTransitRunEmailHtml(transitRun) : ''}
            ${synastryResult ? renderSynastryRunEmailHtml(synastryResult.run, synastryResult.names) : ''}
            ${localityMap ? renderLocalityMapEmailHtml(localityMap) : ''}

            ${
              analiseSanitizada
                ? `
            <div style="margin-top: 60px; padding: 40px; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
                <h3 style="font-size: 28px; font-weight: 900; color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(to right, #3b82f6, #4f46e5); margin: 0 0 24px 0; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">🧠 Síntese do Mestre (IA)</h3>
              <div style="font-size: 16px; line-height: 1.7; color: #334155;">${analiseSanitizada}</div>
            </div>
            `
                : ''
            }

            <footer style="text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #dde4ee;">
                <p style="font-size: 12px; color: #64748b; margin: 0;">Gerado via Oráculo Celestial ${APP_VERSION}</p>
                <p style="font-size: 12px; color: #64748b; margin: 6px 0 0;">Todos os instantes exibidos usam a hora oficial de Brasília (America/Sao_Paulo).</p>
            </footer>

        </div>
    </body>
    </html>
    `;
    return h;
  };

  const copiar = () => {
    navigator.clipboard.writeText(gerarTextoRelatorio());
    showNotification('Dossiê copiado para a memória!', 'success');
  };
  const whatsapp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(gerarTextoRelatorio())}`, '_blank');
  };
  const dispararEmail = async (emailDestino: string) => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailDestino,
          relatorioHtml: gerarHtmlRelatorio(),
          relatorioTexto: gerarTextoRelatorio(),
          nomeConsulente: result.query.nome,
        }),
      });
      const data = (await res.json()) as { success: boolean; message?: string; error?: string };
      if (data.success) {
        showNotification(String(data.message), 'success');
        setEmailModalOpen(false);
      } else {
        showNotification(String(data.error), 'error');
      }
    } catch {
      showNotification('Falha na ponte do e-mail.', 'error');
    }
    setSendingEmail(false);
  };

  return (
    <div className="w-full animate-in fade-in duration-700 max-w-5xl mx-auto mt-8">
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={dispararEmail}
        isSending={sendingEmail}
      />

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
        <button
          onClick={copiar}
          aria-label="Copiar Tudo"
          title="Copiar Tudo"
          className="flex-1 min-w-35 max-w-50 flex items-center justify-center gap-2 bg-white text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-full transition-all text-[11px] md:text-sm font-bold uppercase tracking-wider border border-slate-200 shadow-sm hover:shadow-md"
        >
          <Copy className="w-4 h-4" /> Copiar Tudo
        </button>
        <button
          onClick={whatsapp}
          aria-label="Compartilhar no WhatsApp"
          title="WhatsApp"
          className="flex-1 min-w-35 max-w-50 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-3 rounded-full transition-all text-[11px] md:text-sm font-bold uppercase tracking-wider border border-emerald-200 shadow-sm hover:shadow-md"
        >
          <Share2 className="w-4 h-4" /> WhatsApp
        </button>
        <button
          onClick={() => setEmailModalOpen(true)}
          aria-label="Enviar por E-mail"
          title="E-mail"
          className="flex-1 min-w-35 max-w-50 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-3 rounded-full transition-all text-[11px] md:text-sm font-bold uppercase tracking-wider border border-blue-200 shadow-sm hover:shadow-md"
        >
          <Mail className="w-4 h-4" /> E-mail
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 w-full mb-8">
        <div className="bg-white/70 backdrop-blur-2xl p-5 md:p-8 rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full flex flex-col justify-center min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="flex items-center gap-2 text-lg font-bold text-blue-600 md:text-xl">
              <Wind className="h-5 w-5 text-blue-500" /> Forças Globais: Tatwas
            </h3>
            <button
              type="button"
              aria-label="Saiba mais sobre o cálculo dos Tatwas"
              onClick={() => openInfoModal('tatwas')}
              className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-sky-700 shadow-sm transition hover:bg-sky-50 hover:shadow-md"
            >
              <HelpCircle className="h-4 w-4" /> Saiba mais
            </button>
          </div>
          <div className="space-y-3">
            <div className="bg-white/80 p-3 md:p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
              <p className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wide">Principal</p>
              <p className="font-bold text-slate-800 text-sm md:text-base truncate pl-2">
                {tatwaPresentation.principal}
              </p>
            </div>
            <div className="bg-white/80 p-3 md:p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
              <p className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wide">Subtatwa</p>
              <p className="font-bold text-slate-800 text-sm md:text-base truncate pl-2">{tatwaPresentation.sub}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-900">
              <span className="font-bold">Método:</span> {tatwaPresentation.modeLabelPtBr}
            </div>
            {tatwaPresentation.nearMainBoundary && tatwaPresentation.mainBoundaryMarginSec !== null && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <strong>Próximo de uma transição:</strong> margem de{' '}
                {formatTatwaDurationPtBr(tatwaPresentation.mainBoundaryMarginSec)}.
                {tatwaPresentation.adjacent && (
                  <span>
                    {' '}
                    Possibilidade adjacente: <strong>{tatwaPresentation.adjacent.principal}</strong> /{' '}
                    <strong>{tatwaPresentation.adjacent.sub}</strong>.
                  </span>
                )}
              </div>
            )}
            {tatwaPresentation.subIsIndicative && (
              <p className="px-1 text-[11px] leading-relaxed text-slate-500">
                O subtatwa é indicativo e especialmente sensível à precisão do horário registrado.
              </p>
            )}
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-2xl p-5 md:p-8 rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] w-full flex flex-col justify-center min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <h3 className="flex items-center gap-2 text-lg font-bold text-blue-600 md:text-xl">
              <Hash className="h-5 w-5 text-blue-500" /> Forças Globais: Numerologia
            </h3>
            <button
              type="button"
              aria-label="Saiba mais sobre o cálculo da Numerologia"
              onClick={() => openInfoModal('numerologia')}
              className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-violet-700 shadow-sm transition hover:bg-violet-50 hover:shadow-md"
            >
              <HelpCircle className="h-4 w-4" /> Saiba mais
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/80 p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wide">Expressão</span>
              <strong className="text-sm md:text-base text-slate-800">
                {String(result.dadosGlobais.numerologia.expressao)}
              </strong>
            </div>
            <div className="flex justify-between items-center bg-white/80 p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wide">Caminho</span>
              <strong className="text-sm md:text-base text-slate-800">
                {String(result.dadosGlobais.numerologia.caminhoVida)}
              </strong>
            </div>
            <div className="flex justify-between items-center bg-white/80 p-3 md:p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[11px] md:text-xs text-slate-500 font-bold uppercase tracking-wide">Hora</span>
              <strong className="text-sm md:text-base text-slate-800">
                {String(result.dadosGlobais.numerologia.vibracaoHora)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <RenderBlocoAstrologico
        titulo="Módulo I: Astrológico Tropical"
        dadosAstrologia={result.dadosTropical.astrologia}
        dadosUmbanda={result.dadosTropical.umbanda}
        icon={Sun}
        isTropical={true}
        onInfoClick={() => openInfoModal('tropical')}
      />

      <div className="w-full my-12 relative group max-w-5xl mx-auto animate-in zoom-in duration-1000">
        <div className="absolute inset-0 bg-linear-to-r from-orange-200/50 via-indigo-200/50 to-emerald-200/50 rounded-[3rem] blur-2xl transition-all group-hover:via-indigo-300/50"></div>
        <div className="relative w-full bg-white/80 backdrop-blur-2xl border border-white/50 py-8 px-6 md:px-10 rounded-[2.5rem] shadow-[0_8px_32px_rgba(99,102,241,0.15)] flex flex-col items-center justify-center text-center overflow-hidden">
          <Sparkles className="w-10 h-10 text-indigo-500 shrink-0 animate-pulse mb-3" />
          <div className="flex flex-col items-center max-w-2xl">
            <h4 className="text-indigo-600 font-black uppercase tracking-widest text-sm md:text-xl mb-2">
              ✨ Duas perspectivas, um mesmo nascimento ✨
            </h4>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed text-balance">
              O módulo tropical organiza o zodíaco pelo ciclo sazonal. A seguir, o resumo constelacional usa 13 faixas
              de referência aproximadas ao longo da eclíptica; os dados posicionais detalhados classificam pelas regiões
              oficiais da IAU.
            </p>
          </div>
        </div>
      </div>

      <RenderBlocoAstrologico
        titulo="Módulo II: Astronômico Constelacional"
        dadosAstrologia={result.dadosAstronomica.astrologia}
        dadosUmbanda={result.dadosAstronomica.umbanda}
        icon={Star}
        isTropical={false}
        onInfoClick={() => openInfoModal('astronomica')}
      />

      {result.dadosPosicionaisV2 ? (
        <PositionalV2Panel data={result.dadosPosicionaisV2} openInfoModal={openInfoModal} />
      ) : (
        <p className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Mapa legado: graus, Casas Placidus e falange angelical não estão disponíveis. O horário legado não possui fuso
          verificável e não será relabelado como horário de Brasília.
        </p>
      )}

      {result.dadosPosicionaisV2 && natalAnalysis && (
        <NatalAnalysisPanel
          positional={result.dadosPosicionaisV2}
          analysis={natalAnalysis}
          openInfoModal={openInfoModal}
        />
      )}

      {result.dadosPosicionaisV2 && (
        <CurrentSkyPanel
          mapaId={result.id}
          run={transitRun}
          onRunChange={(run) => {
            onResultEnhance?.({ transitRunV1: run });
          }}
          openInfoModal={openInfoModal}
          notify={showNotification}
        />
      )}

      {result.dadosPosicionaisV2 && (
        <SynastryPanel
          primaryMapId={result.id}
          primaryName={result.query.nome}
          result={synastryResult}
          onResultChange={(nextSynastry) => {
            onResultEnhance?.({ synastryResult: nextSynastry });
          }}
          openInfoModal={openInfoModal}
          notify={showNotification}
        />
      )}

      {result.dadosPosicionaisV2 && (
        <LocalityPanel
          mapaId={result.id}
          data={localityMap}
          onDataChange={(data) => {
            onResultEnhance?.({ localityMapV1: data });
          }}
          openInfoModal={openInfoModal}
          notify={showNotification}
        />
      )}

      {!analiseIa && onSolicitarAnalise && (
        <div className="flex justify-center mt-14 mb-10 w-full border-t border-slate-200 pt-12">
          <button
            aria-label="Solicitar Análise de IA"
            title="Solicitar Análise"
            onClick={onSolicitarAnalise}
            disabled={loadingAi}
            className="group relative px-6 md:px-10 py-5 bg-white border border-blue-200 rounded-full flex items-center justify-center gap-4 hover:bg-blue-50 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-2xl w-full md:w-auto"
          >
            {loadingAi ? (
              <Sparkles className="animate-spin text-blue-600 w-6 h-6" />
            ) : (
              <BrainCircuit className="text-blue-600 group-hover:scale-110 transition-transform w-6 h-6" />
            )}
            <span className="font-black tracking-wide text-slate-800 text-sm md:text-lg uppercase">
              SOLICITAR ANÁLISE PSICOLÓGICA E ESOTÉRICA POR IA
            </span>
          </button>
        </div>
      )}

      {analiseIa && (
        <div className="mt-10 p-6 md:p-12 bg-white/80 backdrop-blur-2xl rounded-[3rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] animate-in slide-in-from-bottom-8 duration-500 w-full overflow-hidden">
          <h3 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-600 mb-6 md:mb-8 border-b border-slate-200 pb-4 flex items-center gap-3">
            <BrainCircuit className="text-blue-600 w-6 h-6 md:w-8 md:h-8 shrink-0" /> Síntese do Mestre (IA)
          </h3>
          <div
            className="text-slate-700 text-sm md:text-base lg:text-lg leading-relaxed md:leading-loose space-y-4 [&_p]:text-justify [&_p]:indent-8 [&_p]:mb-4 [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_li]:text-justify [&_h1]:text-2xl [&_h1]:text-left [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-indigo-700 [&_h2]:text-xl [&_h2]:text-left [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-indigo-700 [&_h3]:text-lg [&_h3]:text-left [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:text-blue-600"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(analiseIa) }}
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [formData, setFormData] = useState<CalculationFormData>({
    nome: '',
    dataNascimento: '',
    horaNascimento: '',
    localNascimento: '',
  });
  const [dataNascimentoDisplay, setDataNascimentoDisplay] = useState('');
  const [ambiguousTimeCandidates, setAmbiguousTimeCandidates] = useState<AmbiguousTimeCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [analiseIa, setAnaliseIa] = useState<string>('');
  const [modalType, setModalType] = useState<InfoTopic | null>(null);
  const { showNotification } = useNotification();

  // ── Auth & Session State ──
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [authEmail, setAuthEmail] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [mapasSalvos, setMapasSalvos] = useState<ResultData[]>([]);
  const savedMapArtifactsRequestRef = useRef<AbortController | null>(null);
  const [rehydratingMapId, setRehydratingMapId] = useState<string | null>(null);
  const [showLicenses, setShowLicenses] = useState(false);

  // ── Contato State ──
  const [showContato, setShowContato] = useState(false);
  const [contatoForm, setContatoForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [contatoSending, setContatoSending] = useState(false);

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('astrologo_session_token');
    if (!sessionToken) return;
    fetch('/api/astrologo-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'session-retrieve', token: sessionToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        const payload = data as { ok: boolean; dados?: { mapasSalvos?: ResultData[] }; sessionToken?: string };
        if (payload.ok) {
          setMapasSalvos(payload.dados?.mapasSalvos ?? []);
          if (payload.sessionToken) sessionStorage.setItem('astrologo_session_token', payload.sessionToken);
        } else {
          sessionStorage.removeItem('astrologo_session_token');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(
    () => () => {
      savedMapArtifactsRequestRef.current?.abort();
    },
    [],
  );

  const handleSavedMapOpen = (savedMap: ResultData) => {
    savedMapArtifactsRequestRef.current?.abort();
    const controller = new AbortController();
    savedMapArtifactsRequestRef.current = controller;
    setRehydratingMapId(savedMap.id);

    setResult(savedMap);
    setAnaliseIa(savedMap.analiseIa ?? '');
    window.scrollTo({ top: 300, behavior: 'smooth' });

    const sessionToken = sessionStorage.getItem('astrologo_session_token');
    if (!sessionToken) {
      savedMapArtifactsRequestRef.current = null;
      setRehydratingMapId(null);
      setAuthMode('retrieve');
      setAuthStep('email');
      setAuthToken('');
      showNotification('Sua sessão expirou. Informe seu e-mail para restaurar os dados avançados.', 'info');
      return;
    }

    void fetch('/api/astrologo-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'session-map-artifacts', token: sessionToken, mapaId: savedMap.id }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (savedMapArtifactsRequestRef.current !== controller) return;
        const payload: unknown = await response.json();
        if (savedMapArtifactsRequestRef.current !== controller) return;
        if (!response.ok) {
          if (response.status === 401) {
            sessionStorage.removeItem('astrologo_session_token');
            throw new SavedMapHydrationError('session-expired');
          }
          throw new SavedMapHydrationError(
            response.status === 409 ? 'invalid-canonical-data' : 'temporarily-unavailable',
          );
        }
        if (!isCanonicalHydrationEnvelope(payload, savedMap.id)) {
          throw new SavedMapHydrationError('invalid-canonical-data');
        }
        setResult((current) => mergeCanonicalArtifacts(current, payload.calculationId, payload.artifacts));
        setMapasSalvos((current) =>
          current.map((saved) => mergeCanonicalArtifacts(saved, payload.calculationId, payload.artifacts) ?? saved),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (savedMapArtifactsRequestRef.current !== controller) return;
        if (error instanceof SavedMapHydrationError && error.kind === 'session-expired') {
          setAuthMode('retrieve');
          setAuthStep('email');
          setAuthToken('');
          showNotification('Sua sessão expirou. Informe seu e-mail para restaurar os dados avançados.', 'info');
          return;
        }
        if (error instanceof SavedMapHydrationError && error.kind === 'invalid-canonical-data') {
          showNotification('Os dados avançados canônicos deste mapa estão inconsistentes.', 'error');
          return;
        }
        showNotification('Os dados avançados deste mapa não puderam ser restaurados com segurança.', 'error');
      })
      .finally(() => {
        if (savedMapArtifactsRequestRef.current === controller) {
          savedMapArtifactsRequestRef.current = null;
          setRehydratingMapId(null);
        }
      });
  };

  const handleContatoSubmit = async () => {
    setContatoSending(true);
    try {
      const res = await fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contatoForm),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      if (data.ok) {
        showNotification(data.message ?? 'Mensagem enviada!', 'success');
        setShowContato(false);
        setContatoForm({ name: '', phone: '', email: '', message: '' });
      } else {
        showNotification(data.error ?? 'Erro ao enviar mensagem.', 'error');
      }
    } catch {
      showNotification('Erro na comunicação.', 'error');
    }
    setContatoSending(false);
  };

  const handleAuthEmailSubmit = async () => {
    if (!isValidEmail(authEmail)) {
      showNotification('Insira um e-mail válido.', 'info');
      return;
    }
    setAuthLoading(true);
    try {
      const action = authMode === 'save' ? 'save' : authMode === 'delete' ? 'request-delete-token' : 'request-token';
      const body: Record<string, unknown> = { action, email: authEmail };
      if (authMode === 'save') {
        // Merge analiseIa into the result before saving so the AI analysis persists
        const resultWithAnalise = result ? { ...result, analiseIa } : null;
        const novosMapas = resultWithAnalise
          ? [resultWithAnalise, ...mapasSalvos.filter((m) => m.id !== result?.id)]
          : mapasSalvos;
        body.dados = { mapasSalvos: novosMapas };
      }

      const res = await fetch('/api/astrologo-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      if (data.ok) {
        setAuthStep('token');
        showNotification(data.message ?? 'Verifique seu e-mail.', 'info');
      } else {
        showNotification(data.error ?? 'Falha.', 'error');
      }
    } catch {
      showNotification('Erro na conexão.', 'error');
    }
    setAuthLoading(false);
  };

  const handleAuthTokenSubmit = async () => {
    if (authToken.length !== 6) return;
    setAuthLoading(true);
    try {
      const action = authMode === 'save' ? 'verify-save' : authMode === 'delete' ? 'verify-delete' : 'retrieve';
      const res = await fetch('/api/astrologo-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email: authEmail, token: authToken }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        dados?: { mapasSalvos?: ResultData[] };
        sessionToken?: string;
      };

      if (data.ok) {
        if (data.sessionToken) sessionStorage.setItem('astrologo_session_token', data.sessionToken);

        if (action === 'verify-delete') {
          sessionStorage.removeItem('astrologo_session_token');
          setMapasSalvos([]);
          showNotification(data.message ?? 'Dados excluídos com sucesso.', 'success');
        } else if (action === 'retrieve' || action === 'verify-save') {
          if (data.dados?.mapasSalvos) setMapasSalvos(data.dados.mapasSalvos);
          showNotification(data.message ?? 'Autenticado com sucesso.', 'success');
        }
        setAuthMode(null);
        setAuthStep('email');
        setAuthEmail('');
        setAuthToken('');
      } else {
        showNotification(data.error ?? 'Código incorreto.', 'error');
      }
    } catch {
      showNotification('Erro na conexão.', 'error');
    }
    setAuthLoading(false);
  };

  const calcularMapa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAnaliseIa('');
    setResult(null);
    try {
      const res = await fetch('/api/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        code?: string;
        candidates?: AmbiguousTimeCandidate[];
      } & ResultData;
      if (data.success) {
        setAmbiguousTimeCandidates([]);
        setResult(data);
      } else {
        if (data.code === 'LOCAL_TIME_AMBIGUOUS' && Array.isArray(data.candidates)) {
          setAmbiguousTimeCandidates(data.candidates);
        }
        showNotification(String(data.error), 'error');
      }
    } catch {
      showNotification('Erro de conexão.', 'error');
    }
    setLoading(false);
  };

  const solicitarAnalise = async () => {
    if (!result) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          dadosAstronomica: result.dadosAstronomica,
          dadosTropical: result.dadosTropical,
          dadosGlobais: result.dadosGlobais,
          query: result.query,
        }),
      });
      const data = (await res.json()) as { analise?: string; error?: string };
      if (res.ok && data.analise) {
        setAnaliseIa(data.analise);
      } else {
        showNotification(data.error ?? 'A análise não pôde ser gerada com segurança.', 'error');
      }
    } catch {
      showNotification('A Inteligência falhou.', 'error');
    }
    setLoadingAi(false);
  };

  const handleNovaConsulta = () => {
    setResult(null);
    setAnaliseIa('');
    setAmbiguousTimeCandidates([]);
    setDataNascimentoDisplay('');
    setFormData({ nome: '', dataNascimento: '', horaNascimento: '', localNascimento: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-800 font-sans flex flex-col items-center w-full overflow-x-hidden relative">
      <div className="fixed inset-0 bg-slate-50 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-50/50 via-slate-50 to-purple-50/50 -z-10"></div>
      <InfoModal
        type={modalType}
        context={
          result
            ? {
                tatwa: presentTatwa(result.dadosGlobais.tatwa),
                numerologia: result.dadosGlobais.numerologia,
              }
            : {}
        }
        onClose={() => setModalType(null)}
      />

      {!showLicenses ? (
        <div className="max-w-6xl mx-auto w-full flex flex-col items-center grow p-3 sm:p-6 md:p-8">
          <header className="text-center mb-10 md:mb-14 w-full flex flex-col items-center px-2 pt-4">
            <div className="p-4 bg-white/60 backdrop-blur-xl rounded-4xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white mb-6">
              <Compass className="w-12 h-12 md:w-16 md:h-16 text-blue-600" />
            </div>
            {/* H1 PRINCIPAL MANTÉM A REDUÇÃO DRÁSTICA */}
            <h1 className="w-full text-center font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-blue-700 to-indigo-600 mb-3 uppercase text-[clamp(10px,2vw,24px)] text-balance">
              MAPEAMENTO ASTROLÓGICO
            </h1>
            <p className="text-slate-600 text-sm md:text-lg font-medium tracking-wide text-balance">
              Investigue as Influências Astrológicas{' '}
              <span className="text-slate-400 text-[10px] md:text-sm font-normal">(Olhe as Estrelas)</span>
            </p>
          </header>

          <form
            onSubmit={calcularMapa}
            autoComplete="on"
            className={`md3-glass bg-white/60 backdrop-blur-2xl p-6 md:p-10 rounded-[2.5rem] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] w-full grid md:grid-cols-2 gap-5 md:gap-8 max-w-4xl ${result ? 'mb-8' : ''}`}
          >
            <div className="flex flex-col gap-2 w-full">
              <label
                htmlFor="nomeConsulente"
                className="flex items-center gap-2 text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2"
              >
                <User className="w-4 h-4 text-blue-500" /> NOME COMPLETO
              </label>
              <input
                id="nomeConsulente"
                name="name"
                required
                type="text"
                autoComplete="name"
                aria-label="Nome Completo"
                title="Nome Completo"
                placeholder="Ex: João da Silva"
                className="w-full p-4 pl-5 text-base bg-white/80 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition shadow-sm font-medium"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label
                htmlFor="localNascimentoInput"
                className="flex items-center gap-2 text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2"
              >
                <MapPin className="w-4 h-4 text-blue-500" /> LOCAL DE NASCIMENTO{' '}
                <span className="normal-case text-slate-400 font-medium tracking-normal">(Cidade, Estado)</span>
              </label>
              <LocationAutocomplete
                value={formData.localNascimento}
                onChange={(value, providerResultId) => {
                  setAmbiguousTimeCandidates([]);
                  setFormData((current) => {
                    const next: CalculationFormData = { ...current, localNascimento: value };
                    delete next.timeDisambiguation;
                    if (providerResultId === undefined) {
                      delete next.localNascimentoId;
                      return next;
                    }
                    next.localNascimentoId = providerResultId;
                    return next;
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label
                htmlFor="dataNascimento"
                className="flex items-center gap-2 text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2"
              >
                <Calendar className="w-4 h-4 text-blue-500" /> DATA DE NASCIMENTO
              </label>
              <input
                id="dataNascimento"
                name="birthDate"
                required
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                placeholder="DD/MM/AAAA"
                pattern="\d{2}/\d{2}/\d{4}"
                aria-label="Data de Nascimento"
                title="Data de Nascimento"
                className="w-full p-4 pl-5 text-base bg-white/80 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition shadow-sm font-medium scheme-light"
                value={dataNascimentoDisplay}
                onChange={(e) => {
                  setAmbiguousTimeCandidates([]);
                  const display = maskBrazilianDate(e.target.value);
                  setDataNascimentoDisplay(display);
                  setFormData((current) => {
                    const next: CalculationFormData = { ...current, dataNascimento: brazilianDateToIso(display) };
                    delete next.timeDisambiguation;
                    return next;
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label
                htmlFor="horaNascimento"
                className="flex items-center gap-2 text-[11px] md:text-xs font-bold text-slate-500 uppercase tracking-widest ml-2"
              >
                <Clock className="w-4 h-4 text-blue-500" /> HORÁRIO LOCAL NO LOCAL DE NASCIMENTO{' '}
                <span className="normal-case text-slate-400 font-medium tracking-normal">(HH:mm)</span>
              </label>
              <input
                id="horaNascimento"
                name="birthTime"
                required
                type="text"
                inputMode="numeric"
                pattern="(?:[01]\d|2[0-3]):[0-5]\d"
                placeholder="HH:mm"
                autoComplete="off"
                aria-label="Horário de Nascimento"
                title="Horário de Nascimento"
                className="w-full p-4 pl-5 text-base bg-white/80 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition shadow-sm font-medium scheme-light"
                value={formData.horaNascimento}
                onChange={(e) => {
                  setAmbiguousTimeCandidates([]);
                  setFormData((current) => {
                    const next: CalculationFormData = { ...current, horaNascimento: maskBrazilianTime(e.target.value) };
                    delete next.timeDisambiguation;
                    return next;
                  });
                }}
              />
              {ambiguousTimeCandidates.length === 2 && (
                <fieldset className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <legend className="px-1 text-xs font-bold text-amber-900">
                    Horário repetido por mudança histórica
                  </legend>
                  <p className="mb-2 text-xs text-amber-800">
                    Escolha a ocorrência do registro. As opções abaixo já estão convertidas para Brasília.
                  </p>
                  {ambiguousTimeCandidates.map((candidate) => (
                    <label
                      key={candidate.disambiguation}
                      className="flex items-center gap-2 py-1 text-sm text-amber-950"
                    >
                      <input
                        type="radio"
                        name="timeDisambiguation"
                        value={candidate.disambiguation}
                        checked={formData.timeDisambiguation === candidate.disambiguation}
                        onChange={() => setFormData({ ...formData, timeDisambiguation: candidate.disambiguation })}
                      />
                      {candidate.disambiguation === 'earlier' ? 'Primeira ocorrência' : 'Segunda ocorrência'} —{' '}
                      {formatInstantInBrasilia(candidate.instantUtc)} (Hora oficial de Brasília)
                    </label>
                  ))}
                </fieldset>
              )}
            </div>

            <div className="md:col-span-2 mt-4 flex flex-col md:flex-row gap-4 w-full">
              <button
                type="submit"
                disabled={loading}
                aria-label="Extrair Arquitetura Sagrada"
                title="Extrair Arquitetura Sagrada"
                className="flex-1 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black p-5 rounded-2xl flex justify-center items-center gap-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 text-lg uppercase tracking-wider"
              >
                {loading ? (
                  <Sparkles className="animate-spin w-6 h-6" />
                ) : (
                  <>
                    <Compass className="w-6 h-6" /> Extrair Arquitetura Sagrada
                  </>
                )}
              </button>
              {result && (
                <button
                  type="button"
                  onClick={handleNovaConsulta}
                  aria-label="Realizar Nova Consulta"
                  title="Realizar Nova Consulta"
                  className="flex-1 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold p-5 rounded-2xl flex justify-center items-center gap-3 transition-all shadow-sm hover:shadow-md text-sm md:text-base uppercase tracking-wider"
                >
                  <RotateCcw className="w-5 h-5" /> Realizar Nova Consulta
                </button>
              )}
            </div>
          </form>

          {result && (
            <ResultView
              key={result.id}
              result={result}
              analiseIa={analiseIa}
              onSolicitarAnalise={solicitarAnalise}
              loadingAi={loadingAi}
              openInfoModal={setModalType}
              onResultEnhance={(patch) => setResult((current) => (current ? { ...current, ...patch } : current))}
            />
          )}

          {/* Auth Action Buttons */}
          <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row justify-center gap-3 mt-8 animate-in fade-in">
            <button
              onClick={() => setAuthMode('save')}
              type="button"
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-full transition shadow-md sm:flex-1 uppercase tracking-wider text-xs md:text-sm"
            >
              <Save className="w-4 h-4" /> Salvar na Nuvem
            </button>
            <button
              onClick={() => setAuthMode('retrieve')}
              type="button"
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 px-6 rounded-full transition shadow-sm sm:flex-1 uppercase tracking-wider text-xs md:text-sm"
            >
              <Download className="w-4 h-4" /> Meus Mapas
            </button>
            <button
              onClick={() => setAuthMode('delete')}
              type="button"
              className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 px-6 rounded-full transition shadow-sm sm:flex-1 uppercase tracking-wider text-xs md:text-sm"
            >
              <Trash2 className="w-4 h-4" /> Excluir Dados
            </button>
          </div>

          {/* Mapas Salvos List */}
          {mapasSalvos.length > 0 && (
            <div className="w-full max-w-4xl mx-auto mt-12 mb-8">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Book className="text-blue-500 w-5 h-5" /> Arquivo Akáshico do Consulente
              </h3>
              <div className="grid sm:grid-cols-2 bg-white/60 backdrop-blur-xl p-4 md:p-6 rounded-4xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] gap-4">
                {mapasSalvos.map((m) => (
                  <SavedMapArchiveButton
                    key={m.id}
                    consultantName={m.query.nome}
                    birthLabel={formatBirthForDisplay(m)}
                    rehydrating={rehydratingMapId === m.id}
                    onOpen={() => handleSavedMapOpen(m)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto w-full flex flex-col grow p-3 sm:p-6 md:p-8 mt-10">
          <div className="bg-white/80 backdrop-blur-2xl p-6 md:p-10 rounded-[2.5rem] border border-white shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <LicencasModule />
            <div className="flex justify-center mt-8 mb-4">
              <button
                onClick={() => setShowLicenses(false)}
                type="button"
                className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold py-3 px-8 rounded-xl transition shadow-sm uppercase tracking-wider text-sm"
              >
                Voltar ao Oráculo Celestial
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full py-6 mt-12 bg-white/40 backdrop-blur-md border-t border-white flex flex-col justify-center items-center shrink-0 gap-4">
        <div className="flex gap-4">
          <button
            onClick={() => setShowContato(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider transition"
          >
            <MessageSquare className="w-4 h-4" /> Contato
          </button>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs flex items-center gap-2">
          <span className="opacity-70">Oráculo Celestial</span>
          <span className="opacity-30">•</span>
          <span className="text-blue-600">{APP_VERSION}</span>
        </p>
      </footer>
      <ComplianceBanner onViewLicenses={() => setShowLicenses(true)} />

      {/* Contato Modal */}
      {showContato && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
          onClick={() => setShowContato(false)}
        >
          <div
            className="md3-glass bg-white/95 backdrop-blur-2xl border border-white p-6 md:p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowContato(false)}
              className="absolute top-4 right-4 p-2 cursor-pointer bg-slate-100 hover:bg-slate-200 rounded-full transition"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
            <h3 id="contact-modal-title" className="text-2xl font-black text-blue-600 mb-2">
              Mensagem do Mestre
            </h3>
            <p className="text-slate-600 mb-6 text-sm">Entre em contato, e responderemos o mais breve possível.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleContatoSubmit();
              }}
              className="flex flex-col gap-3"
            >
              <input
                required
                id="contact-name"
                name="name"
                autoComplete="name"
                type="text"
                placeholder="Seu Nome"
                className="w-full p-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                value={contatoForm.name}
                onChange={(e) => setContatoForm((p) => ({ ...p, name: e.target.value }))}
              />
              <div className="flex gap-3">
                <input
                  id="contact-phone"
                  name="phone"
                  autoComplete="tel-national"
                  inputMode="tel"
                  maxLength={16}
                  type="tel"
                  placeholder="Telefone"
                  className="w-full p-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={contatoForm.phone}
                  onChange={(e) => setContatoForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                />
                <input
                  required
                  id="contact-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="E-mail"
                  className="w-full p-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  value={contatoForm.email}
                  onChange={(e) => setContatoForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <label htmlFor="contact-message-text" className="sr-only">
                Sua mensagem
              </label>
              <textarea
                id="contact-message-text"
                name="message"
                autoComplete="off"
                required
                placeholder="Sua mensagem..."
                maxLength={500}
                rows={4}
                className="w-full p-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm resize-none"
                value={contatoForm.message}
                onChange={(e) => setContatoForm((p) => ({ ...p, message: e.target.value }))}
              />
              <button
                type="submit"
                disabled={contatoSending}
                className="w-full mt-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold p-4 rounded-xl flex justify-center items-center gap-3 transition-all disabled:opacity-50 uppercase tracking-wider shadow-md text-sm"
              >
                {contatoSending ? <Sparkles className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />} Enviar
                Mensagem
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {authMode && (
        <div
          className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          onClick={() => {
            setAuthMode(null);
            setAuthStep('email');
            setAuthEmail('');
            setAuthToken('');
          }}
        >
          <div
            className="md3-glass bg-white/95 backdrop-blur-2xl border border-white p-6 md:p-8 rounded-[2.5rem] max-w-sm w-full shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 relative">
              {authMode === 'save' ? (
                <Save className="w-8 h-8" />
              ) : authMode === 'delete' ? (
                <Trash2 className="w-8 h-8" />
              ) : (
                <Download className="w-8 h-8" />
              )}
            </div>
            <h3 id="auth-modal-title" className="text-xl font-black text-slate-800 mb-2">
              {authMode === 'save' ? 'Salvar Análise' : authMode === 'delete' ? 'Excluir Dados' : 'Meus Mapas'}
            </h3>
            {authStep === 'email' ? (
              <>
                <p className="text-slate-600 mb-6 text-sm">
                  {authMode === 'save'
                    ? 'Insira seu e-mail para salvar este mapa.'
                    : authMode === 'delete'
                      ? 'Insira o e-mail para excluir seus mapas salvos.'
                      : 'Insira o e-mail vinculado aos seus mapas.'}
                </p>
                <label htmlFor="astro-auth-email" className="sr-only">
                  Endereço de e-mail
                </label>
                <input
                  id="astro-auth-email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="seu@email.com"
                  aria-label="Endereço de e-mail"
                  className="w-full p-4 mb-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-base text-center font-medium"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAuthEmailSubmit();
                  }}
                  disabled={authLoading}
                />
                <button
                  type="button"
                  onClick={() => void handleAuthEmailSubmit()}
                  disabled={authLoading || !isValidEmail(authEmail)}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition uppercase text-sm tracking-wider mb-3"
                >
                  {authLoading ? 'Processando...' : 'Enviar Código'}
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 mb-6 text-sm">
                  Código de 6 dígitos enviado para <strong>{authEmail}</strong>
                </p>
                <label htmlFor="astro-auth-token" className="sr-only">
                  Código de verificação
                </label>
                <input
                  id="astro-auth-token"
                  name="oneTimeCode"
                  autoComplete="one-time-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  aria-label="Código de verificação"
                  className="w-full p-4 mb-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-3xl font-black text-center tracking-[0.5em] placeholder:tracking-normal font-mono"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && authToken.length === 6) void handleAuthTokenSubmit();
                  }}
                  disabled={authLoading}
                />
                <button
                  type="button"
                  onClick={() => void handleAuthTokenSubmit()}
                  disabled={authLoading || authToken.length !== 6}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition uppercase text-sm tracking-wider mb-3"
                >
                  {authLoading ? 'Verificando...' : 'Verificar e Confirmar'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setAuthMode(null);
                setAuthStep('email');
                setAuthEmail('');
                setAuthToken('');
              }}
              className="w-full bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
