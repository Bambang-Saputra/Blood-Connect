"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { ModeSwitcher } from "../../lib/ModeSwitcher";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: PENDONOR (Restructured)
 *
 * Sections (top to bottom):
 *   1. Permintaan untuk Anda (broadcast dari PMI)
 *   2. Status Skrining (Step 1)
 *   3. Riwayat Donor (Step 2, view only)
 *
 * NO MORE:
 *   - Permintaan Tersedia (browse open requests) — tidak logis
 *   - Step 3 Cek Kelayakan — pindah ke PMI
 */

type Me = {
  id: string; bloodType: string; rhesusType: string;
  isEligible: boolean; eligibilityReason?: string;
  totalDonations: number;
  user: { name: string; city: string };
  preferredPmi?: { pmiName: string; pmiLoc: string };
  checkups: any[]; screenings: any[];
};

type Notif = {
  id: string; requestId: string;
  request: {
    id: string; bloodType: string; rhesusType: string;
    quantity: number; component: string;
    pmi?: { id: string; pmiName: string; pmiLoc: string };
  };
};

export default function DonorDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [screeningInfo, setScreeningInfo] = useState<any>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState<string | null>(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const [meRes, scRes, notifRes, histRes, schedRes] = await Promise.all([
      api("/donor/me").then((r) => r.json()).catch(() => null),
      api("/donor/screening/latest").then((r) => r.json()).catch(() => null),
      api("/donor/notifications").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/history").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/schedules").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setMe(meRes);
    setScreeningInfo(scRes);
    setNotifs(notifRes.data ?? []);
    setHistory(histRes.data ?? []);
    setSchedules(schedRes.data ?? []);
  }

  async function handleAcceptRequest(notif: Notif) {
    const res = await api(`/donor/notifications/${notif.requestId}/respond`, {
      method: "POST", body: JSON.stringify({ accepted: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Gagal accept");
      return;
    }
    if (data.requireSchedule) {
      // Buka form jadwal
      setShowScheduleForm(notif.request.pmi?.id ?? null);
      toast.success("Terima kasih! Silakan pilih jadwal donor.");
    } else {
      toast.success("Respons tercatat");
    }
    refresh();
  }

  async function handleReject(notif: Notif) {
    const res = await api(`/donor/notifications/${notif.requestId}/respond`, {
      method: "POST", body: JSON.stringify({ accepted: false }),
    });
    if (res.ok) toast.success("Respons tercatat");
    refresh();
  }

  if (!me) return <main className="p-8">Memuat...</main>;

  const lastScreening = me.screenings[0];
  const screeningStatus: "PASSED" | "FAILED" | "NONE" =
    !lastScreening ? "NONE" :
    lastScreening.passed && screeningInfo?.stillValid ? "PASSED" :
    "FAILED";

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-md">
            {me.bloodType}{me.rhesusType === "POSITIVE" ? "+" : "-"}
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-700 to-red-500 bg-clip-text text-transparent">
              Halo, {me.user.name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              📍 {me.user.city} · Total donasi: <strong>{me.totalDonations}</strong>
              {me.preferredPmi && <> · 🩸 PMI: <strong>{me.preferredPmi.pmiName}</strong></>}
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

      {/* 1. Permintaan untuk Anda */}
      <Card title={`Permintaan untuk Anda (${notifs.length})`}
        subtitle="PMI broadcast permintaan darah berdasarkan kecocokan golongan"
        icon={<span>📩</span>} variant="highlight">
        {notifs.length === 0 ? (
          <EmptyState icon="📭"
            title="Tidak ada permintaan saat ini"
            description="PMI akan kirim notifikasi saat stok darah Anda dibutuhkan." />
        ) : (
          <div className="space-y-3">
            {notifs.map((n) => (
              <div key={n.id} className="bg-white border border-red-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
                      {n.request.bloodType}{n.request.rhesusType === "POSITIVE" ? "+" : "-"}
                    </div>
                    <div>
                      <p className="font-semibold">{n.request.quantity} kantong · {n.request.component}</p>
                      {n.request.pmi && (
                        <p className="text-xs text-slate-600 mt-1">
                          🩸 Dari: <strong>{n.request.pmi.pmiName}</strong> ({n.request.pmi.pmiLoc})
                        </p>
                      )}
                    </div>
                  </div>
                  {screeningStatus === "PASSED" ? (
                    <div className="flex gap-2">
                      <Button variant="success" size="sm" icon={<Icons.Check />}
                        onClick={() => handleAcceptRequest(n)}>Bersedia</Button>
                      <Button variant="secondary" size="sm" icon={<Icons.X />}
                        onClick={() => handleReject(n)}>Tolak</Button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic max-w-[140px] text-right">
                      Isi skrining dulu untuk bisa accept
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule form jika baru saja accept */}
        {showScheduleForm && (
          <ScheduleForm pmiId={showScheduleForm}
            onClose={() => { setShowScheduleForm(null); refresh(); }} />
        )}
      </Card>

      {/* 2. Step 1 Skrining */}
      <Card title="Step 1: Skrining Kesehatan" icon={<Icons.Heart />}>
        <ScreeningStatus info={screeningInfo} status={screeningStatus} />
      </Card>

      {/* 3. Jadwal Donor Saya */}
      {schedules.length > 0 && (
        <Card title={`Jadwal Donor Saya (${schedules.length})`} icon={<Icons.Calendar />}>
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="border p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">
                    {new Date(s.jadwal).toLocaleDateString("id-ID", { dateStyle: "full" })} · Sesi {s.sesi}
                  </p>
                  <p className="text-xs text-slate-600">📍 {s.pmi?.pmiName} — {s.pmi?.pmiLoc}</p>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Riwayat Donor */}
      <Card title={`Riwayat Donor (${history.length})`} icon={<Icons.Calendar />}>
        {history.length === 0 ? (
          <EmptyState icon="📋"
            title="Belum ada riwayat donor"
            description="Riwayat terisi otomatis setelah donor pertama di PMI." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b">
                  <th className="py-2">Tanggal</th><th>Lokasi</th><th>Komponen</th><th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h: any) => (
                  <tr key={h.id} className="border-b hover:bg-slate-50">
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

// ============ Komponen Status Skrining ============
function ScreeningStatus({ info, status }: { info: any; status: "PASSED" | "FAILED" | "NONE" }) {
  if (status === "NONE") {
    return (
      <div className="text-center py-6">
        <p className="text-4xl mb-2">📋</p>
        <p className="font-semibold text-slate-700">Belum mengisi skrining</p>
        <p className="text-xs text-slate-500 mt-1 mb-4">Isi kuesioner kesehatan untuk bisa donor.</p>
        <Link href="/dashboard/donor/screening">
          <Button size="sm" icon={<Icons.Plus />}>Mulai Skrining</Button>
        </Link>
      </div>
    );
  }

  if (status === "PASSED") {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 p-4 rounded-xl">
        <p className="font-bold text-emerald-800">✅ Anda LOLOS Skrining</p>
        <p className="text-xs text-slate-600 mt-1">
          Skrining berlaku 24 jam (sampai {new Date(new Date(info.answeredAt).getTime() + 24 * 60 * 60 * 1000).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })})
        </p>
        <p className="text-xs text-slate-600 mt-2">
          Anda dapat menerima permintaan donor di section atas, atau buat jadwal donor langsung ke PMI.
        </p>
      </div>
    );
  }

  // FAILED
  const expired = info && !info.stillValid;
  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 p-4 rounded-xl">
      <p className="font-bold text-amber-800">
        {expired ? "⏰ Skrining Kadaluarsa" : "⚠️ Belum Lolos Skrining"}
      </p>
      <p className="text-xs text-slate-600 mt-1">
        {expired
          ? "Skrining sudah lewat 24 jam. Silakan isi ulang."
          : "Anda memiliki flag medis yang perlu menunggu sebelum bisa donor:"}
      </p>

      {!expired && info?.waitingReasons?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {info.waitingReasons.map((r: any, i: number) => (
            <div key={i} className="bg-white border border-amber-200 rounded-lg p-2 text-xs">
              <p className="font-semibold text-amber-700">⚠️ {r.flag}</p>
              <p className="text-slate-600">
                {r.waitDays === -1
                  ? "Permanen tidak bisa donor (alasan medis)"
                  : `${r.reason} (~${r.waitDays} hari)`}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <Link href="/dashboard/donor/screening">
          <Button size="sm" variant="outline">
            {expired ? "Isi Ulang Skrining" : "Cek Lagi Nanti"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============ Form Pilih Jadwal Donor ============
function ScheduleForm({ pmiId, onClose }: { pmiId: string; onClose: () => void }) {
  const [jadwal, setJadwal] = useState("");
  const [sesi, setSesi] = useState<"PAGI" | "SIANG" | "SORE">("PAGI");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!jadwal) return;
    setSubmitting(true);
    const res = await api("/donor/schedules", {
      method: "POST",
      body: JSON.stringify({
        jadwal: new Date(jadwal).toISOString(),
        sesi, pmiId,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      toast.success("Jadwal donor dibuat. PMI akan menunggu Anda.");
      onClose();
    } else {
      toast.error(data.error ?? "Gagal buat jadwal");
    }
  }

  return (
    <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-xl">
      <p className="font-semibold text-blue-800 mb-3">📅 Pilih Jadwal Donor ke PMI</p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-slate-700">Tanggal</label>
          <input type="date" required value={jadwal}
            onChange={(e) => setJadwal(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full border px-2 py-1.5 rounded text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Sesi</label>
          <select value={sesi} onChange={(e) => setSesi(e.target.value as any)}
            className="w-full border px-2 py-1.5 rounded text-sm mt-1">
            <option value="PAGI">Pagi (08-11)</option>
            <option value="SIANG">Siang (11-14)</option>
            <option value="SORE">Sore (14-17)</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-2 mt-1">
          <Button type="submit" size="sm" loading={submitting}>Buat Jadwal</Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Batal</Button>
        </div>
      </form>
    </div>
  );
}
