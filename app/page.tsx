import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 overflow-x-hidden">
      <Header />
      <Hero />
      <Stats />
      <HowItWorks />
      <Roles />
      <Features />
      <CallToAction />
      <Footer />
    </main>
  );
}

// =====================================================================
// HEADER (sticky nav)
// =====================================================================
function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-red-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BloodDropIcon className="w-8 h-8 text-red-600" />
          <span className="font-bold text-xl text-slate-900">Blood<span className="text-red-600">Connect</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#cara-kerja" className="text-slate-600 hover:text-red-600 transition">Cara Kerja</a>
          <a href="#untuk-siapa" className="text-slate-600 hover:text-red-600 transition">Untuk Siapa</a>
          <a href="#fitur" className="text-slate-600 hover:text-red-600 transition">Fitur</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-700 hover:text-red-600 font-medium">
            Masuk
          </Link>
          <Link href="/register" className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition">
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </header>
  );
}

// =====================================================================
// HERO SECTION
// =====================================================================
function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Floating decorative hearts */}
      <FloatingHeart className="absolute top-10 left-10 w-6 h-6 text-red-200 animate-pulse" />
      <FloatingHeart className="absolute top-32 right-20 w-4 h-4 text-pink-300 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <FloatingHeart className="absolute bottom-32 left-1/4 w-5 h-5 text-red-100 animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="grid md:grid-cols-2 gap-12 items-center relative">
        {/* Left — Copy */}
        <div>
          <span className="inline-flex items-center gap-2 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
            Platform Donor Darah #1 di Indonesia
          </span>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
            Donasikan Darahmu,<br />
            <span className="text-red-600">Selamatkan</span> <span className="relative inline-block">
              Nyawa
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10">
                <path d="M0,5 Q25,0 50,5 T100,5" stroke="#dc2626" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-lg">
            Sistem terpusat yang menghubungkan <strong>Pendonor</strong>, <strong>Pasien</strong>, dan <strong>Rumah Sakit</strong> secara real-time.
            Tidak perlu lagi cari donor lewat media sosial.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="group bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 transition flex items-center gap-2">
              Mulai Donasi
              <svg className="w-4 h-4 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link href="/login" className="bg-white hover:bg-red-50 text-red-600 border-2 border-red-600 px-6 py-3 rounded-lg font-semibold transition">
              Cari Donor
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verifikasi medis otomatis
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Real-time matching
            </div>
          </div>
        </div>

        {/* Right — Illustration */}
        <div className="relative">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// STATS SECTION
// =====================================================================
function Stats() {
  const stats = [
    { value: "10.000+", label: "Pendonor Aktif", icon: "👥" },
    { value: "500+", label: "Rumah Sakit Partner", icon: "🏥" },
    { value: "25.000+", label: "Nyawa Terselamatkan", icon: "❤️" },
    { value: "38", label: "Provinsi Terjangkau", icon: "📍" },
  ];

  return (
    <section className="bg-gradient-to-r from-red-600 to-red-700 py-12">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s) => (
          <div key={s.label} className="text-white">
            <div className="text-4xl mb-2">{s.icon}</div>
            <div className="text-3xl md:text-4xl font-bold">{s.value}</div>
            <div className="text-red-100 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// =====================================================================
// HOW IT WORKS
// =====================================================================
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Daftar & Skrining",
      desc: "Buat akun lalu jawab kuesioner kesehatan singkat (8 pertanyaan standar PMI).",
      icon: <ClipboardIcon className="w-8 h-8" />,
    },
    {
      n: "02",
      title: "Pemeriksaan Fisik",
      desc: "Datang ke RS atau UTD terdekat. Perawat akan cek hemoglobin, tekanan darah, suhu, dan berat.",
      icon: <StethoscopeIcon className="w-8 h-8" />,
    },
    {
      n: "03",
      title: "Donasi & Selamatkan",
      desc: "Setelah dinyatakan layak, daftar jadwal donor. Tim medis akan kontak Anda saat dibutuhkan.",
      icon: <HeartHandIcon className="w-8 h-8" />,
    },
  ];

  return (
    <section id="cara-kerja" className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <span className="text-red-600 text-sm font-semibold uppercase tracking-wide">Cara Kerja</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">3 Langkah untuk Jadi Pahlawan</h2>
        <p className="text-slate-600 mt-3 max-w-xl mx-auto">
          Proses yang aman, terstandarisasi medis, dan transparan dari awal sampai darah Anda tiba ke pasien.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative">
        {/* Connector line */}
        <div className="hidden md:block absolute top-20 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-red-200 via-red-400 to-red-200 z-0" />

        {steps.map((s) => (
          <div key={s.n} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition relative z-10 border border-red-50">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4">
              {s.icon}
            </div>
            <div className="text-xs font-bold text-red-600 mb-1">STEP {s.n}</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
            <p className="text-slate-600 text-sm">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// =====================================================================
// ROLES
// =====================================================================
function Roles() {
  const roles = [
    { icon: "💉", title: "Pendonor", desc: "Lacak riwayat donasi, dapatkan reminder jadwal, dan responi permintaan darurat di sekitar Anda.", color: "bg-red-50 border-red-200" },
    { icon: "🩺", title: "Pasien", desc: "Ajukan permintaan darah dalam hitungan detik. MatchSystem otomatis cari stok terdekat untuk Anda.", color: "bg-pink-50 border-pink-200" },
    { icon: "🏥", title: "Rumah Sakit", desc: "Kelola stok darah, validasi pendonor, dan koordinasikan permintaan dengan jaringan RS nasional.", color: "bg-orange-50 border-orange-200" },
    { icon: "🛡️", title: "Admin", desc: "Awasi distribusi nasional, verifikasi RS, dan kelola integritas data dengan audit log lengkap.", color: "bg-slate-50 border-slate-200" },
  ];

  return (
    <section id="untuk-siapa" className="bg-gradient-to-br from-pink-50 to-red-50 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-red-600 text-sm font-semibold uppercase tracking-wide">Untuk Siapa</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">Satu Platform, Empat Peran</h2>
          <p className="text-slate-600 mt-3 max-w-xl mx-auto">
            Blood Connect dirancang untuk seluruh ekosistem donor darah — dari pendonor sukarela sampai admin nasional.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((r) => (
            <div key={r.title} className={`${r.color} border-2 rounded-2xl p-6 hover:scale-105 transition cursor-default`}>
              <div className="text-5xl mb-4">{r.icon}</div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">{r.title}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// FEATURES
// =====================================================================
function Features() {
  const features = [
    {
      title: "MatchSystem Otomatis",
      desc: "Algoritma pintar mencocokkan permintaan dengan stok darah terdekat dalam hitungan detik. Kalau stok kosong, sistem langsung notifikasi pendonor eligible di sekitar Anda.",
      icon: <LightningIcon className="w-7 h-7" />,
    },
    {
      title: "Real-time Stock",
      desc: "Stok darah dari semua RS partner tersinkron real-time. Tidak perlu lagi telepon satu-satu hanya untuk cek ketersediaan.",
      icon: <RefreshIcon className="w-7 h-7" />,
    },
    {
      title: "Eligibility Check",
      desc: "Sistem evaluasi otomatis kelayakan donor berdasarkan 8+ parameter medis: hemoglobin, tekanan darah, usia, berat, jarak donor terakhir, dan kuesioner skrining.",
      icon: <ShieldCheckIcon className="w-7 h-7" />,
    },
    {
      title: "Lokasi Terdekat",
      desc: "Matching berlapis: kota → zona → provinsi → nasional. Donor terdekat selalu diprioritaskan untuk respons paling cepat.",
      icon: <MapPinIcon className="w-7 h-7" />,
    },
    {
      title: "Audit Log Lengkap",
      desc: "Setiap perubahan data stok, request, dan status terekam untuk kepatuhan UU PDP dan regulasi medis.",
      icon: <DocumentIcon className="w-7 h-7" />,
    },
    {
      title: "Notifikasi Multi-channel",
      desc: "In-app inbox + email otomatis untuk donor saat ada permintaan darurat, perubahan jadwal, atau notifikasi penting lainnya.",
      icon: <BellIcon className="w-7 h-7" />,
    },
  ];

  return (
    <section id="fitur" className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-12">
        <span className="text-red-600 text-sm font-semibold uppercase tracking-wide">Fitur Unggulan</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">Teknologi Modern, Solusi Nyata</h2>
        <p className="text-slate-600 mt-3 max-w-xl mx-auto">
          Dibangun dengan stack engineering kelas enterprise — transaksi serializable, validasi medis, dan kepatuhan data.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="group p-6 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:shadow-lg transition">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
              {f.icon}
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// =====================================================================
// CTA SECTION
// =====================================================================
function CallToAction() {
  return (
    <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-20 overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-pink-300 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
        <BloodDropIcon className="w-16 h-16 mx-auto text-white mb-4" />
        <h2 className="text-3xl md:text-5xl font-bold leading-tight">
          Setiap Tetes Darah Anda<br />
          Menyelamatkan <span className="underline decoration-pink-200">3 Nyawa</span>
        </h2>
        <p className="mt-6 text-lg text-red-100 max-w-2xl mx-auto">
          Bergabunglah dengan ribuan pendonor di seluruh Indonesia. Daftar dalam 2 menit, donasi pertama kapan saja.
        </p>
        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <Link href="/register" className="bg-white text-red-700 hover:bg-red-50 px-8 py-4 rounded-lg font-bold shadow-2xl hover:shadow-white/30 transition">
            Daftar Sebagai Pendonor
          </Link>
          <Link href="/register" className="bg-red-800 hover:bg-red-900 text-white border-2 border-red-500 px-8 py-4 rounded-lg font-bold transition">
            Saya Butuh Darah
          </Link>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// FOOTER
// =====================================================================
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <BloodDropIcon className="w-7 h-7 text-red-500" />
              <span className="font-bold text-xl text-white">Blood<span className="text-red-500">Connect</span></span>
            </div>
            <p className="text-sm max-w-md">
              Sistem terpusat distribusi & manajemen donor darah nasional. Dibangun untuk Indonesia, oleh Kelompok 1 — AOL Software Engineering BINUS.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-red-400">Daftar</Link></li>
              <li><Link href="/login" className="hover:text-red-400">Masuk</Link></li>
              <li><a href="#cara-kerja" className="hover:text-red-400">Cara Kerja</a></li>
              <li><a href="#fitur" className="hover:text-red-400">Fitur</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Bantuan</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-red-400">FAQ</a></li>
              <li><a href="#" className="hover:text-red-400">Kontak Support</a></li>
              <li><a href="https://github.com/Bambang-Saputra/Blood-Connect" className="hover:text-red-400">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>© 2026 Blood Connect — Kelompok 1 AOL Software Engineering BINUS</p>
          <p className="mt-2 md:mt-0">⚠️ Prototipe akademik, bukan sistem produksi rumah sakit</p>
        </div>
      </div>
    </footer>
  );
}

// =====================================================================
// CUSTOM SVG ICONS (inline, zero deps)
// =====================================================================
function BloodDropIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C12 2 5 11 5 16a7 7 0 0014 0c0-5-7-14-7-14z" />
    </svg>
  );
}

function FloatingHeart({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function StethoscopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function HeartHandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

// =====================================================================
// HERO ILLUSTRATION — pure SVG composition
// =====================================================================
function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Background blob */}
      <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 200 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>
        </defs>
        <path
          fill="url(#blobGrad)"
          d="M40,-65C53,-58,66,-49,74,-37C82,-25,86,-9,84,7C82,23,75,39,64,52C53,65,38,75,21,79C5,83,-13,82,-29,76C-45,69,-59,57,-69,42C-79,27,-84,9,-82,-8C-80,-25,-71,-40,-58,-50C-46,-59,-32,-62,-18,-65C-4,-67,11,-69,25,-70C39,-71,27,-72,40,-65Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* Main illustration: stylized blood donation scene */}
      <svg viewBox="0 0 400 400" className="w-full relative">
        {/* Heart shape with cross */}
        <g transform="translate(200 180)">
          {/* Heart background */}
          <path
            d="M0,-30 C-20,-60 -60,-50 -60,-15 C-60,20 -30,45 0,70 C30,45 60,20 60,-15 C60,-50 20,-60 0,-30 Z"
            fill="#dc2626"
            className="drop-shadow-2xl"
          />
          {/* White cross */}
          <rect x="-8" y="-15" width="16" height="40" fill="white" rx="2" />
          <rect x="-20" y="-3" width="40" height="16" fill="white" rx="2" />
        </g>

        {/* Blood drop droplets around */}
        <g>
          <BloodDrop x={80} y={120} size={20} />
          <BloodDrop x={320} y={100} size={16} />
          <BloodDrop x={70} y={280} size={14} />
          <BloodDrop x={340} y={290} size={22} />
          <BloodDrop x={200} y={340} size={18} />
        </g>

        {/* Pulse/heartbeat line */}
        <g transform="translate(0 250)">
          <path
            d="M50 30 L 100 30 L 110 10 L 120 50 L 130 0 L 140 60 L 150 30 L 350 30"
            stroke="#dc2626"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Sparkle/star decorations */}
        <g fill="#fbbf24">
          <Sparkle x={100} y={60} />
          <Sparkle x={320} y={200} />
          <Sparkle x={60} y={200} />
        </g>
      </svg>

      {/* Floating cards */}
      <div className="absolute top-4 -left-4 bg-white rounded-xl shadow-xl p-3 flex items-center gap-2 animate-bounce" style={{ animationDuration: "3s" }}>
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-lg">🩸</div>
        <div>
          <div className="text-xs text-slate-500">Stok O+</div>
          <div className="text-sm font-bold text-slate-900">125 kantong</div>
        </div>
      </div>

      <div className="absolute bottom-4 -right-4 bg-white rounded-xl shadow-xl p-3 flex items-center gap-2 animate-bounce" style={{ animationDuration: "3s", animationDelay: "1.5s" }}>
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">✓</div>
        <div>
          <div className="text-xs text-slate-500">Match ditemukan</div>
          <div className="text-sm font-bold text-slate-900">0.3 detik</div>
        </div>
      </div>
    </div>
  );
}

function BloodDrop({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${size / 20})`}
      d="M0,-10 C-7,0 -10,5 -10,8 A10,10 0 0 0 10,8 C10,5 7,0 0,-10 Z"
      fill="#dc2626"
      opacity="0.7"
    />
  );
}

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z"
    />
  );
}
