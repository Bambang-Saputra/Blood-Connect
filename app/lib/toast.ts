/**
 * Tiny zero-dependency toast notification system.
 * Tampilkan pesan di pojok kanan atas, auto-hide setelah 4 detik.
 */

type Variant = "success" | "error" | "info";

function show(message: string, variant: Variant) {
  if (typeof window === "undefined") return;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed; top: 1rem; right: 1rem; z-index: 9999;
      display: flex; flex-direction: column; gap: 0.5rem;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const colors: Record<Variant, string> = {
    success: "background:#16a34a; color:#fff;",
    error:   "background:#dc2626; color:#fff;",
    info:    "background:#0f172a; color:#fff;",
  };
  const icons: Record<Variant, string> = { success: "✅", error: "❌", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.style.cssText = `
    ${colors[variant]}
    padding: 0.75rem 1rem; border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    min-width: 240px; max-width: 400px;
    font-size: 0.875rem; line-height: 1.25rem;
    pointer-events: auto;
    transform: translateX(120%); transition: transform 0.25s ease-out;
    display: flex; align-items: start; gap: 0.5rem;
  `;
  toast.innerHTML = `<span style="flex-shrink:0">${icons[variant]}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  // animate in
  requestAnimationFrame(() => { toast.style.transform = "translateX(0)"; });

  // auto-hide
  setTimeout(() => {
    toast.style.transform = "translateX(120%)";
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

export const toast = {
  success: (msg: string) => show(msg, "success"),
  error: (msg: string) => show(msg, "error"),
  info: (msg: string) => show(msg, "info"),
};
