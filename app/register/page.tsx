"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken, dashboardPath } from "../lib/api";
import { RegionPicker } from "../lib/RegionPicker";
import { Button, Icons } from "../lib/ui";

/**
 * Register multi-role dengan visual step indicator
 */
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: pilih role, 2: data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    role: "PENDONOR",
    email: "", password: "", name: "", phoneNum: "",
    province: "", city: "", zone: "", address: "",
    birthDate: "",
    bloodType: "O", rhesusType: "POSITIVE",
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

    // Auto-login
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

  // Hanya 2 role di sini — PMI register lewat /pmiregister (institusi terpisah)
  const roleConfig = [
    {
      val: "PENDONOR", label: "Pendonor", emoji: "💉",
      desc: "Donor darah, isi skrining, bantu pasien yang membutuhkan",
      color: "from-red-500 to-rose-600",
      lightBg: "bg-red-50 border-red-200",
    },
    {
      val: "PASIEN", label: "Pasien", emoji: "🩺",
      desc: "Request darah untuk diri sendiri atau anggota keluarga",
      color: "from-blue-500 to-indigo-600",
      lightBg: "bg-blue-50 border-blue-200",
    },
  ];

  const selectedRole = roleConfig.find((r) => r.val === form.role)!;

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <BloodDropIcon className="w-9 h-9 text-red-600" />
            <span className="font-bold text-2xl text-slate-900">Blood<span className="text-red-600">Connect</span></span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Buat Akun Baru</h1>
          <p className="text-slate-500 mt-2">Bergabung dalam 2 menit, mulai berkontribusi sekarang</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepDot active={step >= 1} done={step > 1} num={1} label="Pilih Peran" />
          <div className={`h-0.5 w-12 ${step > 1 ? "bg-red-500" : "bg-slate-200"} transition-all`} />
          <StepDot active={step >= 2} done={false} num={2} label="Lengkapi Data" />
        </div>

        {/* === STEP 1: Pilih Role === */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Saya ingin daftar sebagai...</h2>
            <p className="text-sm text-slate-500 mb-6">Pilih peran yang paling sesuai dengan tujuan Anda</p>

            <div className="grid md:grid-cols-2 gap-3">
              {roleConfig.map((r) => {
                const active = form.role === r.val;
                return (
                  <button
                    key={r.val}
                    type="button"
                    onClick={() => update("role", r.val)}
                    className={`relative text-left p-5 rounded-2xl border-2 transition-all group ${
                      active
                        ? `${r.lightBg} ring-2 ring-offset-2 ring-red-500 shadow-md`
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${r.color} text-white rounded-xl flex items-center justify-center text-2xl shadow-sm mb-3`}>
                      {r.emoji}
                    </div>
                    <h3 className="font-bold text-slate-900">{r.label}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.desc}</p>
                    {active && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white">
                        <Icons.Check />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button size="lg" onClick={() => setStep(2)}>
                Lanjut →
              </Button>
            </div>
          </div>
        )}

        {/* === STEP 2: Form Detail === */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-5">
            {/* Selected role banner */}
            <div className={`${selectedRole.lightBg} border rounded-xl p-3 flex items-center gap-3`}>
              <div className={`w-10 h-10 bg-gradient-to-br ${selectedRole.color} text-white rounded-lg flex items-center justify-center text-xl`}>
                {selectedRole.emoji}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Peran terpilih</p>
                <p className="font-semibold text-slate-900">{selectedRole.label}</p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-sm text-red-600 hover:underline font-medium">
                Ubah
              </button>
            </div>

            {/* Data umum */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">📝 Data Diri</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Nama Lengkap" value={form.name} onChange={(v) => update("name", v)} required />
                <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
                <Input label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} required minLength={8} hint="Minimal 8 karakter" />
                <Input label="No HP" value={form.phoneNum} onChange={(v) => update("phoneNum", v)} required placeholder="0812xxxxxxxx" />
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">📍 Lokasi</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <RegionPicker
                  province={form.province} city={form.city}
                  onChange={({ province, city, zone }) => setForm((f) => ({ ...f, province, city, zone }))}
                  required
                />
                <div className="md:col-span-2">
                  <Input label="Alamat (opsional)" value={form.address} onChange={(v) => update("address", v)} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">🎂 Tanggal Lahir</h3>
              <p className="text-xs text-slate-500 mb-2">Wajib untuk validasi usia donor (17–65 tahun)</p>
              <input
                type="date" value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
                required={form.role === "PENDONOR"}
                className={inputCls}
              />
            </div>

            {/* Role-specific */}
            {form.role === "PENDONOR" && (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-3">🩸 Data Golongan Darah</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <FormSelect label="Golongan Darah" value={form.bloodType} onChange={(v) => update("bloodType", v)}
                    options={[["A", "A"], ["B", "B"], ["AB", "AB"], ["O", "O"]]} />
                  <FormSelect label="Rhesus" value={form.rhesusType} onChange={(v) => update("rhesusType", v)}
                    options={[["POSITIVE", "Positif (+)"], ["NEGATIVE", "Negatif (-)"]]} />
                </div>
              </div>
            )}

            {form.role === "PASIEN" && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-slate-700 flex gap-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <div>
                  Golongan darah pasien diisi <strong>per-request</strong>. Anda bisa request darah dengan golongan berbeda
                  (misal request untuk anggota keluarga).
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>← Kembali</Button>
              <Button type="submit" loading={loading} size="lg" fullWidth icon={<Icons.Heart />}>
                Daftar Sekarang
              </Button>
            </div>

            <p className="text-center text-sm text-slate-500">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-red-600 hover:text-red-700 font-semibold hover:underline">
                Login di sini
              </Link>
            </p>
            <p className="text-center text-xs text-slate-400">
              Daftar sebagai institusi PMI?{" "}
              <Link href="/pmiregister" className="text-red-600 hover:underline font-medium">
                Klik di sini
              </Link>
            </p>
          </form>
        )}
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

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function StepDot({ active, done, num, label }: { active: boolean; done: boolean; num: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all
        ${done ? "bg-emerald-500 text-white" : active ? "bg-red-600 text-white ring-4 ring-red-100" : "bg-slate-200 text-slate-500"}
      `}>
        {done ? <Icons.Check /> : num}
      </div>
      <span className={`text-sm font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
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
