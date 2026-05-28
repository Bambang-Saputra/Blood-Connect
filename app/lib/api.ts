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
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    return res;
  } catch (err) {
    // Network error (server down, CORS block, dll) — log untuk debugging
    console.error(`[api] ${init?.method ?? "GET"} ${path} failed:`, err);
    // Return a fake response biar caller tidak crash
    return new Response(JSON.stringify({
      error: "Tidak bisa terhubung ke server. Pastikan API jalan di " + API_URL,
      networkError: true,
    }), { status: 0, headers: { "Content-Type": "application/json" } });
  }
}

export function dashboardPath(role: string) {
  switch (role) {
    case "PENDONOR": return "/dashboard/donor";
    case "PASIEN": return "/dashboard/patient";
    case "PMI": return "/dashboard/hospital";        // URL legacy untuk PMI dashboard
    case "RUMAH_SAKIT": return "/dashboard/hospital";  // backward compat
    case "ADMIN": return "/dashboard/admin";
    default: return "/";
  }
}
