"use client";

import { useEffect, useState } from "react";
import { clearToken } from "../../lib/api";

/**
 * ============================================================
 * DASHBOARD: RUMAH SAKIT
 * ============================================================
 * Use Cases:
 *   - REQUEST           → buat request darah atas nama pasien
 *   - TRACK REQUEST     → tabel status semua request
 *   - UPDATE STATUS     → patch status request (FULFILLED, REJECTED)
 *   - UPDATE STOCK      → tambah/edit stok
 *   - CHECK AVAILABILITY → cari stok di RS lain
 * ============================================================
 */

const api = (path: string, init?: RequestInit) =>
  fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
      ...(init?.headers ?? {}),
    },
  });

type Req = {
  id: string;
  bloodType: string;
  rhesusType: string;
  quantity: number;
  reqStatus: string;
  urgency: string;
  createdAt: string;
};

type Stock = {
  bloodType: string;
  rhesusType: string;
  quantity: number;
  expiryDate: string;
  location: string;
};

export default function HospitalDashboard() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    api("/requests?mine=true").then((r) => r.json()).then((d) => setRequests(d.data ?? []));
    api("/stocks").then((r) => r.json()).then((d) => setStocks(d.stocks ?? []));
  }, []);

  // [Use Case UPDATE STATUS — RS]
  async function updateStatus(id: string, newStatus: string) {
    await api(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus }),
    });
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, reqStatus: newStatus } : r)));
  }

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Rumah Sakit</h1>
        <div className="flex gap-3 items-center">
          <a href="/dashboard/hospital/checkup" className="text-sm bg-red-600 text-white px-3 py-1.5 rounded">+ Input Pemeriksaan Donor</a>
          <span className="text-sm text-slate-500">{stocks.length} batch stok</span>
          <button
            onClick={() => { clearToken(); location.href = "/"; }}
            className="text-sm text-slate-500 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      {/* === Daftar Request Aktif (TRACK REQUEST) === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Permintaan Darah Aktif</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th>Tanggal</th><th>Golongan</th><th>Qty</th><th>Urgency</th><th>Status</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t">
                <td>{new Date(r.createdAt).toLocaleString("id-ID")}</td>
                <td>{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}</td>
                <td>{r.quantity}</td>
                <td>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    r.urgency === "CRITICAL" ? "bg-red-100 text-red-700" :
                    r.urgency === "URGENT" ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>{r.urgency}</span>
                </td>
                <td><StatusBadge status={r.reqStatus} /></td>
                <td className="space-x-1">
                  <button onClick={() => updateStatus(r.id, "FULFILLED")} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Fulfill</button>
                  <button onClick={() => updateStatus(r.id, "REJECTED")} className="text-xs bg-slate-600 text-white px-2 py-1 rounded">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* === Stok Darah === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Stok Darah</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {["A","B","AB","O"].map((bt) => (
            ["POSITIVE", "NEGATIVE"].map((rh) => {
              const total = stocks
                .filter((s) => s.bloodType === bt && s.rhesusType === rh)
                .reduce((sum, s) => sum + s.quantity, 0);
              return (
                <div key={`${bt}${rh}`} className="bg-red-50 p-4 rounded text-center">
                  <p className="text-2xl font-bold text-red-700">{bt}{rh === "POSITIVE" ? "+" : "-"}</p>
                  <p className="text-sm text-slate-600">{total} kantong</p>
                </div>
              );
            })
          ))}
        </div>
      </section>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = {
    PENDING: "bg-slate-100 text-slate-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    MATCHED_STOCK: "bg-green-100 text-green-700",
    MATCHED_DONOR: "bg-yellow-100 text-yellow-700",
    FULFILLED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-200 text-slate-500",
  }[status] ?? "bg-slate-100";
  return <span className={`px-2 py-0.5 text-xs rounded ${color}`}>{status}</span>;
}
