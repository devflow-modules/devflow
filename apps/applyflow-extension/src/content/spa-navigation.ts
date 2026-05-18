/** Dispara callback em navegação client-side (pushState/replaceState/popstate). */
export function hookSpaNavigation(onNavigate: () => void): () => void {
  const notify = () => {
    try {
      onNavigate();
    } catch {
      /* swallow */
    }
  };

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = (...args: Parameters<History["pushState"]>) => {
    origPush(...args);
    notify();
  };

  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    origReplace(...args);
    notify();
  };

  return () => {
    history.pushState = origPush;
    history.replaceState = origReplace;
  };
}
