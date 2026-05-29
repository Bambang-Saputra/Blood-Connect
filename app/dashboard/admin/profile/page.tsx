"use client";

import { ProfileForm } from "../../../lib/ProfileForm";

export default function AdminProfilePage() {
  return <ProfileForm role="ADMIN" backTo="/dashboard/admin" />;
}
