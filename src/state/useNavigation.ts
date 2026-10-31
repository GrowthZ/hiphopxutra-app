import { useCallback, useEffect, useState } from 'react';
import { ActiveViewType } from '../domain/types';
import { IS_CHECKIN_APP, IS_PUBLIC_SOURCE, VIEW_PATHS, isPublicView, viewFromLocation } from '../app/routes';

/** History-API routing: one view per URL (see app/routes.ts). */
export function useNavigation() {
  const [activeView, setActiveViewState] = useState<ActiveViewType>(viewFromLocation);
  const [pathname, setPathname] = useState(() => window.location.pathname);

  // Public pages read published copies, private pages the raw data: switching source needs a fresh load.
  // So does entering or leaving the check-in desk, so the browser offers the right app to install.
  const sync = useCallback(() => {
    const view = viewFromLocation();
    if (isPublicView(view) !== IS_PUBLIC_SOURCE || (view === 'checkin') !== IS_CHECKIN_APP) return window.location.reload();
    setPathname(window.location.pathname);
    setActiveViewState(view);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      if (window.location.pathname === path) return;
      window.history.pushState(null, '', path);
      sync();
    },
    [sync]
  );

  const setActiveView = useCallback((view: ActiveViewType) => navigate(VIEW_PATHS[view]), [navigate]);

  useEffect(() => {
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [sync]);

  return { activeView, setActiveView, pathname, navigate };
}
