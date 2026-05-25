"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: ADMIN
 *   - Verify Rumah Sakit
 *   - Verify Stok Darah (QUARANTINE → AVAILABLE)
 *   - Confirm jadwal donor
 *   - Re-trigger MatchSystem
 */
export default function AdminDashboard() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [quarantineStocks, setQuarantineStocks] = useState<any[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [stuckRequests, setStuckRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const [h, q, s, r] = await Promise.all([
      api("/admin/hospitals?status=UNVERIFIED").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/stocks/quarantine").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/schedules?status=PENDING").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/requests?status=PENDING").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setHospitals(h.data ?? []);
    setQuarantineStocks(q.data ?? []);
    setPendingSchedules(s.data ?? []);
    setStuckRequests(r.data ?? []);
    setLoading(false);
  }

  async function verifyHospital(id: string, status: "VERIFIED" | "SUSPENDED") {
    if (!confirm(`Yakin set status RS ke ${status}?`)) return;
    const res = await api(`/admin/hospitals/${id}/verify`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (res.ok) { toast.success(`RS berhasil di-${status.toLowerCase()}`); refresh(); }
    else toast.error("Gagal verify RS");
  }

  async function verifyStock(id: string) {
    const res = await api(`/stocks/${id}/verify`, { method: "PATCH" });
    if (res.ok) { toast.success("Stok lolos uji & tersedia"); refresh(); }
    else toast.error("Gagal verify stok");
  }

  async function actSchedule(id: string, status: string, newDate?: string) {
    const res = await api(`/admin/schedules/${id}`, { method: "PATCH", body: JSON.stringify({ status, newDate }) });
    if (res.ok) { toast.success(`Jadwal ${status.toLowerCase()}`); refresh(); }
    else toast.error("Gagal update jadwal");
  }

  async function retryMatch(reqId: string) {
    const res = await api(`/requests/${reqId}/match`, { method: "POST" });
    const result = await res.json();
    if (res.ok) toast.info(`Match: ${result.source} — ${result.message}`);
    else toast.error("MatchSystem error");
    refresh();
  }

  return (
    <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kontrol sistem & verifikasi data nasional</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/dashboard/profile">
            <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<Icons.Logout />}
            onClick={() => { clearToken(); location.href = "/"; }}>
            Keluar
          </Button>
        </div>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🏥" label="RS Pending" value={hospitals.length} gradient="from-orange-500 to-amber-600" />
        <StatCard icon="🧪" label="Stok Quarantine" value={quarantineStocks.length} gradient="from-yellow-500 to-amber-500" />
        <StatCard icon="📅" label="Jadwal Pending" value={pendingSchedules.length} gradient="from-blue-500 to-indigo-600" />
        <StatCard icon="⚠️" label="Request Tertahan" value={stuckRequests.length} gradient="from-red-500 to-rose-600" />
      </section>

      {/* Verifikasi RS */}
      <Card title={`Verifikasi Rumah Sakit (${hospitals.length})`}
        subtitle="RS baru daftar yang menunggu approval Anda"
        icon={<Icons.Search />}>
        {loading ? <LoadingRows /> : hospitals.length === 0 ? (
          <EmptyState icon="✨" title="Semua RS sudah diverifikasi" description="Tidak ada RS menunggu verifikasi." />
        ) : (
          <div className="space-y-2">
            {hospitals.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition">
                <div>
                  <p className="font-semibold">{h.hospitalName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{h.hospitalCode}</code>
                    {" · "}{h.hospitalLoc}{" · "}{h.user?.city}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{h.user?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Icons.Check />}
                    onClick={() => verifyHospital(h.id, "VERIFIED")}>Verify</Button>
                  <Button variant="danger" size="sm" icon={<Icons.X />}
                    onClick={() => verifyHospital(h.id, "SUSPENDED")}>Suspend</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Verifikasi Stok */}
      <Card title={`Verifikasi Stok Darah Quarantine (${quarantineStocks.length})`}
        subtitle="Stok baru dari RS, butuh uji lab sebelum AVAILABLE"
        icon={<Icons.Drop />}>
        {loading ? <LoadingRows /> : quarantineStocks.length === 0 ? (
          <EmptyState icon="🎉" title="Tidak ada stok karantina" description="Semua stok darah sudah diverifikasi." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2">RS</th><th>Golongan</th><th>Komponen</th><th>Qty</th><th>Expiry</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {quarantineStocks.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-3 font-medium">{s.hospital?.hospitalName ?? "-"}</td>
                    <td>
                      <span className="font-bold text-red-600">{s.bloodType}{s.rhesusType === "POSITIVE" ? "+" : "-"}</span>
                    </td>
                    <td className="text-xs text-slate-600">{s.component}</td>
                    <td className="font-medium">{s.quantity}</td>
                    <td className="text-xs text-slate-600">
                      {new Date(s.expiryDate).toLocaleDateString("id-ID")}
                    </td>
                    <td>
                      <Button variant="success" size="sm" icon={<Icons.Check />}
                        onClick={() => verifyStock(s.id)}>Approve</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Jadwal Donor */}
      <Card title={`Jadwal Donor Pending (${pendingSchedules.length})`}
        subtitle="Pendonor yang menunggu konfirmasi jadwal"
        icon={<Icons.Calendar />}>
        {loading ? <LoadingRows /> : pendingSchedules.length === 0 ? (
          <EmptyState icon="📭" title="Tidak ada jadwal pending" />
        ) : (
          <div className="space-y-2">
            {pendingSchedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition">
                <div>
                  <p className="font-semibold">{s.donor?.user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(s.jadwal).toLocaleDateString("id-ID", { dateStyle: "full" })} · Sesi {s.sesi}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Icons.Check />}
                    onClick={() => actSchedule(s.id, "CONFIRMED")}>Confirm</Button>
                  <Button variant="danger" size="sm" icon={<Icons.X />}
                    onClick={() => actSchedule(s.id, "REJECTED")}>Reject</Button>
                  <Button variant="secondary" size="sm"
                    onClick={() => {
                      const d = prompt("Tanggal baru (YYYY-MM-DD)?");
                      if (d) actSchedule(s.id, "RESCHEDULED", new Date(d).toISOString());
                    }}>Reschedule</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Request Stuck */}
      <Card title={`Request Tertahan (${stuckRequests.length})`}
        subtitle="Request yang stuck di PENDING — re-run MatchSystem manual"
        icon={<Icons.Refresh />}>
        {loading ? <LoadingRows /> : stuckRequests.length === 0 ? (
          <EmptyState icon="✅" title="Tidak ada request tertahan" />
        ) : (
          <div className="space-y-2">
            {stuckRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                    {r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-medium">{r.quantity} kantong ({r.component})</p>
                    <p className="text-xs text-slate-500">
                      Dari: {r.patient?.user?.name ?? r.hospital?.hospitalName ?? "-"}
                    </p>
                  </div>
                </div>
                <Button size="sm" icon={<Icons.Refresh />} onClick={() => retryMatch(r.id)}>Re-run Match</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: string; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative bg-gradient-to-br ${gradient} text-white p-5 rounded-xl shadow-sm overflow-hidden`}>
      <div className="absolute -right-2 -top-2 text-6xl opacity-20">{icon}</div>
      <div className="relative">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-white/90 mt-1">{label}</p>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );
}
