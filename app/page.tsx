import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto p-12">
      <h1 className="text-5xl font-bold text-red-700">🩸 Blood Connect</h1>
      <p className="mt-3 text-slate-600 max-w-2xl">
        Sistem terpusat untuk distribusi dan manajemen donor darah nasional —
        menghubungkan Pasien, Pendonor, Rumah Sakit, dan Admin dalam satu platform real-time.
      </p>

      <div className="mt-10 grid md:grid-cols-2 gap-4">
        <Link href="/login" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg">
          <h3 className="font-semibold">Masuk</h3>
          <p className="text-sm text-slate-500">Login ke dashboard Anda</p>
        </Link>
        <Link href="/register" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg">
          <h3 className="font-semibold">Daftar</h3>
          <p className="text-sm text-slate-500">Sebagai Pendonor / Pasien / Rumah Sakit</p>
        </Link>
      </div>
    </main>
  );
}
