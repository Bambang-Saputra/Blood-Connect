# 🩸 Blood Connect

> **Sistem Terpusat Distribusi & Manajemen Donor Darah Berskala Nasional**
> Software Engineering — AOL Kelompok 1

Web application yang menghubungkan **Pasien**, **Pendonor**, **PMI/UTD**, dan **Admin** dalam satu platform real-time. Memecahkan masalah fragmentasi data stok darah antar-UTD dan ketergantungan pencarian donor lewat media sosial.

---

## ⚠️ Disclaimer Akademik

Project ini adalah **prototipe/MVP untuk tugas Software Engineering (AOL)** — **BUKAN** sistem produksi rumah sakit yang siap pakai. Untuk lingkungan klinis nyata masih dibutuhkan sertifikasi medis, integrasi SatuSehat/BPJS, penetration testing, cross-match lab, serta review etik & legal.

---

## 🧭 Konsep Inti — PMI sebagai Pusat Blood Bank

Model sistem ini mengikuti alur donor darah Indonesia yang sebenarnya, di mana **PMI/UTD adalah pusat pengelola darah**, bukan rumah sakit.

```
         PENDONOR  ──(donor darah)──►  PMI / UTD  ──(kirim darah)──►  RS tempat pasien
            ▲                            ▲   │
            │                            │   │
     (broadcast minta stok)     (broadcast request)
            │                            │   │
            └──────────────  PASIEN  ────┘   ▼
                          (minta darah)    ADMIN (verifikasi PMI)
```

- **Pendonor** menyumbang darah ke **PMI** (lewat jadwal donor di PMI pilihan).
- **Pasien** mengajukan permintaan darah → **di-broadcast ke seluruh PMI**.
- **PMI** yang menerima (accept) request → memenuhi (fulfill) dari stoknya → mengirim ke RS tujuan pasien.
- **PMI** juga bisa **broadcast permintaan stok** ke pendonor terdekat saat stok menipis.
- **Admin** hanya **memverifikasi registrasi PMI**. Admin TIDAK mengelola stok (itu urusan internal PMI).

---

## 👥 Aktor & Role

| Role | Dashboard | Tanggung Jawab Utama |
|------|-----------|----------------------|
| 💉 **PENDONOR** | `/dashboard/donor` | Isi skrining, daftar jadwal donor di PMI, lihat broadcast PMI, volunteer ke request pasien |
| 🩺 **PASIEN** | `/dashboard/patient` | Ajukan permintaan darah (broadcast ke semua PMI), pantau status |
| 🏛️ **PMI / UTD** | `/dashboard/pmi` | Kelola stok, accept & fulfill request pasien, cek fisik donor, broadcast minta stok |
| 🛡️ **ADMIN** | `/dashboard/admin` | Verifikasi/suspend PMI, monitor jadwal & request nasional |

> Satu email bisa punya **2 mode personal** (Pendonor + Pasien) lewat *mode switcher*. PMI & Admin adalah role institusional/sistem yang terpisah.

---

## 🔄 Workflow Lengkap

### A. Alur Donor Menyumbang Darah

```
1. REGISTER (/register)              → Pendonor isi data + tanggal lahir (validasi usia ≥17)
        │
        ▼
2. ISI SKRINING (/dashboard/donor/screening)
        │                              8 pertanyaan kesehatan standar PMI.
        │                              (demam? operasi <6bln? hamil? HIV/Hep? dll)
        ▼
3. DAFTAR JADWAL DONOR                → Pilih PMI (diurutkan jarak terdekat) + tanggal + sesi.
   (dashboard donor → "Daftar Jadwal")  Wajib sudah isi skrining dulu.
        │                              Donor BOLEH daftar di beberapa PMI sekaligus.
        ▼
4. CEK FISIK DI PMI (saat hari-H)     → Petugas PMI input Hb, tensi, suhu, nadi, berat.
   (PMI: panel "Jadwal Donor")          Sistem auto-hitung kelayakan:
        │                                eligible = lolosCekFisik AND lolosSkrining
        ▼
5. PMI CONFIRM / DONASI SELESAI       → Status jadwal: CONFIRMED / COMPLETED.
```

**Aturan lolos cek fisik (di PMI):**
| Parameter | Rentang Lolos |
|-----------|---------------|
| Hemoglobin | 12.5 – 17.0 g/dL |
| Tekanan sistolik | 100 – 160 mmHg |
| Tekanan diastolik | 60 – 100 mmHg |
| Suhu tubuh | 36.5 – 37.5 °C |
| Denyut nadi | 50 – 100 bpm |
| Berat badan | ≥ 45 kg |

### B. Alur Permintaan Darah Pasien

```
1. PASIEN REQUEST                    → Golongan + jumlah kantong (min 1) + RS tujuan kirim.
   (/dashboard/patient)                Urgency TIDAK diinput pasien — dihitung sistem.
        │                              Stok PMI TIDAK langsung dipotong.
        ▼  reqStatus = PENDING (broadcast ke SEMUA PMI)
        │
2. PMI ACCEPT                        → PMI pertama yang klik [Accept] meng-claim request.
   (/dashboard/pmi → panel request)    reqStatus = PROCESSING, acceptedByPmiId = PMI itu.
        │                              PMI lain tidak bisa claim lagi (anti double-claim).
        ▼
3. PMI FULFILL                       → PMI klik [Fulfill]. BARU di sini stok dipotong
        │                              (FEFO — First Expiry First Out, dari stok PMI itu).
        │                              Kalau stok kurang → ditolak + saran broadcast stok.
        ▼  reqStatus = FULFILLED
```

**Urgency dihitung server-side** dari total stok AVAILABLE (semua PMI VERIFIED) untuk golongan terkait:

| Total stok nasional | Urgency |
|---------------------|---------|
| < 5 kantong | 🔴 CRITICAL |
| < 20 kantong | 🟠 URGENT |
| ≥ 20 kantong | 🟢 NORMAL |

### C. Alur PMI Broadcast Minta Stok

```
1. PMI BROADCAST                     → PMI pilih golongan + target kantong + pesan.
   (/dashboard/pmi → "Broadcast Stok")
        │
        ▼  Sistem cari donor KOMPATIBEL di KOTA SAMA dengan PMI
        │   (pakai matriks kompatibilitas — bukan cuma golongan persis)
        ▼
2. DONOR DAPAT NOTIFIKASI            → Muncul di dashboard donor (panel atas) + email.
   (/dashboard/donor)                  Donor klik "Daftar Donor di Sini" → form jadwal
        │                              auto-terisi PMI tsb.
        ▼
3. DONOR DAFTAR JADWAL               → Lanjut ke Alur A langkah 3.
```

> **Kompatibilitas darah** (`src/lib/bloodCompat.ts`): PMI minta A+ → notifikasi ke donor A+, A−, O+, O− (semua yang bisa donor ke A+). Donor O+ → melihat broadcast O+, A+, B+, AB+ (semua yang bisa ia donori).

---

## 🛠️ Tech Stack

| Layer | Pilihan |
|-------|---------|
| Backend | Node.js 20 + TypeScript + Express |
| Database | PostgreSQL (Neon Cloud) + transaksi ACID |
| ORM | Prisma 5 |
| Frontend | Next.js 15 (App Router) + Tailwind CSS 3 |
| Chart | Recharts |
| Auth | JWT + bcrypt + role guard (server + client) |
| Background | node-cron (stock expiry job) |
| Email | Nodemailer (best-effort, opsional) |
| Validation | Zod |

---

## 📂 Struktur Project

```
blood-connect/
├── prisma/
│   ├── schema.prisma                  # ⭐ 15 model + 11 enum
│   └── migrations/                    # init_pmi → broadcast → drop_screening_unique
├── src/                               # Backend API (Express)
│   ├── server.ts                      # Entry point + CORS + cron
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── notification.ts            # In-app + email dual-channel
│   │   ├── audit.ts                   # Audit log helper
│   │   └── bloodCompat.ts             # ⭐ Matriks kompatibilitas golongan darah
│   ├── controllers/
│   │   ├── authController.ts          # Login/Register/Register-PMI/switch-role/enable-mode
│   │   ├── matchController.ts         # Request darah: create/accept/fulfill/list
│   │   ├── donorController.ts         # Pendonor: schedule, volunteer, broadcasts, preferred-PMI
│   │   ├── pmiController.ts           # ⭐ PMI: schedules, checkup, broadcast stok
│   │   ├── stockController.ts         # Stok PMI + summary chart
│   │   ├── medicalController.ts       # Cek fisik + skrining
│   │   ├── adminController.ts         # Verifikasi PMI + monitor
│   │   └── notificationController.ts  # Inbox in-app
│   ├── routes/index.ts
│   ├── middleware/auth.ts             # JWT + requireRole
│   ├── jobs/stockExpiryJob.ts         # Cron: set EXPIRED stok kadaluarsa
│   └── services/                      # ⚠️ LEGACY (lihat Known Limitations)
│       ├── eligibilityService.ts      #   checkEligible() — tidak dipakai di alur aktif
│       └── matchSystemService.ts      #   processMatch() — auto-match dimatikan
└── app/                               # Frontend Next.js
    ├── page.tsx                       # Landing
    ├── login/ register/ pmiregister/  # Auth pages (PMI register terpisah)
    ├── lib/
    │   ├── api.ts                     # fetch helper + token (localStorage)
    │   ├── useRequireRole.ts          # ⭐ Client-side role guard (defense-in-depth)
    │   ├── ProfileForm.tsx            # Shared form profil per-role
    │   ├── RegionPicker.tsx           # Cascading Provinsi → Kota
    │   ├── regions.ts ui.tsx toast.ts ModeSwitcher.tsx NotificationBell.tsx
    └── dashboard/
        ├── donor/    page.tsx + profile/ + screening/
        ├── patient/  page.tsx + profile/
        ├── pmi/      page.tsx + profile/ + checkup/
        └── admin/    page.tsx + profile/
```

---

## 🚀 Cara Menjalankan (Windows)

### 1. Prasyarat
- **Node.js 20+** (`node --version`)
- **PostgreSQL** — disarankan **Neon.tech** (cloud, gratis): https://neon.tech

### 2. Setup
```powershell
cd "D:\path\ke\blood-connect"
npm install
copy .env.example .env
```

Edit `.env` — **wajib** 2 baris ini:
```env
DATABASE_URL="postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require"
JWT_SECRET="string-acak-bebas-untuk-dev"
```

### 3. Siapkan Database + Seed
```powershell
npx prisma generate
npx prisma db push          # sync schema ke DB (paling reliable untuk demo)
npm run seed                # isi akun & data dummy
```
> Alternatif: `npx prisma migrate deploy` (pakai migration history). Untuk demo, `db push` paling aman.
> ⚠️ Kalau muncul `EPERM rename query_engine`, stop dulu semua proses node yang jalan, lalu ulangi.

### 4. Jalankan
```powershell
npm run dev                 # API (4000) + Web (3000) bareng
```
Atau pisah 2 terminal: `npm run dev:api` dan `npm run dev:web`.

→ Buka **http://localhost:3000**

---

## 🔑 Akun Dummy untuk Testing

Setelah `npm run seed`:

| Role | Email | Password | Status |
|------|-------|----------|--------|
| 🛡️ **Admin** | `admin@bloodconnect.id` | `admin12345` | Verifikator PMI |
| 🏛️ **PMI Jakarta** | `pmi.jakarta@test.com` | `password123` | ✅ VERIFIED + 6 batch stok |
| 🏛️ **PMI Surabaya** | `pmi.surabaya@test.com` | `password123` | ✅ VERIFIED (kota lain) |
| 🏛️ **PMI Bandung** | `pmi.bandung@test.com` | `password123` | ⏳ UNVERIFIED (demo verifikasi) |
| 💉 **Donor 1 (Jakarta)** | `donor1@test.com` | `password123` | Skrining ✓ — siap daftar jadwal |
| 💉 **Donor 2 (Jakarta)** | `donor2@test.com` | `password123` | Belum skrining — untuk demo flow |
| 💉 **Donor 3 (Surabaya)** | `donor3@test.com` | `password123` | Untuk testing proximity sort |
| 🩺 **Pasien 1** | `pasien1@test.com` | `password123` | Siap request darah |
| 🩺 **Pasien 2** | `pasien2@test.com` | `password123` | Siap request darah |

> 💡 Tombol auto-fill di `/login` hanya menampilkan **Pendonor + Pasien**. Untuk **Admin / PMI**, ketik email + password manual. Registrasi PMI lewat halaman terpisah: **`/pmiregister`**.

### 🎬 Demo Flow Lengkap (Recommended untuk Presentasi)

```
=== BAGIAN 1: Request Pasien → PMI Fulfill ===
1. Login pasien1@test.com → request darah O+ 2 kantong, RS tujuan "RS Pondok Indah"
   → status PENDING (broadcast ke semua PMI), stok BELUM dipotong
2. Login pmi.jakarta@test.com → panel "Permintaan Darah" → request muncul → [Accept]
   → status PROCESSING
3. Klik [Fulfill] → stok O+ PMI Jakarta berkurang 2 (FEFO), status FULFILLED ✓

=== BAGIAN 2: PMI Broadcast → Donor Daftar ===
4. (masih PMI Jakarta) klik [📢 Broadcast Stok] → minta O+ 10 kantong
   → semua donor O+/O−/A−/B− dst di Jakarta dapat notifikasi
5. Login donor1@test.com → panel atas "Permintaan Stok dari PMI" → "Daftar Donor di Sini"
   → form jadwal auto-isi PMI Jakarta → pilih tanggal → submit

=== BAGIAN 3: PMI Cek Fisik → Eligibility ===
6. Login pmi.jakarta@test.com → panel "Jadwal Donor di PMI Anda" → expand donor1
   → "Resume Skrining" (lihat jawaban) + "Input Cek Fisik" (Hb 14, tensi 120/80, dst)
   → sistem auto-hitung: LAYAK / TIDAK LAYAK → [Confirm]

=== BAGIAN 4: Admin Verifikasi PMI ===
7. Login admin@bloodconnect.id → /dashboard/admin → "Verifikasi PMI Baru"
   → verify pmi.bandung (UNVERIFIED → VERIFIED)
```

---

## 🔌 Endpoint API

### Auth
| Method | Path | Role |
|--------|------|------|
| POST | `/api/auth/register` | public (Pendonor/Pasien) |
| POST | `/api/auth/register-pmi` | public (PMI, status awal UNVERIFIED) |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | authed |
| GET | `/api/auth/me` | authed |
| PATCH | `/api/auth/me` | authed (update profil) |
| POST | `/api/auth/me/enable-mode` | Pendonor/Pasien (aktifkan mode kedua) |
| POST | `/api/auth/switch-role` | multi-mode (ganti mode aktif) |

### Request Darah
| Method | Path | Role | Keterangan |
|--------|------|------|------------|
| GET | `/api/requests` | authed | Pasien: miliknya. PMI: broadcast PENDING + claim sendiri. Admin: semua |
| POST | `/api/requests` | **Pasien** | Buat request → broadcast (PENDING). Stok belum dipotong |
| GET | `/api/requests/:id` | owner/PMI/admin | Detail 1 request |
| POST | `/api/requests/:id/accept` | **PMI** | Claim request PENDING → PROCESSING |
| PATCH | `/api/requests/:id/status` | PMI(claim)/Admin | FULFILLED memotong stok (FEFO, atomic) |

### Pendonor
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/donor/me` | Profil + status eligibility |
| PATCH | `/api/donor/me/preferred-pmi` | Set PMI preferensi (untuk broadcast) |
| POST | `/api/donor/schedules` | Daftar jadwal donor (wajib sudah skrining) |
| GET | `/api/donor/schedules` | Jadwal milik sendiri |
| GET | `/api/donor/history` | Riwayat donasi |
| GET | `/api/donor/notifications` | Undangan match (MatchSystem lama) |
| POST | `/api/donor/notifications/:id/respond` | Respons undangan |
| GET | `/api/donor/open-requests` | Browse request kompatibel (proaktif) |
| POST | `/api/donor/volunteer/:requestId` | Nyatakan kesediaan (donor aktif) |
| GET | `/api/donor/broadcasts` | Broadcast PMI relevan (kota sama + kompatibel) |

### PMI
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/pmi/me` | Info institusi PMI sendiri |
| GET | `/api/pmi/list` | List PMI VERIFIED (untuk donor pilih) — semua role |
| GET | `/api/pmi/schedules` | Jadwal donor **scoped ke PMI ini** (bukan broadcast) |
| POST | `/api/pmi/schedules/:id/checkup` | Input cek fisik → auto-hitung eligibility |
| PATCH | `/api/pmi/schedules/:id/status` | Confirm/Reject/Complete jadwal |
| POST | `/api/pmi/broadcasts` | Broadcast minta stok ke donor sekota |
| GET | `/api/pmi/broadcasts` | List broadcast milik PMI ini |
| PATCH | `/api/pmi/broadcasts/:id/close` | Tutup broadcast |

### Stok
| Method | Path | Role | Keterangan |
|--------|------|------|------------|
| GET | `/api/stocks` | authed | Cek ketersediaan (filter golongan/lokasi) |
| POST | `/api/stocks` | PMI | Tambah stok — **langsung AVAILABLE** (tanpa quarantine) |
| GET | `/api/stocks/mine` | PMI | Stok milik PMI sendiri |
| GET | `/api/stocks/summary` | PMI | Agregat per golongan (untuk chart) |

### Medical
| Method | Path | Role |
|--------|------|------|
| GET | `/api/medical/donor-lookup` | Admin/PMI (cari donor by email) |
| POST | `/api/medical/checkup` | Admin/PMI (cek fisik standalone) |
| POST | `/api/medical/screening` | Pendonor (isi kuesioner) |
| GET | `/api/medical/me` | Pendonor (riwayat) |

### Admin
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/admin/pmis?status=UNVERIFIED` | List PMI menunggu verifikasi |
| PATCH | `/api/admin/pmis/:id/verify` | Verify / Suspend PMI |
| GET | `/api/admin/schedules?status=PENDING` | Monitor jadwal pending |
| PATCH | `/api/admin/schedules/:id` | Confirm/Reject/Reschedule jadwal |
| GET | `/api/admin/requests?status=PENDING` | Monitor request |

> Endpoint `/api/admin/hospitals*` masih ada sebagai **alias backward-compat** ke `/admin/pmis*`.

### Notifikasi (semua role)
| Method | Path |
|--------|------|
| GET | `/api/notifications` |
| GET | `/api/notifications/count` |
| PATCH | `/api/notifications/:id/read` |
| PATCH | `/api/notifications/read-all` |

---

## 🧠 Core Business Logic

### 1. Eligibility — Per-Jadwal (Authoritative) + Cache Global
**File:** `src/controllers/pmiController.ts` (`inputScheduleCheckup`)

- `schedule.isEligible` → **sumber kebenaran per-donasi**. Di-set saat PMI input cek fisik untuk jadwal itu = `lolosCekFisik AND lolosSkrining`. Tidak terpengaruh PMI lain.
- `pendonor.isEligible` → **cache** dari checkup **terbaru** donor (by `examinedAt`). Ada *guard* agar checkup lama yang di-input belakangan tidak menimpa hasil yang lebih baru (anti flip-flop antar-PMI). `eligibilityReason` menyertakan nama PMI + tanggal.

### 2. Stock Fulfillment — Atomic, FEFO, On-Demand
**File:** `src/controllers/matchController.ts` (`updateRequestStatus`)

Stok **hanya dipotong saat PMI klik Fulfill** (bukan saat pasien request). Dalam transaksi:
- Cari stok PMI (yang accept) yang AVAILABLE + belum expired, urut **FEFO**.
- Alokasi sampai jumlah terpenuhi → buat `StockAllocation`, kurangi `quantity` (0 → USED).
- Kalau stok kurang → **rollback** + pesan saran broadcast stok dulu.

### 3. Blood Compatibility Matrix
**File:** `src/lib/bloodCompat.ts`

Dua arah: `RECIPIENT_RECEIVES_FROM` (untuk broadcast PMI cari donor) & `DONOR_CAN_GIVE_TO` (untuk donor lihat broadcast relevan). Mengikuti aturan transfusi standar (O− universal donor, AB+ universal recipient).

### 4. Volunteer — Terbuka untuk Donor Aktif
**File:** `src/controllers/donorController.ts` (`volunteerForRequest`)

Sesuai praktik nyata: "volunteer" = **menyatakan kesediaan**, bukan jaminan layak. Hanya butuh akun donor aktif. Kelayakan medis tetap diverifikasi di PMI saat donasi. (Dedup tetap berlaku: 1 donor tidak bisa respons 2× request sama.)

### 5. Role Guard — Defense in Depth
- **Server:** middleware `requireRole(...)` menolak API dengan 403 kalau role JWT salah.
- **Client:** hook `useRequireRole(...)` (`app/lib/useRequireRole.ts`) auto-redirect kalau user buka URL dashboard role lain (mis. pasien ketik `/dashboard/pmi` → balik ke `/dashboard/patient`).

### 6. Stock Expiry Cron
**File:** `src/jobs/stockExpiryJob.ts` — jadwal `5 0 * * *` (tiap hari 00:05): set EXPIRED untuk stok lewat tanggal + notifikasi early-warning (<3 hari) ke PMI terkait.

---

## 🗃️ Skema Database (15 model)

| Model | Tujuan |
|-------|--------|
| `User` | Base — email, password, **birthDate** (validasi usia), city/province/zone |
| `Pendonor` | bloodType, weight, **isEligible** (cache), preferredPmiId |
| `Pasien` | NIK opsional |
| `PMI` | Pusat blood bank — pmiName/Code/Loc, **PmiStatus** (UNVERIFIED→VERIFIED→SUSPENDED) |
| `StokDarah` | Per-batch, milik PMI, **default AVAILABLE** (tanpa quarantine) |
| `PmiBroadcast` ⭐ | Permintaan stok PMI ke donor sekota — **BroadcastStatus** (OPEN/CLOSED/EXPIRED) |
| `PemeriksaanDonor` | Vital signs (Hb/BP/suhu/nadi/BB), scoped ke PMI |
| `ScreeningAnswer` | Kuesioner 8 pertanyaan PMI (diisi donor) |
| `PermintaanDonor` | Request darah — **targetHospitalName**, **acceptedByPmiId**, urgency (computed) |
| `StockAllocation` | Join: 1 request bisa dari multi-batch |
| `JadwalDonor` | Jadwal donor — **scoped ke PMI**, screeningId, checkupId, **isEligible** per-jadwal |
| `DonorHistory` | Riwayat donasi selesai |
| `DonorNotification` | Log undangan MatchSystem + respons |
| `Notification` | Inbox in-app generic |
| `AuditLog` | Jejak perubahan data sensitif (compliance) |

**Enum:** `Role` (PENDONOR/PASIEN/PMI/ADMIN), `BloodType`, `RhesusType`, `BloodComponent`, `RequestStatus`, `StockStatus`, `ScheduleStatus`, `PmiStatus`, `NotificationType` (incl. `PMI_BROADCAST`), `BroadcastStatus`, `AuditAction`.

---

## 🚧 Known Limitations / Future Work

Hal-hal yang **disadari** dan belum/diputuskan tidak diimplementasikan untuk scope MVP:

| # | Item | Catatan |
|---|------|---------|
| Bug #3 | Urutan urgency di "Permintaan Tersedia" donor | `urgency` di-sort alfabetis (string), bukan prioritas. CRITICAL bisa muncul di bawah. |
| Bug #4c | Interval donasi (≥60 hari) belum di-enforce | Aturan ada di `eligibilityService` (legacy, tak dipakai). Cek fisik PMI belum cek jarak donasi terakhir. |
| Bug #4d | Volunteer belum validasi kompatibilitas | Endpoint terima requestId apa pun (FE sudah filter; via API langsung belum dijaga). |
| Bug #5 | Dead code | `services/eligibilityService.ts` & `matchSystemService.ts` tidak dipakai di alur aktif (sisa model MatchSystem auto-allocate yang sudah diganti alur PMI-accept). |
| — | Tab contamination | Token di `localStorage` (di-share antar-tab). Login 2 akun beda di 2 tab bisa saling timpa. `useRequireRole` mengoreksi saat refresh. Untuk demo multi-akun gunakan Incognito/browser berbeda. |
| — | Lupa password / verifikasi email / 2FA | Belum ada. |
| — | RegionPicker typeable + peta lokasi | Ada di branch terpisah (`feat/location-combobox`) / rencana map integration. |

---

## ⚠️ Catatan Produksi
- Ganti `JWT_SECRET` dengan string acak 256-bit. Jangan commit `.env`.
- Aktifkan HTTPS + rate limiting + account lockout sebelum deploy.
- Pertimbangkan httpOnly cookie (anti-XSS) menggantikan token di localStorage.
- Backup database harian + retensi audit log untuk `StokDarah` & `PermintaanDonor`.
