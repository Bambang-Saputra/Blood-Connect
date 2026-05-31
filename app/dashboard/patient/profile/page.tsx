"use client";

import { useRequireRole } from "../../../lib/useRequireRole";
import { ProfileForm } from "../../../lib/ProfileForm";

/**
 * Profile page khusus PASIEN.
 * Guard: useRequireRole("PASIEN") — auto-redirect kalau JWT bukan pasien.
 */
export default function PatientProfilePage() {
  const { me, loading } = useRequireRole("PASIEN");

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Memverifikasi sesi...</div>
      </main>
    );
  }

  return <ProfileForm role="PASIEN" backTo="/dashboard/patient" />;
}
