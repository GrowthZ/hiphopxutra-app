import React, { useMemo, useState } from 'react';
import { useTournament } from '../../state/TournamentContext';
import { isRoundOpen, matchSlug } from '../../domain/model';
import { matchSlugFromPath, VIEW_PATHS } from '../../app/routes';
import { BattleMatch, BattleSide, CategoryType, RoundStage } from '../../domain/types';
import { getDancerAvatarUrl, getTeamPhotoUrl, stripBreakerPrefix } from '../../shared/placeholderAssets';
import { ArrowLeft, Check, ChevronRight, Copy, QrCode, Radio, Swords, X } from 'lucide-react';

// Public battle pages: /ket-qua/nhanh-dau (bracket) and /ket-qua/tran/{slug} (one match).
// They read the published copy, so a round's judge sides only appear after the admin reveals it.

const STAGES: RoundStage[] = ['top32', 'top16', 'top8', 'top4', 'final'];
const matchPath = (m: BattleMatch) => `${VIEW_PATHS.match_guest}/${matchSlug(m)}`;
const sideName = (side: BattleSide) =>
  side.dancers.map((d) => stripBreakerPrefix(d.name)).filter(Boolean).join(' & ') || stripBreakerPrefix(side.name) || 'Chờ xác định';

// ---------- Shared header: brand, Prelim / Battle tabs, QR share ----------
export const GuestHeader: React.FC<{ current: 'prelim' | 'battle' }> = ({ current }) => {
  const { navigate } = useTournament();
  const [isShareOpen, setIsShareOpen] = useState(false);

  const tab = (id: 'prelim' | 'battle', label: string, path: string) =>
    current === id ? (
      <span className="border-b-2 border-zinc-900 pb-2 text-zinc-900" aria-current="page">
        {label}
      </span>
    ) : (
      <button
        onClick={() => navigate(path)}
        className="border-b-2 border-transparent pb-2 text-zinc-400 hover:text-zinc-700 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
      >
        {label}
      </button>
    );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
          <img src="/logo.png" alt="HipHop Xứ Trà U16" className="h-10 w-auto" />
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <QrCode className="h-4 w-4" />
            Chia sẻ
          </button>
        </div>
        <nav className="mx-auto flex max-w-2xl gap-5 px-4 text-sm font-bold" aria-label="Trang kết quả">
          {tab('prelim', 'Vòng loại', VIEW_PATHS.prelim_guest)}
          {tab('battle', 'Nhánh đấu', VIEW_PATHS.bracket_guest)}
        </nav>
      </header>
      {/* Outside the header: its backdrop-blur would trap a fixed-position dialog inside it. */}
      {isShareOpen && <ShareModal url={window.location.href} onClose={() => setIsShareOpen(false)} />}
    </>
  );
};

const ShareModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the link is still visible to copy by hand
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Chia sẻ trang"
        className="w-full max-w-xs rounded-xl border border-zinc-300 bg-zinc-50 p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-condensed text-lg font-black uppercase text-zinc-900">Quét QR xem trên điện thoại</span>
          <button onClick={onClose} aria-label="Đóng" className="text-zinc-500 hover:text-zinc-900 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <img loading="lazy" decoding="async"
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`}
          alt="Mã QR"
          className="mx-auto h-52 w-52 rounded-lg bg-white p-2"
        />
        <p className="mt-3 break-all font-mono text-[11px] text-zinc-500">{url}</p>
        <button
          onClick={copy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 cursor-pointer"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Đã sao chép' : 'Sao chép link'}
        </button>
      </div>
    </div>
  );
};

// ---------- Small pieces ----------
const SideAvatar: React.FC<{ match: BattleMatch; side: BattleSide; ring: string; size?: string }> = ({
  match,
  side,
  ring,
  size = 'h-8 w-8',
}) => {
  const { storageConfig } = useTournament();
  const src =
    match.category === 'pro_2v2'
      ? getTeamPhotoUrl(side, storageConfig.placeholders)
      : getDancerAvatarUrl(side.dancers[0], storageConfig.placeholders);
  return <img loading="lazy" decoding="async" src={src} alt="" className={`${size} shrink-0 rounded-full border-2 object-cover ${ring}`} />;
};

const StatusBadge: React.FC<{ match: BattleMatch; live: boolean }> = ({ match, live }) =>
  live ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      LIVE
    </span>
  ) : match.status === 'finished' ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Đã xong</span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">Sắp đấu</span>
  );

const useLiveMatchId = () => {
  const { activeMatch } = useTournament();
  return activeMatch?.status === 'ongoing' ? activeMatch.id : null;
};

const CategoryToggle: React.FC = () => {
  const { activeCategory, setActiveCategory } = useTournament();
  const option = (id: CategoryType, label: string) => (
    <button
      onClick={() => setActiveCategory(id)}
      className={`flex-1 rounded px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer sm:flex-none ${
        activeCategory === id ? 'bg-white text-zinc-950' : 'text-zinc-500 hover:text-zinc-900'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
      {option('pro_2v2', 'U16 Pro • 2vs2')}
      {option('newbie_1v1', 'U16 Newbie • 1vs1')}
    </div>
  );
};

const MatchCard: React.FC<{ match: BattleMatch; live: boolean }> = ({ match, live }) => {
  const { navigate } = useTournament();
  const row = (side: BattleSide, color: 'red' | 'blue', wins: number) => {
    const won = match.winnerSide === color;
    const lost = match.winnerSide && !won;
    return (
      <div className={`flex items-center gap-2 ${lost ? 'opacity-50' : ''}`}>
        <SideAvatar match={match} side={side} ring={color === 'red' ? 'border-red-500' : 'border-blue-500'} />
        <div className="min-w-0 flex-1">
          <div className={`truncate font-condensed text-base font-black uppercase ${won ? 'text-amber-600' : 'text-zinc-900'}`}>
            {sideName(side)}
          </div>
          <div className="truncate font-mono text-[10px] text-zinc-500">{side.sbdText || '—'}</div>
        </div>
        <span className={`font-condensed text-xl font-black tabular-nums ${won ? 'text-amber-600' : 'text-zinc-700'}`}>
          {wins}
        </span>
      </div>
    );
  };
  return (
    <button
      onClick={() => navigate(matchPath(match))}
      className={`w-full rounded-xl border bg-zinc-50 p-3 text-left transition-colors hover:border-zinc-500 focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer ${
        live ? 'border-red-500' : 'border-zinc-200'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-zinc-500">Trận {String(match.matchNumber).padStart(2, '0')}</span>
        <StatusBadge match={match} live={live} />
      </div>
      <div className="space-y-2">
        {row(match.sideRed, 'red', match.roundWinsRed)}
        {row(match.sideBlue, 'blue', match.roundWinsBlue)}
      </div>
    </button>
  );
};

// ---------- /ket-qua/nhanh-dau ----------
export const GuestBracketView: React.FC = () => {
  const { matches, activeCategory, activeMatch, navigate } = useTournament();
  const liveId = useLiveMatchId();
  const byStage = useMemo(() => {
    const list = matches.filter((m) => m.category === activeCategory);
    return STAGES.map((stage) => list.filter((m) => m.stage === stage)).filter((group) => group.length > 0);
  }, [matches, activeCategory]);

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900">
      <GuestHeader current="battle" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-4">
        {liveId && activeMatch && (
          <button
            onClick={() => navigate(matchPath(activeMatch))}
            className="flex w-full items-center gap-3 rounded-xl border border-red-500/60 bg-red-50 p-3 text-left transition-colors hover:bg-red-50 cursor-pointer"
          >
            <Radio className="h-5 w-5 shrink-0 animate-pulse text-red-600" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase text-red-700">Đang diễn ra • {activeMatch.title}</div>
              <div className="truncate font-condensed text-lg font-black uppercase text-zinc-900">
                {sideName(activeMatch.sideRed)} <span className="text-zinc-500">vs</span> {sideName(activeMatch.sideBlue)}
              </div>
            </div>
            <span className="font-condensed text-2xl font-black tabular-nums text-zinc-900">
              {activeMatch.roundWinsRed}–{activeMatch.roundWinsBlue}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />
          </button>
        )}

        <CategoryToggle />

        {byStage.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            <Swords className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
            Nhánh đấu sẽ được công bố sau vòng Prelim.
          </div>
        ) : (
          byStage.map((group) => (
            <section key={group[0].stage}>
              <h2 className="mb-2 font-condensed text-xl font-black uppercase tracking-wide text-amber-600">
                {group[0].stageName}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((m) => (
                  <MatchCard key={m.id} match={m} live={m.id === liveId} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
};

// ---------- /ket-qua/tran/{slug} ----------
export const GuestMatchView: React.FC = () => {
  const { matches, judges, pathname, navigate } = useTournament();
  const liveId = useLiveMatchId();
  const slug = matchSlugFromPath(pathname);
  const match = matches.find((m) => matchSlug(m) === slug);

  const back = (
    <button
      onClick={() => navigate(VIEW_PATHS.bracket_guest)}
      className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 transition-colors hover:text-zinc-900 cursor-pointer"
    >
      <ArrowLeft className="h-4 w-4" />
      Nhánh đấu
    </button>
  );

  if (!match) {
    return (
      <div className="min-h-[100dvh] bg-white text-zinc-900">
        <GuestHeader current="battle" />
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
          {back}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            {matches.length === 0 ? 'Đang tải…' : 'Không tìm thấy trận này.'}
          </div>
        </main>
      </div>
    );
  }

  const side = (s: BattleSide, color: 'red' | 'blue', wins: number) => {
    const won = match.winnerSide === color;
    return (
      <div className={`flex min-w-0 flex-1 flex-col items-center gap-2 text-center ${match.winnerSide && !won ? 'opacity-50' : ''}`}>
        <SideAvatar match={match} side={s} ring={color === 'red' ? 'border-red-500' : 'border-blue-500'} size="h-16 w-16 sm:h-20 sm:w-20" />
        <div className="w-full truncate font-condensed text-lg font-black uppercase leading-tight text-zinc-900 sm:text-2xl">
          {sideName(s)}
        </div>
        <div className="font-mono text-[10px] text-zinc-500">{s.sbdText || '—'}</div>
        <div className={`font-condensed text-5xl font-black tabular-nums ${won ? 'text-amber-600' : 'text-zinc-900'}`}>{wins}</div>
        {won && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-950">Thắng</span>}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900">
      <GuestHeader current="battle" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {back}

        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase text-zinc-500">{match.title}</span>
            <StatusBadge match={match} live={match.id === liveId} />
          </div>
          <div className="flex items-start gap-3">
            {side(match.sideRed, 'red', match.roundWinsRed)}
            <span className="pt-6 font-condensed text-xl font-black text-zinc-600">VS</span>
            {side(match.sideBlue, 'blue', match.roundWinsBlue)}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-condensed text-lg font-black uppercase tracking-wide text-amber-600">Từng hiệp</h2>
          {match.rounds.map((round) => {
            const open = isRoundOpen(round);
            const voted = Object.keys(round.votes).length;
            return (
              <div key={round.roundNumber} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-condensed text-base font-black uppercase text-zinc-900">
                    {round.isTieBreak ? 'Hiệp phụ' : `Hiệp ${round.roundNumber}`}
                  </span>
                  {open && round.winner ? (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-black uppercase text-zinc-900 ${
                        round.winner === 'red' ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                    >
                      {round.winner === 'red' ? 'Đỏ' : 'Xanh'} thắng {round.redVotesCount}–{round.blueVotesCount}
                    </span>
                  ) : open ? (
                    <span className="text-xs font-bold tabular-nums text-zinc-700">
                      Đỏ {round.redVotesCount} – {round.blueVotesCount} Xanh
                    </span>
                  ) : voted > 0 ? (
                    <span className="text-xs font-bold tabular-nums text-zinc-500">Đang chấm {voted}/{judges.length}</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Chưa diễn ra</span>
                  )}
                </div>
                {open && (
                  <div className="mt-2 grid grid-cols-5 gap-1 sm:grid-cols-9">
                    {judges.map((j) => {
                      const v = round.votes[j.id];
                      return (
                        <div
                          key={j.id}
                          title={j.name}
                          className={`rounded py-1 text-center font-mono text-[10px] font-bold ${
                            v === 'red' ? 'bg-red-600 text-white' : v === 'blue' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {j.code.replace('GK ', 'GK')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};
