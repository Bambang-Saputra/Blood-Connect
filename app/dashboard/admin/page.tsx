"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons as UIIcons } from "../../lib/ui";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Icons = { ...UIIcons, Shield: UIIcons.Heart }; 

export default function AdminDashboard() {
  const [unverifiedHospitals, setUnverifiedHospitals] = useState<any[]>([]);
  const [verifiedHospitals, setVerifiedHospitals] = useState<any[]>([]); // Menyimpan data RS yg sudah verified
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [stuckRequests, setStuckRequests] = useState<any[]>([]);
  const [liveRequests, setLiveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const [hUnverified, hVerified, s, r, allReq] = await Promise.all([
      api("/admin/pmis?status=UNVERIFIED").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/pmis?status=VERIFIED").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/schedules?status=PENDING").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/requests?status=PENDING").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/requests").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);

    setUnverifiedHospitals(hUnverified.data ?? []);
    setVerifiedHospitals(hVerified.data ?? []);
    setPendingSchedules(s.data ?? []);
    setStuckRequests(r.data ?? []);
    setLiveRequests(allReq.data ?? []);
    setLoading(false);
  }

  async function verifyHospital(id: string, status: "VERIFIED" | "SUSPENDED") {
    if (!confirm(`Yakin set status PMI ke ${status}?`)) return;
    const res = await api(`/admin/pmis/${id}/verify`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (res.ok) { toast.success(`Status PMI berhasil diubah menjadi ${status}`); refresh(); }
    else toast.error("Gagal mengubah status PMI");
  }

  async function actSchedule(id: string, status: string, newDate?: string) {
    const res = await api(`/admin/schedules/${id}`, { method: "PATCH", body: JSON.stringify({ status, newDate }) });
    if (res.ok) { toast.success(`Jadwal ${status.toLowerCase()}`); refresh(); }
    else toast.error("Gagal update jadwal");
  }

  const chartData = [
    { name: 'PMI Verified', total: verifiedHospitals.length, color: '#10b981' },
    { name: 'PMI Pending', total: unverifiedHospitals.length, color: '#f97316' },
    { name: 'Jadwal Pending', total: pendingSchedules.length, color: '#3b82f6' },
    { name: 'Request Pending', total: stuckRequests.length, color: '#ef4444' },
  ];

  return (
    <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kontrol sistem, statistik, & verifikasi data nasional</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* 1. Infografis */}
      <section className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Icons.Search /> Ringkasan Sistem Nasional
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 grid grid-cols-2 gap-4">
            <StatCard icon="🏛️" label="PMI Terdaftar" value={verifiedHospitals.length} gradient="from-emerald-500 to-teal-600" />
            <StatCard icon="⏳" label="PMI Pending Verifikasi" value={unverifiedHospitals.length} gradient="from-orange-500 to-amber-600" />
            <StatCard icon="📅" label="Jadwal Pending" value={pendingSchedules.length} gradient="from-blue-500 to-indigo-600" />
            <StatCard icon="📋" label="Request Pending" value={stuckRequests.length} gradient="from-red-500 to-rose-600" />
          </div>
          <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-100 p-4 h-72">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Grafik Beban Sistem</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 2. Verifikasi RS Baru */}
      <Card title={`Verifikasi PMI Baru (${unverifiedHospitals.length})`}
        subtitle="RS baru daftar yang menunggu approval Anda"
        icon={<Icons.Search />}>
        {loading ? <LoadingRows /> : unverifiedHospitals.length === 0 ? (
          <EmptyState icon="✨" title="Semua antrean PMI kosong" description="Tidak ada PMI baru menunggu verifikasi." />
        ) : (
          <div className="space-y-2">
            {unverifiedHospitals.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition">
                <div>
                  <p className="font-semibold">{h.pmiName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{h.pmiCode}</code>
                    {" · "}{h.pmiLoc}{" · "}{h.user?.city}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Icons.Check />} onClick={() => verifyHospital(h.id, "VERIFIED")}>Verify</Button>
                  <Button variant="danger" size="sm" icon={<Icons.X />} onClick={() => verifyHospital(h.id, "SUSPENDED")}>Tolak</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Manajemen PMI Aktif */}
      <Card title={`Manajemen PMI Aktif (${verifiedHospitals.length})`}
        subtitle="Daftar PMI yang sudah beroperasi di sistem"
        icon={<Icons.Shield />}>
        {loading ? <LoadingRows /> : verifiedHospitals.length === 0 ? (
          <EmptyState icon="🏛️" title="Belum ada PMI Aktif" description="Silakan verifikasi PMI terlebih dahulu." />
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {verifiedHospitals.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-700">{h.pmiName}</p>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{h.pmiLoc} · {h.user?.email}</p>
                </div>
                <Button variant="danger" size="sm" icon={<Icons.X />} onClick={() => verifyHospital(h.id, "SUSPENDED")}>
                  Suspend PMI
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Jadwal Donor Pending */}
      <Card title={`Jadwal Donor Pending (${pendingSchedules.length})`}
        subtitle="Pendonor yang menunggu konfirmasi jadwal"
        icon={<Icons.Calendar />}>
        {loading ? <LoadingRows /> : pendingSchedules.length === 0 ? (
          <EmptyState icon="📭" title="Tidak ada jadwal pending" />
        ) : (
          <div className="space-y-2">
            {pendingSchedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-sm transition">
                <div>
                  <p className="font-semibold">{s.donor?.user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(s.jadwal).toLocaleDateString("id-ID", { dateStyle: "full" })} · Sesi {s.sesi}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Icons.Check />} onClick={() => actSchedule(s.id, "CONFIRMED")}>Confirm</Button>
                  <Button variant="danger" size="sm" icon={<Icons.X />} onClick={() => actSchedule(s.id, "REJECTED")}>Reject</Button>
                  <Button variant="secondary" size="sm" onClick={() => {
                      const d = prompt("Tanggal baru (YYYY-MM-DD)?");
                      if (d) actSchedule(s.id, "RESCHEDULED", new Date(d).toISOString());
                    }}>Reschedule</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Live Feed Permintaan Darah */}
      <Card title="Live Feed Permintaan Darah" subtitle="Pantau antrean request dari seluruh PMI secara real-time" icon={<Icons.Refresh />}>
        {loading ? <LoadingRows /> : liveRequests.length === 0 ? (
           <EmptyState icon="📡" title="Sistem Tenang" description="Belum ada aktivitas request terbaru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">ID / Timestamp</th>
                  <th className="px-4 py-3">Pemohon</th>
                  <th className="px-4 py-3">Golongan</th>
                  <th className="px-4 py-3 rounded-tr-lg">Status & Urgensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {liveRequests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-400">#{req.id.slice(0,8)}</div>
                      <div className="text-xs text-slate-500 mt-1">Baru saja</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{req.patient?.user?.name || req.acceptedByPmi?.pmiName || "Pasien Mandiri"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-red-200 text-red-700 bg-red-50">
                        {req.bloodType}{req.rhesusType === "POSITIVE" ? "+" : "-"}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">{req.quantity} Kantong</span>
                    </td>
                    <td className="px-4 py-3"><Badge status={req.status || "PENDING"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 8. Panel Audit Log */}
      <Card title="System Audit Logs" subtitle="Jejak aktivitas perubahan data sensitif (Immutable Record)" icon={<Icons.Shield />}>
        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs overflow-x-auto h-64 overflow-y-auto border border-slate-800 shadow-inner">
          <table className="w-full text-left text-slate-300 min-w-max">
            <thead className="border-b border-slate-700 text-slate-500">
              <tr>
                <th className="pb-3 pl-2 font-semibold">TIMESTAMP</th>
                <th className="pb-3 font-semibold">AKTOR</th>
                <th className="pb-3 font-semibold">AKSI</th>
                <th className="pb-3 font-semibold">TARGET ENTITAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-800/80 transition cursor-default">
                <td className="py-2.5 pl-2 text-emerald-400">2026-05-26 10:05:12</td>
                <td className="py-2.5">Admin (admin@bloodconnect.id)</td>
                <td className="py-2.5 text-blue-400 font-bold">VERIFY_HOSPITAL</td>
                <td className="py-2.5 text-slate-400">RS Fatmawati (#RS-992)</td>
              </tr>
              <tr className="hover:bg-slate-800/80 transition cursor-default">
                <td className="py-2.5 pl-2 text-emerald-400">2026-05-26 09:42:00</td>
                <td className="py-2.5">System (Cron Job)</td>
                <td className="py-2.5 text-yellow-400 font-bold">MARK_EXPIRED</td>
                <td className="py-2.5 text-slate-400">Stok Darah (#STK-102)</td>
              </tr>
              <tr className="hover:bg-slate-800/80 transition cursor-default">
                <td className="py-2.5 pl-2 text-emerald-400">2026-05-26 08:15:33</td>
                <td className="py-2.5">Admin (admin@bloodconnect.id)</td>
                <td className="py-2.5 text-red-400 font-bold">SUSPEND_HOSPITAL</td>
                <td className="py-2.5 text-slate-400">RS Surya Husada (#RS-004)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

    </main>
  );
}

function StatCard({ icon, label, value, gradient }: { icon: string; label: string; value: number; gradient: string }) {
  return (
    <div className={`relative bg-gradient-to-br ${gradient} text-white p-4 rounded-xl shadow-sm overflow-hidden flex flex-col justify-center`}>
      <div className="absolute -right-2 -bottom-2 text-5xl opacity-20">{icon}</div>
      <div className="relative z-10">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-white/90 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );
}