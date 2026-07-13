import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { WheelModalContent } from './wheelElementContent';

type FocusableElement = Element & { focus: () => void };

interface WheelElementModalProps {
  readonly content: WheelModalContent | null;
  readonly onClose: () => void;
  readonly returnFocusTo: FocusableElement | null;
}

export const MAX_WHEEL_MODAL_FACTS = 5;

export const visibleWheelModalFacts = (facts: readonly string[]): readonly string[] =>
  facts.slice(0, MAX_WHEEL_MODAL_FACTS);

const canReceiveFocus = (element: Element | null): element is FocusableElement =>
  Boolean(element && 'focus' in element && typeof (element as FocusableElement).focus === 'function');

export function WheelElementModal({ content, onClose, returnFocusTo }: WheelElementModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!content) return;
    const previousActiveElement = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const focusTarget = returnFocusTo ?? (canReceiveFocus(previousActiveElement) ? previousActiveElement : null);
      focusTarget?.focus();
    };
  }, [content, onClose, returnFocusTo]);

  if (!content || typeof document === 'undefined') return null;
  const facts = visibleWheelModalFacts(content.facts);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="md3-glass relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.42)] backdrop-blur-2xl sm:p-6"
      >
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: content.color }} />
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar detalhes do elemento"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 motion-reduce:transition-none"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-12">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black shadow-lg"
            style={{ color: content.color }}
          >
            {content.symbol}
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-xl font-black text-slate-950 sm:text-2xl" title={content.title}>
              {content.title}
            </h2>
            {content.subtitle ? (
              <p className="truncate text-sm font-bold text-slate-600" title={content.subtitle}>
                {content.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <p id={descriptionId} className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-700">
          {content.summary}
        </p>

        {facts.length > 0 ? (
          <ul className="mt-4 space-y-2" aria-label="Dados deste elemento no mapa">
            {facts.map((fact) => (
              <li
                key={fact}
                title={fact}
                className="truncate rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
              >
                {fact}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
