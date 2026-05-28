"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/api";
import { RegionPicker } from "../lib/RegionPicker";
import { Button } from "../lib/ui";

/**
 * /pmiregister — endpoint khusus untuk PMI mendaftar.
 * Tidak di-link dari landing/register normal supaya tidak banyak orang
 * tahu. Admin yang share link ini ke PMI yang resmi.
 */
export default function PmiRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    email: "", password: "",
    name: "", phoneNum: "",
    province: "", city: "", zone: "", address: "",
    pmiName: "", pmiCode: "", pmiLoc: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await api("/auth/pmiregister", {
      method: "POST",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Registrasi gagal");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <div className="text-6xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-slate-900">PMI Berhasil Didaftarkan</h1>
          <p className="text-slate-600 mt-2 text-sm">
            Pendaftaran PMI <strong>{form.pmiName}</strong> berhasil diterima.<br />
            Status: <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">UNVERIFIED</span>
          </p>
          <p className="text-xs text-slate-500 mt-4">
            Tim Admin Blood Connect akan verifikasi akun Anda dalam 1-3 hari kerja.<br />
            Anda akan mendapat notifikasi via email saat akun diaktifkan.
          </p>
          <div className="mt-6 flex gap-2 justify-center">
            <Link href="/login">
              <Button>Ke Halaman Login</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost">Kembali</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Kembali</Link>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 mt-4">
          <div className="text-center mb-6">
            <span className="text-5xl">🩸</span>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">Daftar PMI / UTD</h1>
            <p className="text-slate-500 text-sm mt-1">
              Endpoint khusus untuk pendaftaran Palang Merah Indonesia / Unit Transfusi Darah
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-xs text-amber-900">
            ⚠️ <strong>Penting:</strong> Pendaftaran ini memerlukan verifikasi manual admin Blood Connect.
            Pastikan info yang diisi sesuai dengan registrasi resmi PMI/UTD Anda.
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">📝 Data Akun Petugas</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Nama Petugas" value={form.name} onChange={(v) => update("name", v)} required />
                <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? "text" : "password"} required minLength={8}
                      value={form.password} onChange={(e) => update("password", e.target.value)}
                      className="w-full border border-slate-300 px-4 py-2.5 pr-12 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm">
                      {showPwd ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <Input label="No HP / Kantor" value={form.phoneNum} onChange={(v) => update("phoneNum", v)} required />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">📍 Lokasi PMI</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <RegionPicker
                  province={form.province} city={form.city}
                  onChange={({ province, city, zone }) => setForm((f) => ({ ...f, province, city, zone }))}
                  required
                />
                <div className="md:col-span-2">
                  <Input label="Alamat Tambahan (opsional)" value={form.address} onChange={(v) => update("address", v)} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-900 mb-3">🏥 Data PMI / UTD</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Nama PMI / UTD" value={form.pmiName} onChange={(v) => update("pmiName", v)} required placeholder="PMI Kota Jakarta Pusat" />
                <Input label="Kode Resmi" value={form.pmiCode} onChange={(v) => update("pmiCode", v)} required placeholder="PMI-JKT-01" />
                <div className="md:col-span-2">
                  <Input label="Alamat Lengkap PMI" value={form.pmiLoc} onChange={(v) => update("pmiLoc", v)} required placeholder="Jl. Kramat Raya No. 47" />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                ⚠️ {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" fullWidth>
              Daftar PMI / UTD
            </Button>

            <p className="text-center text-sm text-slate-500">
              Sudah punya akun? <Link href="/login" className="text-red-600 hover:underline font-semibold">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{props.label}</label>
      <input
        type={props.type ?? "text"} required={props.required}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
      />
    </div>
  );
}
