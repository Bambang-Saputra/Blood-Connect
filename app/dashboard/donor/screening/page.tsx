"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { Button, Icons } from "../../../lib/ui";

// Pertanyaan umum (semua gender) + pertanyaan khusus WANITA (hamil/menyusui & haid).
const BASE_QUESTIONS = [
  { key: "hasFever", q: "Demam dalam 7 hari terakhir?", icon: "🌡️" },
  { key: "recentSurgery", q: "Operasi besar dalam 6 bulan terakhir?", icon: "🏥" },
  { key: "recentTattoo", q: "Tato, tindik, atau akupunktur dalam 6 bulan terakhir?", icon: "🎨" },
  { key: "onMedication", q: "Sedang mengonsumsi obat-obatan tertentu?", icon: "💊" },
  { key: "hasHIVOrHepatitis", q: "Memiliki riwayat HIV/AIDS atau Hepatitis B/C?", icon: "⚠️" },
  { key: "riskySexualBehavior", q: "Memiliki perilaku seksual berisiko dalam 12 bulan terakhir?", icon: "🛡️" },
  { key: "recentVaccination", q: "Menerima vaksinasi dalam 2 minggu terakhir?", icon: "💉" },
] as const;

const FEMALE_QUESTIONS = [
  { key: "isPregnantOrLactating", q: "Sedang hamil atau menyusui?", icon: "🤰" },
  { key: "isMenstruating", q: "Sedang menstruasi (haid) saat ini?", icon: "🩸" },
] as const;

const ALL_QUESTIONS = [...BASE_QUESTIONS, ...FEMALE_QUESTIONS];

type Key = typeof ALL_QUESTIONS[number]["key"];

export default function ScreeningPage() {
  const router = useRouter();
  
  // State Data
  const [answers, setAnswers] = useState<Record<Key, boolean | null>>(() =>
    Object.fromEntries(ALL_QUESTIONS.map((q) => [q.key, null])) as any
  );
  const [details, setDetails] = useState("");
  const [gender, setGender] = useState<string | null>(null); // dari /donor/me — penentu pertanyaan

  // State UI
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false); // Penanda Mode Tinjauan

  // Pertanyaan yang tampil tergantung gender: WANITA dapat tambahan hamil & haid.
  const visibleQuestions = gender === "FEMALE" ? [...BASE_QUESTIONS, ...FEMALE_QUESTIONS] : [...BASE_QUESTIONS];
  const answeredCount = visibleQuestions.filter((q) => answers[q.key] !== null).length;
  const progress = (answeredCount / visibleQuestions.length) * 100;
  const allAnswered = answeredCount === visibleQuestions.length;

  // Fetch data skrining terakhir saat halaman dimuat
  useEffect(() => {
    async function loadExistingScreening() {
      try {
        const res = await api("/donor/me");
        if (res.ok) {
          const data = await res.json();
          setGender(data.user?.gender ?? null);
          const lastScreening = data.screenings?.[0];

          // Skrining kadaluarsa (validUntil < now) → biarkan form KOSONG & editable
          // supaya donor bisa skrining ulang. Hanya skrining yang masih berlaku yang
          // ditampilkan dalam mode Read-Only (tinjauan).
          const expired = lastScreening?.validUntil
            ? new Date(lastScreening.validUntil) < new Date()
            : false;
          if (lastScreening && !expired) {
            const mappedAnswers: any = {};
            ALL_QUESTIONS.forEach(q => {
              mappedAnswers[q.key] = lastScreening[q.key] ?? null;
            });
            setAnswers(mappedAnswers);
            setDetails(lastScreening.details || "");
            
            setResult({
              screening: { passed: lastScreening.passed },
              message: lastScreening.passed 
                ? "Ini adalah tinjauan hasil skrining Anda yang sedang aktif. Anda tidak perlu mengisi ulang saat ini."
                : "Anda sedang dalam masa tunggu (cooldown) medis. Hasil di bawah ini adalah rekaman skrining terakhir Anda."
            });
            
            setIsReadOnly(true);
          }
        }
      } catch (error) {
        console.error("Gagal memuat data skrining:", error);
      } finally {
        setLoadingData(false);
      }
    }
    loadExistingScreening();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered || isReadOnly) return;
    
    setSubmitting(true);
    // Kirim semua field wajib; pertanyaan khusus wanita yang tak tampil (pria) → false.
    const body = {
      hasFever: answers.hasFever,
      recentSurgery: answers.recentSurgery,
      recentTattoo: answers.recentTattoo,
      isPregnantOrLactating: answers.isPregnantOrLactating ?? false,
      isMenstruating: answers.isMenstruating ?? false,
      onMedication: answers.onMedication,
      hasHIVOrHepatitis: answers.hasHIVOrHepatitis,
      riskySexualBehavior: answers.riskySexualBehavior,
      recentVaccination: answers.recentVaccination,
      details,
    };
    const res = await api("/medical/screening", {
      method: "POST",
      body: JSON.stringify(body),
    });
    
    setResult(await res.json());
    setSubmitting(false);
    setShowModal(true); // Tampilkan popup setelah respon diterima
  }

  if (loadingData) {
    return <main className="min-h-screen flex items-center justify-center text-slate-400">Memuat data medis...</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      
      {/* CSS Animasi Custom (Background Sel Darah) */}
      <style>{`
        @keyframes float-blood {
          0% { transform: translateY(110vh) scale(0.6); opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }
        .blood-cell {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, #fca5a5 0%, #ef4444 60%, #b91c1c 100%);
          animation: float-blood linear infinite;
          filter: blur(3px);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* Gelembung Sel Darah Merah Bergerak */}
      <div className="blood-cell w-6 h-6 left-[10%]" style={{ animationDuration: '12s', animationDelay: '0s' }}></div>
      <div className="blood-cell w-10 h-10 left-[35%]" style={{ animationDuration: '18s', animationDelay: '2s' }}></div>
      <div className="blood-cell w-8 h-8 left-[65%]" style={{ animationDuration: '15s', animationDelay: '5s' }}></div>
      <div className="blood-cell w-14 h-14 left-[80%]" style={{ animationDuration: '22s', animationDelay: '1s' }}></div>
      <div className="blood-cell w-5 h-5 left-[50%]" style={{ animationDuration: '14s', animationDelay: '8s' }}></div>
      <div className="blood-cell w-12 h-12 left-[20%]" style={{ animationDuration: '20s', animationDelay: '4s' }}></div>
      <div className="blood-cell w-7 h-7 left-[90%]" style={{ animationDuration: '16s', animationDelay: '7s' }}></div>

      {/* Gradasi statis agar bagian atas tidak terlalu pucat */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-rose-100/60 to-transparent pointer-events-none z-0" />

      {/* KONTEN UTAMA */}
      <main className="relative z-10 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/dashboard/donor" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 mb-4">
            ← Kembali ke dashboard
          </Link>

          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Banner Header */}
            <div className={`text-white p-6 lg:p-8 transition-colors ${isReadOnly ? (result?.screening?.passed ? 'bg-emerald-600' : 'bg-amber-600') : 'bg-gradient-to-br from-red-600 via-red-700 to-rose-800'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{isReadOnly ? (result?.screening?.passed ? '✅' : '⏳') : '📋'}</span>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {isReadOnly ? "Tinjauan Hasil Skrining" : "Kuesioner Skrining Donor"}
                    </h1>
                    <p className="text-white/80 text-sm">
                      {isReadOnly ? "Mode Read-Only (Hanya Baca)" : "Standar PMI · 8 pertanyaan · ~2 menit"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar (Sembunyikan kalau Read-Only) */}
              {!isReadOnly && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-red-100 mb-1.5">
                    <span>{answeredCount} dari {visibleQuestions.length} pertanyaan</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-200 to-white rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-3">
              {/* Banner Info Read-Only */}
              {isReadOnly && result && (
                <div className={`p-4 rounded-xl border-2 mb-6 ${
                  result.screening?.passed
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-amber-50 border-amber-300 text-amber-800"
                }`}>
                  <p className="font-bold text-lg flex items-center gap-2">
                    {result.screening?.passed ? "✅ Status: Lolos Skrining" : "⏳ Status: Masa Tunggu (Cooldown)"}
                  </p>
                  <p className="text-sm mt-1">{result.message}</p>
                </div>
              )}

              {!isReadOnly && (
                <p className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  ⚠️ <strong>Jawab dengan jujur.</strong> Data ini digunakan untuk menentukan kelayakan medis Anda untuk donor.
                </p>
              )}

              {visibleQuestions.map((q, idx) => (
                <div key={q.key}
                  className={`border-2 rounded-xl p-4 transition-all ${
                    answers[q.key] !== null ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white hover:border-slate-300"
                  } ${isReadOnly ? "opacity-80" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{q.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 font-semibold">Pertanyaan {idx + 1}</p>
                      <p className="font-medium text-slate-900 mt-0.5">{q.q}</p>

                      <div className="flex gap-2 mt-3">
                        <YesNoButton
                          active={answers[q.key] === false}
                          variant="no"
                          disabled={isReadOnly}
                          onClick={() => !isReadOnly && setAnswers((a) => ({ ...a, [q.key]: false }))}
                        >
                          Tidak
                        </YesNoButton>
                        <YesNoButton
                          active={answers[q.key] === true}
                          variant="yes"
                          disabled={isReadOnly}
                          onClick={() => !isReadOnly && setAnswers((a) => ({ ...a, [q.key]: true }))}
                        >
                          Ya
                        </YesNoButton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 mt-4">
                  Keterangan tambahan (opsional)
                </label>
                <textarea
                  value={details} 
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full border px-4 py-2.5 rounded-lg focus:outline-none transition resize-none ${
                    isReadOnly 
                      ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                      : "bg-white border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  }`}
                  rows={3}
                  placeholder="Misal: alergi obat, riwayat kesehatan keluarga, dll..."
                />
              </div>

              {/* Sembunyikan tombol submit jika data sedang dikirim, result sudah keluar dari awal, atau mode Read-Only */}
              {!isReadOnly && !result && (
                <div className="pt-4">
                  <Button type="submit" loading={submitting} disabled={!allAnswered}
                    fullWidth size="lg" icon={<Icons.Check />}>
                    {!allAnswered
                      ? `Jawab ${visibleQuestions.length - answeredCount} pertanyaan lagi`
                      : "Kirim Jawaban"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* ========================================= */}
      {/* MODAL POPUP: MEMAKSA USER KE DASHBOARD    */}
      {/* ========================================= */}
      {showModal && result && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center transform scale-100 transition-transform">
            <div className="text-6xl mb-5 drop-shadow-md">
              {result.screening?.passed ? "🎉" : "⏳"}
            </div>
            
            <h3 className={`text-2xl font-black mb-3 ${result.screening?.passed ? "text-emerald-600" : "text-amber-600"}`}>
              {result.screening?.passed ? "Skrining Berhasil!" : "Belum Layak Donor"}
            </h3>
            
            <p className="text-slate-600 mb-8 leading-relaxed">
              {result.message || (result.screening?.passed 
                ? "Mantap, Anda lolos skrining awal! Silakan kembali ke dashboard untuk memilih jadwal dan lokasi PMI." 
                : "Berdasarkan kondisi kesehatan Anda saat ini, Anda diharuskan menunggu beberapa waktu sebelum bisa mendonorkan darah kembali demi keselamatan bersama.")}
            </p>
            
            <Button 
              fullWidth 
              size="lg" 
              variant={result.screening?.passed ? "primary" : "secondary"}
              onClick={() => router.push("/dashboard/donor")}
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

function YesNoButton({ active, variant, disabled, onClick, children }: {
  active: boolean;
  variant: "yes" | "no";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeStyles = {
    yes: "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/30",
    no: "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30",
  };
  
  // Jika tombol disabled (Read-Only) tapi tidak aktif, buat terlihat lebih redup
  const inactiveStyles = disabled 
    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed" 
    : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all duration-200
        ${active ? activeStyles[variant] : inactiveStyles}
        ${disabled && active ? "opacity-90 cursor-not-allowed" : ""}
      `}
    >
      {children}
    </button>
  );
}