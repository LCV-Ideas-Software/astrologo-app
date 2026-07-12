import { MapPin, Sparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface GeoResult {
  readonly id?: number;
  readonly name?: string;
  readonly admin1?: string;
  readonly country?: string;
}

interface LocationAutocompleteProps {
  readonly value: string;
  readonly onChange: (value: string, providerResultId?: number) => void;
  readonly inputId?: string;
  readonly ariaLabel?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  inputId = 'localNascimentoInput',
  ariaLabel = 'Local de nascimento',
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização controlada com o formulário pai
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onChange(nextValue, undefined);
    if (nextValue.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    const searchQuery = (nextValue.split(',')[0] ?? nextValue).trim();
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=pt&format=json`,
    )
      .then((response) => response.json())
      .then((data) => {
        const payload = data as { results?: GeoResult[] };
        setSuggestions(payload.results ?? []);
        setIsOpen(Boolean(payload.results?.length));
      })
      .catch(() => {
        setSuggestions([]);
        setIsOpen(false);
      })
      .finally(() => setLoading(false));
  };

  const handleSelect = (suggestion: GeoResult) => {
    const locationName = [suggestion.name, suggestion.admin1, suggestion.country].filter(Boolean).join(', ');
    setQuery(locationName);
    onChange(locationName, suggestion.id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        id={inputId}
        name="birthLocation"
        required
        type="text"
        aria-label={ariaLabel}
        placeholder="Ex.: Rio de Janeiro, RJ"
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200 bg-white/80 p-4 pl-12 text-base font-medium text-slate-800 shadow-sm outline-none backdrop-blur-sm transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-400"
        value={query || value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
      />
      <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      {loading && <Sparkles className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-blue-500" />}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-100 mt-2 max-h-60 w-full divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id ?? index}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(suggestion);
                }}
                className="flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-slate-50"
              >
                <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">
                  {[suggestion.name, suggestion.admin1, suggestion.country].filter(Boolean).join(', ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
