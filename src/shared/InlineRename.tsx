import React, { useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';

/** A name with a pencil: tap to edit in place, Enter saves, Escape cancels. Used on the admin account pages. */
export const InlineRename: React.FC<{
  value: string;
  /** What is being renamed, for screen readers: "giám khảo GK 01". */
  label: string;
  onSave: (name: string) => Promise<void> | void;
  className?: string;
}> = ({ value, label, onSave, className = '' }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const name = draft?.trim() ?? '';
    if (!name || name === value) return setDraft(null);
    setBusy(true);
    setError(null);
    try {
      await onSave(name);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (draft === null) {
    return (
      <span className={`flex min-w-0 items-center gap-1 ${className}`}>
        <span className="truncate">{value}</span>
        <button
          onClick={() => setDraft(value)}
          aria-label={`Đổi tên ${label}`}
          title="Đổi tên"
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setDraft(null);
          }}
          maxLength={40}
          disabled={busy}
          aria-label={`Tên mới của ${label}`}
          className="min-w-0 flex-1 rounded border border-amber-400 bg-white px-2 py-1 text-sm font-bold text-zinc-900 focus-visible:outline-2 focus-visible:outline-amber-500"
        />
        <button
          onClick={save}
          disabled={busy}
          aria-label="Lưu tên"
          className="shrink-0 rounded bg-zinc-900 p-1.5 text-white hover:bg-zinc-700 disabled:opacity-50 cursor-pointer"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => setDraft(null)}
          disabled={busy}
          aria-label="Huỷ đổi tên"
          className="shrink-0 rounded border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-100 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
      {error && <span className="text-[11px] font-bold text-red-600">{error}</span>}
    </span>
  );
};
