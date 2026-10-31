import React, { useEffect, useState } from 'react';
import { AlertTriangle, FlaskConical, Loader2, Power, Trash2, Wand2 } from 'lucide-react';
import { CAN_SWITCH_TO_REHEARSAL, EVENT_ID, REHEARSAL_EVENT_ID, setRehearsalMode } from '../../services/firestore';
import { deleteRehearsalData, generateRehearsalData, rehearsalSummary } from '../../services/rehearsal';
import { DEFAULT_COUNTS, SampleCounts, sampleCountsProblem, SEED_STAGE_LABELS, SEED_STAGES, SeedStage } from '../../domain/sampleData';

/**
 * /admin/cai-dat/tong-duyet: sample data for rehearsing on the real site. The data lives in its own tree, so the
 * real dancers are never touched; "Chế độ tổng duyệt" moves every device (judges, MC, desks, LED) onto it.
 */
export const RehearsalView: React.FC = () => {
  const onRehearsal = EVENT_ID === REHEARSAL_EVENT_ID;
  const [summary, setSummary] = useState<{ newbie: number; pro: number } | null>(null);
  const [stage, setStage] = useState<SeedStage>('check-in');
  const [counts, setCounts] = useState<SampleCounts>(DEFAULT_COUNTS);
  const [busy, setBusy] = useState<'generate' | 'delete' | 'switch' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = () =>
    rehearsalSummary().then(setSummary, (e: Error) => setMessage({ kind: 'error', text: `Không đọc được dữ liệu tổng duyệt: ${e.message}` }));
  useEffect(() => {
    refresh();
  }, []);

  const problem = sampleCountsProblem(stage, counts);
  const hasData = Boolean(summary && summary.newbie + summary.pro > 0);

  const run = async (kind: 'generate' | 'delete' | 'switch', action: () => Promise<string>) => {
    setBusy(kind);
    setMessage(null);
    try {
      setMessage({ kind: 'ok', text: await action() });
      await refresh();
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const generate = () => {
    if (problem) return;
    const replace = hasData ? ' Toàn bộ dữ liệu tổng duyệt hiện có sẽ bị thay.' : '';
    if (!window.confirm(`Tạo dữ liệu mẫu: ${SEED_STAGE_LABELS[stage]}, ${counts.newbie + counts.both} Newbie và ${counts.pro + counts.both} Pro.${replace} Giải thật không bị ảnh hưởng.`)) return;
    run('generate', async () => {
      const written = await generateRehearsalData(stage, counts);
      return `Đã tạo ${written} bản ghi dữ liệu mẫu. Bật "Chế độ tổng duyệt" để mọi máy chuyển sang dữ liệu này.`;
    });
  };

  const remove = () => {
    if (!window.confirm('Xoá toàn bộ dữ liệu tổng duyệt? Tài khoản đăng nhập và giải thật không bị ảnh hưởng.')) return;
    run('delete', async () => `Đã xoá ${await deleteRehearsalData()} bản ghi dữ liệu mẫu.`);
  };

  const toggle = (on: boolean) => {
    const question = on
      ? 'Bật chế độ tổng duyệt? Mọi máy (giám khảo, MC, check-in, LED, trang khách) sẽ tải lại và dùng dữ liệu mẫu cho tới khi tắt.'
      : 'Tắt chế độ tổng duyệt? Mọi máy sẽ tải lại và quay về dữ liệu giải thật.';
    if (!window.confirm(question)) return;
    // Every open screen, this one included, reloads onto the other tree (App watches config/app).
    run('switch', async () => {
      await setRehearsalMode(on);
      return on ? 'Đã bật, đang chuyển sang dữ liệu tổng duyệt…' : 'Đã tắt, đang quay về giải thật…';
    });
  };

  const field = (key: keyof SampleCounts, label: string, hint: string) => (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-zinc-700">{label}</span>
      <input
        type="number"
        min={0}
        max={112}
        inputMode="numeric"
        value={counts[key]}
        onChange={(e) => setCounts((c) => ({ ...c, [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
        disabled={onRehearsal || busy !== null}
        className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-bold tabular-nums disabled:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-amber-500"
      />
      <span className="text-[11px] text-zinc-500">{hint}</span>
    </label>
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="border-b border-zinc-200 pb-4">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
          Cài đặt
        </span>
        <h1 className="font-condensed font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight mt-1 uppercase">Tổng duyệt</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Dữ liệu mẫu nằm ở bản tổng duyệt riêng, tách khỏi giải thật. Tài khoản BTC, giám khảo, MC dùng chung với giải thật.
        </p>
      </div>

      {/* Mode: which data every device is on */}
      <section
        className={`flex flex-col gap-3 rounded-lg border-2 p-4 sm:flex-row sm:items-center sm:justify-between ${
          onRehearsal ? 'border-fuchsia-400 bg-fuchsia-50' : 'border-emerald-300 bg-emerald-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <FlaskConical className={`mt-0.5 h-6 w-6 shrink-0 ${onRehearsal ? 'text-fuchsia-600' : 'text-emerald-600'}`} />
          <div>
            <p className="font-condensed text-xl font-black uppercase leading-tight">
              {onRehearsal ? 'Đang tổng duyệt: mọi máy dùng dữ liệu mẫu' : 'Đang chạy giải thật'}
            </p>
            <p className="text-xs text-zinc-600">
              {summary === null
                ? 'Đang đọc dữ liệu tổng duyệt…'
                : hasData
                  ? `Dữ liệu mẫu hiện có: ${summary.newbie} Newbie · ${summary.pro} Pro.`
                  : 'Chưa có dữ liệu mẫu.'}
              {onRehearsal && ' Nhớ tắt trước ngày thi.'}
            </p>
          </div>
        </div>
        {CAN_SWITCH_TO_REHEARSAL &&
          (onRehearsal ? (
            <button
              onClick={() => toggle(false)}
              disabled={busy !== null}
              className="flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {busy === 'switch' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Tắt, về giải thật
            </button>
          ) : (
            <button
              onClick={() => toggle(true)}
              disabled={busy !== null || !hasData}
              title={hasData ? undefined : 'Tạo dữ liệu mẫu trước'}
              className="flex items-center justify-center gap-2 rounded bg-fuchsia-600 px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-fuchsia-700 disabled:opacity-50 cursor-pointer"
            >
              {busy === 'switch' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Bật chế độ tổng duyệt
            </button>
          ))}
      </section>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`rounded border px-3 py-2 text-xs font-bold ${
            message.kind === 'error' ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Generator */}
      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-condensed text-xl font-black uppercase">Tạo dữ liệu mẫu</h2>
          {onRehearsal && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Tắt chế độ tổng duyệt trước khi tạo lại hoặc xoá
            </span>
          )}
        </div>

        <fieldset className="space-y-1.5" disabled={onRehearsal || busy !== null}>
          <legend className="mb-1 text-xs font-bold text-zinc-700">Giai đoạn bắt đầu tổng duyệt</legend>
          {SEED_STAGES.map((s) => (
            <label
              key={s}
              className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                stage === s ? 'border-zinc-900 bg-zinc-50 font-bold' : 'border-zinc-200'
              } ${onRehearsal ? 'opacity-60' : 'cursor-pointer'}`}
            >
              <input type="radio" name="stage" checked={stage === s} onChange={() => setStage(s)} className="accent-zinc-900" />
              {SEED_STAGE_LABELS[s]}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          {field('newbie', 'Chỉ thi Newbie', 'Số thí sinh chỉ đăng ký Newbie')}
          {field('pro', 'Chỉ thi Pro', 'Số thí sinh chỉ đăng ký Pro')}
          {field('both', 'Thi cả 2 hạng mục', 'Có mặt ở cả Newbie và Pro')}
        </div>
        <p className="text-xs text-zinc-600">
          Tổng: <b>{counts.newbie + counts.both} Newbie</b> · <b>{counts.pro + counts.both} Pro</b>. Giám khảo và cách chia bảng lấy theo giải
          thật. Từ 40 em trở lên, vài em mẫu sẽ vắng mặt lúc check-in.
        </p>
        {problem && (
          <p role="alert" className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            {problem}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:justify-between">
          <button
            onClick={remove}
            disabled={onRehearsal || busy !== null || !hasData}
            className="flex items-center justify-center gap-2 rounded border border-red-300 bg-white px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
          >
            {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Xoá dữ liệu mẫu
          </button>
          <button
            onClick={generate}
            disabled={onRehearsal || busy !== null || Boolean(problem)}
            className="flex items-center justify-center gap-2 rounded bg-amber-500 px-5 py-2.5 text-xs font-black uppercase text-zinc-950 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
          >
            {busy === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Tạo dữ liệu mẫu
          </button>
        </div>
      </section>
    </div>
  );
};
