"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, clearToken } from "../../lib/api";

/**
 * DASHBOARD: PENDONOR (medical workflow)
 *
 * Flow lengkap untuk donor darah:
 *   1. Isi kuesioner skrining (di halaman /dashboard/donor/screening)
 *   2. Lakukan pemeriksaan fisik di RS (diinput nakes/RS)
 *   3. Cek kelayakan (sistem evaluasi semua kriteria medis)
 *   4. Kalau eligible → daftar jadwal donor
 *   5. Pantau notifikasi MatchSystem (permintaan darah dari pasien)
 */

type Eligibility = { eligible: boolean; reasons: string[]; missingData?: string[]; checkedAt: string };
type Me = {
  id: string; bloodType: string; rhesusType: string;
  isEligible: boolean; eligibilityReason?: string;
  user: { name: string; email: string; city: string; birthDate?: string };
  checkups: any[]; screenings: any[];
};
type Notif = {
  id: string; requestId: string;
  request: { id: string; bloodType: string; rhesusType: string; quantity: number; urgency: string; component: string };
};

export default function DonorDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const [meRes, notifRes, histRes] = await Promise.all([
      api("/donor/me").then((r) => r.json()).catch(() => null),
      api("/donor/notifications").then((r) => r.json()).catch(() => ({ data: [] })),
      api("/donor/history").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setMe(meRes);
    setNotifs(notifRes.data ?? []);
    setHistory(histRes.data ?? []);
  }

  async function handleCheckEligible() {
    setLoading(true);
    const res = await api("/donor/check-eligible", { method: "POST" });
    setEligibility(await res.json());
    setLoading(false);
    refresh();
  }

  async function handleRespond(reqId: string, accepted: boolean) {
    await api(`/donor/notifications/${reqId}/respond`, {
      method: "POST", body: JSON.stringify({ accepted }),
    });
    refresh();
  }

  if (!me) return <main className="p-8">Memuat...</main>;

  const lastCheckup = me.checkups[0];
  const lastScreening = me.screenings[0];

  return (
    <main className="max-w-6xl mx-auto p-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Halo, {me.user.name}</h1>
          <p className="text-slate-500 text-sm">
            Golongan: {me.bloodType}{me.rhesusType === "POSITIVE" ? "+" : "-"} · Kota: {me.user.city}
          </p>
        </div>
        <button
          onClick={() => { clearToken(); location.href = "/"; }}
          className="text-sm text-slate-500 hover:text-red-600"
        >
          Logout
        </button>
      </header>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg ${me.isEligible ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
        <p className="font-semibold">
          {me.isEligible ? "✅ Anda LAYAK donor" : "⚠️ Belum layak donor"}
        </p>
        {me.eligibilityReason && <p className="text-sm mt-1 text-slate-600">{me.eligibilityReason}</p>}
      </div>

      {/* Step-by-step workflow */}
      <section className="grid md:grid-cols-3 gap-4">
        <StepCard
          step={1} title="Kuesioner Skrining"
          status={lastScreening ? (lastScreening.passed ? "done" : "warning") : "todo"}
          desc={lastScreening
            ? `Diisi ${new Date(lastScreening.answeredAt).toLocaleString("id-ID")} ${lastScreening.passed ? "(Lolos)" : "(Belum lolos)"}`
            : "Isi kuesioner kesehatan dulu"}
          href="/dashboard/donor/screening"
        />
        <StepCard
          step={2} title="Pemeriksaan Fisik"
          status={lastCheckup ? (lastCheckup.passed ? "done" : "warning") : "todo"}
          desc={lastCheckup
            ? `Hb: ${lastCheckup.hemoglobinLevel}, BP: ${lastCheckup.systolicBP}/${lastCheckup.diastolicBP}, BB: ${lastCheckup.weight}kg`
            : "Belum ada pemeriksaan. Datang ke RS/UTD"}
        />
        <StepCard
          step={3} title="Cek Kelayakan & Daftar"
          status={me.isEligible ? "done" : "todo"}
          desc={me.isEligible ? "Anda bisa daftar jadwal donor" : "Jalankan cek setelah skrining + pemeriksaan"}
          action={<button onClick={handleCheckEligible} disabled={loading} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
            {loading ? "Cek..." : "Cek Kelayakan"}
          </button>}
        />
      </section>

      {eligibility && (
        <div className={`p-4 rounded ${eligibility.eligible ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          <p className="font-semibold">{eligibility.eligible ? "✅ Eligible!" : "❌ Tidak eligible"}</p>
          {eligibility.missingData && eligibility.missingData.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Data belum lengkap:</p>
              <ul className="list-disc list-inside text-sm">
                {eligibility.missingData.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          {eligibility.reasons.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium">Alasan:</p>
              <ul className="list-disc list-inside text-sm">
                {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Notifikasi MatchSystem */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Permintaan Darah untuk Anda ({notifs.length})</h2>
        {notifs.length === 0 ? (
          <p className="text-slate-500 text-sm">Belum ada permintaan saat ini.</p>
        ) : (
          notifs.map((n) => (
            <div key={n.id} className="border p-4 rounded mb-2 flex justify-between items-center">
              <div>
                <p className="font-medium">
                  {n.request.bloodType}{n.request.rhesusType === "POSITIVE" ? "+" : "-"} — {n.request.quantity} kantong ({n.request.component})
                </p>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  n.request.urgency === "CRITICAL" ? "bg-red-100 text-red-700" :
                  n.request.urgency === "URGENT" ? "bg-orange-100 text-orange-700" :
                  "bg-slate-100"
                }`}>{n.request.urgency}</span>
              </div>
              <div className="space-x-2">
                <button onClick={() => handleRespond(n.requestId, true)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Bersedia</button>
                <button onClick={() => handleRespond(n.requestId, false)} className="bg-slate-300 px-3 py-1 rounded text-sm">Tolak</button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Riwayat */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Riwayat Donor</h2>
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">Belum ada riwayat.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500"><th>Tanggal</th><th>Lokasi</th><th>Komponen</th><th>Volume</th></tr></thead>
            <tbody>
              {history.map((h: any) => (
                <tr key={h.id} className="border-t">
                  <td>{new Date(h.donationDate).toLocaleDateString("id-ID")}</td>
                  <td>{h.location}</td>
                  <td>{h.component}</td>
                  <td>{h.volumeMl} mL</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function StepCard({ step, title, status, desc, href, action }: {
  step: number; title: string; status: "done" | "todo" | "warning";
  desc: string; href?: string; action?: React.ReactNode;
}) {
  const icon = status === "done" ? "✅" : status === "warning" ? "⚠️" : "⭕";
  const card = (
    <div className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Step {step}</span> {icon}
      </div>
      <h3 className="font-semibold mt-1">{title}</h3>
      <p className="text-xs text-slate-600 mt-1">{desc}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
