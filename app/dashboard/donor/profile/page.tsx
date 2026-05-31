"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import { toast } from "../../../lib/toast";
import { useRequireRole } from "../../../lib/useRequireRole";
import { ProfileForm } from "../../../lib/ProfileForm";
import { Card, Icons, Button, Badge } from "../../../lib/ui";

/**
 * Profile page khusus PENDONOR.
 * Guard: useRequireRole("PENDONOR") — auto-redirect kalau JWT bukan donor.
 * Extra section: info donor + dropdown ubah PMI preferensi.
 */
export default function DonorProfilePage() {
  const { me: authMe, loading: authLoading } = useRequireRole("PENDONOR");
  const [donor, setDonor] = useState<any>(null);
  const [pmiList, setPmiList] = useState<any[]>([]);
  const [changingPmi, setChangingPmi] = useState(false);
  const [selectedPmi, setSelectedPmi] = useState("");

  useEffect(() => {
    if (!authMe) return;
    api("/donor/me").then((r) => r.json()).then(setDonor).catch(() => null);
    api("/pmi/list").then((r) => r.json()).then((d) => setPmiList(d.data ?? [])).catch(() => []);
  }, [authMe]);

  // Sort PMI by proximity ke user
  const sortedPmis = useMemo(() => {
    if (!authMe) return pmiList;
    return [...pmiList].sort((a, b) => {
      const score = (p: any) =>
        p.user?.city === (authMe as any).city ? 3 :
        p.user?.zone === (authMe as any).zone ? 2 :
        p.user?.province === (authMe as any).province ? 1 : 0;
      return score(b) - score(a);
    });
  }, [pmiList, authMe]);

  async function changePmi() {
    if (!selectedPmi) return;
    const res = await api("/donor/me/preferred-pmi", {
      method: "PATCH", body: JSON.stringify({ preferredPmiId: selectedPmi }),
    });
    if (res.ok) {
      toast.success("PMI preferensi berhasil diubah");
      setChangingPmi(false);
      api("/donor/me").then((r) => r.json()).then(setDonor);
    } else {
      toast.error("Gagal ubah PMI");
    }
  }

  if (authLoading || !authMe) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Memverifikasi sesi...</div>
      </main>
    );
  }

  const extra = donor && (
    <Card title="Info Donor" icon={<Icons.Drop />} variant="highlight">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Golongan Darah">
            <span className="text-2xl font-bold text-red-600">
              {donor.bloodType}{donor.rhesusType === "POSITIVE" ? "+" : "-"}
            </span>
          </InfoItem>
          <InfoItem label="Total Donasi">
            <span className="text-2xl font-bold text-slate-900">{donor.totalDonations ?? 0}</span>
          </InfoItem>
          <InfoItem label="Status Kelayakan">
            {donor.isEligible ? (
              <Badge status="VERIFIED" />
            ) : (
              <span className="text-xs text-amber-700 font-semibold">⚠️ Belum eligible</span>
            )}
          </InfoItem>
          <InfoItem label="Donor Terakhir">
            <span className="text-sm">
              {donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString("id-ID") : "Belum pernah"}
            </span>
          </InfoItem>
        </div>

        {/* PMI Preferensi Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">🏛️ PMI Preferensi</p>
          <p className="text-[10px] text-slate-500 mb-2">
            Untuk notifikasi broadcast dari PMI ini. Pas jadwal donor Anda tetap bisa pilih PMI lain.
          </p>
          {donor.preferredPmi ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{donor.preferredPmi.pmiName}</p>
                <p className="text-xs text-slate-600">📍 {donor.preferredPmi.pmiLoc}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setChangingPmi(!changingPmi)}>
                {changingPmi ? "Batal" : "Ubah"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-700">⚠️ Belum pilih PMI preferensi</p>
              <Button size="sm" onClick={() => setChangingPmi(true)}>Pilih PMI</Button>
            </div>
          )}

          {changingPmi && (
            <div className="mt-3 space-y-2">
              <select
                value={selectedPmi}
                onChange={(e) => setSelectedPmi(e.target.value)}
                className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
              >
                <option value="">— Pilih PMI Preferensi —</option>
                {sortedPmis.map((p, idx) => {
                  const a = authMe as any;
                  const proximity =
                    p.user?.city === a.city ? "📍 Kota sama" :
                    p.user?.zone === a.zone ? "🗺️ Zona sama" :
                    p.user?.province === a.province ? "🌏 Provinsi sama" :
                    "🌐 Nasional";
                  return (
                    <option key={p.id} value={p.id}>
                      {idx === 0 ? "⭐ " : ""}{p.pmiName} ({p.pmiLoc}) — {proximity}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-slate-500">
                💡 Diurutkan berdasarkan jarak terdekat.
              </p>
              <Button size="sm" onClick={changePmi} disabled={!selectedPmi}>Simpan PMI</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return <ProfileForm role="PENDONOR" backTo="/dashboard/donor" extraSection={extra} />;
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  );
}
