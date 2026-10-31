import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { CategoryType, Dancer } from '../../domain/types';
import { otherCategory, twinOf } from '../../domain/model';
import { useTournament } from '../../state/TournamentContext';
import { walkInName } from '../../services/firestore';

const field =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-900 focus-visible:outline-2 focus-visible:outline-amber-500';

/**
 * Admin edits a dancer's name, real name, club and gender. SBD, photos and scores are left as they are.
 * A dancer in both categories is edited once (the change goes to both records); one in a single category can be
 * signed up for the other here.
 */
export const DancerInfoModal: React.FC<{
  dancer: Dancer | null;
  category: CategoryType;
  onClose: () => void;
}> = ({ dancer, category, onClose }) => {
  const { newbieDancers, proDancers, updateDancerInfo, addOtherCategory } = useTournament();
  const [form, setForm] = useState({ name: '', realName: '', crew: '', gender: 'male' as Dancer['gender'] });
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!dancer) return;
    setForm({ name: dancer.name, realName: dancer.realName ?? '', crew: dancer.crew ?? '', gender: dancer.gender });
    setError(null);
    // Only when another dancer is opened: live updates of the same one must not wipe what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dancer?.id]);

  const open = Boolean(dancer);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!dancer) return null;

  const other = otherCategory(category);
  const otherLabel = other === 'newbie_1v1' ? 'Newbie' : 'Pro';
  const twin = twinOf(dancer, other === 'newbie_1v1' ? newbieDancers : proDancers);

  // Signed up for one category, now wants the other too: same details and the same photo.
  const addOther = async () => {
    setAdding(true);
    setError(null);
    try {
      await addOtherCategory(category, dancer.id);
    } catch (err) {
      setError(`Không đăng ký thêm được: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAdding(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const name = walkInName(form.name);
    if (!name) return setError('Cần nhập tên thi đấu.');
    const list = category === 'newbie_1v1' ? newbieDancers : proDancers;
    if (list.some((d) => d.id !== dancer.id && walkInName(d.name) === name)) {
      return setError(`${name} đã có trong danh sách ${category === 'newbie_1v1' ? 'Newbie' : 'Pro'}.`);
    }
    // The stage name links the two categories: it must not land on someone else's record in the other list.
    const otherList = other === 'newbie_1v1' ? newbieDancers : proDancers;
    if (otherList.some((d) => d.id !== twin?.id && walkInName(d.name) === name)) {
      return setError(`${name} đã là một thí sinh khác trong danh sách ${otherLabel}.`);
    }
    updateDancerInfo(category, dancer.id, { ...form, name });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dancer-info-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-4 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="dancer-info-title" className="font-condensed text-2xl font-black uppercase text-zinc-900">
            Sửa thông tin {dancer.sbd && <span className="font-mono text-lg text-zinc-400">#{dancer.sbd}</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="-m-1 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-bold text-zinc-600">Tên thi đấu</span>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={40}
              className={`${field} uppercase`}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-zinc-600">Họ và tên</span>
            <input
              value={form.realName}
              onChange={(e) => setForm((f) => ({ ...f, realName: e.target.value }))}
              maxLength={60}
              className={field}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-zinc-600">CLB / Đội</span>
            <input
              value={form.crew}
              onChange={(e) => setForm((f) => ({ ...f, crew: e.target.value }))}
              maxLength={60}
              className={field}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-bold text-zinc-600">Giới tính</span>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Dancer['gender'] }))}
              className={`${field} cursor-pointer`}
            >
              <option value="male">♂ Nam (Bboy)</option>
              <option value="female">♀ Nữ (Bgirl)</option>
            </select>
          </label>
        </div>
        {/* Both categories: one record each, sharing details and photo */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2.5">
          {twin ? (
            <p className="text-sm font-bold text-sky-800">
              Cũng thi {otherLabel}
              {twin.sbd && <span className="font-mono"> #{twin.sbd}</span>} · tên, thông tin và ảnh dùng chung
            </p>
          ) : (
            <>
              <p className="text-sm text-sky-900">Chỉ thi {category === 'newbie_1v1' ? 'Newbie' : 'Pro'}.</p>
              <button
                type="button"
                onClick={addOther}
                disabled={adding}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black uppercase text-white hover:bg-sky-500 disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Đăng ký thêm {otherLabel}
              </button>
            </>
          )}
        </div>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black uppercase text-zinc-950 hover:bg-amber-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900"
          >
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
};
