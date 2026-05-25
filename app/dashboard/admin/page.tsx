"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";

/**
 * DASHBOARD: ADMIN
 *   - Verify Rumah Sakit
 *   - Verify Stok Darah (QUARANTINE → AVAILABLE)
 *   - Confirm/Reject/Reschedule jadwal donor
 *   - Re-trigger MatchSystem untuk request stuck
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
    if (res.ok) { toast.success(`RS di-${status.toLowerCase()}`); refresh(); }
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
    <main className="max-w-7xl mx-auto p-8 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Admin</h1>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <Link href="/dashboard/profile" className="text-sm text-slate-600 hover:text-red-600">Profil</Link>
          <button onClick={() => { clearToken(); location.href = "/"; }} className="text-sm text-slate-500 hover:text-red-600">Logout</button>
        </div>
      </header>

      {/* === Statistik Cepat === */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="RS Pending Verify" value={hospitals.length} color="orange" />
        <StatCard label="Stok Quarantine" value={quarantineStocks.length} color="yellow" />
        <StatCard label="Jadwal Pending" value={pendingSchedules.length} color="blue" />
        <StatCard label="Request Tertahan" value={stuckRequests.length} color="red" />
      </section>

      {/* === Verifikasi RS === */}
      <Section title={`Verifikasi Rumah Sakit (${hospitals.length})`}>
        {hospitals.length === 0 ? (
          <Empty msg="Tidak ada RS menunggu verifikasi." />
        ) : hospitals.map((h) => (
          <div key={h.id} className="border p-3 rounded mb-2 flex justify-between items-center">
            <div>
              <p className="font-medium">{h.hospitalName} — <span className="font-mono text-xs">{h.hospitalCode}</span></p>
              <p className="text-xs text-slate-500">{h.hospitalLoc} · {h.user?.city}</p>
              <p className="text-xs text-slate-400">{h.user?.email}</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => verifyHospital(h.id, "VERIFIED")} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Verify</button>
              <button onClick={() => verifyHospital(h.id, "SUSPENDED")} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Suspend</button>
            </div>
          </div>
        ))}
      </Section>

      {/* === Verifikasi Stok === */}
      <Section title={`Verifikasi Stok Darah Quarantine (${quarantineStocks.length})`}>
        {quarantineStocks.length === 0 ? (
          <Empty msg="Tidak ada stok menunggu verifikasi." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th>RS</th><th>Golongan</th><th>Komponen</th><th>Qty</th><th>Expiry</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {quarantineStocks.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2">{s.hospital?.hospitalName ?? "-"}</td>
                  <td>{s.bloodType}{s.rhesusType === "POSITIVE" ? "+" : "-"}</td>
                  <td>{s.component}</td>
                  <td>{s.quantity}</td>
                  <td>{new Date(s.expiryDate).toLocaleDateString("id-ID")}</td>
                  <td><button onClick={() => verifyStock(s.id)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs">Approve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* === Jadwal Donor === */}
      <Section title={`Jadwal Donor Pending (${pendingSchedules.length})`}>
        {pendingSchedules.length === 0 ? (
          <Empty msg="Tidak ada jadwal menunggu konfirmasi." />
        ) : pendingSchedules.map((s) => (
          <div key={s.id} className="border p-3 rounded mb-2 flex justify-between items-center">
            <div>
              <p className="font-medium">{s.donor?.user?.name}</p>
              <p className="text-sm text-slate-500">{new Date(s.jadwal).toLocaleDateString("id-ID")} — Sesi {s.sesi}</p>
            </div>
            <div className="space-x-2">
              <button onClick={() => actSchedule(s.id, "CONFIRMED")} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Confirm</button>
              <button onClick={() => actSchedule(s.id, "REJECTED")} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Reject</button>
              <button onClick={() => {
                const d = prompt("Tanggal baru (YYYY-MM-DD)?");
                if (d) actSchedule(s.id, "RESCHEDULED", new Date(d).toISOString());
              }} className="bg-slate-500 text-white px-3 py-1 rounded text-sm">Reschedule</button>
            </div>
          </div>
        ))}
      </Section>

      {/* === Request Stuck === */}
      <Section title={`Request Tertahan (${stuckRequests.length})`}>
        {stuckRequests.length === 0 ? (
          <Empty msg="Tidak ada request tertahan." />
        ) : stuckRequests.map((r) => (
          <div key={r.id} className="border p-3 rounded mb-2 flex justify-between items-center">
            <div>
              <p className="font-medium">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"} ({r.component}) — {r.quantity} kantong</p>
              <p className="text-xs text-slate-500">Dari: {r.patient?.user?.name ?? r.hospital?.hospitalName ?? "-"}</p>
            </div>
            <button onClick={() => retryMatch(r.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Re-run Match</button>
          </div>
        ))}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-slate-400 text-sm text-center py-4">{msg}</p>;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bg = { orange: "bg-orange-50 text-orange-700", yellow: "bg-yellow-50 text-yellow-700",
               blue: "bg-blue-50 text-blue-700", red: "bg-red-50 text-red-700" }[color] ?? "bg-slate-50";
  return (
    <div className={`p-4 rounded-lg ${bg}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}
