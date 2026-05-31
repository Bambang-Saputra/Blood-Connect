"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useRequireRole } from "../../../lib/useRequireRole";
import { ProfileForm } from "../../../lib/ProfileForm";
import { Card, Icons, Badge } from "../../../lib/ui";

/**
 * Profile page khusus PMI.
 * Guard: useRequireRole("PMI") — auto-redirect kalau JWT bukan PMI.
 * Extra section: info institusi PMI (read-only — nama/kode/lokasi ga bisa diubah).
 */
export default function PmiProfilePage() {
  const { me: authMe, loading: authLoading } = useRequireRole("PMI");
  const [pmiInfo, setPmiInfo] = useState<any>(null);

  useEffect(() => {
    if (!authMe) return;
    api("/pmi/me").then((r) => r.json()).then(setPmiInfo).catch(() => null);
  }, [authMe]);

  if (authLoading || !authMe) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Memverifikasi sesi...</div>
      </main>
    );
  }

  const extra = pmiInfo && (
    <Card title="Info Institusi PMI" icon={<Icons.Heart />} variant="highlight">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Nama PMI">
            <span className="font-bold text-slate-900">{pmiInfo.pmiName}</span>
          </InfoItem>
          <InfoItem label="Kode PMI">
            <code className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">{pmiInfo.pmiCode}</code>
          </InfoItem>
          <InfoItem label="Lokasi">
            <span className="text-sm">📍 {pmiInfo.pmiLoc}</span>
          </InfoItem>
          <InfoItem label="Status Verifikasi">
            <Badge status={pmiInfo.status} />
          </InfoItem>
        </div>
        <p className="text-xs text-slate-500 italic">
          ℹ️ Data institusi (nama/kode/lokasi) tidak bisa diubah dari sini. Hubungi admin pusat kalau perlu update.
        </p>
      </div>
    </Card>
  );

  return <ProfileForm role="PMI" backTo="/dashboard/pmi" extraSection={extra} />;
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-slate-200">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  );
}
