/**
 * Styled confirmation dialog — pengganti window.confirm() default browser.
 * Zero-dependency (DOM imperatif, pola sama dgn toast.ts), berbasis Promise:
 *
 *   if (!(await confirmDialog({ message: "Yakin?" }))) return;
 *
 * Murni lapisan presentasi — tidak menyentuh state/flow aplikasi.
 */

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger" | "success";
  icon?: string;
};

const ACCENT: Record<string, string> = {
  primary: "#e11d48", // rose-600
  danger: "#dc2626", // red-600
  success: "#16a34a", // green-600
};
const DEFAULT_ICON: Record<string, string> = { primary: "🩸", danger: "⚠️", success: "✅" };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    const {
      title = "Konfirmasi", message,
      confirmText = "Ya, Lanjutkan", cancelText = "Batal",
      variant = "primary",
    } = opts;
    const accent = ACCENT[variant] ?? ACCENT.primary;
    const icon = opts.icon ?? DEFAULT_ICON[variant] ?? "❓";

    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center;" +
      "padding:1rem; background:rgba(15,23,42,0.55); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);" +
      "opacity:0; transition:opacity .18s ease;";

    const card = document.createElement("div");
    card.style.cssText =
      "background:#fff; width:100%; max-width:384px; border-radius:1.25rem;" +
      "box-shadow:0 25px 50px -12px rgba(0,0,0,.35); padding:1.5rem 1.5rem 1.25rem;" +
      "transform:scale(.92) translateY(8px); transition:transform .18s cubic-bezier(.16,1,.3,1);" +
      "font-family:inherit;";
    card.innerHTML =
      '<div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:.7rem;">' +
        `<div style="width:3.5rem; height:3.5rem; border-radius:9999px; background:${accent}1a; display:flex; align-items:center; justify-content:center; font-size:1.6rem;">${icon}</div>` +
        `<h3 style="font-size:1.125rem; font-weight:700; color:#0f172a; margin:0;">${escapeHtml(title)}</h3>` +
        `<p style="font-size:.875rem; color:#475569; margin:0; line-height:1.5;">${escapeHtml(message)}</p>` +
      "</div>" +
      '<div style="display:flex; gap:.5rem; margin-top:1.5rem;">' +
        `<button data-act="cancel" style="flex:1; padding:.65rem; border-radius:.65rem; border:1px solid #e2e8f0; background:#fff; color:#334155; font-weight:600; font-size:.875rem; cursor:pointer; transition:background .15s;">${escapeHtml(cancelText)}</button>` +
        `<button data-act="ok" style="flex:1; padding:.65rem; border-radius:.65rem; border:none; background:${accent}; color:#fff; font-weight:700; font-size:.875rem; cursor:pointer; box-shadow:0 8px 18px -6px ${accent}80;">${escapeHtml(confirmText)}</button>` +
      "</div>";

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      card.style.transform = "scale(1) translateY(0)";
    });

    let done = false;
    function close(result: boolean) {
      if (done) return;
      done = true;
      overlay.style.opacity = "0";
      card.style.transform = "scale(.92) translateY(8px)";
      document.removeEventListener("keydown", onKey);
      setTimeout(() => overlay.remove(), 180);
      resolve(result);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      else if (e.key === "Enter") close(true);
    }
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(false); });
    (card.querySelector('[data-act="cancel"]') as HTMLElement).addEventListener("click", () => close(false));
    (card.querySelector('[data-act="ok"]') as HTMLElement).addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKey);
  });
}
