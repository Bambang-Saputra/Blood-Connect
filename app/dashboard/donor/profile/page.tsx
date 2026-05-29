"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "../../../lib/api";
import { toast } from "../../../lib/toast";
import { ProfileForm } from "../../../lib/ProfileForm";
import { Card, Icons, Button, Badge } from "../../../lib/ui";

/**
 * Donor profile — only donor-specific data.
 * Mode switching tidak di sini — pakai ModeSwitcher di header dashboard.
 */
export default function DonorProfilePage() {
  const [donor, setDonor] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [pmiList, setPmiList] = useState<any[]>([]);
  const [changingPmi, setChangingPmi] = useState(false);
  const [selectedPmi, setSelectedPmi] = useState("");

  useEffect(() => {
    api("/donor/me").then((r) => r.json()).then(setDonor).catch(() => null);
    api("/auth/me").then((r) => r.json()).then(setMe).catch(() => null);
    api("/pmi/list").then((r) => r.json()).then((d) => setPmiList(d.data ?? [])).catch(() => []);
  }, []);

  // Sort PMI by proximity ke user
  const sortedPmis = useMemo(() => {
    if (!me) return pmiList;
    return [...pmiList].sort((a, b) => {
      const score = (p: any) =>
        p.user?.city === me.city ? 3 :
        p.user?.zone === me.zone ? 2 :
        p.user?.province === me.province ? 1 : 0;
      return score(b) - score(a);
    });
  }, [pmiList, me]);

  async function changePmi() {
    if (!selectedPmi) return;
    const res = await api("/donor/me/preferred-pmi", {
      method: "PATCH", body: JSON.stringify({ preferredPmiId: selectedPmi }),
    });
    if (res.ok) {
      toast.success("PMI berhasil diubah");
      setChangingPmi(false);
      api("/donor/me").then((r) => r.json()).then(setDonor);
    } else {
      toast.error("Gagal ubah PMI");
    }
  }

  const extra = (
    <>
      {donor && (
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

            {/* PMI Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">🩸 PMI Tempat Donor</p>
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
                <p className="text-sm text-amber-700">⚠️ Belum pilih PMI</p>
              )}

              {changingPmi && (
                <div className="mt-3 space-y-2">
                  <select
                    value={selectedPmi}
                    onChange={(e) => setSelectedPmi(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">— Pilih PMI Baru —</option>
                    {sortedPmis.map((p, idx) => {
                      const proximity =
                        p.user?.city === me?.city ? "📍 Kota sama" :
                        p.user?.zone === me?.zone ? "🗺️ Zona sama" :
                        p.user?.province === me?.province ? "🌏 Provinsi sama" :
                        "🌐 Nasional";
                      return (
                        <option key={p.id} value={p.id}>
                          {idx === 0 ? "⭐ " : ""}{p.pmiName} ({p.pmiLoc}) — {proximity}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    💡 Diurutkan berdasarkan jarak terdekat. Anda tetap bisa pilih PMI di kota lain saat jadwal donor.
                  </p>
                  <Button size="sm" onClick={changePmi} disabled={!selectedPmi}>Simpan PMI</Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </>
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
