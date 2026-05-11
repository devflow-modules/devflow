/** Localiza o contentor do modal Easy Apply (evita dependência circular com `inject-applyflow-panel`). */
export function findEasyApplyModal(): HTMLElement | null {
  const hints = [
    ".jobs-easy-apply-modal",
    ".jobs-easy-apply-content",
    '[data-test-modal="jobs-easy-apply-modal"]',
    ".artdeco-modal.jobs-easy-apply-modal",
  ];

  for (const sel of hints) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) {
      const dialog = el.closest('[role="dialog"]');
      if (dialog instanceof HTMLElement) return dialog;
      return el;
    }
  }

  const dialogs = document.querySelectorAll('[role="dialog"]');
  for (const d of dialogs) {
    if (!(d instanceof HTMLElement)) continue;
    const txt = d.innerText.toLowerCase();
    if (
      txt.includes("easy apply") ||
      txt.includes("candidatura simplificada") ||
      txt.includes("enviar candidatura") ||
      txt.includes("submit your application")
    ) {
      return d;
    }
  }

  return null;
}
