import { ActiveViewType } from '../domain/types';

export const VIEW_PATHS: Record<ActiveViewType, string> = {
  prelim_guest: '/ket-qua/prelim',
  prelim_results: '/ket-qua/bang-xep-hang',
  prelim_screen: '/ket-qua/trinh-chieu',
  prelim_screen_led: '/ket-qua/trinh-chieu-led',
  bracket_guest: '/ket-qua/nhanh-dau',
  match_guest: '/ket-qua/tran', // + '/{matchSlug}'
  judge: '/giam-khao',
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

/** `/led?preview=1` is the live preview embedded in /admin/led: no heartbeat, no sound, no writes. */
export const IS_LED_PREVIEW = new URLSearchParams(window.location.search).has('preview');

const PATH_ALIASES: Record<string, ActiveViewType> = {
  '/': 'prelim_guest',
  '/ket-qua': 'prelim_guest',
  '/admin': 'prelim',
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

/** Guest pages and the LED read only the published copies (publicDancers / publicVotes). */
export const isPublicView = (view: ActiveViewType) => view === 'stage' || VIEW_PATHS[view].startsWith('/ket-qua');

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
  if (path.startsWith(`${VIEW_PATHS.match_guest}/`)) return 'match_guest';
  const exact = (Object.keys(VIEW_PATHS) as ActiveViewType[]).find((v) => VIEW_PATHS[v] === path);
  return exact ?? PATH_ALIASES[path] ?? 'prelim_guest';
}

/** The data source is fixed per page load; moving between public and private pages reloads the page. */
export const IS_PUBLIC_SOURCE = isPublicView(viewFromLocation());

/** `/ket-qua/tran/{slug}` -> slug */
export const matchSlugFromPath = (pathname: string) =>
  decodeURIComponent(pathname.slice(VIEW_PATHS.match_guest.length + 1).replace(/\/+$/, ''));
