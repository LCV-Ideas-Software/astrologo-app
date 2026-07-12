interface SavedMapArchiveButtonProps {
  readonly consultantName: string;
  readonly birthLabel: string;
  readonly rehydrating: boolean;
  readonly onOpen: () => void;
}

export function SavedMapArchiveButton({ consultantName, birthLabel, rehydrating, onOpen }: SavedMapArchiveButtonProps) {
  return (
    <button
      type="button"
      aria-busy={rehydrating}
      aria-label={`Abrir mapa salvo de ${consultantName}`}
      className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-shadow cursor-pointer flex flex-col gap-1 text-left"
      onClick={onOpen}
    >
      <strong className="text-slate-800 truncate block text-base w-full">{consultantName}</strong>
      <span className="text-xs text-slate-500">{birthLabel}</span>
      {rehydrating && (
        <span role="status" className="mt-1 text-xs font-semibold text-blue-700 animate-pulse">
          Restaurando dados avançados…
        </span>
      )}
    </button>
  );
}
