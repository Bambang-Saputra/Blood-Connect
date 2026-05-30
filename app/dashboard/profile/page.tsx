"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, dashboardPath } from "../../lib/api";
import { toast } from "../../lib/toast";
import { RegionPicker } from "../../lib/RegionPicker";
import { Button, Card, Badge, Icons } from "../../lib/ui";

/**
 * Use Case: UPDATE PROFIL (Activity Diagram #3)
 * Universal profile page untuk semua role.
 * - Tampilkan data profil saat ini
 * - Edit nama, phone, alamat, city, province, zone, birthDate
 * - Ganti password (opsional)
 */

type Me = {
  id: string; email: string; name: string; phoneNum: string;
  address?: string | null; city: string; province?: string | null;
  zone?: string | null; birthDate?: string | null; role: string;
  availableModes?: string[];
  pendonor?: { bloodType: string; rhesusType: string; isEligible: boolean; weight?: number };
  pasien?: { nik?: string };
  pmi?: { pmiName: string; pmiCode: string; pmiLoc: string; status: string };
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({
    name: "", phoneNum: "", address: "",
    province: "", city: "", zone: "",
    birthDate: "", password: "",
  });
  const [saving, setSaving] = useState(false);

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

  if (!me) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 p-8 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Memuat profil...</div>
      </main>
    );
  }

  const roleEmoji: Record<string, string> = {
    PENDONOR: "💉", PASIEN: "🩺", PMI: "🏛️", ADMIN: "🛡️",
  };
  const initials = me.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 pb-12">
      {/* Banner Header */}
      <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 relative">
          <Link href={dashboardPath(me.role)} className="inline-flex items-center gap-1 text-sm text-red-100 hover:text-white transition mb-6">
            ← Kembali ke dashboard
          </Link>

          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl flex items-center justify-center font-bold text-2xl lg:text-3xl shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{me.name}</h1>
              <p className="text-red-100 text-sm mt-1">{me.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="bg-white/20 backdrop-blur-sm border border-white/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {roleEmoji[me.role]} {me.role}
                </span>
                {me.pendonor && (
                  <span className="bg-red-900/40 border border-red-300/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    🩸 {me.pendonor.bloodType}{me.pendonor.rhesusType === "POSITIVE" ? "+" : "-"}
                    {me.pendonor.isEligible ? " · Eligible" : " · Belum eligible"}
                  </span>
                )}
                {me.pmi && (
                  <span className="bg-white/20 backdrop-blur-sm border border-white/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {me.pmi.pmiName} ({me.pmi.status})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8 -mt-6 space-y-5 relative">
        {/* === Mode Tambahan === */}
        {(me.role === "PENDONOR" || me.role === "PASIEN") && (
          <EnableModeSection me={me} onChanged={load} />
        )}

        {/* === Edit Form === */}
        <Card title="Data Pribadi" subtitle="Update informasi profil Anda" icon={<Icons.User />}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <Field label="No HP" value={form.phoneNum} onChange={(v) => setForm({ ...form, phoneNum: v })} required />
                  {me.role !== "PMI" && (
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
                  className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition resize-none"
                  rows={2}
                  placeholder="Jl. Contoh No.123, RT/RW..."
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                🔐 Ganti Password
              </h3>
              <Field
                label="Password Baru (min 8 karakter, kosongkan kalau tidak ganti)"
                type="password" value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
              />
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

function Field(p: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{p.label}</label>
      <input
        type={p.type ?? "text"} required={p.required}
        value={p.value} onChange={(e) => p.onChange(e.target.value)}
        className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
      />
    </div>
  );
}

// =====================================================================
// Section: Enable Mode Tambahan
// User Pendonor bisa enable Pasien, dan sebaliknya.
// =====================================================================
function EnableModeSection({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const [enabling, setEnabling] = useState<string | null>(null);
  const [pendonorForm, setPendonorForm] = useState({ bloodType: "O", rhesusType: "POSITIVE" });

  const hasPendonor = !!me.pendonor;
  const hasPasien = !!me.pasien;

  async function enableMode(mode: "PENDONOR" | "PASIEN", body: any = {}) {
    if (mode === "PENDONOR" && !me.birthDate) {
      toast.error("Isi tanggal lahir dulu di form di bawah, lalu simpan profil");
      return;
    }
    if (mode === "PENDONOR" && !confirm("Aktifkan mode Pendonor? Anda akan bisa donor darah dengan akun ini.")) return;
    if (mode === "PASIEN" && !confirm("Aktifkan mode Pasien? Anda akan bisa request darah dengan akun ini.")) return;

    setEnabling(mode);
    const res = await api("/auth/me/enable-mode", {
      method: "POST",
      body: JSON.stringify({ mode, ...body }),
    });
    const data = await res.json();
    setEnabling(null);

    if (res.ok) {
      toast.success(data.message);
      onChanged();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal aktifkan mode");
    }
  }

  return (
    <Card title="Mode Akun"
      subtitle="Satu akun bisa Pendonor & Pasien sekaligus — aktifkan sesuai kebutuhan"
      icon={<Icons.Heart />} variant="highlight">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Pendonor */}
        <div className={`relative p-5 rounded-xl border-2 transition-all ${
          hasPendonor
            ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300"
            : "bg-white border-slate-200 hover:border-slate-300"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 ${hasPendonor ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-red-500 to-rose-600"} text-white rounded-xl flex items-center justify-center text-xl shadow-sm`}>
              💉
            </div>
            {hasPendonor && <Badge status="AKTIF" />}
          </div>
          <h3 className="font-bold text-slate-900">Mode Pendonor</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">Donor darah, isi skrining, bantu pasien yang butuh.</p>

          {hasPendonor ? (
            <div className="mt-3 bg-white/60 border border-emerald-200 rounded-lg p-2.5">
              <p className="text-xs text-emerald-700 font-semibold">
                ✓ Aktif · Golongan {me.pendonor!.bloodType}{me.pendonor!.rhesusType === "POSITIVE" ? "+" : "-"}
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={pendonorForm.bloodType}
                  onChange={(e) => setPendonorForm({ ...pendonorForm, bloodType: e.target.value })}
                  className="border border-slate-300 px-2 py-1.5 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option>A</option><option>B</option><option>AB</option><option>O</option>
                </select>
                <select
                  value={pendonorForm.rhesusType}
                  onChange={(e) => setPendonorForm({ ...pendonorForm, rhesusType: e.target.value })}
                  className="border border-slate-300 px-2 py-1.5 rounded-lg text-xs bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="POSITIVE">Rh+</option>
                  <option value="NEGATIVE">Rh-</option>
                </select>
              </div>
              <Button size="sm" fullWidth loading={enabling === "PENDONOR"}
                icon={<Icons.Plus />}
                onClick={() => enableMode("PENDONOR", pendonorForm)}>
                Aktifkan Mode Pendonor
              </Button>
            </div>
          )}
        </div>

        {/* Pasien */}
        <div className={`relative p-5 rounded-xl border-2 transition-all ${
          hasPasien
            ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300"
            : "bg-white border-slate-200 hover:border-slate-300"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 ${hasPasien ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"} text-white rounded-xl flex items-center justify-center text-xl shadow-sm`}>
              🩺
            </div>
            {hasPasien && <Badge status="AKTIF" />}
          </div>
          <h3 className="font-bold text-slate-900">Mode Pasien</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">Request darah untuk diri sendiri atau anggota keluarga.</p>

          {hasPasien ? (
            <div className="mt-3 bg-white/60 border border-emerald-200 rounded-lg p-2.5">
              <p className="text-xs text-emerald-700 font-semibold">✓ Aktif · Bisa request darah</p>
            </div>
          ) : (
            <div className="mt-4">
              <Button size="sm" fullWidth loading={enabling === "PASIEN"}
                icon={<Icons.Plus />}
                onClick={() => enableMode("PASIEN")}>
                Aktifkan Mode Pasien
              </Button>
            </div>
          )}
        </div>
      </div>

      {hasPendonor && hasPasien && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-slate-700 flex gap-2">
          <span className="text-blue-600 text-base">💡</span>
          <div>
            <strong>Anda punya 2 mode aktif.</strong> Beralih antar mode via pill toggle di header dashboard, atau langsung ke{" "}
            <Link href="/dashboard/donor" className="text-red-600 hover:underline font-semibold">Dashboard Pendonor</Link>
            {" / "}
            <Link href="/dashboard/patient" className="text-red-600 hover:underline font-semibold">Dashboard Pasien</Link>.
          </div>
        </div>
      )}
    </Card>
  );
}
