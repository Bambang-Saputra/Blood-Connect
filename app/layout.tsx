import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blood Connect",
  description: "Sistem terpusat distribusi & manajemen donor darah nasional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
