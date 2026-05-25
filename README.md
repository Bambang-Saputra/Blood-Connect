# 🩸 Blood Connect

> **Sistem Terpusat Distribusi dan Manajemen Donor Darah Berskala Nasional**
> Software Engineering — AOL Kelompok 1

Web application yang menghubungkan **Pasien**, **Pendonor**, **Rumah Sakit**, dan **Admin** dalam satu platform real-time untuk memecahkan masalah fragmentasi data stok darah dan ketergantungan pencarian donor via media sosial.

---

## ⚠️ Disclaimer Akademik

Project ini adalah **prototipe/MVP untuk tugas mata kuliah Software Engineering (AOL)**. **BUKAN sistem produksi rumah sakit yang siap pakai.** Untuk digunakan di lingkungan klinis sesungguhnya, masih dibutuhkan:

- Sertifikasi medis & audit kepatuhan (UU PDP, Permenkes)
- Integrasi dengan sistem nasional (Satusehat, BPJS)
- Penetration testing & vulnerability assessment
- Cross-match testing & blood typing verification by lab
- Persetujuan etik & legal review

Yang sudah **diimplementasikan dengan benar** untuk demo akademis:
- Workflow medis lengkap (skrining → pemeriksaan fisik → cek kelayakan → donor)
- MatchSystem dengan transaksi serializable (race condition safe)
- Audit log untuk perubahan data sensitif
- Verifikasi RS oleh admin sebelum bisa transact

---

## 🎯 Masalah yang Dipecahkan

| Masalah Lama                                       | Solusi Blood Connect                                |
|----------------------------------------------------|-----------------------------------------------------|
| Data stok darah tersebar di banyak UTD             | Database terpusat real-time (PostgreSQL)            |
| Cari donor via Instagram/WA → hoax                 | MatchSystem engine notifikasi langsung ke pendonor |
| Validasi donor manual                              | `checkEligible()` otomatis berbasis aturan medis    |
| Tidak ada pengecekan stok kadaluarsa               | Cron job harian `stockExpiryJob`                    |
| Tidak ada matching otomatis pasien ↔ stok/donor    | `processMatch()` dengan transaksi serializable      |

---

## 🛠️ Tech Stack

| Layer        | Pilihan                                   |
|--------------|-------------------------------------------|
| Backend      | Node.js 20 + TypeScript + Express         |
| Database     | PostgreSQL (Neon Cloud) + transaksi ACID  |
| ORM          | Prisma 5                                  |
| Frontend     | Next.js 15 (App Router) + Tailwind CSS 3  |
| Auth         | JWT + bcrypt                              |
| Background   | node-cron (stock expiry job)              |
| Email        | Nodemailer                                |
| Validation   | Zod                                       |

---

## 🏥 Medical Workflow

Berbeda dengan MVP awal, sistem ini memodelkan **workflow medis nyata** untuk donor darah, sesuai standar PMI / Permenkes:

```
1. PENDONOR REGISTER          → Isi data + tanggal lahir (validasi usia 17-65)
        │
        ▼
2. ISI KUESIONER SKRINING     → 8 pertanyaan kesehatan (PMI standard)
   (/dashboard/donor/screening)  Demam? Operasi <6bln? Hamil? HIV/Hep?
                                Lolos → bisa lanjut. Gagal → ditolak.
        │
        ▼
3. PEMERIKSAAN FISIK DI RS    → Nakes input: Hb, BP, suhu, nadi, BB
   (/dashboard/hospital/checkup)  Sistem auto-evaluate passed/not passed
        │
        ▼
4. CEK KELAYAKAN              → checkEligible() evaluasi:
   (POST /api/donor/check-eligible) - Hb 12.5-17.0 g/dL
                                - BP sistolik 100-160, diastolik 60-100
                                - Suhu 36.5-37.5 °C
                                - BB ≥ 45 kg
                                - Jarak donor terakhir ≥ 60 hari
                                - Usia 17-65 tahun
                                - Lolos skrining (≤24 jam)
                                - Pemeriksaan ≤24 jam
        │
   eligible=true
        ▼
5. DAFTAR JADWAL DONOR        → Admin confirm/reject/reschedule
        │
        ▼
6. DONOR SELESAI              → Update DonorHistory + lastDonationDate
```

Untuk **request darah** dari pasien/RS:

```
PASIEN REQUEST → MatchSystem:
  Step 1: cari stok kompatibel (FEFO, SERIALIZABLE transaction)
          ├─ FOUND → alokasi, status MATCHED_STOCK
          └─ NONE  → fallthrough ke step 2
  Step 2: cari pendonor eligible di kota terdekat
          ├─ FOUND → kirim notifikasi (in-app + email)
          └─ NONE  → status PENDING, admin eskalasi manual
```

---

## 📂 Struktur Project

```
blood-connect/
├── prisma/
│   └── schema.prisma           # ⭐ Database schema (10 tabel + 6 enum)
├── src/                        # Backend API
│   ├── server.ts               # Entry point Express
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── notification.ts     # In-app + email dual-channel notif
│   ├── services/
│   │   ├── eligibilityService.ts   # Fitur A: checkEligible()
│   │   └── matchSystemService.ts   # Fitur B: MatchSystem engine
│   ├── controllers/
│   │   ├── authController.ts       # Login / Register / Logout
│   │   ├── matchController.ts      # Request darah + MatchSystem trigger
│   │   ├── donorController.ts      # Pendonor flows
│   │   └── stockController.ts      # Manajemen stok
│   ├── routes/
│   │   └── index.ts
│   ├── middleware/
│   │   └── auth.ts                 # JWT + role guard
│   └── jobs/
│       └── stockExpiryJob.ts       # Fitur C: cron harian
└── app/                        # Frontend Next.js
    ├── page.tsx                # Landing
    └── dashboard/
        ├── donor/page.tsx      # Dashboard Pendonor
        ├── patient/page.tsx    # Dashboard Pasien
        ├── hospital/page.tsx   # Dashboard Rumah Sakit
        └── admin/page.tsx      # Dashboard Admin
```

---

## 🚀 Cara Menjalankan (Step-by-Step Windows)

### 1. Prasyarat
- **Node.js 20+** — cek dengan `node --version`
- **PostgreSQL Database** — gunakan salah satu:
  - **Neon.tech** (Recommended — cloud, gratis, 0 disk usage) → https://neon.tech
  - PostgreSQL 14+ lokal (butuh ~1 GB disk)
- (Opsional) Redis untuk BullMQ — saat ini cron pakai `node-cron` jadi tidak wajib

### 2. Setup Database (Neon.tech — Recommended)

1. Daftar di **https://neon.tech** (login dengan GitHub/Google)
2. Project default otomatis dibuat
3. Klik **Connection Details** → copy **Connection string**
   Format: `postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require`

### 3. Setup Project

```powershell
cd "D:\path\ke\blood-connect"
npm install
```

Buat file `.env` (copy dari `.env.example`):
```powershell
copy .env.example .env
```

Edit `.env`, **wajib isi 2 baris ini**:
```env
DATABASE_URL="postgresql://user:password@ep-xxxxx.neon.tech/neondb?sslmode=require"
JWT_SECRET="string-acak-bebas-untuk-dev"
```

### 4. Migrasi Database (buat semua tabel)

```powershell
npm run prisma:generate
npm run prisma:migrate
```

Saat diminta nama migration: ketik `init` → Enter.
Akan terbentuk 13 tabel di Neon dashboard.

### 5. Bootstrap Data Demo

**Opsi A — Seed lengkap (Recommended untuk demo AOL):**
```powershell
npm run seed
```

Membuat:
- 1 Admin (`admin@bloodconnect.id` / `admin12345`)
- 2 RS (`rscm@test.com` VERIFIED dengan 5 batch stok; `rsfm@test.com` UNVERIFIED untuk demo workflow)
- 3 Pendonor (1 sudah eligible, 1 perlu skrining, 1 di kota beda)
- 2 Pasien siap request

Semua password (kecuali admin): `password123`.

**Opsi B — Cuma buat admin saja:**
```powershell
npm run admin:create
```

### 6. Jalankan Website

**Cara 1 — Jalankan API & Web bareng (paling praktis):**
```powershell
npm run dev
```

> ⚠️ Kalau `npm run dev` error `spawn cmd.exe ENOENT` di Windows, pakai Cara 2.

**Cara 2 — Pisah di 2 terminal (lebih mudah debug):**

Terminal 1 — API backend:
```powershell
npm run dev:api
```
Output: `🩸 Blood Connect API running on http://localhost:4000`

Terminal 2 — Frontend Next.js:
```powershell
npm run dev:web
```
Output: `▲ Next.js 15.5.x — Local: http://localhost:3000`

### 7. Buka di Browser

→ **http://localhost:3000** (landing page)

Flow lengkap:
1. **`/register`** — daftar sebagai Pendonor / Pasien / Rumah Sakit
2. **`/login`** — masuk dengan email + password
3. Otomatis di-redirect ke dashboard sesuai role:
   - `/dashboard/donor` — Pendonor
   - `/dashboard/patient` — Pasien
   - `/dashboard/hospital` — Rumah Sakit
   - `/dashboard/admin` — Admin (login pakai `admin@bloodconnect.id`)

### 8. Cron Stock Expiry (manual test)

```powershell
npm run job:expiry
```
Otomatis di-set EXPIRED untuk stok yang lewat tanggal kadaluarsa.

### 🧪 End-to-End Test Flow Setelah Server Jalan

1. **Daftar 4 user** lewat halaman `/register`: pendonor, pasien, RS, dan satu lagi untuk admin (atau seed manual).
2. **Login sebagai Admin** → dashboard admin → **Verify RS** yang baru daftar.
3. **Login sebagai RS** → dashboard RS → tombol "**+ Input Pemeriksaan Donor**" → isi vital signs pendonor (Hb 13.5, BP 120/80, suhu 36.8, dst). Catat `donorId` dari halaman donor.
4. **Login sebagai Pendonor** → dashboard → klik kartu "Step 1: Kuesioner Skrining" → jawab semua "Tidak" → kirim.
5. **Kembali ke dashboard donor** → klik "Cek Kelayakan" → harus muncul **✅ Eligible**.
6. **Login sebagai Pasien** → "Request Darah" → MatchSystem otomatis cari stok / pendonor.
7. **Login sebagai Pendonor** lagi → notifikasi muncul → Bersedia/Tolak.

### ⚠️ Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `Can't reach database server` | DATABASE_URL salah / Neon project sleep | Cek string di Neon dashboard, retry |
| `EADDRINUSE :4000` | Port 4000 dipakai proses lama | Ubah `PORT=4001` di `.env`, atau kill node process |
| `Akun RS belum diverifikasi` | RS baru daftar belum di-approve | Login sebagai Admin, verify RS dulu |
| `Belum ada hasil pemeriksaan fisik` | Pendonor belum diperiksa nakes | RS input via `/dashboard/hospital/checkup` |
| `Belum mengisi kuesioner skrining` | Pendonor belum isi screening | Pendonor isi via `/dashboard/donor/screening` |
| Dashboard kosong / 401 | Token belum di localStorage | Login ulang via `/login` |
| `EPERM rename query_engine` | Prisma generate konflik karena server jalan | Stop semua node process dulu, baru `prisma:migrate` |

---

## 🔑 Endpoint Utama

### Auth
| Method | Path                     | Use Case        | Role     |
|--------|--------------------------|-----------------|----------|
| POST   | `/api/auth/register`     | -               | public   |
| POST   | `/api/auth/login`        | **LOGIN**       | public   |
| POST   | `/api/auth/logout`       | **LOGOUT**      | authed   |

### Request Darah + MatchSystem
| Method | Path                            | Use Case             | Role            |
|--------|---------------------------------|----------------------|-----------------|
| GET    | `/api/requests`                 | TRACK (mine)         | authed          |
| POST   | `/api/requests`                 | **REQUEST**          | Pasien / RS¹    |
| GET    | `/api/requests/:id`             | **TRACK REQUEST**    | owner / admin   |
| PATCH  | `/api/requests/:id/status`      | **UPDATE STATUS**    | RS / Admin      |
| POST   | `/api/requests/:id/match`       | Re-trigger Match     | Admin           |

¹ RS harus berstatus VERIFIED (di-approve admin) sebelum bisa request.

### Pendonor
| Method | Path                                       | Use Case               |
|--------|--------------------------------------------|------------------------|
| GET    | `/api/donor/me`                            | Profil + status        |
| POST   | `/api/donor/check-eligible`                | **CHECKELIGIBLE**      |
| POST   | `/api/donor/schedules`                     | **DAFTAR DONOR**       |
| GET    | `/api/donor/history`                       | **HISTORY**            |
| GET    | `/api/donor/notifications`                 | List undangan match    |
| POST   | `/api/donor/notifications/:id/respond`     | Respons match          |
| GET    | `/api/donor/open-requests`                 | Browse semua request aktif (proaktif) |
| POST   | `/api/donor/volunteer/:requestId`          | Volunteer ke request tanpa di-tag |

### Profile & Notification Inbox (semua role)
| Method | Path                                | Use Case              |
|--------|-------------------------------------|------------------------|
| GET    | `/api/auth/me`                      | Load profile           |
| PATCH  | `/api/auth/me`                      | **UPDATE PROFIL**      |
| GET    | `/api/notifications`                | Inbox notifikasi       |
| GET    | `/api/notifications/count`          | Badge unread count     |
| PATCH  | `/api/notifications/:id/read`       | Tandai dibaca          |
| PATCH  | `/api/notifications/read-all`       | Tandai semua dibaca    |

### Medical (Pemeriksaan + Skrining)
| Method | Path                            | Role            | Fungsi                |
|--------|---------------------------------|-----------------|------------------------|
| POST   | `/api/medical/checkup`          | RS / Admin      | Input Hb/BP/BB pendonor |
| POST   | `/api/medical/screening`        | Pendonor        | Isi kuesioner skrining |
| GET    | `/api/medical/me`               | Pendonor        | Riwayat pemeriksaan    |

### Stok
| Method | Path                            | Role            | Fungsi                |
|--------|---------------------------------|-----------------|------------------------|
| GET    | `/api/stocks`                   | authed          | **CHECK AVAILABILITY** |
| POST   | `/api/stocks`                   | RS (VERIFIED)   | **UPDATE STOCK** (default QUARANTINE) |
| GET    | `/api/stocks/mine`              | RS              | List stok milik RS     |
| PATCH  | `/api/stocks/:id/verify`        | Admin           | QUARANTINE → AVAILABLE |

### Admin
| Method | Path                                     | Fungsi                          |
|--------|------------------------------------------|---------------------------------|
| GET    | `/api/admin/hospitals?status=UNVERIFIED` | List RS menunggu verifikasi     |
| PATCH  | `/api/admin/hospitals/:id/verify`        | Verify / Suspend RS             |
| GET    | `/api/admin/schedules?status=PENDING`    | List jadwal pending             |
| PATCH  | `/api/admin/schedules/:id`               | **CONFIRM** (confirm/reject/reschedule) |
| GET    | `/api/admin/requests?status=PENDING`     | List request tertahan           |

---

## 🧠 Core Business Logic

### Fitur A — `checkEligible()` Automated Eligibility Screening

**File:** `src/services/eligibilityService.ts`

Pendonor dinyatakan **eligible** jika:
- Hemoglobin antara **12.5 – 17.0 g/dL** (standar PMI/WHO)
- Selisih `lastDonationDate` dengan hari ini **> 60 hari**
- Status `isActive = true`
- Data medis lengkap (`hemoglobinLevel` tidak null)

Jika gagal, sistem mengembalikan list alasan detail (mengikuti **Exception 2.2** pada use case CHECKELIGIBLE) dan tetap mengupdate `isEligible = false` di DB.

### Fitur B — `MatchSystem` Engine

**File:** `src/services/matchSystemService.ts`

Saat `requestBlood()` dipanggil:

```
processMatch(requestId)
   ├─ Step 1: matchStockToRequest()      [Activity Diagram #15]
   │     SERIALIZABLE transaction
   │     ├─ SELECT ... FOR UPDATE SKIP LOCKED       ← cegah race condition
   │     ├─ FEFO ordering (First Expiry First Out)
   │     └─ FOUND  → allocate, decrement, set MATCHED_STOCK
   │
   └─ Step 2: matchDonorToRequest()      [Activity Diagram #14]
         ├─ Cek kompatibilitas golongan darah (checkCompatibleBlood)
         ├─ Filter: bloodType + rhesus + isEligible + isActive + kota
         ├─ Order by lastDonationDate ASC (paling lama → prioritas)
         └─ notifyEligibleDonor() — in-app + email
```

**Concurrency Safety:**
- Isolation level **Serializable** + `FOR UPDATE SKIP LOCKED` mencegah dua request mengambil batch stok yang sama.
- Caller-level **retry** untuk error `P2034` (serialization conflict).
- Transaksi atomik: jika alokasi gagal di tengah → rollback otomatis.

### Fitur C — Stock Auto-Update Cron

**File:** `src/jobs/stockExpiryJob.ts`

- Schedule: **`5 0 * * *`** (setiap hari 00:05)
- Aksi:
  1. `UPDATE StokDarah SET status='EXPIRED' WHERE expiryDate < NOW() AND status='AVAILABLE'`
  2. Notifikasi early-warning untuk batch yang akan expired dalam < 3 hari ke admin RS terkait.

---

## 📊 Mapping ke Diagram UML

| Komponen Kode                    | Use Case / Activity Diagram                |
|----------------------------------|--------------------------------------------|
| `authController.login`           | Use Case **LOGIN** (Sequence Diagram #1)   |
| `eligibilityService.checkEligible` | Use Case **CHECKELIGIBLE** + Activity #4 |
| `donorController.createSchedule` | Use Case **DAFTAR DONOR** + Activity #5    |
| `donorController.getDonorHistory`| Use Case **HISTORY** + Activity #6         |
| `matchController.createRequest`  | Use Case **REQUEST** + Activity #9         |
| `matchSystemService.matchStockToRequest` | **MATCH STOCK** + Activity #15     |
| `matchSystemService.matchDonorToRequest` | **MATCH REQUEST** + Activity #14   |
| `matchController.updateRequestStatus`    | **UPDATE STATUS** (RS) + Activity #11/#12 |
| `stockController.createStock`    | **UPDATE STOCK** + Activity #12            |
| `stockController.checkAvailability` | **CHECK AVAILABILITY** + Activity #13   |
| `stockExpiryJob.runStockExpiryCheck` | Auto-branch **UPDATE STOCK** (Fitur C) |

---

## 🗃️ Skema Database (12 model)

| Model | Tujuan |
|-------|--------|
| `User` | Base — email, password, name, **birthDate** (validasi usia donor) |
| `Pendonor` | Pendonor — bloodType, weight, isEligible, lastDonationDate |
| `Pasien` | Pasien — NIK opsional |
| `RumahSakit` | RS — dengan **HospitalStatus** (UNVERIFIED → VERIFIED → SUSPENDED) |
| `PemeriksaanDonor` ⭐ | Time-series vital signs: Hb, BP, suhu, BB (diisi nakes) |
| `ScreeningAnswer` ⭐ | Kuesioner 8 pertanyaan PMI (diisi pendonor sendiri) |
| `StokDarah` | Per-batch dengan **BloodComponent** (WHOLE_BLOOD/PRC/FFP/TC/CRYO), default QUARANTINE |
| `StockAllocation` | Join: 1 request bisa dipenuhi dari multi-batch |
| `PermintaanDonor` | Request darah dengan urgency NORMAL/URGENT/CRITICAL |
| `JadwalDonor` | Jadwal donor + status lifecycle |
| `DonorHistory` | Riwayat donor selesai |
| `DonorNotification` | Log MatchSystem invite pendonor + response |
| `Notification` | Inbox in-app generic |
| `AuditLog` ⭐ | Jejak perubahan untuk compliance |

⭐ = ditambahkan untuk medical workflow yang proper.

Index strategis untuk MatchSystem:
```prisma
@@index([bloodType, rhesusType, component, status, expiryDate])  // stok lookup
@@index([bloodType, rhesusType, isEligible])                      // pendonor filter
@@index([reqStatus, createdAt])                                    // request queue
@@index([entity, entityId])                                        // audit lookup
```

---

## 🧪 Test Scenario (Manual QA)

1. **Happy path stok:** Pasien request darah → MatchSystem temukan stok → status `MATCHED_STOCK`.
2. **Fallback donor:** Stok kosong → MatchSystem fallback ke pendonor → notifikasi terkirim → status `MATCHED_DONOR`.
3. **Race condition:** 2 RS request bersamaan untuk stok terakhir → hanya 1 yang dapat `MATCHED_STOCK`, lainnya fallback ke donor.
4. **Eligibility:** Pendonor dengan `lastDonationDate` 30 hari lalu → `checkEligible` return `eligible: false` + reason.
5. **Cron expiry:** Tambah stok manual dengan `expiryDate` kemarin → `npm run job:expiry` → status berubah `EXPIRED`.

---

## 👥 Aktor & Role

| Role         | Akses Dashboard          | Use Cases                                     |
|--------------|--------------------------|-----------------------------------------------|
| **PENDONOR** | `/dashboard/donor`       | checkEligible, daftarDonor, history, respond notif |
| **PASIEN**   | `/dashboard/patient`     | requestBlood, trackRequestStatus              |
| **RUMAH_SAKIT** | `/dashboard/hospital` | requestBlood, updateStatus, updateStock, checkAvailability |
| **ADMIN**    | `/dashboard/admin`       | confirm/reject schedules, re-trigger MatchSystem, manage stok |

---

## ⚠️ Catatan Produksi

- Ganti `JWT_SECRET` dengan string acak 256-bit.
- Aktifkan **HTTPS** + **rate limiting** sebelum deploy.
- Migrasi `processMatch()` ke **BullMQ queue** (Redis) saat traffic tinggi agar response API tidak blocking.
- Backup database harian + audit log untuk perubahan `StokDarah` dan `PermintaanDonor`.

---
