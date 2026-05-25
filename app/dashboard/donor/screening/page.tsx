"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { Button, Card, Icons } from "../../../lib/ui";

/**
 * Kuesioner Skrining Donor (standar PMI)
 * Visual upgrade: progress bar + Yes/No card buttons
 */

const QUESTIONS = [
  { key: "hasFever", q: "Demam dalam 7 hari terakhir?", icon: "🌡️" },
  { key: "recentSurgery", q: "Operasi besar dalam 6 bulan terakhir?", icon: "🏥" },
  { key: "recentTattoo", q: "Tato, tindik, atau akupunktur dalam 6 bulan terakhir?", icon: "🎨" },
  { key: "isPregnantOrLactating", q: "Sedang hamil atau menyusui? (untuk perempuan)", icon: "🤰" },
  { key: "onMedication", q: "Sedang mengonsumsi obat-obatan tertentu?", icon: "💊" },
  { key: "hasHIVOrHepatitis", q: "Memiliki riwayat HIV/AIDS atau Hepatitis B/C?", icon: "⚠️" },
  { key: "riskySexualBehavior", q: "Memiliki perilaku seksual berisiko dalam 12 bulan terakhir?", icon: "🛡️" },
  { key: "recentVaccination", q: "Menerima vaksinasi dalam 2 minggu terakhir?", icon: "💉" },
] as const;

type Key = typeof QUESTIONS[number]["key"];

export default function ScreeningPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<Key, boolean | null>>(() =>
    Object.fromEntries(QUESTIONS.map((q) => [q.key, null])) as any
  );
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const progress = (answeredCount / QUESTIONS.length) * 100;
  const allAnswered = answeredCount === QUESTIONS.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) return;
    setSubmitting(true);
    const res = await api("/medical/screening", {
      method: "POST",
      body: JSON.stringify({ ...answers, details }),
    });
    setResult(await res.json());
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/dashboard/donor" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-4">
          ← Kembali ke dashboard
        </Link>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Banner Header */}
          <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-800 text-white p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">📋</span>
              <div>
                <h1 className="text-2xl font-bold">Kuesioner Skrining Donor</h1>
                <p className="text-red-100 text-sm">Standar PMI · 8 pertanyaan · ~2 menit</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-red-100 mb-1.5">
                <span>{answeredCount} dari {QUESTIONS.length} pertanyaan</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-200 to-white rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-3">
            <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              ⚠️ <strong>Jawab dengan jujur.</strong> Data ini digunakan untuk menentukan kelayakan medis Anda untuk donor.
            </p>

            {QUESTIONS.map((q, idx) => (
              <div key={q.key}
                className={`border-2 rounded-xl p-4 transition-all ${
                  answers[q.key] !== null ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{q.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-semibold">Pertanyaan {idx + 1}</p>
                    <p className="font-medium text-slate-900 mt-0.5">{q.q}</p>

                    <div className="flex gap-2 mt-3">
                      <YesNoButton
                        active={answers[q.key] === false}
                        variant="no"
                        onClick={() => setAnswers((a) => ({ ...a, [q.key]: false }))}
                      >
                        Tidak
                      </YesNoButton>
                      <YesNoButton
                        active={answers[q.key] === true}
                        variant="yes"
                        onClick={() => setAnswers((a) => ({ ...a, [q.key]: true }))}
                      >
                        Ya
                      </YesNoButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Keterangan tambahan (opsional)
              </label>
              <textarea
                value={details} onChange={(e) => setDetails(e.target.value)}
                className="w-full border border-slate-300 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition resize-none"
                rows={3}
                placeholder="Misal: alergi obat, riwayat kesehatan keluarga, dll..."
              />
            </div>

            {result && (
              <div className={`p-4 rounded-xl border-2 ${
                result.screening?.passed
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-red-50 border-red-300 text-red-800"
              }`}>
                <p className="font-bold text-lg flex items-center gap-2">
                  {result.screening?.passed ? "✅ Skrining Lolos!" : "⚠️ Belum Lolos Skrining"}
                </p>
                <p className="text-sm mt-1">{result.message}</p>
                {result.screening?.passed && (
                  <Button variant="success" size="sm" className="mt-3"
                    onClick={() => router.push("/dashboard/donor")}>
                    Lanjut ke Dashboard →
                  </Button>
                )}
              </div>
            )}

            <Button type="submit" loading={submitting} disabled={!allAnswered}
              fullWidth size="lg" icon={<Icons.Check />}>
              {!allAnswered
                ? `Jawab ${QUESTIONS.length - answeredCount} pertanyaan lagi`
                : "Kirim Jawaban"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function YesNoButton({ active, variant, onClick, children }: {
  active: boolean;
  variant: "yes" | "no";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeStyles = {
    yes: "bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/30",
    no: "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all
        ${active ? activeStyles[variant] : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}
      `}
    >
      {children}
    </button>
  );
}
