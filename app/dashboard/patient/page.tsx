"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { useRequireRole } from "../../lib/useRequireRole";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { ModeSwitcher } from "../../lib/ModeSwitcher";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: PASIEN
 * Pasien submit request → broadcast ke semua PMI.
 * Urgency BUKAN input pasien — dihitung server dari stok PMI.
 */
export default function PatientDashboard() {
  // Role guard — auto-redirect kalau JWT bukan PASIEN
  const { me: guardMe, loading: guardLoading } = useRequireRole("PASIEN");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bloodType: "O",
    rhesusType: "POSITIVE",
    quantity: "1",
    targetHospitalName: "",
    targetHospitalAddress: "",
    reason: "",
  });

  useEffect(() => {
    if (guardMe) refresh();
  }, [guardMe]);

  async function refresh() {
    setLoading(true);
    const data = await api("/requests?mine=true").then((r) => r.json()).catch(() => ({ data: [] }));
    setRequests(data.data ?? []);
    setLoading(false);
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    // Defense in depth: HTML min=1 + JS guard + server validation
    const qty = Number(form.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      toast.error("Jumlah kantong harus angka bulat positif (minimal 1)");
      return;
    }
    if (!form.targetHospitalName.trim()) {
      toast.error("Nama RS tujuan kirim wajib diisi");
      return;
    }
    setSubmitting(true);
    const res = await api("/requests", {
      method: "POST",
      body: JSON.stringify({
        bloodType: form.bloodType,
        rhesusType: form.rhesusType,
        quantity: qty,
        targetHospitalName: form.targetHospitalName,
        targetHospitalAddress: form.targetHospitalAddress || undefined,
        reason: form.reason || undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Permintaan dikirim ke semua PMI nasional");
      setForm((f) => ({ ...f, quantity: "1", reason: "" }));
      refresh();
    } else {
      toast.error((await res.json()).error ?? "Gagal mengirim permintaan");
    }
  }

  const activeCount = requests.filter((r) => !["FULFILLED", "REJECTED", "CANCELLED"].includes(r.reqStatus)).length;
  const fulfilledCount = requests.filter((r) => r.reqStatus === "FULFILLED").length;

  if (guardLoading || !guardMe) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Memverifikasi sesi...</div>
      </main>
    );
  }

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
          <Link href="/dashboard/patient/profile">
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
        subtitle="Broadcast ke semua PMI nasional — PMI pertama yang accept akan memproses"
        icon={<Icons.Drop />}
        variant="highlight"
      >
        <form onSubmit={submitRequest} className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SelectField label="Golongan Darah" value={form.bloodType}
              onChange={(v) => setForm({ ...form, bloodType: v })}
              options={[["A", "A"], ["B", "B"], ["AB", "AB"], ["O", "O"]]} />
            <SelectField label="Rhesus" value={form.rhesusType}
              onChange={(v) => setForm({ ...form, rhesusType: v })}
              options={[["POSITIVE", "Rh+"], ["NEGATIVE", "Rh-"]]} />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kantong</label>
              <input
                type="number" min={1} step={1} required
                value={form.quantity}
                onChange={(e) => {
                  // Strip leading zeros + reject negative on input.
                  const raw = e.target.value.replace(/^0+(?=\d)/, "").replace(/-/g, "");
                  setForm({ ...form, quantity: raw });
                }}
                onBlur={() => {
                  const n = Number(form.quantity);
                  if (!Number.isInteger(n) || n < 1) {
                    setForm((f) => ({ ...f, quantity: "1" }));
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                placeholder="1"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Minimal 1 kantong</p>
            </div>
          </div>

          {/* RS tujuan kirim — replacement untuk urgency input */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">🏥 RS Tujuan Kirim</p>
            <div className="grid md:grid-cols-2 gap-2">
              <input
                type="text" required
                value={form.targetHospitalName}
                onChange={(e) => setForm({ ...form, targetHospitalName: e.target.value })}
                placeholder="Nama RS tempat pasien dirawat"
                className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
              />
              <input
                type="text"
                value={form.targetHospitalAddress}
                onChange={(e) => setForm({ ...form, targetHospitalAddress: e.target.value })}
                placeholder="Alamat RS (opsional)"
                className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
              />
            </div>
            <p className="text-[10px] text-blue-700">PMI akan mengantar darah ke alamat ini setelah accept request.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan / Keterangan (opsional)</label>
            <textarea
              rows={2} value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Contoh: Pasca operasi caesar, perlu transfusi"
              className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition text-sm resize-none"
            />
          </div>

          <Button type="submit" loading={submitting} fullWidth size="lg" icon={<Icons.Heart />}>
            Kirim Permintaan ke Semua PMI
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
            description="Ajukan permintaan darah lewat form di atas."
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
                      🏥 {r.targetHospitalName ?? "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      {r.acceptedByPmi && <> · diterima {r.acceptedByPmi.pmiName}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UrgencyBadge urgency={r.urgency} />
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

// Urgency dihitung server-side dari ketersediaan stok PMI.
// CRITICAL = stok PMI nasional <5 → merah
// URGENT   = stok <20 → oranye
// NORMAL   = stok cukup → hijau
function UrgencyBadge({ urgency }: { urgency: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    CRITICAL: { label: "🔴 Stok Kritis", cls: "bg-red-100 text-red-700 border-red-200" },
    URGENT:   { label: "🟠 Stok Tipis",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
    NORMAL:   { label: "🟢 Stok Cukup",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const c = cfg[urgency] ?? cfg.NORMAL;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${c.cls}`}>
      {c.label}
    </span>
  );
}
