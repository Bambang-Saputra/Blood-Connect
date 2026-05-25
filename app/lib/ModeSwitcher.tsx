"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, dashboardPath } from "./api";
import { toast } from "./toast";

/**
 * ModeSwitcher — pill toggle untuk user multi-profile.
 * Tampilkan hanya kalau user punya >1 mode (PENDONOR + PASIEN).
 * RS & Admin tidak tampil switcher (single role).
 */

const MODE_LABELS: Record<string, { label: string; icon: string; path: string }> = {
  PENDONOR: { label: "Mode Pendonor", icon: "💉", path: "/dashboard/donor" },
  PASIEN: { label: "Mode Pasien", icon: "🩺", path: "/dashboard/patient" },
};

export function ModeSwitcher({ currentRole }: { currentRole: string }) {
  const router = useRouter();
  const [availableModes, setAvailableModes] = useState<string[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    api("/auth/me").then((r) => r.json()).then((d) => {
      setAvailableModes(d.availableModes ?? []);
    }).catch(() => setAvailableModes([]));
  }, []);

  // Filter cuma mode personal yang relevan
  const personalModes = availableModes.filter((m) => m === "PENDONOR" || m === "PASIEN");

  // Tidak tampil kalau cuma 1 mode (atau bukan user personal)
  if (personalModes.length < 2) return null;

  async function switchTo(role: string) {
    if (role === currentRole) return;
    setSwitching(true);
    const res = await api("/auth/switch-role", {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    setSwitching(false);

    if (res.ok) {
      setToken(data.token);
      toast.success(`Beralih ke ${MODE_LABELS[role]?.label}`);
      router.push(dashboardPath(role));
    } else {
      toast.error(data.error ?? "Gagal beralih mode");
    }
  }

  return (
    <div className="inline-flex bg-slate-100 rounded-full p-1 text-sm">
      {personalModes.map((m) => {
        const info = MODE_LABELS[m];
        const active = m === currentRole;
        return (
          <button
            key={m}
            onClick={() => switchTo(m)}
            disabled={switching || active}
            className={`px-3 py-1.5 rounded-full font-medium transition flex items-center gap-1.5 ${
              active
                ? "bg-white shadow-sm text-red-700"
                : "text-slate-600 hover:text-slate-900"
            } disabled:cursor-not-allowed`}
            title={info?.label}
          >
            <span>{info?.icon}</span>
            <span className="hidden md:inline">{info?.label}</span>
          </button>
        );
      })}
    </div>
  );
}
