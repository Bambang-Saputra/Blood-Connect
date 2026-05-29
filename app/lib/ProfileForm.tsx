"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./api";
import { toast } from "./toast";
import { RegionPicker } from "./RegionPicker";
import { Button, Card, Icons } from "./ui";

/**
 * Shared profile form — basic data + password.
 * Dipakai di /dashboard/<role>/profile (donor, patient, pmi, admin).
 * Tidak include EnableMode / mode switching (pindah ke section terpisah).
 */

interface Props {
  role: "PENDONOR" | "PASIEN" | "PMI" | "ADMIN";
  backTo: string;  // URL kembali ke dashboard role tsb
  extraSection?: React.ReactNode;  // Konten tambahan role-specific (mis. info golongan darah donor)
}

type Me = {
  id: string; email: string; name: string; phoneNum: string;
  address?: string | null; city: string; province?: string | null;
  zone?: string | null; birthDate?: string | null; role: string;
  pendonor?: any;
  pasien?: any;
  pmi?: any;
};

export function ProfileForm({ role, backTo, extraSection }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({
    name: "", phoneNum: "", address: "",
    province: "", city: "", zone: "",
    birthDate: "", password: "",
  });
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api("/auth/me").then((r) => r.json()).catch(() => null);
    if (!data) return;
    setMe(data);
    setForm({
      name: data.name ?? "",
      phoneNum: data.phoneNum ?? "",
      address: data.address ?? "",
      province: data.province ?? "",
      city: data.city ?? "",
      zone: data.zone ?? "",
      birthDate: data.birthDate ? data.birthDate.slice(0, 10) : "",
      password: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      name: form.name,
      phoneNum: form.phoneNum,
      address: form.address || null,
      city: form.city,
      province: form.province || null,
      zone: form.zone || null,
      birthDate: form.birthDate || null,
    };
    if (form.password.trim().length >= 8) payload.password = form.password;

    const res = await api("/auth/me", { method: "PATCH", body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      toast.success("Profil berhasil diperbarui");
      setForm((f) => ({ ...f, password: "" }));
      load();
    } else {
      const err = await res.json();
      toast.error(typeof err.error === "string" ? err.error : "Gagal update profil");
    }
  }

  if (!me) return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 p-8 flex items-center justify-center">
      <div className="animate-pulse text-slate-400">Memuat profil...</div>
    </main>
  );

  const initials = me.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const roleEmoji: Record<string, string> = {
    PENDONOR: "💉", PASIEN: "🩺", PMI: "🩸", ADMIN: "🛡️",
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 pb-12">
      {/* Banner */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 relative">
          <Link href={backTo} className="inline-flex items-center gap-1 text-sm text-red-100 hover:text-white transition mb-6">
            ← Kembali ke dashboard
          </Link>

          <div className="flex items-center gap-5">
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl flex items-center justify-center font-bold text-2xl lg:text-3xl shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{me.name}</h1>
              <p className="text-red-100 text-sm mt-1">{me.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="bg-white/20 backdrop-blur-sm border border-white/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {roleEmoji[role]} {role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 -mt-6 space-y-5 relative">
        {/* Role-specific extra info */}
        {extraSection}

        {/* Edit Form */}
        <Card title="Data Pribadi" subtitle="Update informasi profil Anda" icon={<Icons.User />}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="No HP" value={form.phoneNum} onChange={(v) => setForm({ ...form, phoneNum: v })} required />
              {role !== "PMI" && (
                <Field label="Tanggal Lahir" type="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
              )}
              <RegionPicker
                province={form.province} city={form.city}
                onChange={({ province, city, zone }) => setForm({ ...form, province, city, zone })}
                required
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alamat (opsional)</label>
                <textarea
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                🔐 Ganti Password
              </h3>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password Baru (min 8 karakter, kosongkan kalau tidak ganti)</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-300 px-4 py-2.5 pr-12 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm">
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <Button type="submit" loading={saving} size="lg" icon={<Icons.Check />}>
              Simpan Perubahan
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

function Field(p: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{p.label}</label>
      <input
        type={p.type ?? "text"} required={p.required}
        value={p.value} onChange={(e) => p.onChange(e.target.value)}
        className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
      />
    </div>
  );
}
