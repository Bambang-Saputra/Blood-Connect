"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { useRequireRole } from "../../lib/useRequireRole";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirmDialog";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

export default function DonorDashboard() {
  const { me: guardMe, loading: guardLoading } = useRequireRole("PENDONOR");
  const [me, setMe] = useState<any>(null);
  const [authMe, setAuthMe] = useState<any>(null);
  
  // State untuk data
  const [history, setHistory] = useState<any[]>([]);
  const [pmiList, setPmiList] = useState<any[]>([]);
  const [nearbyBroadcasts, setNearbyBroadcasts] = useState<any[]>([]);
  const [mySchedules, setMySchedules] = useState<any[]>([]); // <-- State jadwal kembali dimunculkan
  
  // State untuk interaksi UI (Modal & Form)
  const [selectedPmiInfo, setSelectedPmiInfo] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({ pmiId: "", pmiName: "", jadwal: "", sesi: "PAGI" });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (guardMe) refresh();
  }, [guardMe]);

  async function refresh() {
    const [meRes, authRes, histRes, pmiRes, broadcastsRes, schedulesRes] = await Promise.all([
      api("/donor/me").then((r) => r.json()).catch(() => null),
      api("/auth/me").then((r) => r.json()).catch(() => null),
      api("/donor/history").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/pmi/list").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/broadcasts").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/schedules").then((r) => r.json()).catch(() => ({ data: [] })), // <-- Ambil data jadwal donor ini
    ]);
    
    setMe(meRes);
    setAuthMe(authRes);
    setHistory(histRes.data ?? []);
    setPmiList(pmiRes.data ?? []);
    setNearbyBroadcasts(broadcastsRes.data ?? []);
    setMySchedules(schedulesRes.data ?? []);
  }

  // Cek apakah ada jadwal yang sedang aktif (belum selesai/ditolak)
  const activeSchedule = mySchedules.find(s => s.status === "PENDING" || s.status === "CONFIRMED");

  // Sorting + filter PMI berdasarkan lokasi PROFIL pendonor.
  // Hanya tampilkan PMI yang se-region (kota/zona/provinsi) — donor di Jakarta
  // tidak masuk akal mendonor di PMI Makassar. Fallback: tampilkan semua jika
  // tak ada satu pun PMI se-region (agar daftar tidak kosong).
  const sortedPmis = useMemo(() => {
    const score = (p: any) =>
      !authMe ? 0 :
      p.user?.city === authMe.city ? 3 :
      p.user?.zone && p.user?.zone === authMe.zone ? 2 :
      p.user?.province && p.user?.province === authMe.province ? 1 : 0;
    // HANYA PMI se-region (kota/zona/provinsi). Jika kosong → tampilkan empty
    // state "belum ada PMI terdekat" (bukan menampilkan PMI luar provinsi yang
    // membingungkan — donor tak akan mendonor lintas provinsi).
    return [...pmiList]
      .map((p) => ({ ...p, _score: score(p) }))
      .filter((p) => p._score > 0)
      .sort((a, b) => b._score - a._score);
  }, [pmiList, authMe]);

  async function submitSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.jadwal) { toast.error("Pilih tanggal jadwal"); return; }
    
    setSubmitting(true);
    const res = await api("/donor/schedules", {
      method: "POST",
      body: JSON.stringify({
        pmiId: scheduleForm.pmiId,
        jadwal: new Date(scheduleForm.jadwal).toISOString(),
        sesi: scheduleForm.sesi,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    
    if (res.ok) {
      toast.success(data.message);
      setShowScheduleModal(false);
      refresh();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal daftar jadwal");
    }
  }

  // Fungsi untuk membatalkan jadwal (Butuh update di backend nanti)
  async function cancelSchedule(scheduleId: string) {
    if (!(await confirmDialog({ title: "Batalkan Jadwal Donor", message: "Yakin ingin membatalkan jadwal donor ini?", confirmText: "Ya, Batalkan", variant: "danger" }))) return;
    
    // CATATAN: Endpoint DELETE ini harus kita buat nanti di file donorController.ts
    const res = await api(`/donor/schedules/${scheduleId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Jadwal berhasil dibatalkan.");
      refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Gagal membatalkan jadwal. Fitur API mungkin belum siap.");
    }
  }

  if (guardLoading || !guardMe) {
    return <main className="min-h-screen flex items-center justify-center animate-pulse text-slate-400">Memverifikasi sesi...</main>;
  }
  if (!me) return <main className="p-8">Memuat...</main>;
  

  const lastScreening = me.screenings?.[0];
  // Skrining kadaluarsa (validUntil < now) diperlakukan SEPERTI BELUM mengisi,
  // supaya donor bisa skrining ulang — bukan stuck di state "Layak Donor".
  const screeningExpired = lastScreening?.validUntil
    ? new Date(lastScreening.validUntil) < new Date()
    : false;
  const hasScreening = !!lastScreening && !screeningExpired; // expired = anggap belum isi
  const hasPassedScreening = hasScreening && lastScreening?.passed === true;
  const screeningFailed = hasScreening && !hasPassedScreening; // udah ngisi (masih berlaku), TAPI nggak lulus

  // Masa tunggu MEDIS pasca-donor (cooldownUntil di masa depan).
  // Ini KONSEP BERBEDA dari skrining: walau skrining lolos, donor yang baru
  // saja mendonor tetap harus menunggu sebelum bisa donor lagi.
  const cooldownActive = me.cooldownUntil ? new Date(me.cooldownUntil) > new Date() : false;
  const cooldownUntilStr = me.cooldownUntil
    ? new Date(me.cooldownUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // "Siap daftar jadwal" = lolos skrining DAN tidak sedang masa tunggu medis.
  // (Cek fisik final tetap dilakukan PMI di hari donor — itu beda dari isEligible.)
  const readyToSchedule = hasPassedScreening && !cooldownActive;
  // Banner amber kalau skrining gagal ATAU sedang masa tunggu medis.
  const isWaiting = screeningFailed || cooldownActive;

  // Alasan kenapa belum bisa daftar jadwal (null = boleh daftar).
  const scheduleBlockReason = !hasScreening
    ? "Isi kuesioner skrining kesehatan dulu sebelum daftar jadwal ya!"
    : screeningFailed
    ? "Skrining terakhir Anda belum lolos, jadi belum bisa daftar jadwal saat ini."
    : cooldownActive
    ? `Anda masih dalam masa tunggu pasca-donor${cooldownUntilStr ? ` sampai ${cooldownUntilStr}` : ""}.`
    : null;

  // Kunjungan terakhir yang SUDAH ada hasilnya (selesai/ditolak) & masih "baru" (≤14 hari).
  // Tujuannya kasih feedback hasil cek fisik PMI ke donor — terutama jadwal REJECTED
  // (cek fisik gagal) yang selama ini tidak muncul sama sekali di dashboard donor.
  const RECENT_VISIT_DAYS = 14;
  const lastVisit = mySchedules.find((s) => s.status === "COMPLETED" || s.status === "REJECTED");
  const lastVisitRecent =
    !!lastVisit && Date.now() - new Date(lastVisit.jadwal).getTime() < RECENT_VISIT_DAYS * 86400000;

  return (
    /* INI KANVAS BACKGROUND-NYA (Tag DIV baru) */
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      
{/* 1. CSS Animasi Custom (Inject langsung) */}
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
          /* Gradasi biar gelembung kelihatan kayak sel darah 3D */
          background: radial-gradient(circle, #fca5a5 0%, #ef4444 60%, #b91c1c 100%);
          animation: float-blood linear infinite;
          filter: blur(3px); /* Blur tipis biar menyatu dengan background */
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* 2. Gelembung Sel Darah Merah */}
      <div className="blood-cell w-6 h-6 left-[10%]" style={{ animationDuration: '12s', animationDelay: '0s' }}></div>
      <div className="blood-cell w-10 h-10 left-[35%]" style={{ animationDuration: '18s', animationDelay: '2s' }}></div>
      <div className="blood-cell w-8 h-8 left-[65%]" style={{ animationDuration: '15s', animationDelay: '5s' }}></div>
      <div className="blood-cell w-14 h-14 left-[80%]" style={{ animationDuration: '22s', animationDelay: '1s' }}></div>
      <div className="blood-cell w-5 h-5 left-[50%]" style={{ animationDuration: '14s', animationDelay: '8s' }}></div>
      <div className="blood-cell w-12 h-12 left-[20%]" style={{ animationDuration: '20s', animationDelay: '4s' }}></div>
      <div className="blood-cell w-7 h-7 left-[90%]" style={{ animationDuration: '16s', animationDelay: '7s' }}></div>

      {/* 3. --- DEKORASI BACKGROUND BLOBS LAMA --- */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-rose-100/60 to-transparent pointer-events-none z-0" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-red-200/40 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute top-60 -left-40 w-[400px] h-[400px] bg-pink-200/40 rounded-full blur-3xl pointer-events-none z-0" />

      {/* INI KONTEN UTAMANYA */}
      <main className="relative z-10 max-w-6xl mx-auto p-6 lg:p-8 space-y-8">
        
        {/* HEADER SECTION (Tetap Sama) */}
        <header className="flex flex-wrap gap-4 justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-700 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-red-500/30">
              {me.bloodType}{me.rhesusType === "POSITIVE" ? "+" : "-"}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Halo, {me.user.name} 👋
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-1">
                📍 {me.user.city} <span className="mx-2">•</span> Total donasi: <strong className="text-rose-600">{(me as any).totalDonations ?? 0}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/dashboard/donor/profile">
              <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
            </Link>
            <Button variant="ghost" size="sm" icon={<Icons.Logout />} onClick={() => { clearToken(); location.href = "/"; }}>Keluar</Button>
          </div>
        </header>

        {/* SKRINING BANNER */}
        <section className="relative overflow-hidden rounded-3xl shadow-sm">
          <div className={`absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]`}></div>
          
          {/* Pewarnaan Background Berdasarkan State */}
          <div className={`relative p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all ${
            readyToSchedule
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              : isWaiting
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              : "bg-gradient-to-r from-slate-800 to-slate-900 text-white"
          }`}>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Badge Step 1 */}
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  hasScreening ? "bg-white/20" : "bg-rose-500/20 text-rose-300"
                }`}>
                  STEP 1: SKRINING KESEHATAN
                </span>
              </div>
              
              {/* Judul Banner Berdasarkan State */}
              <h2 className="text-2xl font-bold mb-2">
                {readyToSchedule ? "Lolos Skrining — Siap Daftar Jadwal! 🎉"
                  : cooldownActive ? "Masa Tunggu Pasca-Donor ⏳"
                  : screeningFailed ? "Skrining Belum Lolos ⏳"
                  : "Kuesioner Skrining Belum Lengkap"}
              </h2>

              {/* Deskripsi Banner */}
              <p className="text-sm opacity-90 max-w-xl">
                {readyToSchedule
                  ? "Anda telah lolos skrining awal. Silakan pilih PMI terdekat di bawah untuk mendaftar jadwal. Cek fisik final (HB, tensi, dll) tetap dilakukan PMI di hari donor."
                  : cooldownActive
                  ? (me.eligibilityReason || `Anda baru saja mendonorkan darah. Demi keselamatan, Anda dapat donor kembali${cooldownUntilStr ? ` mulai ${cooldownUntilStr}` : " setelah masa tunggu selesai"}.`)
                  : screeningFailed
                  ? (me.eligibilityReason || "Berdasarkan hasil skrining, Anda perlu menunggu sebelum bisa mendonorkan darah. Silakan isi skrining ulang setelah kondisi Anda membaik.")
                  : "Sebelum mendaftar jadwal donor, Anda diwajibkan untuk mengisi 8 pertanyaan kesehatan standar PMI untuk memastikan kelayakan awal."}
              </p>
            </div>
            
            {/* Tombol Aksi */}
            <div className="shrink-0">
              <Link href="/dashboard/donor/screening">
                <Button size="lg" variant={hasScreening ? "secondary" : "primary"} className="shadow-xl">
                  {hasScreening ? "Lihat Hasil Skrining" : "Isi Kuesioner Sekarang"}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* STATUS KUNJUNGAN TERAKHIR — feedback hasil cek fisik PMI ke donor */}
        {lastVisitRecent && (
          <section className={`rounded-3xl p-6 border-2 flex items-start gap-4 ${
            lastVisit.status === "COMPLETED"
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="text-3xl shrink-0">{lastVisit.status === "COMPLETED" ? "✅" : "⚠️"}</div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${lastVisit.status === "COMPLETED" ? "text-emerald-800" : "text-amber-800"}`}>
                {lastVisit.status === "COMPLETED" ? "Donor Berhasil — Terima Kasih! 🩸" : "Cek Fisik Belum Lolos"}
              </h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {lastVisit.status === "COMPLETED" ? (
                  <>
                    Kunjungan <strong>{new Date(lastVisit.jadwal).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong> di{" "}
                    <strong>{lastVisit.pmi?.pmiName}</strong> berhasil. Detailnya tercatat di Riwayat Donor di bawah.
                    {cooldownUntilStr ? <> Anda boleh donor lagi mulai <strong>{cooldownUntilStr}</strong>.</> : null}
                  </>
                ) : (
                  <>
                    Pada kunjungan <strong>{new Date(lastVisit.jadwal).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong> di{" "}
                    <strong>{lastVisit.pmi?.pmiName}</strong>, kondisi Anda belum memenuhi syarat cek fisik. Jaga kondisi & istirahat
                    cukup, lalu isi skrining ulang untuk mendaftar kembali.
                  </>
                )}
              </p>
            </div>
          </section>
        )}

      {/* CONDITIONAL RENDERING: PENGINGAT JADWAL ATAU LIST PMI */}
      {activeSchedule ? (
        
        /* PANEL PENGINGAT JADWAL AKTIF */
        <section className="bg-white rounded-3xl p-8 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                {activeSchedule.status === "CONFIRMED" ? (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                    ✓ Dikonfirmasi PMI
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    ⏳ Menunggu Konfirmasi PMI
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-2">Siap Donor Darah! 🩸</h3>
              <p className="text-slate-500 mb-8 max-w-md">
                {activeSchedule.status === "CONFIRMED"
                  ? "PMI sudah mengonfirmasi jadwalmu. Pastikan istirahat cukup, banyak minum air putih, dan bawa KTP saat datang ke lokasi ya."
                  : "Jadwalmu sedang menunggu konfirmasi PMI. Sambil menunggu, jaga kondisi: istirahat cukup, banyak minum air putih, dan siapkan KTP-mu ya."}
              </p>

              <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">📅</div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Hari & Tanggal</p>
                    <p className="font-bold text-slate-900 text-lg">
                      {new Date(activeSchedule.jadwal).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-600">Sesi: <strong className="text-rose-600">{activeSchedule.sesi}</strong></p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">🏥</div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Lokasi PMI</p>
                    <p className="font-bold text-slate-900 text-lg">{activeSchedule.pmi?.pmiName}</p>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-sm">{activeSchedule.pmi?.pmiLoc}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="secondary" className="text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => cancelSchedule(activeSchedule.id)}>
                  Batalkan Jadwal
                </Button>
                <Button variant="primary" onClick={async () => {
                  // Ganti lokasi: batalkan jadwal dulu, lalu daftar PMI muncul lagi
                  if (await confirmDialog({ title: "Ganti Lokasi / Reschedule", message: "Jadwal saat ini akan dibatalkan dulu agar Anda bisa memilih lokasi/jadwal baru. Lanjutkan?", confirmText: "Ya, Lanjutkan" })) {
                    cancelSchedule(activeSchedule.id);
                  }
                }}>
                  Ganti Lokasi / Reschedule
                </Button>
              </div>
            </div>

            {/* Dummy Map Terintegrasi Panel */}
            <div className="w-full lg:w-1/2 h-64 lg:h-auto min-h-[300px] bg-slate-200 rounded-2xl relative overflow-hidden border border-slate-200">
              <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
                <div className="text-5xl mb-3 drop-shadow-md">🗺️</div>
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-sm">
                  <p className="font-bold text-slate-800 text-sm">{activeSchedule.pmi?.pmiName}</p>
                  <p className="text-xs text-slate-500">Integrasi Peta Menyusul (AOL)</p>
                </div>
              </div>
              {/* Pin Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-8 text-rose-500 drop-shadow-lg text-2xl">
                <Icons.Drop />
              </div>
            </div>
          </div>
        </section>

      ) : (

        /* PANEL DISCOVERY PMI (Muncul kalau nggak ada jadwal aktif) */
        <section>
          <div className="mb-4">
            <h3 className="text-xl font-bold text-slate-800">🏥 Cari Lokasi PMI Terdekat</h3>
            <p className="text-sm text-slate-500">Daftar PMI yang tersedia untuk donor darah, diurutkan dari lokasimu.</p>
          </div>

          {sortedPmis.length === 0 ? (
            <EmptyState
              icon="📍"
              title="Belum ada PMI terdekat tersedia"
              description={`Saat ini belum ada PMI terverifikasi di wilayah Anda${authMe?.city ? ` (${authMe.city}${authMe?.province ? `, ${authMe.province}` : ""})` : ""}. Silakan cek kembali nanti — PMI baru akan muncul setelah diverifikasi.`}
            />
          ) : (
          <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
            {sortedPmis.map((p) => {
              const isClosest = p._score === 3;
              // Label region (bukan jarak palsu) — tanpa integrasi geolokasi nyata.
              const regionLabel =
                p._score === 3 ? "📍 Dalam kota Anda" :
                p._score === 2 ? "📍 Satu wilayah" :
                p._score === 1 ? "📍 Satu provinsi" : "📍 Luar provinsi";

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all flex flex-col overflow-hidden group">
                  
                  {/* Bagian Atas: Gambar Cover & Badges */}
                  <div className="h-32 relative bg-slate-200 overflow-hidden">
                    {/* Dummy Image dari Unsplash */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700" 
                      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=500&auto=format&fit=crop')" }}
                    ></div>
                    {/* Gradient overlay supaya teks putih tetap terbaca */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                    
                    {/* Badge Status & Jarak */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                      {isClosest ? (
                        <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm border border-blue-400/50">
                          📍 Paling Dekat
                        </span>
                      ) : <div></div>}
                      <span className="bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                        {regionLabel}
                      </span>
                    </div>

                    <h4 className="absolute bottom-3 left-4 right-4 font-bold text-white truncate drop-shadow-md text-lg">
                      {p.pmiName}
                    </h4>
                  </div>
                  
                  {/* Bagian Bawah: Info Lokasi & Tombol */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-xs text-slate-500 mb-5 line-clamp-2 leading-relaxed">{p.pmiLoc}</p>
                    
                    <div className="mt-auto flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1 text-xs bg-slate-50 border-slate-200 hover:bg-slate-100" onClick={() => setSelectedPmiInfo(p)}>
                        Info Detail
                      </Button>
                      <Button variant="primary" size="sm" className="flex-1 text-xs shadow-md shadow-rose-500/20" onClick={() => {
                        if (scheduleBlockReason) {
                          toast.error(scheduleBlockReason);
                          return;
                        }
                        setScheduleForm({ ...scheduleForm, pmiId: p.id, pmiName: p.pmiName });
                        setShowScheduleModal(true);
                      }}>
                        Daftar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </section>
      )}

      {/* BROADCAST / PERMINTAAN PANEL */}
      {nearbyBroadcasts.length > 0 && !activeSchedule && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-bold text-slate-800">🚨 Panggilan Darurat PMI</h3>
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-full">{nearbyBroadcasts.length} Permintaan</span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {nearbyBroadcasts.map((b) => {
              const golongan = `${b.bloodType}${b.rhesusType === "POSITIVE" ? "+" : "-"}`;
              return (
                <div key={b.id} className="bg-white p-5 rounded-2xl border-2 border-rose-100 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                      {golongan}
                    </div>
                    <Badge status="URGENT" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg">{b.pmi?.pmiName}</h4>
                  <p className="text-sm text-slate-500 mb-4">Butuh {b.targetQuantity} kantong • 📍 {b.pmi?.pmiLoc}</p>
                  
                  {b.message && (
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 italic border-l-4 border-rose-400 mb-4">
                      "{b.message}"
                    </div>
                  )}

                  <Button size="sm" className="w-full" onClick={() => {
                    if (scheduleBlockReason) {
                      toast.error(scheduleBlockReason);
                      return;
                    }
                    setScheduleForm({ ...scheduleForm, pmiId: b.pmi.id, pmiName: b.pmi.pmiName });
                    setShowScheduleModal(true);
                  }}>
                    Daftar di PMI Ini
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* RIWAYAT (Tetap Sama) */}
      <section>
        <Card title="Riwayat Donor" icon={<Icons.Calendar />}>
          {history.length === 0 ? (
            <EmptyState icon="📋" title="Belum ada riwayat donor" description="Riwayat akan otomatis terisi setelah Anda menyelesaikan donor pertama." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-2">Tanggal</th><th>Lokasi</th><th>Komponen</th><th>Jumlah Kantong</th><th>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5">{new Date(h.donationDate).toLocaleDateString("id-ID", { dateStyle: "medium" })}</td>
                      <td>{h.location}</td>
                      <td>{h.component}</td>
                      <td className="font-medium">{h.bagCount ?? 1} kantong</td>
                      <td className="font-medium">{h.volumeMl} mL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* MODAL: INFO PMI & MAP DUMMY (Tetap Sama) */}
      {/* ... (bagian ini sama persis kayak kode sebelumnya) ... */}
      {selectedPmiInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            {/* Dummy Map Area */}
            <div className="h-56 bg-slate-200 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>
              <div className="text-center z-10">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-slate-600 font-semibold">Integrasi Peta Menyusul</p>
                <p className="text-xs text-slate-500">Kordinat: {selectedPmiInfo.user?.city}</p>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-4 text-rose-500 drop-shadow-md">
                <Icons.Drop />
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{selectedPmiInfo.pmiName}</h3>
              <p className="text-sm text-slate-500 mb-6">{selectedPmiInfo.pmiLoc}</p>
              
              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Kota</span>
                  <span className="font-semibold">{selectedPmiInfo.user?.city}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Provinsi</span>
                  <span className="font-semibold">{selectedPmiInfo.user?.province || "-"}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-emerald-600">Terverifikasi Nasional</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setSelectedPmiInfo(null)}>Tutup</Button>
                <Button variant="primary" className="flex-1" onClick={() => {
                  if (scheduleBlockReason) {
                    toast.error(scheduleBlockReason);
                    return;
                  }
                  setSelectedPmiInfo(null);
                  setScheduleForm({ ...scheduleForm, pmiId: selectedPmiInfo.id, pmiName: selectedPmiInfo.pmiName });
                  setShowScheduleModal(true);
                }}>Daftar Jadwal</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DAFTAR JADWAL (Tetap Sama) */}
      {/* ... (bagian ini juga sama persis kayak kode sebelumnya) ... */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Pilih Jadwal Donor</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-rose-500">
                <Icons.X />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Anda akan mendaftar donasi di <strong className="text-slate-800">{scheduleForm.pmiName}</strong>. Pastikan kondisi badan fit saat hari H.
            </p>

            <form onSubmit={submitSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kedatangan</label>
                <input
                  type="date"
                  value={scheduleForm.jadwal}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, jadwal: e.target.value })}
                  required
                  className="w-full border-2 border-slate-200 px-4 py-2.5 rounded-xl bg-slate-50 focus:bg-white focus:border-rose-500 outline-none text-sm transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Sesi Waktu</label>
                <select
                  value={scheduleForm.sesi}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, sesi: e.target.value })}
                  className="w-full border-2 border-slate-200 px-4 py-2.5 rounded-xl bg-slate-50 focus:bg-white focus:border-rose-500 outline-none text-sm transition-colors"
                >
                  <option value="PAGI">🌅 Pagi (08:00 - 11:00)</option>
                  <option value="SIANG">☀️ Siang (11:00 - 14:00)</option>
                  <option value="SORE">🌇 Sore (14:00 - 17:00)</option>
                </select>
              </div>
              
              <div className="pt-4">
                <Button type="submit" loading={submitting} className="w-full" size="lg">
                  Konfirmasi Pendaftaran
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
    </div>
  );
}