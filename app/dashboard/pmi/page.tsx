"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: PMI
 * Catatan: panel donor schedule + stock chart akan ditambahkan
 * di commit berikutnya. Saat ini fokus rebrand UI + endpoint paths.
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
    if (res.ok) { toast.success(`Status diperbarui ke ${newStatus}`); refresh(); }
    else toast.error("Gagal update status");
  }

  const totalAvailable = stocks.filter((s) => s.status === "AVAILABLE").reduce((sum, s) => sum + s.quantity, 0);
  const totalQuarantine = stocks.filter((s) => s.status === "QUARANTINE").reduce((sum, s) => sum + s.quantity, 0);
  const activeRequestsCount = requests.filter((r) => !["FULFILLED", "REJECTED", "CANCELLED"].includes(r.reqStatus)).length;

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
          <Link href="/dashboard/pmi/checkup">
            <Button size="sm" icon={<Icons.Plus />}>Pemeriksaan Donor</Button>
          </Link>
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
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🩸" label="Total Batch" value={stocks.length} gradient="from-red-500 to-rose-600" />
        <StatCard icon="✅" label="Available" value={totalAvailable} gradient="from-emerald-500 to-green-600" />
        <StatCard icon="🧪" label="Quarantine" value={totalQuarantine} gradient="from-amber-500 to-yellow-600" />
        <StatCard icon="📋" label="Permintaan Aktif" value={activeRequestsCount} gradient="from-blue-500 to-indigo-600" />
      </section>

      {/* Form Tambah Stok */}
      {showAddStock && (
        <AddStockForm onCreated={() => { setShowAddStock(false); refresh(); }} onCancel={() => setShowAddStock(false)} />
      )}

      {/* Stok Grid */}
      <Card title="Stok Darah" subtitle={`${stocks.length} batch · ${totalAvailable} kantong AVAILABLE`}
        icon={<Icons.Drop />}>
        {/* Aggregate per golongan */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
          {["A", "B", "AB", "O"].flatMap((bt) =>
            ["POSITIVE", "NEGATIVE"].map((rh) => {
              const total = stocks
                .filter((s) => s.bloodType === bt && s.rhesusType === rh && s.status === "AVAILABLE")
                .reduce((sum, s) => sum + s.quantity, 0);
              const lowStock = total > 0 && total < 5;
              return (
                <div key={`${bt}${rh}`}
                  className={`relative bg-gradient-to-br ${
                    total === 0 ? "from-slate-50 to-slate-100" :
                    lowStock ? "from-orange-50 to-amber-100" :
                    "from-red-50 to-pink-100"
                  } p-3 rounded-lg text-center border ${
                    lowStock ? "border-orange-200" : "border-red-100"
                  } hover:shadow-sm transition`}>
                  <p className={`text-xl font-bold ${total === 0 ? "text-slate-400" : "text-red-700"}`}>
                    {bt}{rh === "POSITIVE" ? "+" : "-"}
                  </p>
                  <p className="text-xs text-slate-600">{total} kantong</p>
                  {lowStock && <span className="absolute top-1 right-1 text-xs">⚠️</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Detail per batch */}
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

      {/* Requests */}
      <Card title={`Permintaan Darah (${requests.length})`} icon={<Icons.Heart />}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon="📭" title="Belum ada permintaan" description="Permintaan dari pasien akan muncul di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2">Tanggal</th><th>Golongan</th><th>Qty</th><th>Urgency</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="py-3 text-xs text-slate-600">
                      {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td>
                      <span className="font-bold text-red-600">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}</span>
                    </td>
                    <td className="font-medium">{r.quantity}</td>
                    <td><Badge status={r.urgency} /></td>
                    <td><Badge status={r.reqStatus} /></td>
                    <td>
                      {r.reqStatus !== "FULFILLED" && r.reqStatus !== "CANCELLED" && r.reqStatus !== "REJECTED" && (
                        <div className="flex gap-1">
                          <Button variant="success" size="sm" icon={<Icons.Check />}
                            onClick={() => updateStatus(r.id, "FULFILLED")}>Fulfill</Button>
                          <Button variant="secondary" size="sm" icon={<Icons.X />}
                            onClick={() => updateStatus(r.id, "REJECTED")}>Reject</Button>
                        </div>
                      )}
                    </td>
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
      subtitle="Stok akan masuk ke QUARANTINE — admin verify setelah uji lab"
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
              className={inputCls} placeholder="Jakarta Pusat" required />
          </FormField>
          <FormField label="Source (opsional)">
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              className={inputCls} placeholder="UTD PMI" />
          </FormField>
        </div>

        <div className="bg-white/60 border border-emerald-200 rounded-lg p-3 text-xs text-slate-700">
          ℹ️ <strong>Status awal:</strong> <code className="bg-yellow-100 px-1.5 py-0.5 rounded">QUARANTINE</code>.
          Admin pusat perlu verify ke <code className="bg-green-100 px-1.5 py-0.5 rounded">AVAILABLE</code> setelah uji lab lolos.
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
