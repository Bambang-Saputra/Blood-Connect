"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, dashboardPath } from "../../lib/api";
import { toast } from "../../lib/toast";
import { RegionPicker } from "../../lib/RegionPicker";

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
  rumahSakit?: { hospitalName: string; hospitalCode: string; hospitalLoc: string; status: string };
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

  if (!me) return <main className="p-8">Memuat profil...</main>;

  return (
    <main className="max-w-3xl mx-auto p-8">
      <Link href={dashboardPath(me.role)} className="text-sm text-slate-500 hover:underline">← Dashboard</Link>
      <h1 className="text-3xl font-bold mt-2">Profil Saya</h1>
      <p className="text-slate-500 text-sm mt-1">Update data pribadi Anda</p>

      {/* === Info Akun (read-only) === */}
      <section className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="font-semibold text-sm text-slate-500 uppercase">Akun</h2>
        <div className="mt-2 space-y-1 text-sm">
          <p><span className="text-slate-500">Email:</span> <span className="font-medium">{me.email}</span></p>
          <p><span className="text-slate-500">Role:</span> <span className="font-medium">{me.role}</span></p>
          {me.pendonor && (
            <p><span className="text-slate-500">Golongan darah:</span>{" "}
              <span className="font-medium">{me.pendonor.bloodType}{me.pendonor.rhesusType === "POSITIVE" ? "+" : "-"}</span>
              {" · "}
              <span className={me.pendonor.isEligible ? "text-green-600" : "text-orange-600"}>
                {me.pendonor.isEligible ? "Eligible" : "Belum eligible"}
              </span>
            </p>
          )}
          {me.rumahSakit && (
            <>
              <p><span className="text-slate-500">RS:</span> <span className="font-medium">{me.rumahSakit.hospitalName}</span> ({me.rumahSakit.hospitalCode})</p>
              <p><span className="text-slate-500">Status:</span>{" "}
                <span className={`px-2 py-0.5 text-xs rounded ${
                  me.rumahSakit.status === "VERIFIED" ? "bg-green-100 text-green-700" :
                  me.rumahSakit.status === "SUSPENDED" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>{me.rumahSakit.status}</span>
              </p>
            </>
          )}
        </div>
      </section>

      {/* === Mode Tambahan (multi-role) === */}
      {(me.role === "PENDONOR" || me.role === "PASIEN") && (
        <EnableModeSection me={me} onChanged={load} />
      )}

      {/* === Edit Form === */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mt-4 space-y-4">
        <h2 className="font-semibold text-sm text-slate-500 uppercase">Data Pribadi</h2>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Nama Lengkap" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="No HP" value={form.phoneNum} onChange={(v) => setForm({ ...form, phoneNum: v })} required />
          {me.role !== "RUMAH_SAKIT" && (
            <Field label="Tanggal Lahir" type="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
          )}
          <RegionPicker
            province={form.province} city={form.city}
            onChange={({ province, city, zone }) => setForm({ ...form, province, city, zone })}
            required
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Alamat (opsional)</label>
            <textarea
              value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border px-3 py-2 rounded" rows={2}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold text-sm text-slate-500 uppercase mb-2">Ganti Password (opsional)</h2>
          <Field
            label="Password Baru (min 8 karakter, kosongkan kalau tidak ganti)"
            type="password" value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />
        </div>

        <button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded disabled:opacity-50">
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </main>
  );
}

function Field(p: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{p.label}</label>
      <input
        type={p.type ?? "text"} required={p.required}
        value={p.value} onChange={(e) => p.onChange(e.target.value)}
        className="w-full border border-slate-300 px-3 py-2 rounded"
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
    <section className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 p-6 rounded-lg shadow-sm mt-4">
      <h2 className="font-semibold text-sm text-red-700 uppercase tracking-wide">Mode Akun</h2>
      <p className="text-xs text-slate-600 mt-1">
        Satu akun bisa berfungsi sebagai Pendonor & Pasien sekaligus. Aktifkan sesuai kebutuhan.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {/* Pendonor */}
        <div className={`p-4 rounded-lg border-2 ${hasPendonor ? "bg-green-50 border-green-300" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💉</span>
            {hasPendonor && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold">AKTIF</span>}
          </div>
          <p className="font-semibold text-sm">Mode Pendonor</p>
          <p className="text-xs text-slate-600 mt-1">Donor darah, isi skrining, jawab permintaan darurat.</p>

          {hasPendonor ? (
            <p className="text-xs text-green-700 mt-3">
              ✓ Golongan: {me.pendonor!.bloodType}{me.pendonor!.rhesusType === "POSITIVE" ? "+" : "-"}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={pendonorForm.bloodType}
                  onChange={(e) => setPendonorForm({ ...pendonorForm, bloodType: e.target.value })}
                  className="border border-slate-300 px-2 py-1 rounded text-xs"
                >
                  <option>A</option><option>B</option><option>AB</option><option>O</option>
                </select>
                <select
                  value={pendonorForm.rhesusType}
                  onChange={(e) => setPendonorForm({ ...pendonorForm, rhesusType: e.target.value })}
                  className="border border-slate-300 px-2 py-1 rounded text-xs"
                >
                  <option value="POSITIVE">Rh+</option>
                  <option value="NEGATIVE">Rh-</option>
                </select>
              </div>
              <button
                onClick={() => enableMode("PENDONOR", pendonorForm)}
                disabled={enabling === "PENDONOR"}
                className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded disabled:opacity-50"
              >
                {enabling === "PENDONOR" ? "Mengaktifkan..." : "+ Aktifkan Mode Pendonor"}
              </button>
            </div>
          )}
        </div>

        {/* Pasien */}
        <div className={`p-4 rounded-lg border-2 ${hasPasien ? "bg-green-50 border-green-300" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🩺</span>
            {hasPasien && <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold">AKTIF</span>}
          </div>
          <p className="font-semibold text-sm">Mode Pasien</p>
          <p className="text-xs text-slate-600 mt-1">Request darah untuk diri sendiri atau anggota keluarga.</p>

          {hasPasien ? (
            <p className="text-xs text-green-700 mt-3">✓ Bisa request darah</p>
          ) : (
            <button
              onClick={() => enableMode("PASIEN")}
              disabled={enabling === "PASIEN"}
              className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded disabled:opacity-50"
            >
              {enabling === "PASIEN" ? "Mengaktifkan..." : "+ Aktifkan Mode Pasien"}
            </button>
          )}
        </div>
      </div>

      {hasPendonor && hasPasien && (
        <p className="mt-4 text-xs text-slate-600 bg-white p-3 rounded">
          💡 Anda punya 2 mode. Beralih antar mode via pill toggle di header dashboard, atau langsung ke{" "}
          <a href="/dashboard/donor" className="text-red-600 hover:underline">Dashboard Pendonor</a> /{" "}
          <a href="/dashboard/patient" className="text-red-600 hover:underline">Dashboard Pasien</a>.
        </p>
      )}
    </section>
  );
}
