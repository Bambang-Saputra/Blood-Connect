"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/api";
import { RegionPicker } from "../lib/RegionPicker";
import { Button, Icons } from "../lib/ui";

/**
 * PMI Register — institusi terpisah dari /register publik.
 * Setelah submit, status = UNVERIFIED. Admin perlu verifikasi
 * dari dashboard admin sebelum PMI bisa beraktivitas.
 */
export default function PmiRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", name: "", phoneNum: "",
    province: "", city: "", zone: "", address: "",
    pmiName: "", pmiCode: "", pmiLoc: "",
    licenseDoc: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await api("/auth/register-pmi", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Registrasi PMI gagal — cek isian Anda");
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-4xl shadow-lg mb-4">
            ✅
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pendaftaran Berhasil</h2>
          <p className="text-slate-600 text-sm">
            Akun PMI Anda berhasil dibuat dengan status <strong>UNVERIFIED</strong>.
            Tim admin Blood Connect akan memverifikasi akun Anda dalam 1×24 jam.
          </p>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-800">
            ℹ️ Setelah diverifikasi, Anda bisa login dan mengelola stok, request, dan jadwal donor.
          </div>
          <Link href="/login">
            <Button size="lg" fullWidth className="mt-6">Lanjut ke Login</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <BloodDropIcon className="w-9 h-9 text-red-600" />
            <span className="font-bold text-2xl text-slate-900">Blood<span className="text-red-600">Connect</span></span>
          </Link>
          <div className="inline-block bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3">
            🏛️ Khusus Institusi
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Pendaftaran PMI</h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">
            Form ini khusus untuk PMI/UTD daerah yang ingin terhubung dengan jaringan Blood Connect nasional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-5">
          {/* Data PIC */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">👤 Data PIC / Penanggung Jawab</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Nama Lengkap PIC" value={form.name} onChange={(v) => update("name", v)} required />
              <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
              <Input label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} required minLength={8} hint="Minimal 8 karakter" />
              <Input label="No HP PIC" value={form.phoneNum} onChange={(v) => update("phoneNum", v)} required placeholder="0812xxxxxxxx" />
            </div>
          </div>

          {/* Lokasi */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">📍 Lokasi PIC</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <RegionPicker
                province={form.province} city={form.city}
                onChange={({ province, city, zone }) => setForm((f) => ({ ...f, province, city, zone }))}
                required
              />
              <div className="md:col-span-2">
                <Input label="Alamat PIC (opsional)" value={form.address} onChange={(v) => update("address", v)} />
              </div>
            </div>
          </div>

          {/* Data PMI institusi */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-semibold text-slate-900 mb-3">🏛️ Data PMI / UTD</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Nama PMI" value={form.pmiName} onChange={(v) => update("pmiName", v)} required placeholder="PMI Provinsi DKI Jakarta" />
              <Input label="Kode PMI (unik)" value={form.pmiCode} onChange={(v) => update("pmiCode", v)} required placeholder="PMI-DKI-01" />
              <div className="md:col-span-2">
                <Input label="Alamat Lengkap PMI" value={form.pmiLoc} onChange={(v) => update("pmiLoc", v)} required placeholder="Jl. Joe Lenteng Agung No.7" />
              </div>
              <div className="md:col-span-2">
                <Input label="URL Dokumen Izin / SIUP (opsional)" value={form.licenseDoc} onChange={(v) => update("licenseDoc", v)} placeholder="https://drive.google.com/..." hint="Upload manual ke cloud storage, paste link di sini" />
              </div>
            </div>
            <p className="text-xs text-red-700 mt-3 leading-relaxed">
              ⚠️ Akun PMI akan berstatus <strong>UNVERIFIED</strong> hingga diverifikasi admin pusat. Pastikan kode PMI unik secara nasional.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/register" className="flex-shrink-0">
              <Button type="button" variant="ghost">← Bukan PMI</Button>
            </Link>
            <Button type="submit" loading={loading} size="lg" fullWidth icon={<Icons.Heart />}>
              Kirim Permohonan
            </Button>
          </div>

          <p className="text-center text-sm text-slate-500">
            Sudah punya akun PMI?{" "}
            <Link href="/login" className="text-red-600 hover:text-red-700 font-semibold hover:underline">
              Login di sini
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

const inputCls = "w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition";

function Input(props: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number;
  placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{props.label}</label>
      <input
        type={props.type ?? "text"} required={props.required} minLength={props.minLength}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className={inputCls}
      />
      {props.hint && <p className="text-xs text-slate-400 mt-1">{props.hint}</p>}
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
