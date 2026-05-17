"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

/**
 * Halaman Kuesioner Skrining Donor (standar PMI)
 * Dijawab pendonor sendiri, valid 24 jam.
 */

const QUESTIONS = [
  { key: "hasFever", q: "Apakah Anda mengalami demam dalam 7 hari terakhir?" },
  { key: "recentSurgery", q: "Apakah Anda menjalani operasi besar dalam 6 bulan terakhir?" },
  { key: "recentTattoo", q: "Apakah Anda menerima tato, tindik, atau akupunktur dalam 6 bulan terakhir?" },
  { key: "isPregnantOrLactating", q: "Apakah Anda sedang hamil atau menyusui? (jika perempuan)" },
  { key: "onMedication", q: "Apakah Anda sedang mengonsumsi obat-obatan tertentu?" },
  { key: "hasHIVOrHepatitis", q: "Apakah Anda memiliki riwayat HIV/AIDS atau Hepatitis B/C?" },
  { key: "riskySexualBehavior", q: "Apakah Anda memiliki perilaku seksual berisiko dalam 12 bulan terakhir?" },
  { key: "recentVaccination", q: "Apakah Anda menerima vaksinasi dalam 2 minggu terakhir?" },
] as const;

type Key = typeof QUESTIONS[number]["key"];

export default function ScreeningPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<Key, boolean>>(() =>
    Object.fromEntries(QUESTIONS.map((q) => [q.key, false])) as any
  );
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await api("/medical/screening", {
      method: "POST",
      body: JSON.stringify({ ...answers, details }),
    });
    setResult(await res.json());
    setSubmitting(false);
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <Link href="/dashboard/donor" className="text-sm text-slate-500 hover:underline">← Kembali ke dashboard</Link>
      <h1 className="text-3xl font-bold mt-2">Kuesioner Skrining Donor</h1>
      <p className="text-slate-600 text-sm mt-1">
        Jawab dengan jujur sesuai kondisi Anda saat ini. Data dipakai untuk menentukan kelayakan donor.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 bg-white p-6 rounded-lg shadow">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="border-b pb-3">
            <p className="font-medium text-sm">{q.q}</p>
            <div className="flex gap-3 mt-2">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio" name={q.key}
                  checked={answers[q.key] === false}
                  onChange={() => setAnswers((a) => ({ ...a, [q.key]: false }))}
                />
                Tidak
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio" name={q.key}
                  checked={answers[q.key] === true}
                  onChange={() => setAnswers((a) => ({ ...a, [q.key]: true }))}
                />
                Ya
              </label>
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">Keterangan tambahan (opsional)</label>
          <textarea
            value={details} onChange={(e) => setDetails(e.target.value)}
            className="w-full border px-3 py-2 rounded" rows={2}
          />
        </div>

        {result && (
          <div className={`p-3 rounded text-sm ${result.screening?.passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {result.message}
            {result.screening?.passed && (
              <button
                type="button" onClick={() => router.push("/dashboard/donor")}
                className="ml-3 underline"
              >Kembali ke dashboard</button>
            )}
          </div>
        )}

        <button
          type="submit" disabled={submitting}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {submitting ? "Mengirim..." : "Kirim Jawaban"}
        </button>
      </form>
    </main>
  );
}
