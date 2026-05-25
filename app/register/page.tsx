"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken, dashboardPath } from "../lib/api";
import { RegionPicker } from "../lib/RegionPicker";

/**
 * Halaman Register multi-role
 * - PENDONOR / PASIEN → wajib isi bloodType + rhesusType
 * - RUMAH_SAKIT → wajib isi hospitalName + hospitalCode + hospitalLoc
 *
 * Setelah berhasil register, auto login & redirect ke dashboard role
 */
export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    role: "PENDONOR",
    email: "", password: "", name: "", phoneNum: "",
    province: "", city: "", zone: "", address: "",
    birthDate: "",
    bloodType: "O", rhesusType: "POSITIVE",
    hospitalName: "", hospitalCode: "", hospitalLoc: "",
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await api("/auth/register", { method: "POST", body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Registrasi gagal — cek isian Anda");
      setLoading(false);
      return;
    }

    // Auto-login setelah register sukses
    const loginRes = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: form.email, password: form.password }),
    });
    const loginData = await loginRes.json();
    setLoading(false);

    if (loginRes.ok) {
      setToken(loginData.token);
      router.push(dashboardPath(loginData.user.role));
    } else {
      router.push("/login");
    }
  }

  const isHospital = form.role === "RUMAH_SAKIT";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-100 p-4 py-12">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Kembali</Link>
        <h1 className="text-3xl font-bold text-red-700 mt-2">🩸 Daftar Akun</h1>
        <p className="text-slate-500 text-sm mt-1">Pilih peran Anda dan lengkapi data</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Pilih Role */}
          <div>
            <label className="block text-sm font-medium mb-2">Daftar sebagai:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: "PENDONOR", label: "Pendonor" },
                { val: "PASIEN", label: "Pasien" },
                { val: "RUMAH_SAKIT", label: "Rumah Sakit" },
              ].map((r) => (
                <button
                  key={r.val} type="button"
                  onClick={() => update("role", r.val)}
                  className={`py-2 rounded border-2 text-sm font-medium ${
                    form.role === r.val
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data Umum */}
          <div className="grid md:grid-cols-2 gap-3">
            <Input label="Nama Lengkap" value={form.name} onChange={(v) => update("name", v)} required />
            <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
            <Input label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} required minLength={8} />
            <Input label="No HP" value={form.phoneNum} onChange={(v) => update("phoneNum", v)} required />
            <RegionPicker
              province={form.province} city={form.city}
              onChange={({ province, city, zone }) => {
                setForm((f) => ({ ...f, province, city, zone }));
              }}
              required
            />
            <div className="md:col-span-2">
              <Input label="Alamat (opsional)" value={form.address} onChange={(v) => update("address", v)} />
            </div>
            {!isHospital && (
              <div className="md:col-span-2">
                <Input label="Tanggal Lahir (wajib untuk pendonor)" type="date" value={form.birthDate} onChange={(v) => update("birthDate", v)} required={!isHospital} />
              </div>
            )}
          </div>

          {/* Role-specific fields */}
          {form.role === "PENDONOR" ? (
            <div className="grid md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded">
              <div>
                <label className="block text-sm font-medium mb-1">Golongan Darah</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => update("bloodType", e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded"
                >
                  <option>A</option><option>B</option><option>AB</option><option>O</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rhesus</label>
                <select
                  value={form.rhesusType}
                  onChange={(e) => update("rhesusType", e.target.value)}
                  className="w-full border border-slate-300 px-3 py-2 rounded"
                >
                  <option value="POSITIVE">Positif (+)</option>
                  <option value="NEGATIVE">Negatif (-)</option>
                </select>
              </div>
            </div>
          ) : form.role === "PASIEN" ? (
            <div className="p-4 bg-slate-50 rounded text-sm text-slate-600">
              ℹ️ Sebagai pasien, golongan darah akan diisi saat membuat request darah
              (bisa berbeda jika request untuk keluarga).
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded">
              <Input label="Nama Rumah Sakit" value={form.hospitalName} onChange={(v) => update("hospitalName", v)} required />
              <Input label="Kode RS (unik)" value={form.hospitalCode} onChange={(v) => update("hospitalCode", v)} required />
              <div className="md:col-span-2">
                <Input label="Lokasi/Alamat Lengkap RS" value={form.hospitalLoc} onChange={(v) => update("hospitalLoc", v)} required />
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-medium disabled:opacity-50"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Sudah punya akun? <Link href="/login" className="text-red-600 hover:underline">Login di sini</Link>
        </p>
      </div>
    </main>
  );
}

function Input(props: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{props.label}</label>
      <input
        type={props.type ?? "text"} required={props.required} minLength={props.minLength}
        value={props.value} onChange={(e) => props.onChange(e.target.value)}
        className="w-full border border-slate-300 px-3 py-2 rounded focus:ring-2 focus:ring-red-500 focus:outline-none"
      />
    </div>
  );
}
