import { ActiveViewType } from './types/tournament';

export const VIEW_PATHS: Record<ActiveViewType, string> = {
  prelim_guest: '/ket-qua/prelim',
  prelim_results: '/ket-qua/bang-xep-hang',
  judge: '/giam-khao',
  stage: '/led',
  prelim: '/admin/prelim',
  dancers: '/admin/thi-sinh',
  teams: '/admin/boc-tham',
  bracket: '/admin/nhanh-dau',
  battle: '/admin/battle',
  sheets: '/admin/cai-dat/google-sheets',
  storage: '/admin/cai-dat/luu-tru',
};

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
  const exact = (Object.keys(VIEW_PATHS) as ActiveViewType[]).find((v) => VIEW_PATHS[v] === path);
  return exact ?? PATH_ALIASES[path] ?? 'prelim_guest';
}
