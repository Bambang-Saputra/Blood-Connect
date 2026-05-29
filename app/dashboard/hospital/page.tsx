"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: PMI (Palang Merah Indonesia / UTD)
 */

export default function PmiDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonorId, setSelectedDonorId] = useState("");
  const [donorSearch, setDonorSearch] = useState("");

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const [r, s, d, sc] = await Promise.all([
      api("/requests").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/stocks/mine").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/pmi/donors").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/pmi/schedules").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setRequests(r.data ?? []);
    setStocks(s.data ?? []);
    setDonors(d.data ?? []);
    setSchedules(sc.data ?? []);
    setLoading(false);
  }

  async function accRequest(id: string) {
    if (!confirm("ACC permintaan ini? Stok akan dialokasikan otomatis.")) return;
    const res = await api(`/pmi/requests/${id}/acc`, { method: "POST" });
    const data = await res.json();
    if (res.ok) { toast.success("Request ACC, stok dialokasikan"); refresh(); }
    else toast.error(data.error ?? "Gagal ACC");
  }

  async function updateRequestStatus(id: string, newStatus: string) {
    if (!confirm(`Update status ke ${newStatus}?`)) return;
    const res = await api(`/requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ newStatus }),
    });
    if (res.ok) { toast.success(`Status: ${newStatus}`); refresh(); }
    else toast.error("Gagal update");
  }

  async function broadcastBlood(bt: string, rh: string) {
    if (!confirm(`Broadcast minta donor ${bt}${rh === "POSITIVE" ? "+" : "-"} ke semua pendonor terdaftar?`)) return;
    const res = await api("/pmi/broadcast", {
      method: "POST",
      body: JSON.stringify({ bloodType: bt, rhesusType: rh, urgencyLevel: "URGENT" }),
    });
    const data = await res.json();
    if (res.ok) toast.success(`Broadcast ke ${data.notifiedCount} pendonor`);
    else toast.error(data.error ?? "Gagal broadcast");
  }

  const totalAvailable = stocks.filter((s) => s.status === "AVAILABLE").reduce((sum, s) => sum + s.quantity, 0);
  const pendingReqs = requests.filter((r) => r.reqStatus === "PENDING");
  const accReqs = requests.filter((r) => ["ACC", "SHIPPED", "DELIVERED"].includes(r.reqStatus));

  const filteredDonors = donors.filter((d) => {
    const q = donorSearch.toLowerCase();
    return !q || d.user.name.toLowerCase().includes(q) || d.user.email.toLowerCase().includes(q);
  });
  const selectedDonor = donors.find((d) => d.id === selectedDonorId);

  return (
    <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-rose-500 bg-clip-text text-transparent">
            Dashboard PMI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola permintaan pasien, donor, & stok darah</p>
        </div>
        <div className="flex gap-2 items-center">
          <NotificationBell />
          <Link href="/dashboard/hospital/profile">
            <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<Icons.Logout />}
            onClick={() => { clearToken(); location.href = "/"; }}>Keluar</Button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="🩸" label="Total Stok" value={totalAvailable} gradient="from-red-500 to-rose-600" />
        <StatCard icon="📋" label="Request Pending" value={pendingReqs.length} gradient="from-amber-500 to-orange-600" />
        <StatCard icon="👤" label="Pendonor Terdaftar" value={donors.length} gradient="from-blue-500 to-indigo-600" />
        <StatCard icon="📅" label="Jadwal Donor" value={schedules.length} gradient="from-emerald-500 to-green-600" />
      </section>

      {/* Permintaan Pasien */}
      <Card title={`📋 Permintaan Pasien (${pendingReqs.length} pending)`} icon={<Icons.Heart />} variant="highlight">
        {loading ? <Loader /> : pendingReqs.length === 0 && accReqs.length === 0 ? (
          <EmptyState icon="📭" title="Belum ada permintaan dari pasien" />
        ) : (
          <div className="space-y-3">
            {pendingReqs.map((r) => (
              <PatientRequestCard key={r.id} r={r} onAcc={() => accRequest(r.id)}
                onReject={() => updateRequestStatus(r.id, "REJECTED")} />
            ))}
            {accReqs.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  Lihat request yang sudah diproses ({accReqs.length})
                </summary>
                <div className="space-y-2 mt-2">
                  {accReqs.map((r) => (
                    <ProcessedRequestCard key={r.id} r={r}
                      onShip={() => updateRequestStatus(r.id, "SHIPPED")}
                      onDeliver={() => updateRequestStatus(r.id, "DELIVERED")}
                      onFulfill={() => updateRequestStatus(r.id, "FULFILLED")} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </Card>

      {/* Pendonor */}
      <Card title={`👤 Pendonor Terdaftar di PMI Ini (${donors.length})`}
        subtitle="Pilih pendonor untuk input pemeriksaan fisik & ambil darah">
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={donorSearch}
            onChange={(e) => setDonorSearch(e.target.value)}
            placeholder="🔍 Cari nama atau email pendonor..."
            className="flex-1 border border-slate-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
          />
          <select
            value={selectedDonorId}
            onChange={(e) => setSelectedDonorId(e.target.value)}
            className="border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
          >
            <option value="">— Pilih Donor —</option>
            {filteredDonors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.name} ({d.bloodType}{d.rhesusType === "POSITIVE" ? "+" : "-"})
              </option>
            ))}
          </select>
        </div>

        {selectedDonor && (
          <DonorActionBox donor={selectedDonor} onChanged={refresh} />
        )}
      </Card>

      {/* Stok */}
      <Card title="🩸 Stok Darah" subtitle={`${stocks.length} batch · ${totalAvailable} kantong tersedia`}>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-4">
          {["A", "B", "AB", "O"].flatMap((bt) =>
            ["POSITIVE", "NEGATIVE"].map((rh) => {
              const total = stocks
                .filter((s) => s.bloodType === bt && s.rhesusType === rh && s.status === "AVAILABLE")
                .reduce((sum, s) => sum + s.quantity, 0);
              const critical = total < 5;
              return (
                <div key={`${bt}${rh}`} className={`p-3 rounded-lg text-center border-2 ${
                  total === 0 ? "bg-slate-50 border-slate-200" :
                  critical ? "bg-red-50 border-red-300" :
                  "bg-emerald-50 border-emerald-200"
                }`}>
                  <p className={`text-xl font-bold ${total === 0 ? "text-slate-400" : critical ? "text-red-700" : "text-emerald-700"}`}>
                    {bt}{rh === "POSITIVE" ? "+" : "-"}
                  </p>
                  <p className="text-xs text-slate-600">{total} kantong</p>
                  {(critical || total === 0) && (
                    <button onClick={() => broadcastBlood(bt, rh)}
                      className={`mt-1 text-[10px] text-white px-2 py-0.5 rounded-full font-semibold ${
                        total === 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                      }`}>
                      {total === 0 ? "🚨 Minta Donor" : "📢 Broadcast"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Jadwal */}
      <Card title={`📅 Jadwal Donor Masuk (${schedules.length})`}>
        {schedules.length === 0 ? (
          <EmptyState icon="📭" title="Belum ada jadwal donor" />
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex justify-between items-center border p-3 rounded-lg">
                <div>
                  <p className="font-medium">{s.donor.user.name} <span className="text-xs text-slate-500">({s.donor.user.phoneNum})</span></p>
                  <p className="text-xs text-slate-600">
                    {new Date(s.jadwal).toLocaleDateString("id-ID", { dateStyle: "full" })} · Sesi {s.sesi}
                  </p>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function PatientRequestCard({ r, onAcc, onReject }: { r: any; onAcc: () => void; onReject: () => void }) {
  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center font-bold shadow-sm">
            {r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{r.patient?.user?.name ?? "Pasien"} — {r.quantity} kantong</p>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              <p>📞 {r.patient?.user?.phoneNum ?? "-"} · 📧 {r.patient?.user?.email ?? "-"}</p>
              <p>🏥 <strong>RS Tujuan:</strong> {r.targetHospitalName}</p>
              <p>📍 {r.targetHospitalAddress}</p>
              {r.doctorName && <p>👨‍⚕️ Dokter: {r.doctorName}</p>}
              {r.familyContact && <p>👨‍👩‍👧 Keluarga: {r.familyContact}</p>}
              <p className="text-slate-400 text-[10px]">{new Date(r.createdAt).toLocaleString("id-ID")}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="success" size="sm" icon={<Icons.Check />} onClick={onAcc}>ACC</Button>
          <Button variant="danger" size="sm" icon={<Icons.X />} onClick={onReject}>Tolak</Button>
        </div>
      </div>
    </div>
  );
}

function ProcessedRequestCard({ r, onShip, onDeliver, onFulfill }: any) {
  return (
    <div className="border rounded-lg p-3 flex justify-between items-center text-sm">
      <div>
        <p className="font-medium">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"} ({r.quantity}) · {r.patient?.user?.name}</p>
        <p className="text-xs text-slate-500">{r.targetHospitalName} · <Badge status={r.reqStatus} /></p>
      </div>
      <div className="flex gap-1">
        {r.reqStatus === "ACC" && <Button size="sm" onClick={onShip}>Ship 🚚</Button>}
        {r.reqStatus === "SHIPPED" && <Button size="sm" variant="success" onClick={onDeliver}>Delivered 🏥</Button>}
        {r.reqStatus === "DELIVERED" && <Button size="sm" variant="success" onClick={onFulfill}>Fulfill ✅</Button>}
      </div>
    </div>
  );
}

function DonorActionBox({ donor, onChanged }: { donor: any; onChanged: () => void }) {
  const [showCheckup, setShowCheckup] = useState(false);
  const lastCheckup = donor.checkups[0];

  async function takeBlood() {
    if (!confirm(`Ambil darah dari ${donor.user.name}? Stok bertambah 1 kantong ${donor.bloodType}${donor.rhesusType === "POSITIVE" ? "+" : "-"}.`)) return;
    const res = await api("/pmi/take-blood", {
      method: "POST",
      body: JSON.stringify({ donorId: donor.id, volumeMl: 450, component: "WHOLE_BLOOD", location: "PMI" }),
    });
    const data = await res.json();
    if (res.ok) { toast.success("Darah berhasil diambil!"); onChanged(); }
    else toast.error(data.error ?? "Gagal ambil darah");
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{donor.user.name}</p>
          <p className="text-xs text-slate-600">
            {donor.bloodType}{donor.rhesusType === "POSITIVE" ? "+" : "-"} ·
            {donor.isEligible ? <span className="text-emerald-700"> ✅ Eligible</span> : <span className="text-amber-700"> ⚠️ Belum eligible</span>}
            {donor.lastDonationDate && <> · Last: {new Date(donor.lastDonationDate).toLocaleDateString("id-ID")}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setShowCheckup(!showCheckup)} icon={<Icons.Plus />}>
            {showCheckup ? "Tutup" : "Pemeriksaan"}
          </Button>
          {donor.isEligible && (
            <Button size="sm" variant="success" icon={<Icons.Drop />} onClick={takeBlood}>
              Ambil Darah
            </Button>
          )}
        </div>
      </div>

      {lastCheckup && !showCheckup && (
        <p className="text-xs text-slate-600">
          📋 Last: Hb {lastCheckup.hemoglobinLevel}, BP {lastCheckup.systolicBP}/{lastCheckup.diastolicBP}, BB {lastCheckup.weight}kg ·
          {lastCheckup.passed ? <span className="text-emerald-700"> LOLOS</span> : <span className="text-red-700"> TIDAK LOLOS</span>}
        </p>
      )}

      {showCheckup && <CheckupForm donorId={donor.id} onDone={() => { setShowCheckup(false); onChanged(); }} />}
    </div>
  );
}

function CheckupForm({ donorId, onDone }: { donorId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    hemoglobinLevel: "14", systolicBP: "120", diastolicBP: "80",
    bodyTempC: "36.8", pulseRate: "75", weight: "60",
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await api("/pmi/checkup", {
      method: "POST",
      body: JSON.stringify({
        donorId,
        hemoglobinLevel: Number(form.hemoglobinLevel),
        systolicBP: Number(form.systolicBP),
        diastolicBP: Number(form.diastolicBP),
        bodyTempC: Number(form.bodyTempC),
        pulseRate: Number(form.pulseRate),
        weight: Number(form.weight),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      toast.success(data.message);
      onDone();
    } else toast.error("Gagal simpan");
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-3 gap-2 bg-white p-3 rounded border">
      {[
        ["hemoglobinLevel", "Hb (g/dL)", "12.5-17"],
        ["systolicBP", "Sistolik", "100-160"],
        ["diastolicBP", "Diastolik", "60-100"],
        ["bodyTempC", "Suhu (°C)", "36.5-37.5"],
        ["pulseRate", "Nadi (BPM)", "50-100"],
        ["weight", "BB (kg)", "≥45"],
      ].map(([key, label, hint]) => (
        <div key={key}>
          <label className="text-[10px] font-semibold text-slate-700">{label}</label>
          <input type="number" step="0.1" value={(form as any)[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            onFocus={(e) => e.target.select()}
            className="w-full border px-2 py-1 rounded text-xs" required />
          <p className="text-[9px] text-slate-400">{hint}</p>
        </div>
      ))}
      <div className="col-span-3 flex gap-2">
        <Button type="submit" size="sm" loading={submitting} icon={<Icons.Check />}>Simpan</Button>
      </div>
    </form>
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

function Loader() {
  return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>;
}
