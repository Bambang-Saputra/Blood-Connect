"use client";

import { useRequireRole } from "../../../lib/useRequireRole";
import { ProfileForm } from "../../../lib/ProfileForm";

/**
 * Profile page khusus ADMIN.
 * Guard: useRequireRole("ADMIN") — auto-redirect kalau JWT bukan admin.
 */
export default function AdminProfilePage() {
  const { me, loading } = useRequireRole("ADMIN");

  if (loading || !me) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Memverifikasi sesi...</div>
      </main>
    );
  }

  return <ProfileForm role="ADMIN" backTo="/dashboard/admin" />;
}
