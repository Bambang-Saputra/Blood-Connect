"use client";

import { useEffect, useState } from "react";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";

/**
 * ============================================================
 * DASHBOARD: PASIEN
 * ============================================================
 * Use Cases:
 *   - REQUEST           → form pengajuan darah
 *   - TRACK REQUEST     → live status request
 *   - CHECK AVAILABILITY → cek stok darah di RS terdekat
 * ============================================================
 */

export default function PatientDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [form, setForm] = useState({ bloodType: "O", rhesusType: "POSITIVE", quantity: 1, urgency: "NORMAL" });

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    const data = await api("/requests?mine=true").then((r) => r.json());
    setRequests(data.data ?? []);
  }

  // [Use Case REQUEST — Activity Diagram #9]
  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/requests", {
      method: "POST",
      body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
    });
    if (res.ok) { toast.success("Permintaan dikirim. MatchSystem memproses..."); refresh(); }
    else toast.error((await res.json()).error ?? "Gagal mengirim permintaan");
  }

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Pasien</h1>
        <button
          onClick={() => { clearToken(); location.href = "/"; }}
          className="text-sm text-slate-500 hover:text-red-600"
        >
          Logout
        </button>
      </header>

      {/* === Form Request Darah === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Ajukan Permintaan Darah</h2>
        <form onSubmit={submitRequest} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} className="border px-2 py-2 rounded">
            <option>A</option><option>B</option><option>AB</option><option>O</option>
          </select>
          <select value={form.rhesusType} onChange={(e) => setForm({ ...form, rhesusType: e.target.value })} className="border px-2 py-2 rounded">
            <option value="POSITIVE">Rh+</option><option value="NEGATIVE">Rh-</option>
          </select>
          <input
            type="number" min={1} value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            className="border px-2 py-2 rounded" placeholder="Qty kantong"
          />
          <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className="border px-2 py-2 rounded">
            <option>NORMAL</option><option>URGENT</option><option>CRITICAL</option>
          </select>
          <button className="col-span-2 md:col-span-4 bg-red-600 text-white py-2 rounded">Kirim Permintaan</button>
        </form>
      </section>

      {/* === Track Request === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Status Permintaan Saya</h2>
        {requests.length === 0 ? (
          <p className="text-slate-500">Belum ada permintaan aktif.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex justify-between border p-3 rounded">
                <div>
                  <p className="font-medium">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"} — {r.quantity} kantong</p>
                  <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("id-ID")}</p>
                </div>
                <span className="self-center text-sm bg-slate-100 px-3 py-1 rounded">{r.reqStatus}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
