import { ActiveViewType } from '../domain/types';

export const VIEW_PATHS: Record<ActiveViewType, string> = {
  prelim_guest: '/ket-qua/prelim',
  prelim_results: '/ket-qua/bang-xep-hang',
  prelim_screen: '/ket-qua/trinh-chieu',
  prelim_screen_led: '/ket-qua/trinh-chieu-led',
  bracket_guest: '/ket-qua/nhanh-dau',
  match_guest: '/ket-qua/tran', // + '/{matchSlug}'
  judge: '/giam-khao',
  mc: '/mc',
  stage: '/led',
  prelim: '/admin/prelim',
  dancers: '/admin/thi-sinh',
  teams: '/admin/boc-tham',
  bracket: '/admin/nhanh-dau',
  battle: '/admin/battle',
  sheets: '/admin/cai-dat/google-sheets',
  storage: '/admin/cai-dat/luu-tru',
  stage_control: '/admin/led',
  checkin: '/admin/check-in',
  judge_accounts: '/admin/cai-dat/giam-khao',
  staff_accounts: '/admin/cai-dat/nguoi-dung',
};

/** Audience screens and the MC screen open in a new tab from the admin pages. */
export const SCREEN_VIEWS = ['prelim_screen', 'prelim_screen_led', 'mc'] as const;
export const openInNewTab = (view: ActiveViewType) => window.open(VIEW_PATHS[view], '_blank', 'noopener');

/** `/led?preview=1` is the live preview embedded in /admin/led: no heartbeat, no sound, no writes. */
export const IS_LED_PREVIEW = new URLSearchParams(window.location.search).has('preview');

const PATH_ALIASES: Record<string, ActiveViewType> = {
  '/': 'prelim_guest',
  '/ket-qua': 'prelim_guest',
  '/admin': 'prelim',
};

// Short links handed to each team (read out over the phone): rewritten to the full path on load.
const SHORT_LINKS: Record<string, ActiveViewType> = {
  '/gk': 'judge',
  '/checkin': 'checkin',
  '/xem': 'prelim_guest',
  '/bxh': 'prelim_results',
  '/nhanh': 'bracket_guest',
  '/tv': 'prelim_screen',
};

// Old hash / ?view= links printed on QR codes and bookmarks before path routing.
const LEGACY_VIEWS: Record<string, ActiveViewType> = {
  guest: 'prelim_guest',
  khach: 'prelim_guest',
  prelim_guest: 'prelim_guest',
  stage: 'stage',
  judge: 'judge',
  prelim_results: 'prelim_results',
};

export const isAdminView = (view: ActiveViewType) => VIEW_PATHS[view].startsWith('/admin');

/** Guest pages, the MC screen and the LED read only the published copies (publicDancers / publicVotes). */
export const isPublicView = (view: ActiveViewType) =>
  view === 'stage' || view === 'mc' || VIEW_PATHS[view].startsWith('/ket-qua');

/** Reads the view from the URL, rewriting legacy hash/query links to their path. */
export function viewFromLocation(): ActiveViewType {
  const { hash, search, pathname } = window.location;
  const legacyKey = hash.slice(1).toLowerCase() || new URLSearchParams(search).get('view')?.toLowerCase() || '';
  const legacy = LEGACY_VIEWS[legacyKey];
  if (legacy) {
    window.history.replaceState(null, '', VIEW_PATHS[legacy]);
    return legacy;
  }

  const path = pathname.replace(/\/+$/, '') || '/';
  const short = SHORT_LINKS[path.toLowerCase()];
  if (short) {
    window.history.replaceState(null, '', VIEW_PATHS[short]);
    return short;
  }
  if (path.startsWith(`${VIEW_PATHS.match_guest}/`)) return 'match_guest';
  const exact = (Object.keys(VIEW_PATHS) as ActiveViewType[]).find((v) => VIEW_PATHS[v] === path);
  return exact ?? PATH_ALIASES[path] ?? 'prelim_guest';
}

/** The data source is fixed per page load; moving between public and private pages reloads the page. */
export const IS_PUBLIC_SOURCE = isPublicView(viewFromLocation());

/** The check-in desk installs as its own app (manifest picked in index.html), so it is also fixed per page load. */
export const IS_CHECKIN_APP = viewFromLocation() === 'checkin';

/** `/ket-qua/tran/{slug}` -> slug */
export const matchSlugFromPath = (pathname: string) =>
  decodeURIComponent(pathname.slice(VIEW_PATHS.match_guest.length + 1).replace(/\/+$/, ''));
