"use client";

import { useEffect } from "react";
import { Button } from "./ui";

/**
 * Beautiful AlertModal — pengganti alert() native yang jelek.
 * Punya 4 variant: error, warning, info, success
 * Auto-close dengan ESC, klik backdrop, atau tombol close.
 *
 * Pemakaian:
 *   const [alertState, setAlertState] = useState<AlertState>(null);
 *   ...
 *   setAlertState({
 *     type: "warning",
 *     title: "Usia Belum 17 Tahun",
 *     message: "Pendonor min. 17 tahun. Usia Anda: 14 tahun.",
 *     primaryButton: "Saya Mengerti",
 *   });
 *   ...
 *   <AlertModal state={alertState} onClose={() => setAlertState(null)} />
 */

export type AlertVariant = "error" | "warning" | "info" | "success";

export interface AlertState {
  type: AlertVariant;
  title: string;
  message: string;
  details?: string[];
  primaryButton?: string;
  secondaryButton?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

interface Props {
  state: AlertState | null;
  onClose: () => void;
}

const variantConfig: Record<AlertVariant, {
  emoji: string;
  bg: string;
  ring: string;
  iconBg: string;
  buttonVariant: "primary" | "danger" | "success";
}> = {
  error: {
    emoji: "❌",
    bg: "from-red-500 to-rose-600",
    ring: "ring-red-200",
    iconBg: "bg-gradient-to-br from-red-500 to-rose-600",
    buttonVariant: "danger",
  },
  warning: {
    emoji: "⚠️",
    bg: "from-amber-500 to-orange-600",
    ring: "ring-amber-200",
    iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
    buttonVariant: "primary",
  },
  info: {
    emoji: "ℹ️",
    bg: "from-blue-500 to-indigo-600",
    ring: "ring-blue-200",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    buttonVariant: "primary",
  },
  success: {
    emoji: "✅",
    bg: "from-emerald-500 to-green-600",
    ring: "ring-emerald-200",
    iconBg: "bg-gradient-to-br from-emerald-500 to-green-600",
    buttonVariant: "success",
  },
};

export function AlertModal({ state, onClose }: Props) {
  // ESC to close
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;
  const cfg = variantConfig[state.type];

  function handlePrimary() {
    state?.onPrimary?.();
    onClose();
  }

  function handleSecondary() {
    state?.onSecondary?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-popIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className={`h-1.5 bg-gradient-to-r ${cfg.bg}`} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition z-10"
          aria-label="Tutup"
        >
          ✕
        </button>

        {/* Body */}
        <div className="p-6 lg:p-8 text-center">
          {/* Big icon */}
          <div className={`mx-auto w-20 h-20 ${cfg.iconBg} rounded-full flex items-center justify-center text-4xl shadow-lg mb-4 ring-8 ${cfg.ring}`}>
            {cfg.emoji}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{state.title}</h2>

          {/* Message */}
          <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">{state.message}</p>

          {/* Details list */}
          {state.details && state.details.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-left bg-slate-50 border border-slate-200 rounded-xl p-3">
              {state.details.map((d, i) => (
                <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 justify-center">
            {state.secondaryButton && (
              <Button variant="ghost" onClick={handleSecondary}>
                {state.secondaryButton}
              </Button>
            )}
            <Button variant={cfg.buttonVariant} onClick={handlePrimary} size="md">
              {state.primaryButton ?? "OK, Mengerti"}
            </Button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        :global(.animate-fadeIn) {
          animation: fadeIn 0.2s ease-out;
        }
        :global(.animate-popIn) {
          animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
