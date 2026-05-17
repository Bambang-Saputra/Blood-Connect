"use client";

import { useEffect, useState } from "react";
import { api, clearToken } from "../../lib/api";

/**
 * DASHBOARD: ADMIN
 *   - Verify Rumah Sakit (gate sebelum RS bisa transact)
 *   - Confirm/Reject/Reschedule jadwal donor
 *   - Re-trigger MatchSystem untuk request stuck
 *   - Verifikasi stok karantina → AVAILABLE
 */

export default function AdminDashboard() {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [stuckRequests, setStuckRequests] = useState<any[]>([]);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const [h, s, r] = await Promise.all([
      api("/admin/hospitals?status=UNVERIFIED").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/schedules?status=PENDING").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/requests?status=PENDING").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setHospitals(h.data ?? []);
    setPendingSchedules(s.data ?? []);
    setStuckRequests(r.data ?? []);
  }

  async function verifyHospital(id: string, status: "VERIFIED" | "SUSPENDED") {
    await api(`/admin/hospitals/${id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    refresh();
  }

  async function actSchedule(id: string, status: string, newDate?: string) {
    await api(`/admin/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, newDate }),
    });
    refresh();
  }

  async function retryMatch(reqId: string) {
    const res = await api(`/requests/${reqId}/match`, { method: "POST" });
    const result = await res.json();
    alert(`Match: ${result.source ?? "ERROR"} — ${result.message ?? JSON.stringify(result)}`);
    refresh();
  }

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Admin</h1>
        <button onClick={() => { clearToken(); location.href = "/"; }} className="text-sm text-slate-500 hover:text-red-600">Logout</button>
      </header>

      {/* === Verifikasi RS === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Verifikasi Rumah Sakit ({hospitals.length})</h2>
        {hospitals.length === 0 ? (
          <p className="text-slate-500 text-sm">Tidak ada RS menunggu verifikasi.</p>
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
      </section>

      {/* === Jadwal Donor === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Jadwal Donor Pending ({pendingSchedules.length})</h2>
        {pendingSchedules.map((s) => (
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
      </section>

      {/* === Request Stuck === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Request Tertahan ({stuckRequests.length})</h2>
        {stuckRequests.map((r) => (
          <div key={r.id} className="border p-3 rounded mb-2 flex justify-between items-center">
            <div>
              <p className="font-medium">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"} ({r.component}) — {r.quantity} kantong</p>
              <p className="text-xs text-slate-500">Dari: {r.patient?.user?.name ?? r.hospital?.hospitalName ?? "-"}</p>
            </div>
            <button onClick={() => retryMatch(r.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Re-run Match</button>
          </div>
        ))}
      </section>
    </main>
  );
}
