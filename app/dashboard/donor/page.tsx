"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { ModeSwitcher } from "../../lib/ModeSwitcher";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: PENDONOR (medical workflow)
 *
 * Flow lengkap untuk donor darah:
 *   1. Isi kuesioner skrining (di halaman /dashboard/donor/screening)
 *   2. Lakukan pemeriksaan fisik di RS (diinput nakes/RS)
 *   3. Cek kelayakan (sistem evaluasi semua kriteria medis)
 *   4. Kalau eligible → daftar jadwal donor
 *   5. Pantau notifikasi MatchSystem (permintaan darah dari pasien)
 */

type Me = {
  id: string; bloodType: string; rhesusType: string;
  isEligible: boolean; eligibilityReason?: string;
  user: { name: string; email: string; city: string; birthDate?: string };
  checkups: any[]; screenings: any[];
};
type Notif = {
  id: string; requestId: string;
  request: { id: string; bloodType: string; rhesusType: string; quantity: number; urgency: string; component: string };
};

export default function DonorDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [authMe, setAuthMe] = useState<any>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [pmiList, setPmiList] = useState<any[]>([]);
  const [mySchedules, setMySchedules] = useState<any[]>([]);
  const [scheduleForm, setScheduleForm] = useState({ pmiId: "", jadwal: "", sesi: "PAGI" });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const [meRes, authRes, notifRes, histRes, openRes, pmiRes, schedulesRes] = await Promise.all([
      api("/donor/me").then((r) => r.json()).catch(() => null),
      api("/auth/me").then((r) => r.json()).catch(() => null),
      api("/donor/notifications").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/history").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/open-requests").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/pmi/list").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/schedules").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setMe(meRes);
    setAuthMe(authRes);
    setNotifs(notifRes.data ?? []);
    setHistory(histRes.data ?? []);
    setOpenRequests(openRes.data ?? []);
    setPmiList(pmiRes.data ?? []);
    setMySchedules(schedulesRes.data ?? []);
  }

  // Sort PMI by proximity ke user (city > zone > province > nasional)
  const sortedPmis = useMemo(() => {
    if (!authMe) return pmiList;
    return [...pmiList].sort((a, b) => {
      const score = (p: any) =>
        p.user?.city === authMe.city ? 3 :
        p.user?.zone === authMe.zone ? 2 :
        p.user?.province === authMe.province ? 1 : 0;
      return score(b) - score(a);
    });
  }, [pmiList, authMe]);

  async function submitSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleForm.pmiId) { toast.error("Pilih PMI dulu"); return; }
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
      setShowScheduleForm(false);
      setScheduleForm({ pmiId: "", jadwal: "", sesi: "PAGI" });
      refresh();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal daftar jadwal");
    }
  }

  async function volunteer(requestId: string) {
    if (!confirm("Anda yakin bersedia mendonor untuk request ini?")) return;
    const res = await api(`/donor/volunteer/${requestId}`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { toast.success(data.message); refresh(); }
    else toast.error(data.error ?? "Gagal volunteer");
  }

  async function handleRespond(reqId: string, accepted: boolean) {
    await api(`/donor/notifications/${reqId}/respond`, {
      method: "POST", body: JSON.stringify({ accepted }),
    });
    refresh();
  }

  if (!me) return <main className="p-8">Memuat...</main>;

  const lastCheckup = me.checkups[0];
  const lastScreening = me.screenings[0];

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md shadow-red-600/20">
            {me.bloodType}{me.rhesusType === "POSITIVE" ? "+" : "-"}
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-700 to-red-500 bg-clip-text text-transparent">
              Halo, {me.user.name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              📍 {me.user.city} · Total donasi: <strong>{(me as any).totalDonations ?? 0}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ModeSwitcher currentRole="PENDONOR" />
          <NotificationBell />
          <Link href="/dashboard/profile">
            <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<Icons.Logout />}
            onClick={() => { clearToken(); location.href = "/"; }}>Keluar</Button>
        </div>
      </header>

      {/* Status Banner */}
      <div className={`relative p-5 rounded-2xl border-2 overflow-hidden ${
        me.isEligible
          ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200"
          : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
      }`}>
        <div className="absolute -right-4 -top-4 text-7xl opacity-10">
          {me.isEligible ? "✅" : "⚠️"}
        </div>
        <div className="relative">
          <p className={`font-bold text-lg ${me.isEligible ? "text-emerald-800" : "text-amber-800"}`}>
            {me.isEligible ? "✅ Anda LAYAK Donor Darah" : "⚠️ Belum Layak Donor"}
          </p>
          {me.eligibilityReason && (
            <p className="text-sm mt-1 text-slate-700">{me.eligibilityReason}</p>
          )}
        </div>
      </div>

      {/* Step-by-step workflow */}
      <section className="grid md:grid-cols-3 gap-4">
        <StepCard
          step={1} title="Kuesioner Skrining"
          status={lastScreening ? (lastScreening.passed ? "done" : "warning") : "todo"}
          desc={lastScreening
            ? `Diisi ${new Date(lastScreening.answeredAt).toLocaleString("id-ID")} ${lastScreening.passed ? "(Lolos)" : "(Belum lolos)"}`
            : "Isi kuesioner kesehatan dulu"}
          href="/dashboard/donor/screening"
        />
        <StepCard
          step={2} title="Pemeriksaan Fisik di PMI"
          status={lastCheckup ? (lastCheckup.passed ? "done" : "warning") : "todo"}
          desc={lastCheckup
            ? `Hb: ${lastCheckup.hemoglobinLevel}, BP: ${lastCheckup.systolicBP}/${lastCheckup.diastolicBP}, BB: ${lastCheckup.weight}kg`
            : "Datang ke PMI saat jadwal donor — petugas yang akan input"}
        />
        <StepCard
          step={3} title="Daftar Jadwal Donor di PMI"
          status={mySchedules.length > 0 ? "done" : "todo"}
          desc={
            mySchedules.length > 0
              ? `Anda punya ${mySchedules.length} jadwal terdaftar`
              : "Pilih PMI & tanggal. PMI akan cek fisik saat hari H."
          }
          action={
            <Button size="sm" variant={showScheduleForm ? "ghost" : "primary"}
              onClick={() => setShowScheduleForm(!showScheduleForm)} icon={<Icons.Plus />}>
              {showScheduleForm ? "Tutup" : "Daftar Jadwal"}
            </Button>
          }
        />
      </section>

      {/* Form Daftar Jadwal */}
      {showScheduleForm && (
        <Card title="📅 Daftar Jadwal Donor di PMI"
          subtitle="Pilih PMI tempat Anda akan donor — bisa beda tiap kali"
          icon={<Icons.Calendar />} variant="highlight">
          <form onSubmit={submitSchedule} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih PMI</label>
              <select
                value={scheduleForm.pmiId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, pmiId: e.target.value })}
                required
                className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
              >
                <option value="">— Pilih PMI tempat donor —</option>
                {sortedPmis.map((p, idx) => {
                  const proximity =
                    p.user?.city === authMe?.city ? "📍 Kota sama" :
                    p.user?.zone === authMe?.zone ? "🗺️ Zona sama" :
                    p.user?.province === authMe?.province ? "🌏 Provinsi sama" :
                    "🌐 Nasional";
                  return (
                    <option key={p.id} value={p.id}>
                      {idx === 0 ? "⭐ " : ""}{p.pmiName} ({p.pmiLoc}) — {proximity}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                💡 Diurutkan berdasarkan jarak terdekat. Anda tetap bisa pilih PMI di kota lain.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Jadwal</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.jadwal}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, jadwal: e.target.value })}
                  required
                  className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sesi</label>
                <select
                  value={scheduleForm.sesi}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, sesi: e.target.value })}
                  className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm"
                >
                  <option value="PAGI">🌅 Pagi (08–11)</option>
                  <option value="SIANG">☀️ Siang (11–14)</option>
                  <option value="SORE">🌇 Sore (14–17)</option>
                </select>
              </div>
            </div>
            <Button type="submit" loading={submitting} size="lg" icon={<Icons.Heart />}>
              Kirim Pendaftaran
            </Button>
          </form>
        </Card>
      )}

      {/* List Jadwal Donor Saya */}
      {mySchedules.length > 0 && (
        <Card title={`Jadwal Donor Saya (${mySchedules.length})`}
          subtitle="Status jadwal donor Anda di setiap PMI"
          icon={<Icons.Calendar />}>
          <div className="space-y-2">
            {mySchedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">
                    🏛️ {s.pmi?.pmiName ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    📅 {new Date(s.jadwal).toLocaleDateString("id-ID", { dateStyle: "medium" })} · Sesi {s.sesi}
                  </p>
                  {s.isEligible === true && (
                    <p className="text-xs text-emerald-700 mt-1">✓ Layak donor (sudah cek fisik di PMI)</p>
                  )}
                  {s.isEligible === false && (
                    <p className="text-xs text-red-700 mt-1">✗ Tidak layak — {s.eligibilityReason}</p>
                  )}
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        </Card>
      )}


      {/* Notifikasi MatchSystem */}
      <Card title={`Permintaan untuk Anda (${notifs.length})`}
        subtitle="MatchSystem secara khusus memanggil Anda berdasarkan kecocokan & lokasi"
        icon={<span>📩</span>}>
        {notifs.length === 0 ? (
          <EmptyState icon="📭"
            title="Belum ada permintaan personal"
            description="Cek 'Permintaan Tersedia' di bawah untuk volunteer secara proaktif." />
        ) : (
          <div className="space-y-2">
            {notifs.map((n) => (
              <div key={n.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-red-300 hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
                    {n.request.bloodType}{n.request.rhesusType === "POSITIVE" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-semibold">{n.request.quantity} kantong · {n.request.component}</p>
                    <Badge status={n.request.urgency} className="mt-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Icons.Check />}
                    onClick={() => handleRespond(n.requestId, true)}>Bersedia</Button>
                  <Button variant="secondary" size="sm" icon={<Icons.X />}
                    onClick={() => handleRespond(n.requestId, false)}>Tolak</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Browse Open Requests — Proaktif */}
      <Card title={`Permintaan Tersedia (${openRequests.length})`}
        subtitle="Semua permintaan kompatibel dengan golongan darah Anda — volunteer proaktif"
        icon={<Icons.Drop />}>
        {openRequests.length === 0 ? (
          <EmptyState icon="🎉"
            title="Tidak ada permintaan aktif"
            description="Semua kebutuhan darah sudah terpenuhi dari stok rumah sakit." />
        ) : (
          <div className="space-y-2">
            {openRequests.map((r) => (
              <div key={r.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-red-300 hover:shadow-sm transition">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
                    {r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{r.quantity} kantong · {r.component}</p>
                      <Badge status={r.urgency} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      📍 {r.proximity} · {r.patient?.user?.city ?? r.acceptedByPmi?.pmiName ?? "-"}
                    </p>
                    {r.reason && <p className="text-xs text-slate-600 mt-1 italic">"{r.reason}"</p>}
                  </div>
                </div>
                {me.isEligible ? (
                  <Button size="sm" icon={<Icons.Heart />} onClick={() => volunteer(r.id)}>Bersedia</Button>
                ) : (
                  <span className="text-xs text-slate-400 italic">Eligible dulu</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Riwayat */}
      <Card title="Riwayat Donor" icon={<Icons.Calendar />}>
        {history.length === 0 ? (
          <EmptyState icon="📋"
            title="Belum ada riwayat donor"
            description="Riwayat akan otomatis terisi setelah Anda menyelesaikan donor pertama." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2">Tanggal</th><th>Lokasi</th><th>Komponen</th><th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-2.5">{new Date(h.donationDate).toLocaleDateString("id-ID", { dateStyle: "medium" })}</td>
                    <td>{h.location}</td>
                    <td>{h.component}</td>
                    <td className="font-medium">{h.volumeMl} mL</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}

function StepCard({ step, title, status, desc, href, action }: {
  step: number; title: string; status: "done" | "todo" | "warning";
  desc: string; href?: string; action?: React.ReactNode;
}) {
  const statusConfig = {
    done: { icon: "✅", bg: "bg-emerald-50", border: "border-emerald-300", iconBg: "bg-emerald-500", label: "Selesai" },
    warning: { icon: "⚠️", bg: "bg-amber-50", border: "border-amber-300", iconBg: "bg-amber-500", label: "Perlu Action" },
    todo: { icon: "⭕", bg: "bg-white", border: "border-slate-200", iconBg: "bg-slate-300", label: "Belum" },
  };
  const cfg = statusConfig[status];

  const card = (
    <div className={`${cfg.bg} ${cfg.border} border-2 p-5 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden group h-full`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`${cfg.iconBg} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
          STEP {step}
        </span>
        <span className="text-2xl">{cfg.icon}</span>
      </div>
      <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
      {action && <div className="mt-3">{action}</div>}
      {href && (
        <div className="absolute bottom-3 right-3 text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition">
          →
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
