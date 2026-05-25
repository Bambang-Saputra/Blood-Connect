"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";

/**
 * DASHBOARD: RUMAH SAKIT
 *   - Permintaan darah aktif (TRACK + UPDATE STATUS)
 *   - Grid stok (CHECK AVAILABILITY)
 *   - Form tambah stok baru (UPDATE STOCK)
 */

type Req = {
  id: string; bloodType: string; rhesusType: string;
  quantity: number; reqStatus: string; urgency: string;
  createdAt: string;
};

type Stock = {
  id: string;
  bloodType: string; rhesusType: string; component: string;
  quantity: number; expiryDate: string; location: string;
  status: string;
};

export default function HospitalDashboard() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStock, setShowAddStock] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const [r, s] = await Promise.all([
      api("/requests").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/stocks/mine").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setRequests(r.data ?? []);
    setStocks(s.data ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    if (!confirm(`Yakin ubah status ke ${newStatus}?`)) return;
    const res = await api(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus }),
    });
    if (res.ok) {
      toast.success(`Status diperbarui ke ${newStatus}`);
      refresh();
    } else {
      toast.error("Gagal update status");
    }
  }

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Rumah Sakit</h1>
        <div className="flex gap-2 items-center">
          <a href="/dashboard/hospital/checkup" className="text-sm bg-red-600 text-white px-3 py-1.5 rounded">+ Pemeriksaan Donor</a>
          <button onClick={() => setShowAddStock(!showAddStock)} className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded">
            {showAddStock ? "× Tutup" : "+ Tambah Stok"}
          </button>
          <NotificationBell />
          <Link href="/dashboard/profile" className="text-sm text-slate-600 hover:text-red-600">Profil</Link>
          <button onClick={() => { clearToken(); location.href = "/"; }}
            className="text-sm text-slate-500 hover:text-red-600">Logout</button>
        </div>
      </header>

      {/* === Form Tambah Stok (toggle) === */}
      {showAddStock && <AddStockForm onCreated={() => { setShowAddStock(false); refresh(); }} />}

      {/* === Stok Darah Grid === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Stok Darah Kami</h2>
          <span className="text-sm text-slate-500">{stocks.length} batch total</span>
        </div>

        {/* Aggregate by golongan */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
          {["A", "B", "AB", "O"].flatMap((bt) =>
            ["POSITIVE", "NEGATIVE"].map((rh) => {
              const total = stocks
                .filter((s) => s.bloodType === bt && s.rhesusType === rh && s.status === "AVAILABLE")
                .reduce((sum, s) => sum + s.quantity, 0);
              return (
                <div key={`${bt}${rh}`} className="bg-red-50 p-3 rounded text-center">
                  <p className="text-xl font-bold text-red-700">{bt}{rh === "POSITIVE" ? "+" : "-"}</p>
                  <p className="text-xs text-slate-600">{total} kantong</p>
                </div>
              );
            })
          )}
        </div>

        {/* Detail per batch */}
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Lihat detail per batch ({stocks.length})</summary>
          <table className="w-full mt-2 text-xs">
            <thead className="text-left text-slate-500">
              <tr><th>Golongan</th><th>Komponen</th><th>Qty</th><th>Expiry</th><th>Lokasi</th><th>Status</th></tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id} className="border-t">
                  <td>{s.bloodType}{s.rhesusType === "POSITIVE" ? "+" : "-"}</td>
                  <td>{s.component}</td>
                  <td>{s.quantity}</td>
                  <td>{new Date(s.expiryDate).toLocaleDateString("id-ID")}</td>
                  <td>{s.location}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded ${
                      s.status === "AVAILABLE" ? "bg-green-100 text-green-700" :
                      s.status === "QUARANTINE" ? "bg-yellow-100 text-yellow-700" :
                      s.status === "EXPIRED" ? "bg-red-100 text-red-700" :
                      "bg-slate-100"
                    }`}>{s.status}</span>
                  </td>
                </tr>
              ))}
              {stocks.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-4 text-slate-400">Belum ada stok. Klik "+ Tambah Stok" di atas.</td></tr>
              )}
            </tbody>
          </table>
        </details>
      </section>

      {/* === Permintaan Darah Aktif === */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Permintaan Darah ({requests.length})</h2>
        {loading ? (
          <p className="text-slate-400 text-sm">Memuat...</p>
        ) : requests.length === 0 ? (
          <p className="text-slate-500 text-sm">Belum ada permintaan.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th>Tanggal</th><th>Golongan</th><th>Qty</th><th>Urgency</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{new Date(r.createdAt).toLocaleString("id-ID")}</td>
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
                    {r.reqStatus !== "FULFILLED" && r.reqStatus !== "CANCELLED" && (
                      <>
                        <button onClick={() => updateStatus(r.id, "FULFILLED")} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Fulfill</button>
                        <button onClick={() => updateStatus(r.id, "REJECTED")} className="text-xs bg-slate-600 text-white px-2 py-1 rounded">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

// ===== Form tambah stok =====
function AddStockForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    bloodType: "O", rhesusType: "POSITIVE", component: "WHOLE_BLOOD",
    quantity: "10",          // STRING — biar input number tidak auto-prefix "0"
    expiryDate: "", location: "",
    source: "",
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
      body: JSON.stringify({
        ...form,
        quantity: qty,
        expiryDate: new Date(form.expiryDate).toISOString(),
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (res.ok) {
      toast.success(data.message ?? "Stok dibuat (status QUARANTINE, menunggu verifikasi admin)");
      onCreated();
    } else {
      toast.error(typeof data.error === "string" ? data.error : "Gagal tambah stok");
    }
  }

  return (
    <form onSubmit={submit} className="bg-emerald-50 border border-emerald-200 p-5 rounded-lg space-y-3">
      <h3 className="font-semibold">Tambah Stok Darah Baru</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium mb-1">Golongan</label>
          <select value={form.bloodType} onChange={(e) => setForm({ ...form, bloodType: e.target.value })} className="w-full border px-2 py-1.5 rounded">
            <option>A</option><option>B</option><option>AB</option><option>O</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Rhesus</label>
          <select value={form.rhesusType} onChange={(e) => setForm({ ...form, rhesusType: e.target.value })} className="w-full border px-2 py-1.5 rounded">
            <option value="POSITIVE">Rh+</option><option value="NEGATIVE">Rh-</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Komponen</label>
          <select value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} className="w-full border px-2 py-1.5 rounded">
            <option value="WHOLE_BLOOD">Whole Blood</option>
            <option value="PRC">PRC</option>
            <option value="FFP">FFP</option>
            <option value="TC">Trombosit</option>
            <option value="CRYO">Cryo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Jumlah (kantong)</label>
          <input
            type="number" min={1} step={1}
            value={form.quantity}
            onChange={(e) => {
              // Buang leading zero kalau ada (kecuali kalau cuma "0" sebagai placeholder)
              const v = e.target.value.replace(/^0+(?=\d)/, "");
              setForm({ ...form, quantity: v });
            }}
            onFocus={(e) => e.target.select()}   // auto-select supaya user tinggal ketik ulang
            className="w-full border px-2 py-1.5 rounded"
            required
            placeholder="10"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Expiry Date</label>
          <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className="w-full border px-2 py-1.5 rounded" required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium mb-1">Lokasi (UTD/RS)</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full border px-2 py-1.5 rounded" placeholder="Jakarta Pusat" required />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Source (opsional)</label>
          <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="w-full border px-2 py-1.5 rounded" placeholder="UTD PMI" />
        </div>
      </div>
      <p className="text-xs text-slate-600">
        ℹ️ Stok dibuat berstatus <code>QUARANTINE</code> dulu. Admin perlu verify ke <code>AVAILABLE</code> setelah uji lab lolos.
      </p>
      <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50">
        {submitting ? "Menyimpan..." : "Simpan Stok"}
      </button>
    </form>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = {
    PENDING: "bg-slate-100 text-slate-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    MATCHED_STOCK: "bg-green-100 text-green-700",
    MATCHED_DONOR: "bg-yellow-100 text-yellow-700",
    IN_TRANSIT: "bg-purple-100 text-purple-700",
    FULFILLED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-200 text-slate-500",
  }[status] ?? "bg-slate-100";
  return <span className={`px-2 py-0.5 text-xs rounded ${color}`}>{status}</span>;
}
