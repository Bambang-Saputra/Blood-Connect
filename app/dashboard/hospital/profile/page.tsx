"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { ProfileForm } from "../../../lib/ProfileForm";
import { Card, Icons, Badge } from "../../../lib/ui";

export default function PmiProfilePage() {
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    api("/auth/me").then((r) => r.json()).then(setMe).catch(() => null);
  }, []);

  const extra = me?.pmi && (
    <Card title="Info PMI" icon={<Icons.Drop />} variant="highlight">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Nama PMI</p>
          <p className="font-bold text-slate-900">{me.pmi.pmiName}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">Kode</p>
          <p className="font-mono font-bold text-slate-900">{me.pmi.pmiCode}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200 col-span-2">
          <p className="text-xs text-slate-500 mb-1">Lokasi</p>
          <p className="text-sm text-slate-900">{me.pmi.pmiLoc}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-slate-200 col-span-2">
          <p className="text-xs text-slate-500 mb-1">Status Verifikasi</p>
          <Badge status={me.pmi.status} />
        </div>
      </div>
    </Card>
  );

  return <ProfileForm role="PMI" backTo="/dashboard/hospital" extraSection={extra} />;
}
