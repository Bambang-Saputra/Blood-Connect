"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";
import { toast } from "../../lib/toast";
import { NotificationBell } from "../../lib/NotificationBell";
import { Button, Card, Badge, EmptyState, Icons } from "../../lib/ui";

/**
 * DASHBOARD: ADMIN (SIMPLIFIED)
 * Tugas: verify PMI registration. Itu saja.
 */
export default function AdminDashboard() {
  const [unverifiedPmis, setUnverifiedPmis] = useState<any[]>([]);
  const [verifiedPmis, setVerifiedPmis] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    const [u, v, r, all] = await Promise.all([
      api("/admin/pmis?status=UNVERIFIED").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/pmis?status=VERIFIED").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/requests").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/admin/users").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setUnverifiedPmis(u.data ?? []);
    setVerifiedPmis(v.data ?? []);
    setAllRequests(r.data ?? []);
    setAllUsers(all.data ?? []);
    setLoading(false);
  }

  async function verifyPmi(id: string, status: "VERIFIED" | "SUSPENDED") {
    if (!confirm(`Yakin set status PMI ke ${status}?`)) return;
    const res = await api(`/admin/pmis/${id}/verify`, {
      method: "PATCH", body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`PMI di-${status.toLowerCase()}`); refresh(); }
    else toast.error("Gagal verify");
  }

  return (
    <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Dashboard Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">Verifikasi PMI & monitoring sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link href="/dashboard/profile">
            <Button variant="ghost" size="sm" icon={<Icons.User />}>Profil</Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<Icons.Logout />}
            onClick={() => { clearToken(); location.href = "/"; }}>Keluar</Button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="⏳" label="PMI Pending" value={unverifiedPmis.length} gradient="from-orange-500 to-amber-600" />
        <StatCard icon="✅" label="PMI Verified" value={verifiedPmis.length} gradient="from-emerald-500 to-green-600" />
        <StatCard icon="📋" label="Total Request" value={allRequests.length} gradient="from-blue-500 to-indigo-600" />
        <StatCard icon="👥" label="Total User" value={allUsers.length} gradient="from-red-500 to-rose-600" />
      </section>

      {/* Verifikasi PMI Pending */}
      <Card title={`⏳ Verifikasi PMI Baru (${unverifiedPmis.length})`}
        subtitle="PMI yang menunggu approval Anda" icon={<Icons.Search />} variant="highlight">
        {loading ? <Loader /> : unverifiedPmis.length === 0 ? (
          <EmptyState icon="✨" title="Semua PMI sudah diverifikasi" />
        ) : (
          <div className="space-y-2">
            {unverifiedPmis.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-white border-2 border-amber-200 rounded-xl">
                <div>
                  <p className="font-semibold">{p.pmiName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{p.pmiCode}</code>
                    {" · "}{p.pmiLoc}{" · "}{p.user?.city}
                  </p>
                  <p className="text-xs text-slate-400">{p.user?.email} · {p.user?.phoneNum}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" icon={<Icons.Check />}
                    onClick={() => verifyPmi(p.id, "VERIFIED")}>Verify</Button>
                  <Button variant="danger" size="sm" icon={<Icons.X />}
                    onClick={() => verifyPmi(p.id, "SUSPENDED")}>Suspend</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* List PMI Verified */}
      <Card title={`✅ PMI Aktif (${verifiedPmis.length})`} icon={<Icons.Check />}>
        {verifiedPmis.length === 0 ? <EmptyState icon="📭" title="Belum ada PMI aktif" /> : (
          <div className="grid sm:grid-cols-2 gap-2">
            {verifiedPmis.map((p) => (
              <div key={p.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="font-semibold text-sm">{p.pmiName}</p>
                <p className="text-xs text-slate-600">{p.pmiCode} · {p.user?.city}</p>
                <Badge status="VERIFIED" className="mt-1" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Audit: All Requests (read-only) */}
      <Card title={`📋 Audit: Semua Permintaan (${allRequests.length})`} icon={<Icons.Search />}>
        <details>
          <summary className="cursor-pointer text-sm text-slate-600">Lihat list lengkap</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 uppercase font-semibold border-b">
                  <th className="py-2">Tgl</th><th>Pasien</th><th>Golongan</th><th>Qty</th><th>PMI</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allRequests.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-1.5">{new Date(r.createdAt).toLocaleDateString("id-ID")}</td>
                    <td>{r.patient?.user?.name ?? "-"}</td>
                    <td className="font-bold text-red-600">{r.bloodType}{r.rhesusType === "POSITIVE" ? "+" : "-"}</td>
                    <td>{r.quantity}</td>
                    <td>{r.pmi?.pmiName ?? "-"}</td>
                    <td><Badge status={r.reqStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
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

function Loader() {
  return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>;
}
