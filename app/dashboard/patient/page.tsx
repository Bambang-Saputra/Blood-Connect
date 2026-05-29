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
 * Flow: Patient → request → PMI ACC → ship to RS → delivered → fulfilled
 */
export default function PatientDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    bloodType: "O", rhesusType: "POSITIVE", quantity: "1",
    targetHospitalName: "", targetHospitalAddress: "",
    doctorName: "", familyContact: "",
  });

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const data = await api("/requests").then((r) => r.json()).catch(() => ({ data: [] }));
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
    if (qty > 20) {
      toast.error("Maksimal 20 kantong per request");
      return;
    }
    if (form.targetHospitalName.trim().length < 2) {
      toast.error("Nama RS tujuan wajib diisi");
      return;
    }
    if (form.targetHospitalAddress.trim().length < 5) {
      toast.error("Alamat RS wajib diisi");
      return;
    }

    setSubmitting(true);
    const res = await api("/requests", {
      method: "POST",
      body: JSON.stringify({ ...form, quantity: qty }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Permintaan dikirim ke PMI. Menunggu konfirmasi.");
      setForm({
        bloodType: "O", rhesusType: "POSITIVE", quantity: "1",
        targetHospitalName: "", targetHospitalAddress: "",
        doctorName: "", familyContact: "",
      });
      refresh();
    } else {
      toast.error((await res.json()).error ?? "Gagal mengirim permintaan");
    }
  }

  const activeCount = requests.filter((r) => !["FULFILLED", "REJECTED", "CANCELLED"].includes(r.reqStatus)).length;
  const fulfilledCount = requests.filter((r) => r.reqStatus === "FULFILLED").length;

  return (
    <main className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-red-500 bg-clip-text text-transparent">
            Dashboard Pasien
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ajukan permintaan darah ke PMI</p>
        </div>
        <div className="flex items-center gap-2">
          <ModeSwitcher currentRole="PASIEN" />
          <NotificationBell />
          <Link href="/dashboard/patient/profile">
            <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<Icons.Logout />}
            onClick={() => { clearToken(); location.href = "/"; }}>Keluar</Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="📋" label="Total Permintaan" value={requests.length} color="from-slate-100 to-slate-50" />
        <StatCard icon="⏳" label="Aktif Diproses" value={activeCount} color="from-amber-100 to-orange-50" />
        <StatCard icon="✅" label="Terpenuhi" value={fulfilledCount} color="from-emerald-100 to-green-50" />
      </section>

      <Card
        title="Ajukan Permintaan Darah"
        subtitle="PMI akan otomatis memproses & mengirim darah ke RS tujuan"
        icon={<Icons.Drop />}
        variant="highlight"
      >
        <form onSubmit={submitRequest} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <SelectField label="Golongan Darah" value={form.bloodType}
              onChange={(v) => setForm({ ...form, bloodType: v })}
              options={[["A", "A"], ["B", "B"], ["AB", "AB"], ["O", "O"]]} />
            <SelectField label="Rhesus" value={form.rhesusType}
              onChange={(v) => setForm({ ...form, rhesusType: v })}
              options={[["POSITIVE", "Rh+"], ["NEGATIVE", "Rh-"]]} />
            <NumberField label="Jumlah Kantong (min 1, max 20)" value={form.quantity}
              onChange={(v) => setForm({ ...form, quantity: v })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="Nama RS Tujuan *" value={form.targetHospitalName}
              onChange={(v) => setForm({ ...form, targetHospitalName: v })}
              placeholder="RS Cipto Mangunkusumo" required />
            <TextField label="Alamat RS Lengkap *" value={form.targetHospitalAddress}
              onChange={(v) => setForm({ ...form, targetHospitalAddress: v })}
              placeholder="Jl. Diponegoro 71, Jakarta Pusat" required />
            <TextField label="Nama Dokter Penanggung Jawab" value={form.doctorName}
              onChange={(v) => setForm({ ...form, doctorName: v })}
              placeholder="Dr. Budi (opsional)" />
            <TextField label="Kontak Keluarga" value={form.familyContact}
              onChange={(v) => setForm({ ...form, familyContact: v })}
              placeholder="08123xxx (opsional)" />
          </div>

          <Button type="submit" loading={submitting} fullWidth size="lg" icon={<Icons.Heart />}>
            Kirim Permintaan ke PMI
          </Button>
        </form>
      </Card>

      <Card title={`Status Permintaan Saya (${requests.length})`} icon={<Icons.Calendar />}>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : requests.length === 0 ? (
          <EmptyState icon="📭" title="Belum ada permintaan"
            description="Ajukan permintaan darah lewat form di atas." />
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function RequestCard({ request: r }: { request: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
          {r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold">{r.quantity} kantong</p>
            <Badge status={r.reqStatus} />
          </div>
          <div className="text-xs text-slate-600 space-y-0.5">
            <p>🏥 <strong>RS Tujuan:</strong> {r.targetHospitalName ?? "-"}</p>
            {r.targetHospitalAddress && <p>📍 {r.targetHospitalAddress}</p>}
            {r.pmi && <p>🩸 <strong>Diproses:</strong> {r.pmi.pmiName}</p>}
            <p className="text-slate-400 text-[10px]">
              {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>

          {r.reqStatus === "ACC" && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs text-emerald-800">
              ✅ <strong>PMI sudah ACC.</strong> Stok dialokasikan. Tunggu pengiriman ke RS Anda.
            </div>
          )}
          {r.reqStatus === "SHIPPED" && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
              🚚 <strong>Sedang dikirim</strong> dari {r.pmi?.pmiName} ke {r.targetHospitalName}.
            </div>
          )}
          {r.reqStatus === "DELIVERED" && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
              🏥 <strong>Sudah sampai!</strong> Darah telah diterima di {r.targetHospitalName}.
            </div>
          )}
          {r.reqStatus === "REJECTED" && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
              ❌ <strong>Ditolak.</strong> {r.rejectedReason ?? "Hubungi PMI untuk info lebih lanjut."}
            </div>
          )}
          {r.reqStatus === "SEARCHING" && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
              🔍 <strong>Stok kosong.</strong> PMI sedang broadcast ke pendonor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-slate-200 rounded-xl p-4 flex items-center gap-3`}>
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
        className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type="number" min={1} max={20} step={1}
        value={value}
        onChange={(e) => {
          let v = e.target.value.replace(/^0+(?=\d)/, "");
          if (Number(v) < 0) v = "1";
          onChange(v);
        }}
        onFocus={(e) => e.target.select()}
        className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
        placeholder="1"
      />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type="text" required={required} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-red-500 outline-none"
      />
    </div>
  );
}
