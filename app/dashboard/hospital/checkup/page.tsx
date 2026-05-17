"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

/**
 * Form Pemeriksaan Fisik Pendonor (diisi nakes/RS)
 *
 * Flow 2 langkah:
 *   1. Cari pendonor via email → tampilkan info (nama, gol darah)
 *   2. Isi vital signs → submit
 *
 * Hasil disimpan sebagai PemeriksaanDonor + update Pendonor.weight
 */
export default function CheckupPage() {
  const router = useRouter();
  const [donorEmail, setDonorEmail] = useState("");
  const [donor, setDonor] = useState<any>(null);
  const [lookupErr, setLookupErr] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [form, setForm] = useState({
    hemoglobinLevel: 13.5, systolicBP: 120, diastolicBP: 80,
    bodyTempC: 36.8, pulseRate: 75, weight: 60, notes: "",
  });
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  function up<K extends keyof typeof form>(k: K, v: number | string) {
    setForm((f) => ({ ...f, [k]: v as any }));
  }

  // ===== Step 1: Cari pendonor =====
  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupErr(""); setDonor(null); setLookingUp(true);

    const res = await api(`/medical/donor-lookup?email=${encodeURIComponent(donorEmail)}`);
    const data = await res.json();
    setLookingUp(false);

    if (!res.ok) {
      setLookupErr(data.error ?? "Gagal mencari pendonor");
      return;
    }
    setDonor(data);
  }

  // ===== Step 2: Submit checkup =====
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(""); setResult(null); setSubmitting(true);

    const res = await api("/medical/checkup", {
      method: "POST",
      body: JSON.stringify({
        donorId: donor.donorId,
        hemoglobinLevel: Number(form.hemoglobinLevel),
        systolicBP: Number(form.systolicBP),
        diastolicBP: Number(form.diastolicBP),
        bodyTempC: Number(form.bodyTempC),
        pulseRate: Number(form.pulseRate),
        weight: Number(form.weight),
        notes: form.notes,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitErr(typeof data.error === "string" ? data.error : JSON.stringify(data.error, null, 2));
      return;
    }
    setResult(data);
  }

  function resetAll() {
    setDonor(null); setDonorEmail(""); setResult(null);
    setSubmitErr(""); setLookupErr("");
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <Link href="/dashboard/hospital" className="text-sm text-slate-500 hover:underline">← Dashboard RS</Link>
      <h1 className="text-3xl font-bold mt-2">Pemeriksaan Fisik Pendonor</h1>
      <p className="text-slate-600 text-sm mt-1">
        Form diisi oleh perawat/dokter setelah memeriksa kondisi fisik pendonor.
      </p>

      {/* ===== STEP 1: Cari Pendonor ===== */}
      {!donor && (
        <form onSubmit={handleLookup} className="mt-6 bg-white p-6 rounded-lg shadow space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Step 1 — Email Pendonor</label>
            <p className="text-xs text-slate-500 mb-2">Masukkan email yang dipakai pendonor saat register</p>
            <div className="flex gap-2">
              <input
                type="email" required value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder="donor1@test.com"
                className="flex-1 border px-3 py-2 rounded"
              />
              <button type="submit" disabled={lookingUp} className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50">
                {lookingUp ? "Mencari..." : "Cari"}
              </button>
            </div>
          </div>
          {lookupErr && <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">{lookupErr}</div>}
        </form>
      )}

      {/* ===== Profile Card + STEP 2: Form Vital Signs ===== */}
      {donor && !result && (
        <>
          <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold text-green-800">✅ Pendonor ditemukan</p>
              <p className="text-sm mt-1">
                <span className="font-medium">{donor.name}</span> ·
                Gol darah {donor.bloodType}{donor.rhesusType === "POSITIVE" ? "+" : "-"} ·
                Kota {donor.city}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">ID: <code>{donor.donorId}</code></p>
            </div>
            <button onClick={resetAll} className="text-sm text-slate-500 hover:underline">Ganti pendonor</button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="font-semibold">Step 2 — Input Vital Signs</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Hemoglobin (g/dL)" hint="Normal: 12.5–17.0" type="number" step="0.1" value={form.hemoglobinLevel} onChange={(v) => up("hemoglobinLevel", v)} />
              <Field label="Tek. Sistolik (mmHg)" hint="Normal: 100–160" type="number" value={form.systolicBP} onChange={(v) => up("systolicBP", v)} />
              <Field label="Tek. Diastolik (mmHg)" hint="Normal: 60–100" type="number" value={form.diastolicBP} onChange={(v) => up("diastolicBP", v)} />
              <Field label="Suhu (°C)" hint="Normal: 36.5–37.5" type="number" step="0.1" value={form.bodyTempC} onChange={(v) => up("bodyTempC", v)} />
              <Field label="Nadi (BPM)" hint="Normal: 50–100" type="number" value={form.pulseRate} onChange={(v) => up("pulseRate", v)} />
              <Field label="Berat (kg)" hint="Min: 45 kg" type="number" step="0.1" value={form.weight} onChange={(v) => up("weight", v)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
              <textarea value={form.notes} onChange={(e) => up("notes", e.target.value)} className="w-full border px-3 py-2 rounded" rows={2} />
            </div>

            {submitErr && (
              <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
                <p className="font-semibold mb-1">Submit gagal:</p>
                <pre className="text-xs whitespace-pre-wrap">{submitErr}</pre>
              </div>
            )}

            <button type="submit" disabled={submitting} className="bg-red-600 text-white px-6 py-2 rounded disabled:opacity-50">
              {submitting ? "Menyimpan..." : "Simpan Pemeriksaan"}
            </button>
          </form>
        </>
      )}

      {/* ===== Result ===== */}
      {result && (
        <div className={`mt-6 p-6 rounded-lg border ${result.checkup?.passed ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300"}`}>
          <p className="text-xl font-bold">{result.checkup?.passed ? "✅ Pemeriksaan LOLOS" : "⚠️ Pemeriksaan TIDAK LOLOS"}</p>
          <p className="text-sm mt-2 text-slate-700">{result.message}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={resetAll} className="bg-red-600 text-white px-4 py-2 rounded text-sm">Periksa Pendonor Lain</button>
            <button onClick={() => router.push("/dashboard/hospital")} className="bg-slate-200 px-4 py-2 rounded text-sm">Kembali ke Dashboard</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, hint, value, onChange, type, step }: {
  label: string; hint?: string; value: number | string; onChange: (v: number | string) => void; type: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input
        type={type} step={step} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border px-2 py-1.5 rounded text-sm"
        required
      />
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
