"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { ModeSwitcher } from "../../lib/ModeSwitcher";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: PASIEN
 * Use Cases: REQUEST, TRACK REQUEST, CHECK AVAILABILITY
 */
export default function PatientDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ bloodType: "O", rhesusType: "POSITIVE", quantity: "1", urgency: "NORMAL" });

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const data = await api("/requests?mine=true").then((r) => r.json()).catch(() => ({ data: [] }));
    setRequests(data.data ?? []);
    setLoading(false);
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Jumlah kantong harus angka positif");
      return;
    }
    setSubmitting(true);
    const res = await api("/requests", {
      method: "POST",
      body: JSON.stringify({ ...form, quantity: qty }),
    });
    setSubmitting(false);
    if (res.ok) { toast.success("Permintaan dikirim. MatchSystem memproses..."); refresh(); }
    else toast.error((await res.json()).error ?? "Gagal mengirim permintaan");
  }

  const activeCount = requests.filter((r) => !["FULFILLED", "REJECTED", "CANCELLED"].includes(r.reqStatus)).length;
  const fulfilledCount = requests.filter((r) => r.reqStatus === "FULFILLED").length;

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-red-500 bg-clip-text text-transparent">
            Dashboard Pasien
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ajukan permintaan darah & pantau statusnya</p>
        </div>
        <div className="flex items-center gap-2">
          <ModeSwitcher currentRole="PASIEN" />
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

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="📋" label="Total Permintaan" value={requests.length} color="from-slate-100 to-slate-50" />
        <StatCard icon="⏳" label="Aktif Diproses" value={activeCount} color="from-amber-100 to-orange-50" />
        <StatCard icon="✅" label="Terpenuhi" value={fulfilledCount} color="from-emerald-100 to-green-50" />
      </section>

      {/* Form Request */}
      <Card
        title="Ajukan Permintaan Darah"
        subtitle="MatchSystem akan otomatis mencocokkan dengan stok atau pendonor"
        icon={<Icons.Drop />}
        variant="highlight"
      >
        <form onSubmit={submitRequest} className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SelectField label="Golongan Darah" value={form.bloodType}
              onChange={(v) => setForm({ ...form, bloodType: v })}
              options={[["A", "A"], ["B", "B"], ["AB", "AB"], ["O", "O"]]} />
            <SelectField label="Rhesus" value={form.rhesusType}
              onChange={(v) => setForm({ ...form, rhesusType: v })}
              options={[["POSITIVE", "Rh+"], ["NEGATIVE", "Rh-"]]} />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kantong</label>
              <input
                type="number" min={1} step={1}
                value={form.quantity}
                onChange={(e) => {
                  const v = e.target.value.replace(/^0+(?=\d)/, "");
                  setForm({ ...form, quantity: v });
                }}
                onFocus={(e) => e.target.select()}
                className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                placeholder="1"
              />
            </div>
            <SelectField label="Urgency" value={form.urgency}
              onChange={(v) => setForm({ ...form, urgency: v })}
              options={[["NORMAL", "🟢 Normal"], ["URGENT", "🟠 Urgent"], ["CRITICAL", "🔴 Critical"]]} />
          </div>
          <Button type="submit" loading={submitting} fullWidth size="lg" icon={<Icons.Heart />}>
            Kirim Permintaan
          </Button>
        </form>
      </Card>

      {/* Track Request */}
      <Card title={`Status Permintaan Saya (${requests.length})`} icon={<Icons.Calendar />}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Belum ada permintaan"
            description="Ajukan permintaan darah lewat form di atas. Sistem akan memprosesnya secara otomatis."
          />
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id}
                className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-red-300 hover:shadow-sm transition group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition">
                    {r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{r.quantity} kantong</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={r.urgency} />
                  <Badge status={r.reqStatus} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow transition`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-600">{label}</p>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
