"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

/**
 * DASHBOARD: PMI
 * Panel:
 *   - Stats + Chart ketersediaan stok per golongan
 *   - Permintaan Darah (broadcast PENDING + own claimed)
 *   - Jadwal Donor Terjadwal (scoped ke PMI ini)
 *     - tiap row punya screening expandable + form cek fisik + eligibility
 *   - Stok darah (detail + add)
 */

type Req = {
  id: string;
  bloodType: string; rhesusType: string;
  quantity: number; reqStatus: string; urgency: string;
  createdAt: string;
  targetHospitalName?: string;
  targetHospitalAddress?: string;
  patient?: { user?: { name: string; email: string; city: string } };
  acceptedByPmi?: { pmiName: string };
};

type Stock = {
  id: string;
  bloodType: string; rhesusType: string; component: string;
  quantity: number; expiryDate: string; location: string;
  status: string;
};

type Schedule = {
  id: string;
  jadwal: string;
  sesi: string;
  status: string;
  isEligible: boolean | null;
  eligibilityReason: string | null;
  donor: {
    bloodType: string;
    rhesusType: string;
    user: { name: string; email: string; phoneNum: string; city: string; birthDate?: string };
  };
  screening: null | {
    id: string;
    answeredAt: string;
    hasFever: boolean; recentSurgery: boolean; recentTattoo: boolean;
    isPregnantOrLactating: boolean; onMedication: boolean;
    hasHIVOrHepatitis: boolean; riskySexualBehavior: boolean;
    recentVaccination: boolean;
    passed: boolean; details?: string;
  };
  checkup: null | {
    id: string; examinedAt: string;
    hemoglobinLevel: number; systolicBP: number; diastolicBP: number;
    bodyTempC: number; pulseRate: number; weight: number;
    passed: boolean; notes?: string;
  };
};

export default function PmiDashboard() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [chartData, setChartData] = useState<{ label: string; total: number }[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const [r, s, sch, summary, bc] = await Promise.all([
      api("/requests").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/stocks/mine").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/pmi/schedules").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/stocks/summary").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/pmi/broadcasts").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setRequests(r.data ?? []);
    setStocks(s.data ?? []);
    setSchedules(sch.data ?? []);
    setChartData(summary.data ?? []);
    setBroadcasts(bc.data ?? []);
    setLoading(false);
  }

  async function closeBroadcast(id: string) {
    if (!confirm("Tutup broadcast ini? Donor tidak akan dapat respons lagi.")) return;
    const res = await api(`/pmi/broadcasts/${id}/close`, { method: "PATCH" });
    if (res.ok) { toast.success("Broadcast ditutup"); refresh(); }
    else toast.error("Gagal tutup broadcast");
  }

  async function acceptRequest(id: string) {
    if (!confirm("Accept request ini? PMI Anda yang akan memproses & mengantar darah ke RS tujuan.")) return;
    const res = await api(`/requests/${id}/accept`, { method: "POST" });
    if (res.ok) { toast.success("Request berhasil di-accept"); refresh(); }
    else toast.error((await res.json()).error ?? "Gagal accept request");
  }

  async function updateRequestStatus(id: string, newStatus: string) {
    if (!confirm(`Yakin ubah status ke ${newStatus}?`)) return;
    const res = await api(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus }),
    });
    if (res.ok) { toast.success(`Status diperbarui ke ${newStatus}`); refresh(); }
    else toast.error("Gagal update status");
  }

  const totalAvailable = stocks.filter((s) => s.status === "AVAILABLE").reduce((sum, s) => sum + s.quantity, 0);
  const activeRequestsCount = requests.filter((r) => !["FULFILLED", "REJECTED", "CANCELLED"].includes(r.reqStatus)).length;
  const pendingSchedules = schedules.filter((s) => s.status === "PENDING").length;
  const openBroadcasts = broadcasts.filter((b) => b.status === "OPEN").length;

  return (
    <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-rose-500 bg-clip-text text-transparent">
            Dashboard PMI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola stok darah, permintaan pasien, & jadwal donor</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="danger" size="sm" icon={<span>📢</span>}
            onClick={() => setShowBroadcastForm(!showBroadcastForm)}>
            {showBroadcastForm ? "Tutup" : "Broadcast Stok"}
          </Button>
          <Button variant="success" size="sm" icon={showAddStock ? <Icons.X /> : <Icons.Plus />}
            onClick={() => setShowAddStock(!showAddStock)}>
            {showAddStock ? "Tutup" : "Tambah Stok"}
          </Button>
          <NotificationBell />
          <Link href="/dashboard/profile">
            <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<Icons.Logout />}
            onClick={() => { clearToken(); location.href = "/"; }}>Keluar</Button>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon="🩸" label="Total Batch Stok" value={stocks.length} gradient="from-red-500 to-rose-600" />
        <StatCard icon="✅" label="Stok Available" value={totalAvailable} gradient="from-emerald-500 to-green-600" />
        <StatCard icon="📋" label="Permintaan Aktif" value={activeRequestsCount} gradient="from-blue-500 to-indigo-600" />
        <StatCard icon="📅" label="Jadwal Pending" value={pendingSchedules} gradient="from-purple-500 to-fuchsia-600" />
        <StatCard icon="📢" label="Broadcast Aktif" value={openBroadcasts} gradient="from-amber-500 to-orange-600" />
      </section>

      {/* Stock Chart */}
      <Card title="📊 Ketersediaan Stok per Golongan Darah"
        subtitle="Total kantong AVAILABLE di PMI Anda, belum expired"
        icon={<Icons.Drop />}>
        {chartData.length === 0 ? (
          <EmptyState icon="📉" title="Belum ada data" description="Tambah stok darah untuk melihat chart." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  formatter={(v) => [`${v} kantong`, "Stok"]}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => {
                    // Color tiering: 0 = abu, <5 = merah, <20 = oranye, else hijau
                    const color =
                      d.total === 0 ? "#cbd5e1" :
                      d.total < 5 ? "#ef4444" :
                      d.total < 20 ? "#f59e0b" :
                      "#10b981";
                    return <Cell key={i} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="text-[10px] text-slate-500 flex flex-wrap gap-3 mt-2 justify-center">
          <span>🔴 Kritis (&lt;5)</span>
          <span>🟠 Tipis (&lt;20)</span>
          <span>🟢 Cukup (≥20)</span>
          <span>⚪ Kosong (0)</span>
        </div>
      </Card>

      {/* Form Broadcast Permintaan Stok */}
      {showBroadcastForm && (
        <BroadcastForm onCreated={() => { setShowBroadcastForm(false); refresh(); }} onCancel={() => setShowBroadcastForm(false)} />
      )}

      {/* Form Tambah Stok */}
      {showAddStock && (
        <AddStockForm onCreated={() => { setShowAddStock(false); refresh(); }} onCancel={() => setShowAddStock(false)} />
      )}

      {/* Daftar Broadcast PMI */}
      {broadcasts.length > 0 && (
        <Card title={`📢 Broadcast Permintaan Stok (${broadcasts.length})`}
          subtitle="Broadcast yang Anda kirim ke donor satu kota"
          icon={<Icons.Heart />}>
          <div className="space-y-2">
            {broadcasts.map((b) => {
              const golongan = `${b.bloodType}${b.rhesusType === "POSITIVE" ? "+" : "-"}`;
              return (
                <div key={b.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
                      {golongan}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        Target {b.targetQuantity} kantong {golongan}
                      </p>
                      {b.message && <p className="text-xs text-slate-500 mt-0.5 italic">"{b.message}"</p>}
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Dibuat {new Date(b.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={b.status} />
                    {b.status === "OPEN" && (
                      <Button size="sm" variant="ghost" onClick={() => closeBroadcast(b.id)}>
                        Tutup
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Request Panel — broadcast + own claimed */}
      <Card title={`Permintaan Darah Pasien (${requests.length})`}
        subtitle="Broadcast nasional — PMI pertama yang accept akan memproses"
        icon={<Icons.Heart />}>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <EmptyState icon="📭" title="Belum ada permintaan" description="Permintaan dari pasien akan muncul di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2 pr-2">Tanggal</th>
                  <th className="px-2">Golongan</th>
                  <th className="px-2">Qty</th>
                  <th className="px-2">RS Tujuan Kirim</th>
                  <th className="px-2">Email Pasien</th>
                  <th className="px-2">Status</th>
                  <th className="px-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition align-top">
                    <td className="py-3 pr-2 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-2">
                      <span className="font-bold text-red-600">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}</span>
                    </td>
                    <td className="px-2 font-medium">{r.quantity}</td>
                    <td className="px-2">
                      <p className="font-semibold text-slate-900 text-xs">{r.targetHospitalName ?? "—"}</p>
                      {r.targetHospitalAddress && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{r.targetHospitalAddress}</p>
                      )}
                    </td>
                    <td className="px-2 text-xs text-slate-700">
                      {r.patient?.user?.email ?? "—"}
                      <p className="text-[10px] text-slate-400">{r.patient?.user?.city}</p>
                    </td>
                    <td className="px-2"><Badge status={r.reqStatus} /></td>
                    <td className="px-2 whitespace-nowrap">
                      {r.reqStatus === "PENDING" ? (
                        <Button size="sm" variant="success" icon={<Icons.Check />}
                          onClick={() => acceptRequest(r.id)}>Accept</Button>
                      ) : r.acceptedByPmi && !["FULFILLED", "REJECTED", "CANCELLED"].includes(r.reqStatus) ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="success" icon={<Icons.Check />}
                            onClick={() => updateRequestStatus(r.id, "FULFILLED")}>Fulfill</Button>
                          <Button size="sm" variant="secondary" icon={<Icons.X />}
                            onClick={() => updateRequestStatus(r.id, "REJECTED")}>Reject</Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Schedule Panel — scoped ke PMI ini */}
      <Card title={`Jadwal Donor di PMI Anda (${schedules.length})`}
        subtitle="Hanya menampilkan donor yang mendaftar ke PMI Anda (bukan broadcast)"
        icon={<Icons.Calendar />}>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
        ) : schedules.length === 0 ? (
          <EmptyState icon="📅" title="Belum ada jadwal" description="Pendonor yang mendaftar ke PMI Anda akan muncul di sini." />
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <ScheduleRow key={s.id} schedule={s} onChange={refresh} />
            ))}
          </div>
        )}
      </Card>

      {/* Stok Grid (detail) */}
      <Card title="Stok Darah PMI Anda" subtitle={`${stocks.length} batch · ${totalAvailable} kantong AVAILABLE`}
        icon={<Icons.Drop />}>
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900 font-medium py-2">
            📦 Lihat detail per batch ({stocks.length})
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <th className="py-2">Golongan</th><th>Komponen</th><th>Qty</th><th>Expiry</th><th>Lokasi</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-2">
                      <span className="font-bold text-red-600">{s.bloodType}{s.rhesusType === "POSITIVE" ? "+" : "-"}</span>
                    </td>
                    <td>{s.component}</td>
                    <td className="font-medium">{s.quantity}</td>
                    <td>{new Date(s.expiryDate).toLocaleDateString("id-ID")}</td>
                    <td>{s.location}</td>
                    <td><Badge status={s.status} /></td>
                  </tr>
                ))}
                {stocks.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center py-6 text-slate-400">Belum ada stok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </details>
      </Card>
    </main>
  );
}

// =====================================================================
// SCHEDULE ROW — expandable screening + checkup form + eligibility
// =====================================================================
function ScheduleRow({ schedule, onChange }: { schedule: Schedule; onChange: () => void }) {
  const [showScreening, setShowScreening] = useState(false);
  const [showCheckup, setShowCheckup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkupForm, setCheckupForm] = useState({
    hemoglobinLevel: "14",
    systolicBP: "120",
    diastolicBP: "80",
    bodyTempC: "36.7",
    pulseRate: "72",
    weight: "60",
    notes: "",
  });

  async function submitCheckup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const body = {
      hemoglobinLevel: parseFloat(checkupForm.hemoglobinLevel),
      systolicBP: parseInt(checkupForm.systolicBP, 10),
      diastolicBP: parseInt(checkupForm.diastolicBP, 10),
      bodyTempC: parseFloat(checkupForm.bodyTempC),
      pulseRate: parseInt(checkupForm.pulseRate, 10),
      weight: parseFloat(checkupForm.weight),
      notes: checkupForm.notes || undefined,
    };
    const res = await api(`/pmi/schedules/${schedule.id}/checkup`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      toast.success(data.message);
      setShowCheckup(false);
      onChange();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal simpan cek fisik");
    }
  }

  async function confirmSchedule(status: "CONFIRMED" | "REJECTED") {
    if (!confirm(`Yakin set status jadwal ke ${status}?`)) return;
    const res = await api(`/pmi/schedules/${schedule.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Jadwal di-${status.toLowerCase()}`); onChange(); }
    else toast.error("Gagal update jadwal");
  }

  const d = schedule.donor;
  const golongan = `${d.bloodType}${d.rhesusType === "POSITIVE" ? "+" : "-"}`;

  // Eligibility badge: null = belum dievaluasi, true = layak, false = tidak
  const eligBadge =
    schedule.isEligible === true ? (
      <span className="bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
        ✓ Layak Donor
      </span>
    ) : schedule.isEligible === false ? (
      <span className="bg-red-100 text-red-700 border border-red-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
        ✕ Tidak Layak
      </span>
    ) : (
      <span className="bg-slate-100 text-slate-600 border border-slate-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
        ⌛ Belum Dievaluasi
      </span>
    );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition">
      {/* Header row */}
      <div className="p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0">
            {golongan}
          </div>
          <div>
            <p className="font-bold text-slate-900">{d.user.name}</p>
            <p className="text-xs text-slate-500">{d.user.email} · {d.user.phoneNum}</p>
            <p className="text-xs text-slate-400 mt-1">
              📅 {new Date(schedule.jadwal).toLocaleDateString("id-ID", { dateStyle: "medium" })} · Sesi {schedule.sesi}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {eligBadge}
          <Badge status={schedule.status} />
        </div>
      </div>

      {/* Action bars */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowScreening(!showScreening)}
          className="text-xs font-semibold text-slate-700 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-white transition"
        >
          {showScreening ? "▼" : "▶"} Resume Skrining
          {schedule.screening?.passed === true && <span className="text-emerald-600">✓</span>}
          {schedule.screening?.passed === false && <span className="text-red-600">✗</span>}
        </button>

        {!schedule.checkup ? (
          <button
            type="button"
            onClick={() => setShowCheckup(!showCheckup)}
            className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-white transition"
          >
            {showCheckup ? "▼" : "▶"} + Input Cek Fisik
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowCheckup(!showCheckup)}
            className="text-xs font-semibold text-slate-700 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-white transition"
          >
            {showCheckup ? "▼" : "▶"} Hasil Cek Fisik
            {schedule.checkup.passed ? <span className="text-emerald-600">✓</span> : <span className="text-red-600">✗</span>}
          </button>
        )}

        {schedule.status === "PENDING" && schedule.isEligible === true && (
          <Button size="sm" variant="success" onClick={() => confirmSchedule("CONFIRMED")}>Confirm</Button>
        )}
        {schedule.status === "PENDING" && (
          <Button size="sm" variant="ghost" onClick={() => confirmSchedule("REJECTED")}>Reject</Button>
        )}
      </div>

      {/* Expandable: Screening */}
      {showScreening && (
        <div className="border-t border-slate-100 p-4 bg-amber-50/40">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">📋 Hasil Skrining Donor</p>
          {!schedule.screening ? (
            <p className="text-sm text-slate-500 italic">Donor belum mengisi kuesioner skrining.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <ScreenItem label="Demam 7 hari" value={schedule.screening.hasFever} />
                <ScreenItem label="Operasi <6 bln" value={schedule.screening.recentSurgery} />
                <ScreenItem label="Tato/tindik <6 bln" value={schedule.screening.recentTattoo} />
                <ScreenItem label="Hamil/menyusui" value={schedule.screening.isPregnantOrLactating} />
                <ScreenItem label="Konsumsi obat" value={schedule.screening.onMedication} />
                <ScreenItem label="HIV/Hepatitis" value={schedule.screening.hasHIVOrHepatitis} />
                <ScreenItem label="Perilaku berisiko" value={schedule.screening.riskySexualBehavior} />
                <ScreenItem label="Vaksin <2 minggu" value={schedule.screening.recentVaccination} />
              </div>
              {schedule.screening.details && (
                <p className="text-xs text-slate-600 mt-2 italic">Catatan: {schedule.screening.details}</p>
              )}
              <p className="text-xs mt-2">
                Hasil: {schedule.screening.passed ? (
                  <strong className="text-emerald-700">✓ Lolos Skrining</strong>
                ) : (
                  <strong className="text-red-700">✗ Tidak Lolos Skrining</strong>
                )}
                <span className="text-slate-400 ml-2">
                  · {new Date(schedule.screening.answeredAt).toLocaleString("id-ID")}
                </span>
              </p>
            </>
          )}
        </div>
      )}

      {/* Expandable: Checkup */}
      {showCheckup && (
        <div className="border-t border-slate-100 p-4 bg-blue-50/40">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">🩺 Pemeriksaan Fisik</p>
          {schedule.checkup ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <VitalItem label="Hemoglobin" value={`${schedule.checkup.hemoglobinLevel} g/dL`} ok={schedule.checkup.hemoglobinLevel >= 12.5 && schedule.checkup.hemoglobinLevel <= 17} />
                <VitalItem label="Tekanan Darah" value={`${schedule.checkup.systolicBP}/${schedule.checkup.diastolicBP}`} ok={schedule.checkup.systolicBP >= 100 && schedule.checkup.systolicBP <= 160 && schedule.checkup.diastolicBP >= 60 && schedule.checkup.diastolicBP <= 100} />
                <VitalItem label="Suhu" value={`${schedule.checkup.bodyTempC} °C`} ok={schedule.checkup.bodyTempC >= 36.5 && schedule.checkup.bodyTempC <= 37.5} />
                <VitalItem label="Denyut Nadi" value={`${schedule.checkup.pulseRate} bpm`} ok={schedule.checkup.pulseRate >= 50 && schedule.checkup.pulseRate <= 100} />
                <VitalItem label="Berat Badan" value={`${schedule.checkup.weight} kg`} ok={schedule.checkup.weight >= 45} />
                <VitalItem label="Hasil Overall" value={schedule.checkup.passed ? "Lolos" : "Tidak Lolos"} ok={schedule.checkup.passed} />
              </div>
              {schedule.checkup.notes && (
                <p className="text-xs text-slate-600 mt-2 italic">Catatan: {schedule.checkup.notes}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-2">
                Diperiksa: {new Date(schedule.checkup.examinedAt).toLocaleString("id-ID")}
              </p>
              {schedule.eligibilityReason && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                  Alasan tidak layak: {schedule.eligibilityReason}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submitCheckup} className="space-y-3">
              <p className="text-xs text-slate-600">Isi hasil cek fisik. Sistem otomatis hitung eligibility = Cek Fisik AND Skrining.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <VitalInput label="Hemoglobin (g/dL)" value={checkupForm.hemoglobinLevel} onChange={(v) => setCheckupForm({ ...checkupForm, hemoglobinLevel: v })} placeholder="14.0" />
                <VitalInput label="Sistolik (mmHg)" value={checkupForm.systolicBP} onChange={(v) => setCheckupForm({ ...checkupForm, systolicBP: v })} placeholder="120" />
                <VitalInput label="Diastolik (mmHg)" value={checkupForm.diastolicBP} onChange={(v) => setCheckupForm({ ...checkupForm, diastolicBP: v })} placeholder="80" />
                <VitalInput label="Suhu (°C)" value={checkupForm.bodyTempC} onChange={(v) => setCheckupForm({ ...checkupForm, bodyTempC: v })} placeholder="36.7" />
                <VitalInput label="Nadi (bpm)" value={checkupForm.pulseRate} onChange={(v) => setCheckupForm({ ...checkupForm, pulseRate: v })} placeholder="72" />
                <VitalInput label="BB (kg)" value={checkupForm.weight} onChange={(v) => setCheckupForm({ ...checkupForm, weight: v })} placeholder="60" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan (opsional)</label>
                <textarea
                  value={checkupForm.notes}
                  onChange={(e) => setCheckupForm({ ...checkupForm, notes: e.target.value })}
                  className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  rows={2}
                  placeholder="Catatan dari petugas medis…"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={submitting} size="sm" variant="success" icon={<Icons.Check />}>
                  Simpan & Cek Eligibility
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowCheckup(false)}>Batal</Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ScreenItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`px-2 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 ${
      value ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
    }`}>
      <span>{value ? "✗" : "✓"}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function VitalItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${ok ? "bg-white border-emerald-200" : "bg-red-50 border-red-200"}`}>
      <p className="text-[10px] text-slate-500 uppercase">{label}</p>
      <p className={`font-bold text-sm ${ok ? "text-slate-900" : "text-red-700"}`}>
        {ok ? "✓" : "⚠"} {value}
      </p>
    </div>
  );
}

function VitalInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-700 uppercase mb-1">{label}</label>
      <input
        type="number" step="any" value={value} required
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 px-2 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
      />
    </div>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: string; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative bg-gradient-to-br ${gradient} text-white p-4 rounded-xl shadow-sm overflow-hidden`}>
      <div className="absolute -right-2 -top-2 text-5xl opacity-20">{icon}</div>
      <div className="relative">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-[11px] text-white/90 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// =====================================================================
// BROADCAST FORM — PMI minta stok darah ke donor satu kota
// =====================================================================
function BroadcastForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    bloodType: "O", rhesusType: "POSITIVE",
    targetQuantity: "10",
    message: "",
    expiresAt: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.targetQuantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Target kantong harus angka positif");
      return;
    }
    setSubmitting(true);
    const res = await api("/pmi/broadcasts", {
      method: "POST",
      body: JSON.stringify({
        bloodType: form.bloodType,
        rhesusType: form.rhesusType,
        targetQuantity: qty,
        message: form.message || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      toast.success(data.message);
      onCreated();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal broadcast");
    }
  }

  return (
    <Card title="📢 Broadcast Permintaan Stok ke Donor"
      subtitle="Donor di kota yang sama dengan PMI Anda akan menerima notifikasi"
      icon={<Icons.Heart />} variant="highlight"
      action={<Button variant="ghost" size="sm" icon={<Icons.X />} onClick={onCancel}>Tutup</Button>}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <FormField label="Golongan">
            <select value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} className={inputCls}>
              <option>A</option><option>B</option><option>AB</option><option>O</option>
            </select>
          </FormField>
          <FormField label="Rhesus">
            <select value={form.rhesusType} onChange={(e) => setForm({ ...form, rhesusType: e.target.value })} className={inputCls}>
              <option value="POSITIVE">Rh+ Positif</option>
              <option value="NEGATIVE">Rh- Negatif</option>
            </select>
          </FormField>
          <FormField label="Target Kantong">
            <input type="number" min={1} step={1} value={form.targetQuantity}
              onChange={(e) => setForm({ ...form, targetQuantity: e.target.value.replace(/^0+(?=\d)/, "").replace(/-/g, "") })}
              onFocus={(e) => e.target.select()}
              className={inputCls} required placeholder="10" />
          </FormField>
        </div>

        <FormField label="Pesan untuk Donor (opsional)">
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
            placeholder="Contoh: Stok kritis untuk pasien thalassemia. Mohon bantuan segera."
          />
        </FormField>

        <FormField label="Deadline (opsional)">
          <input type="datetime-local" value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className={inputCls} />
        </FormField>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
          ℹ️ Sistem akan kirim notif ke <strong>semua donor di kota PMI Anda</strong> yang golongannya cocok
          (exact match atau donor universal O−). Donor bisa langsung daftar jadwal di PMI Anda.
        </div>

        <div className="flex gap-2">
          <Button type="submit" loading={submitting} variant="danger" icon={<span>📢</span>}>
            Kirim Broadcast
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}

function AddStockForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    bloodType: "O", rhesusType: "POSITIVE", component: "WHOLE_BLOOD",
    quantity: "10", expiryDate: "", location: "", source: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Jumlah kantong harus angka positif");
      return;
    }
    setSubmitting(true);
    const res = await api("/stocks", {
      method: "POST",
      body: JSON.stringify({ ...form, quantity: qty, expiryDate: new Date(form.expiryDate).toISOString() }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      toast.success(data.message ?? "Stok dibuat (status QUARANTINE)");
      onCreated();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal tambah stok");
    }
  }

  return (
    <Card title="Tambah Stok Darah Baru"
      subtitle="Stok akan langsung AVAILABLE — pastikan sudah lolos validasi internal PMI"
      icon={<Icons.Plus />} variant="success"
      action={<Button variant="ghost" size="sm" icon={<Icons.X />} onClick={onCancel}>Tutup</Button>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FormField label="Golongan">
            <select value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} className={inputCls}>
              <option>A</option><option>B</option><option>AB</option><option>O</option>
            </select>
          </FormField>
          <FormField label="Rhesus">
            <select value={form.rhesusType} onChange={(e) => setForm({ ...form, rhesusType: e.target.value })} className={inputCls}>
              <option value="POSITIVE">Rh+ Positif</option>
              <option value="NEGATIVE">Rh- Negatif</option>
            </select>
          </FormField>
          <FormField label="Komponen">
            <select value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} className={inputCls}>
              <option value="WHOLE_BLOOD">Whole Blood</option>
              <option value="PRC">PRC (Packed Red Cells)</option>
              <option value="FFP">FFP (Fresh Frozen Plasma)</option>
              <option value="TC">TC (Trombosit)</option>
              <option value="CRYO">Cryoprecipitate</option>
            </select>
          </FormField>
          <FormField label="Jumlah Kantong">
            <input type="number" min={1} step={1} value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/^0+(?=\d)/, "") })}
              onFocus={(e) => e.target.select()}
              className={inputCls} required placeholder="10" />
          </FormField>
          <FormField label="Tanggal Kadaluarsa">
            <input type="date" value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              className={inputCls} required />
          </FormField>
          <FormField label="Lokasi Penyimpanan" className="lg:col-span-2">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className={inputCls} placeholder="Gudang Pusat PMI" required />
          </FormField>
          <FormField label="Source (opsional)">
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className={inputCls} placeholder="UTD PMI" />
          </FormField>
        </div>

        <div className="bg-white/60 border border-emerald-200 rounded-lg p-3 text-xs text-slate-700">
          ℹ️ Stok akan tersimpan dengan status <code className="bg-green-100 px-1.5 py-0.5 rounded">AVAILABLE</code> dan
          langsung bisa dipakai untuk fulfill request pasien.
        </div>

        <div className="flex gap-2">
          <Button type="submit" loading={submitting} variant="success" icon={<Icons.Check />}>
            Simpan Stok
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}

const inputCls = "w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm";

function FormField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
