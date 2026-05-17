// Helper API client + token management
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

export function dashboardPath(role: string) {
  switch (role) {
    case "PENDONOR": return "/dashboard/donor";
    case "PASIEN": return "/dashboard/patient";
    case "RUMAH_SAKIT": return "/dashboard/hospital";
    case "ADMIN": return "/dashboard/admin";
    default: return "/";
  }
}
