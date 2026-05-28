"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken, dashboardPath } from "../lib/api";
import { Button, Icons } from "../lib/ui";

/**
 * Use Case: LOGIN
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Login gagal");
      return;
    }

    setToken(data.token);
    router.push(dashboardPath(data.user.role));
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-red-50 via-white to-pink-50">
      {/* ============ KIRI: HERO ============ */}
      <aside className="hidden lg:flex relative bg-gradient-to-br from-red-600 via-red-700 to-rose-800 p-12 flex-col justify-between text-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl" />

        {/* Floating hearts */}
        <FloatingHeart className="absolute top-20 right-32 w-8 h-8 text-pink-300/40 animate-pulse" />
        <FloatingHeart className="absolute bottom-40 right-20 w-5 h-5 text-white/30 animate-pulse" style={{ animationDelay: "1s" }} />
        <FloatingHeart className="absolute top-60 left-20 w-6 h-6 text-rose-200/40 animate-pulse" style={{ animationDelay: "0.5s" }} />

        {/* Logo */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <BloodDropIcon className="w-10 h-10 text-white group-hover:scale-110 transition" />
            <span className="font-bold text-2xl">Blood<span className="text-pink-200">Connect</span></span>
          </Link>
        </div>

        {/* Center Illustration + Quote */}
        <div className="relative z-10">
          <BigHeartIllustration />
          <h2 className="text-4xl font-bold leading-tight mt-8">
            Setetes Darah Anda,<br />
            <span className="text-pink-200">Sejuta Harapan</span>
          </h2>
          <p className="mt-4 text-red-100 text-lg max-w-md">
            Bergabung dengan ribuan pendonor di seluruh Indonesia. Bantu pasien yang membutuhkan, hari ini.
          </p>
        </div>

        {/* Stats Footer */}
        <div className="relative grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
          <Stat value="10K+" label="Pendonor" />
          <Stat value="500+" label="RS Partner" />
          <Stat value="25K+" label="Nyawa" />
        </div>
      </aside>

      {/* ============ KANAN: FORM ============ */}
      <section className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (only show on small screens) */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-6">
            <BloodDropIcon className="w-8 h-8 text-red-600" />
            <span className="font-bold text-xl text-slate-900">Blood<span className="text-red-600">Connect</span></span>
          </Link>

          <Link href="/" className="hidden lg:inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-6">
            ← Kembali ke beranda
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">Selamat Datang Kembali 👋</h1>
            <p className="text-slate-500 mt-1">Masuk untuk lanjut kontribusi Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <FormField label="Email">
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                placeholder="anda@email.com"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Password">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 px-4 py-2.5 pr-12 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm">
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </FormField>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg">
              Masuk
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Belum punya akun?{" "}
            <Link href="/register" className="text-red-600 hover:text-red-700 font-semibold hover:underline">
              Daftar Sekarang
            </Link>
          </p>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wide">
              🎭 Akun Demo (Click untuk Auto-fill)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: "Admin", email: "admin@bloodconnect.id", pw: "admin12345", emoji: "🛡️", color: "from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 border-red-200" },
                { role: "PMI", email: "pmi-jakarta@test.com", pw: "password123", emoji: "🩸", color: "from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 text-orange-700 border-orange-200" },
                { role: "Pendonor", email: "donor1@test.com", pw: "password123", emoji: "💉", color: "from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border-blue-200" },
                { role: "Pasien", email: "pasien1@test.com", pw: "password123", emoji: "🩺", color: "from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 border-green-200" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.pw); }}
                  className={`bg-gradient-to-br ${acc.color} border px-3 py-2.5 rounded-lg transition text-left group`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">{acc.emoji}</span>
                    <span className="font-bold text-xs">{acc.role}</span>
                  </div>
                  <p className="text-[10px] opacity-75 font-mono truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ===== Helpers =====
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-red-100">{label}</p>
    </div>
  );
}

function BloodDropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 11 5 16a7 7 0 0014 0c0-5-7-14-7-14z" />
    </svg>
  );
}

function FloatingHeart({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function BigHeartIllustration() {
  return (
    <svg viewBox="0 0 240 160" className="w-full max-w-sm">
      {/* Heart with cross */}
      <g transform="translate(120 70)">
        <path
          d="M0,-25 C-18,-50 -55,-42 -55,-12 C-55,18 -28,40 0,60 C28,40 55,18 55,-12 C55,-42 18,-50 0,-25 Z"
          fill="white" fillOpacity="0.95"
          className="drop-shadow-2xl"
        />
        <rect x="-6" y="-12" width="12" height="32" fill="#dc2626" rx="2" />
        <rect x="-16" y="-2" width="32" height="12" fill="#dc2626" rx="2" />
      </g>
      {/* EKG pulse line */}
      <g transform="translate(0 130)">
        <path
          d="M10 10 L 80 10 L 90 0 L 100 25 L 110 -10 L 120 30 L 130 10 L 230 10"
          stroke="white" strokeWidth="2.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}
