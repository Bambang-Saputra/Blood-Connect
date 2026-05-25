"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken, dashboardPath } from "../lib/api";

/**
 * Use Case: LOGIN (Sequence Diagram #1)
 * Flow: User input email/password → AuthService validates → JWT → redirect ke dashboard sesuai role
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    // [Activity 2.2] Buat sesi → simpan token
    setToken(data.token);
    // [Activity 2.3] Arahkan ke halaman utama sesuai peran
    router.push(dashboardPath(data.user.role));
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Kembali</Link>
        <h1 className="text-3xl font-bold text-red-700 mt-2">🩸 Login</h1>
        <p className="text-slate-500 text-sm mt-1">Masuk ke Blood Connect</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
              placeholder="anda@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 px-3 py-2 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? "Masuk..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Belum punya akun? <Link href="/register" className="text-red-600 hover:underline">Daftar di sini</Link>
        </p>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 mb-2">Akun demo (dari <code className="bg-slate-100 px-1 rounded">npm run seed</code>) — klik untuk auto-isi:</p>
          <div className="space-y-1.5">
            {[
              { role: "Admin", email: "admin@bloodconnect.id", pw: "admin12345", color: "bg-red-50 hover:bg-red-100 text-red-700 border-red-200" },
              { role: "Rumah Sakit", email: "rscm@test.com", pw: "password123", color: "bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200" },
              { role: "Pendonor (eligible)", email: "donor1@test.com", pw: "password123", color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" },
              { role: "Pasien", email: "pasien1@test.com", pw: "password123", color: "bg-green-50 hover:bg-green-100 text-green-700 border-green-200" },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.pw); }}
                className={`w-full text-left text-xs ${acc.color} border px-2 py-1.5 rounded font-mono transition flex justify-between items-center`}
              >
                <span className="font-sans font-semibold not-italic">{acc.role}</span>
                <span className="opacity-80">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
