"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { Button, Card, Icons } from "../../../lib/ui";

/**
 * Form Pemeriksaan Fisik Pendonor (nakes/RS)
 * Flow 2 langkah: lookup donor by email → input vital signs
 */
export default function CheckupPage() {
  const router = useRouter();
  const [donorEmail, setDonorEmail] = useState("");
  const [donor, setDonor] = useState<any>(null);
  const [lookupErr, setLookupErr] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [form, setForm] = useState({
    hemoglobinLevel: "13.5", systolicBP: "120", diastolicBP: "80",
    bodyTempC: "36.8", pulseRate: "75", weight: "60", notes: "",
  });
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  function up(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

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
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard/hospital" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-4">
          ← Dashboard Rumah Sakit
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-rose-500 bg-clip-text text-transparent">
            Pemeriksaan Fisik Pendonor
          </h1>
          <p className="text-slate-500 text-sm mt-1">Form diisi oleh perawat/dokter setelah pemeriksaan</p>
        </header>

        {/* ===== STEP 1: Cari Pendonor ===== */}
        {!donor && (
          <Card title="Step 1 — Cari Pendonor" subtitle="Masukkan email yang dipakai pendonor saat register"
            icon={<Icons.Search />}>
            <form onSubmit={handleLookup} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email" required value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="donor1@test.com"
                  className="flex-1 border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                />
                <Button type="submit" loading={lookingUp} icon={<Icons.Search />}>
                  Cari
                </Button>
              </div>
              {lookupErr && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <span>⚠️</span><span>{lookupErr}</span>
                </div>
              )}
            </form>
          </Card>
        )}

        {/* ===== STEP 2: Vital Signs ===== */}
        {donor && !result && (
          <>
            <Card variant="success" className="mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md">
                    {donor.bloodType}{donor.rhesusType === "POSITIVE" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 font-semibold">✅ PENDONOR DITEMUKAN</p>
                    <p className="font-bold text-slate-900 text-lg">{donor.name}</p>
                    <p className="text-sm text-slate-600">{donor.email} · 📍 {donor.city}</p>
                  </div>
                </div>
                <button onClick={resetAll} className="text-sm text-slate-500 hover:text-red-600 transition">
                  Ganti pendonor
                </button>
              </div>
            </Card>

            <Card title="Step 2 — Input Vital Signs" subtitle="Hasil akan otomatis dievaluasi sesuai standar PMI"
              icon={<Icons.Heart />}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <VitalField label="Hemoglobin" unit="g/dL" value={form.hemoglobinLevel}
                    onChange={(v) => up("hemoglobinLevel", v)} hint="Normal: 12.5–17.0" />
                  <VitalField label="Berat Badan" unit="kg" value={form.weight}
                    onChange={(v) => up("weight", v)} hint="Min: 45 kg" />
                  <VitalField label="Suhu Tubuh" unit="°C" value={form.bodyTempC}
                    onChange={(v) => up("bodyTempC", v)} hint="Normal: 36.5–37.5" />
                  <VitalField label="Tek. Sistolik" unit="mmHg" value={form.systolicBP}
                    onChange={(v) => up("systolicBP", v)} hint="Normal: 100–160" integer />
                  <VitalField label="Tek. Diastolik" unit="mmHg" value={form.diastolicBP}
                    onChange={(v) => up("diastolicBP", v)} hint="Normal: 60–100" integer />
                  <VitalField label="Nadi" unit="BPM" value={form.pulseRate}
                    onChange={(v) => up("pulseRate", v)} hint="Normal: 50–100" integer />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan (opsional)</label>
                  <textarea value={form.notes} onChange={(e) => up("notes", e.target.value)}
                    className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition resize-none"
                    rows={2} placeholder="Misal: tampak sehat, tidak ada keluhan..." />
                </div>

                {submitErr && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    <p className="font-semibold mb-1">Submit gagal:</p>
                    <pre className="text-xs whitespace-pre-wrap font-mono">{submitErr}</pre>
                  </div>
                )}

                <Button type="submit" loading={submitting} size="lg" icon={<Icons.Check />}>
                  Simpan Pemeriksaan
                </Button>
              </form>
            </Card>
          </>
        )}

        {/* ===== Result ===== */}
        {result && (
          <Card variant={result.checkup?.passed ? "success" : "danger"}>
            <div className="text-center py-4">
              <div className="text-6xl mb-3">{result.checkup?.passed ? "✅" : "⚠️"}</div>
              <h2 className="text-2xl font-bold text-slate-900">
                {result.checkup?.passed ? "Pemeriksaan LOLOS" : "Pemeriksaan TIDAK LOLOS"}
              </h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{result.message}</p>
              <div className="flex gap-2 justify-center mt-6">
                <Button onClick={resetAll} icon={<Icons.Plus />}>Periksa Pendonor Lain</Button>
                <Button variant="secondary" onClick={() => router.push("/dashboard/hospital")}>
                  Kembali ke Dashboard
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function VitalField({ label, unit, value, onChange, hint, integer }: {
  label: string; unit: string; value: string; onChange: (v: string) => void;
  hint?: string; integer?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={integer ? 1 : 0.1}
          value={value}
          onChange={(e) => onChange(integer ? e.target.value.replace(/^0+(?=\d)/, "") : e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-full border border-slate-300 px-3 py-2 pr-12 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm"
          required
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">
          {unit}
        </span>
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
