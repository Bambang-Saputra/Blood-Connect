"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, dashboardPath } from "./api";

/**
 * Defense-in-depth: cegah akses lintas-role di sisi client.
 *
 * Backend sudah punya middleware requireRole() yang menolak API request
 * dengan 403 kalau JWT role salah. Tapi UI shell (header, layout, navigasi)
 * tetap render — user lihat halaman broken dengan data kosong/error.
 *
 * Hook ini melakukan client-side validation di mount tiap dashboard page:
 *   1. Fetch /auth/me → cek JWT valid + role-nya apa
 *   2. Kalau JWT invalid/expired → clearToken + redirect ke /login
 *   3. Kalau role mismatch → redirect ke dashboard yang sesuai role-nya
 *   4. Kalau OK → expose `me` object ke component
 *
 * Skenario yang di-protect:
 *   - User ketik URL salah role di address bar
 *   - Klik link role lain tanpa logout dulu
 *   - Back button setelah logout
 *   - Tab dengan token yang sudah di-overwrite tab lain
 *
 * Pemakaian:
 *   const { me, loading } = useRequireRole("PMI");
 *   if (loading || !me) return <LoadingScreen />;
 *   // me dijamin role === "PMI" di titik ini
 */
export function useRequireRole<T = any>(expectedRole: string) {
  const router = useRouter();
  const [me, setMe] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api("/auth/me");
        if (cancelled) return;

        // Token invalid/expired → kick ke login
        if (res.status === 401 || res.status === 0) {
          clearToken();
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        // Safety net: response tidak ada role
        if (!data?.role) {
          clearToken();
          router.replace("/login");
          return;
        }

        // Role mismatch → redirect ke dashboard yang benar.
        // TIDAK clearToken karena user-nya valid, cuma salah URL.
        if (data.role !== expectedRole) {
          router.replace(dashboardPath(data.role));
          return;
        }

        setMe(data);
        setLoading(false);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();

    return () => { cancelled = true; };
  }, [expectedRole, router]);

  return { me, loading };
}

/**
 * Variant lebih longgar: hanya butuh authenticated, tidak peduli role.
 * Dipakai di halaman yang melayani semua role (kalau ada).
 */
export function useRequireAuth<T = any>() {
  const router = useRouter();
  const [me, setMe] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api("/auth/me");
        if (cancelled) return;

        if (res.status === 401 || res.status === 0) {
          clearToken();
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        if (!data?.role) {
          clearToken();
          router.replace("/login");
          return;
        }

        setMe(data);
        setLoading(false);
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  return { me, loading };
}
