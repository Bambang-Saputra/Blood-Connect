/**
 * RICH DUMMY SEED — "seolah aplikasi sudah lama berjalan"
 * ======================================================================
 * Jalankan: npm run seed:dummy
 *
 * Membuat data dalam jumlah besar untuk SEMUA role + history lintas-role:
 *   - 8 kota, ~11 PMI (verified/unverified/suspended)
 *   - ~60 Pendonor, ~35 Pasien, 1 Admin
 *   - Ratusan donasi selesai (DonorHistory + stok dari donor + checkup + jadwal)
 *   - Puluhan permintaan darah di SEMUA status (PENDING…FULFILLED…CANCELLED)
 *     beserta alokasi stok, notifikasi pasien, dan audit log
 *   - Broadcast PMI→donor (OPEN/CLOSED/EXPIRED) + notifikasi donor
 *   - Tanggal di-backdate hingga ~8 bulan ke belakang
 *
 * ⚠️ DESTRUCTIVE: script ini meng-WIPE semua data lalu mengisi ulang.
 * Akun test yang dikenal tetap dibuat (login lama tetap jalan).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "../src/lib/prisma";

// ---------------------------------------------------------------- helpers
const rid = () => randomUUID();
const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p: number) => Math.random() < p;
const pickSome = <T>(a: T[], k: number): T[] => [...a].sort(() => Math.random() - 0.5).slice(0, k);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

// ---------------------------------------------------------------- reference
const REGIONS = [
  { city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek", tel: "021", weight: 5 },
  { city: "Surabaya", province: "Jawa Timur", zone: "Gerbangkertosusila", tel: "031", weight: 3 },
  { city: "Bandung", province: "Jawa Barat", zone: "Bandung Raya", tel: "022", weight: 3 },
  { city: "Medan", province: "Sumatera Utara", zone: "Mebidangro", tel: "061", weight: 2 },
  { city: "Semarang", province: "Jawa Tengah", zone: "Kedungsepur", tel: "024", weight: 2 },
  { city: "Yogyakarta", province: "DI Yogyakarta", zone: "Kartamantul", tel: "0274", weight: 2 },
  { city: "Denpasar", province: "Bali", zone: "Sarbagita", tel: "0361", weight: 1 },
  { city: "Makassar", province: "Sulawesi Selatan", zone: "Mamminasata", tel: "0411", weight: 1 },
];
const regionByCity = (c: string) => REGIONS.find((r) => r.city === c)!;
const weightedRegion = () => {
  const pool: typeof REGIONS = [];
  REGIONS.forEach((r) => { for (let i = 0; i < r.weight; i++) pool.push(r); });
  return rand(pool);
};

const FIRST = ["Budi", "Siti", "Andi", "Dewi", "Agus", "Rina", "Joko", "Maya", "Eko", "Putri",
  "Rizki", "Wati", "Hadi", "Lestari", "Bayu", "Indah", "Fajar", "Sri", "Dimas", "Ayu",
  "Galih", "Nadia", "Yusuf", "Citra", "Bagus", "Fitri", "Arif", "Lina", "Reza", "Tari",
  "Hendra", "Mega", "Iqbal", "Sara", "Doni", "Wulan", "Teguh", "Nita", "Surya", "Vina"];
const LAST = ["Santoso", "Wijaya", "Pratama", "Hidayat", "Saputra", "Nugroho", "Kusuma", "Halim",
  "Permana", "Maulana", "Anggraini", "Setiawan", "Hartono", "Gunawan", "Suryadi", "Firmansyah",
  "Rahmawati", "Cahyono", "Utami", "Wibowo", "Susanto", "Handoko", "Pertiwi", "Yulianto"];
const fullName = () => `${rand(FIRST)} ${rand(LAST)}`;
// Gender konsisten dengan nama depan (mis. Budi→MALE, Siti→FEMALE) agar skrining sesuai.
const FEMALE_FIRST = new Set(["Siti","Dewi","Rina","Maya","Putri","Wati","Lestari","Indah","Sri","Ayu","Nadia","Citra","Fitri","Lina","Tari","Mega","Sara","Wulan","Nita","Vina","Ani"]);
const genderOf = (name: string): "MALE" | "FEMALE" => (FEMALE_FIRST.has(name.split(" ")[0]) ? "FEMALE" : "MALE");

const HOSPITALS = ["RS Cipto Mangunkusumo", "RS Pondok Indah", "RSUD Dr. Soetomo", "RS Hasan Sadikin",
  "RS Sardjito", "RSUP Adam Malik", "RS Kariadi", "RS Sanglah", "RS Wahidin Sudirohusodo",
  "RS Premier Bintaro", "RS Siloam", "RS Mitra Keluarga", "RSUD Tarakan", "RS Mayapada"];

const COMPONENTS = ["WHOLE_BLOOD", "PRC", "FFP", "TC", "CRYO"];
const SESI = ["PAGI", "SIANG", "SORE"];
const REQ_REASONS = ["Operasi caesar", "Kecelakaan lalu lintas", "Transfusi rutin thalassemia",
  "Operasi jantung", "Demam berdarah", "Anemia berat", "Pendarahan pasca-melahirkan",
  "Operasi tumor", "Cuci darah", "Leukemia"];
const DOCTORS = ["dr. Hartono, Sp.PD", "dr. Wijaya, Sp.B", "dr. Sari, Sp.OG", "dr. Pranata, Sp.JP", "dr. Lim, Sp.A"];

// distribusi golongan darah ~ realistis Indonesia
const bloodType = () => rand(["O", "O", "O", "O", "A", "A", "A", "B", "B", "B", "AB"]);
const rhesus = () => (chance(0.93) ? "POSITIVE" : "NEGATIVE");
const rhSym = (rh: string) => (rh === "POSITIVE" ? "+" : "-");

// ---------------------------------------------------------------- counters
const C = { donors: 57, patients: 33, extraStockPerPmi: 6, donationsTotal: 150, requests: 90, broadcastsPerPmi: 3 };

async function main() {
  console.log("🌱 RICH DUMMY SEED — membangun database 'sudah lama berjalan'…\n");

  // ============================= 1) WIPE =============================
  console.log("🧹 Menghapus data lama…");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.donorNotification.deleteMany();
  await prisma.stockAllocation.deleteMany();
  await prisma.donorHistory.deleteMany();
  await prisma.jadwalDonor.deleteMany();
  await prisma.pemeriksaanDonor.deleteMany();
  await prisma.screeningAnswer.deleteMany();
  await prisma.stokDarah.deleteMany();
  await prisma.pmiBroadcast.deleteMany();
  await prisma.permintaanDonor.deleteMany();
  await prisma.pendonor.deleteMany();
  await prisma.pasien.deleteMany();
  await prisma.pMI.deleteMany();
  await prisma.user.deleteMany();

  const pw = bcrypt.hashSync("password123", 10);
  const pwAdmin = bcrypt.hashSync("admin12345", 10);
  let phoneSeq = 1000;
  const phone = (tel: string) => `${tel}${String(phoneSeq++).padStart(7, "0")}`;
  const emails = new Set<string>();
  const mkEmail = (name: string, dom: string) => {
    const base = name.toLowerCase().replace(/[^a-z]/g, ".").replace(/\.+/g, ".");
    let e = `${base}@${dom}`; let i = 1;
    while (emails.has(e)) e = `${base}${i++}@${dom}`;
    emails.add(e); return e;
  };

  // record buffers
  const users: any[] = [], pmis: any[] = [], donors: any[] = [], patients: any[] = [];
  const screenings: any[] = [], checkups: any[] = [], schedules: any[] = [];
  const histories: any[] = [], stocks: any[] = [], requests: any[] = [];
  const allocations: any[] = [], broadcasts: any[] = [], donorNotifs: any[] = [];
  const notifs: any[] = [], audits: any[] = [];

  // ============================= 2) ADMIN =============================
  const adminId = rid();
  users.push({ id: adminId, email: "admin@bloodconnect.id", password: pwAdmin, name: "Super Admin",
    phoneNum: "021555000", city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
    role: "ADMIN", createdAt: daysAgo(240) });
  emails.add("admin@bloodconnect.id");

  // ============================= 3) PMI =============================
  // objek PMI in-memory: {id, userId, city, name, status, stockIds:[]}
  const pmiObjs: any[] = [];
  const pmiSpec = [
    { email: "pmi.jakarta@test.com", city: "Jakarta", name: "PMI Provinsi DKI Jakarta", code: "PMI-DKI-01", status: "VERIFIED" },
    { email: "pmi.surabaya@test.com", city: "Surabaya", name: "PMI Kota Surabaya", code: "PMI-SBY-01", status: "VERIFIED" },
    { email: "pmi.bandung@test.com", city: "Bandung", name: "PMI Kota Bandung", code: "PMI-BDG-01", status: "UNVERIFIED" },
    { email: null, city: "Medan", name: "PMI Kota Medan", code: "PMI-MDN-01", status: "VERIFIED" },
    { email: null, city: "Semarang", name: "PMI Kota Semarang", code: "PMI-SMG-01", status: "VERIFIED" },
    { email: null, city: "Yogyakarta", name: "PMI Kota Yogyakarta", code: "PMI-YGY-01", status: "VERIFIED" },
    { email: null, city: "Denpasar", name: "PMI Kota Denpasar", code: "PMI-DPS-01", status: "VERIFIED" },
    { email: null, city: "Makassar", name: "PMI Kota Makassar", code: "PMI-MKS-01", status: "VERIFIED" },
    { email: null, city: "Jakarta", name: "PMI Jakarta Timur", code: "PMI-DKI-02", status: "VERIFIED" },
    { email: null, city: "Surabaya", name: "PMI Surabaya Selatan", code: "PMI-SBY-02", status: "UNVERIFIED" },
    { email: null, city: "Bandung", name: "PMI Cimahi", code: "PMI-BDG-02", status: "SUSPENDED" },
  ];
  for (const p of pmiSpec) {
    const reg = regionByCity(p.city);
    const uid = rid(), pid = rid();
    const email = p.email ?? mkEmail(p.name, "pmi.or.id");
    const createdAt = daysAgo(randInt(150, 230));
    users.push({ id: uid, email, password: pw, name: `Petugas ${p.name}`,
      phoneNum: phone(reg.tel), address: `Jl. Merdeka No.${randInt(1, 99)}`,
      city: p.city, province: reg.province, zone: reg.zone, role: "PMI", createdAt });
    pmis.push({ id: pid, userId: uid, pmiName: p.name, pmiCode: p.code,
      pmiLoc: `Jl. Donor Darah No.${randInt(1, 50)}, ${p.city}`, status: p.status,
      verifiedAt: p.status === "VERIFIED" ? addDays(createdAt, randInt(1, 5)) : null,
      verifiedById: p.status === "VERIFIED" ? adminId : null });
    pmiObjs.push({ id: pid, userId: uid, city: p.city, name: p.name, status: p.status, stockIds: [] as string[] });
    // audit verifikasi PMI oleh admin
    if (p.status === "VERIFIED") {
      audits.push({ id: rid(), userId: adminId, action: "UPDATE", entity: "PMI", entityId: pid,
        after: { status: "VERIFIED" }, ipAddress: "127.0.0.1", createdAt: addDays(createdAt, randInt(1, 5)) });
      notifs.push({ id: rid(), userId: uid, type: "ACCOUNT_VERIFICATION", title: "PMI terverifikasi ✅",
        body: `${p.name} telah diverifikasi admin dan dapat beroperasi penuh.`, isRead: true, createdAt: addDays(createdAt, randInt(1, 5)) });
    }
  }
  const verifiedPmis = pmiObjs.filter((p) => p.status === "VERIFIED");
  const pmiInCity = (city: string) => verifiedPmis.filter((p) => p.city === city);

  // ============================= 4) PENDONOR =============================
  // objek donor in-memory dengan agregat donasi
  const donorObjs: any[] = [];
  const knownDonors = [
    { email: "donor1@test.com", name: "Budi Donor", city: "Jakarta", bt: "O", rh: "POSITIVE", birth: "1995-05-15" },
    { email: "donor2@test.com", name: "Siti Donor", city: "Jakarta", bt: "A", rh: "POSITIVE", birth: "1998-08-20" },
    { email: "donor3@test.com", name: "Andi Donor", city: "Surabaya", bt: "B", rh: "NEGATIVE", birth: "2000-01-10" },
  ];
  const totalDonors = C.donors + knownDonors.length;
  for (let i = 0; i < totalDonors; i++) {
    const known = knownDonors[i];
    const reg = known ? regionByCity(known.city) : weightedRegion();
    const name = known?.name ?? fullName();
    const uid = rid(), did = rid();
    const email = known?.email ?? mkEmail(name, "mail.com");
    if (known) emails.add(email);
    const bt = known?.bt ?? bloodType();
    const rh = known?.rh ?? rhesus();
    const createdAt = daysAgo(randInt(30, 230));
    const birthY = known ? new Date(known.birth) : new Date(`${randInt(1965, 2007)}-0${randInt(1, 9)}-1${randInt(0, 8)}`);
    users.push({ id: uid, email, password: pw, name, phoneNum: phone(reg.tel),
      address: `Jl. ${rand(LAST)} No.${randInt(1, 200)}`, city: reg.city, province: reg.province, zone: reg.zone,
      birthDate: birthY, gender: genderOf(name), role: "PENDONOR", createdAt });
    donorObjs.push({ id: did, userId: uid, name, city: reg.city, bt, rh, createdAt,
      donations: 0, lastDon: null as Date | null, eligible: true, cooldownUntil: null as Date | null, reason: null as string | null });
  }

  // ============================= 5) PASIEN =============================
  const patientObjs: any[] = [];
  const knownPatients = [
    { email: "pasien1@test.com", name: "Ani Pasien", city: "Jakarta", birth: "1985-03-20" },
    { email: "pasien2@test.com", name: "Doni Pasien", city: "Jakarta", birth: "1990-07-12" },
  ];
  const totalPatients = C.patients + knownPatients.length;
  for (let i = 0; i < totalPatients; i++) {
    const known = knownPatients[i];
    const reg = known ? regionByCity(known.city) : weightedRegion();
    const name = known?.name ?? fullName();
    const uid = rid(), pid = rid();
    const email = known?.email ?? mkEmail(name, "gmail.com");
    if (known) emails.add(email);
    const createdAt = daysAgo(randInt(20, 220));
    users.push({ id: uid, email, password: pw, name, phoneNum: phone(reg.tel),
      city: reg.city, province: reg.province, zone: reg.zone,
      birthDate: known ? new Date(known.birth) : new Date(`${randInt(1950, 2010)}-0${randInt(1, 9)}-1${randInt(0, 8)}`),
      gender: genderOf(name), role: "PASIEN", createdAt });
    patients.push({ id: pid, userId: uid, nik: `32${randInt(10, 99)}${String(phoneSeq++).padStart(10, "0")}` });
    patientObjs.push({ id: pid, userId: uid, name, city: reg.city });
  }

  // ============================= 6) BASE STOCK per PMI verified =============================
  for (const pmi of verifiedPmis) {
    for (let i = 0; i < C.extraStockPerPmi; i++) {
      const sid = rid();
      const bt = bloodType(), rh = rhesus();
      const created = daysAgo(randInt(3, 35));
      const expiry = addDays(created, randInt(20, 42));
      const expired = expiry < new Date();
      stocks.push({ id: sid, pmiId: pmi.id, bloodType: bt, rhesusType: rh, component: rand(COMPONENTS),
        quantity: randInt(2, 14), expiryDate: expiry, location: `Gudang ${rand(["A", "B", "C", "Utama"])} - ${pmi.city}`,
        status: expired ? "EXPIRED" : "AVAILABLE", source: `UTD ${pmi.name}`, createdAt: created });
      if (!expired) pmi.stockIds.push(sid);
    }
  }

  // ============================= 7) DONASI SELESAI (history kaya) =============================
  // tentukan dulu siapa donor mana berapa kali → agregat, baru bangun record
  for (let i = 0; i < C.donationsTotal; i++) {
    const donor = rand(donorObjs);
    const localPmis = pmiInCity(donor.city);
    const pmi = localPmis.length ? rand(localPmis) : rand(verifiedPmis); // umumnya kota sama
    const date = daysAgo(randInt(8, 220));
    const scrId = rid(), chkId = rid(), schId = rid(), hisId = rid(), stkId = rid();
    screenings.push({ id: scrId, donorId: donor.id, answeredAt: date, validUntil: addDays(date, 7),
      hasFever: false, recentSurgery: false, recentTattoo: false, isPregnantOrLactating: false,
      onMedication: false, hasHIVOrHepatitis: false, riskySexualBehavior: false, recentVaccination: false, passed: true });
    checkups.push({ id: chkId, donorId: donor.id, pmiId: pmi.id, examinedAt: date, examinedBy: pmi.userId,
      hemoglobinLevel: 13 + Math.random() * 3, systolicBP: randInt(110, 130), diastolicBP: randInt(70, 85),
      bodyTempC: 36.4 + Math.random(), pulseRate: randInt(62, 88), weight: randInt(50, 85), passed: true });
    schedules.push({ id: schId, donorId: donor.id, pmiId: pmi.id, jadwal: date, sesi: rand(SESI),
      status: "COMPLETED", screeningId: scrId, checkupId: chkId, isEligible: true,
      eligibilityReason: null, createdAt: addDays(date, -randInt(1, 10)) });
    histories.push({ id: hisId, donorId: donor.id, donationDate: date, location: `${pmi.name}`,
      bagCount: rand([1, 1, 1, 2]), volumeMl: rand([350, 450, 450, 450]), component: "WHOLE_BLOOD", note: chance(0.3) ? "Donasi rutin" : null });
    const expiry = addDays(date, 35);
    const expired = expiry < new Date();
    const sid2 = stkId;
    stocks.push({ id: sid2, pmiId: pmi.id, bloodType: donor.bt, rhesusType: donor.rh, component: "WHOLE_BLOOD",
      quantity: 1, expiryDate: expiry, location: `Gudang Utama - ${pmi.city}`,
      status: expired ? "USED" : "AVAILABLE", source: `Donasi ${donor.name}`, donorId: donor.id, createdAt: date });
    if (!expired) pmi.stockIds.push(sid2);
    notifs.push({ id: rid(), userId: donor.userId, type: "GENERIC", title: "Donasi selesai — terima kasih! 🩸",
      body: `Donasi Anda di ${pmi.name} tercatat. ${donor.bt}${rhSym(donor.rh)} masuk stok. Sampai jumpa donasi berikutnya!`,
      isRead: chance(0.7), createdAt: date });
    audits.push({ id: rid(), userId: pmi.userId, action: "CREATE", entity: "DonorHistory", entityId: hisId,
      after: { donorId: donor.id, pmiId: pmi.id, volumeMl: 450 }, ipAddress: "127.0.0.1", createdAt: date });
    // agregat
    donor.donations++;
    if (!donor.lastDon || date > donor.lastDon) donor.lastDon = date;
  }

  // ============================= 8) JADWAL AKTIF / GAGAL SKRINING (variasi state donor) =============================
  for (const donor of donorObjs) {
    // sebagian donor punya jadwal mendatang (PENDING/CONFIRMED)
    if (chance(0.35)) {
      const localPmis = pmiInCity(donor.city);
      const pmi = localPmis.length ? rand(localPmis) : rand(verifiedPmis);
      const scrDate = daysAgo(randInt(0, 4));
      const scrId = rid();
      screenings.push({ id: scrId, donorId: donor.id, answeredAt: scrDate, validUntil: addDays(scrDate, 7),
        hasFever: false, recentSurgery: false, recentTattoo: false, isPregnantOrLactating: false,
        onMedication: false, hasHIVOrHepatitis: false, riskySexualBehavior: false, recentVaccination: false, passed: true });
      schedules.push({ id: rid(), donorId: donor.id, pmiId: pmi.id, jadwal: daysAhead(randInt(1, 21)),
        sesi: rand(SESI), status: rand(["PENDING", "CONFIRMED", "CONFIRMED"]), screeningId: scrId,
        checkupId: null, isEligible: null, eligibilityReason: null, createdAt: scrDate });
    }
    // sebagian kecil donor GAGAL skrining → cooldown + tidak eligible
    if (chance(0.12)) {
      const scrDate = daysAgo(randInt(1, 40));
      const failKind = rand(["fever", "tattoo", "medication", "hiv"]);
      screenings.push({ id: rid(), donorId: donor.id, answeredAt: scrDate, validUntil: addDays(scrDate, 7),
        hasFever: failKind === "fever", recentSurgery: false, recentTattoo: failKind === "tattoo",
        isPregnantOrLactating: false, onMedication: failKind === "medication", hasHIVOrHepatitis: failKind === "hiv",
        riskySexualBehavior: false, recentVaccination: false, passed: false,
        details: `Gagal skrining: ${failKind}` });
      donor.eligible = false;
      donor.reason = `Skrining tidak lolos (${failKind})`;
      donor.cooldownUntil = failKind === "hiv" ? daysAhead(36500) : failKind === "tattoo" ? daysAhead(180) : daysAhead(randInt(7, 14));
    }
    // cooldown karena baru donor (< 60 hari)
    if (donor.lastDon && (Date.now() - donor.lastDon.getTime()) < 60 * 86400000) {
      donor.cooldownUntil = addDays(donor.lastDon, 60);
      donor.eligible = false;
      donor.reason = donor.reason ?? "Masa tunggu 60 hari pasca-donor";
    } else if (donor.donations > 0 && donor.eligible) {
      donor.eligible = true;
    }
  }

  // ============================= 9) FINALISASI PENDONOR ROWS =============================
  const preferredVerified = verifiedPmis;
  for (const d of donorObjs) {
    const localPmi = pmiInCity(d.city)[0];
    donors.push({ id: d.id, userId: d.userId, bloodType: d.bt, rhesusType: d.rh,
      weight: randInt(50, 88), lastDonationDate: d.lastDon, isActive: true,
      isEligible: d.eligible, eligibilityReason: d.reason, totalDonations: d.donations,
      cooldownUntil: d.cooldownUntil, preferredPmiId: chance(0.6) ? (localPmi?.id ?? rand(preferredVerified).id) : null });
  }

  // ============================= 10) PERMINTAAN DARAH (semua status) =============================
  const STATUS_PLAN: [string, number][] = [
    ["FULFILLED", 30], ["CANCELLED", 12], ["REJECTED", 10], ["PENDING", 14], ["PROCESSING", 12], ["IN_TRANSIT", 8],
  ];
  const allRequestIdsPending: string[] = [];
  for (const [status, n] of STATUS_PLAN) {
    for (let i = 0; i < n; i++) {
      const patient = rand(patientObjs);
      const bt = bloodType(), rh = rhesus();
      const created = daysAgo(randInt(1, 210));
      const reqId = rid();
      const needsPmi = status !== "PENDING" && status !== "CANCELLED" ? true : (status === "CANCELLED" ? chance(0.5) : false);
      const localPmis = pmiInCity(patient.city);
      const pmi = needsPmi ? (localPmis.length && chance(0.7) ? rand(localPmis) : rand(verifiedPmis)) : null;
      const qty = randInt(1, 4);
      const fulfilledAt = status === "FULFILLED" ? addDays(created, randInt(1, 4)) : null;
      requests.push({ id: reqId, patientId: patient.id, targetHospitalName: rand(HOSPITALS),
        targetHospitalAddress: `Jl. Sehat No.${randInt(1, 99)}, ${patient.city}`, acceptedByPmiId: pmi?.id ?? null,
        bloodType: bt, rhesusType: rh, component: chance(0.7) ? "WHOLE_BLOOD" : rand(COMPONENTS), quantity: qty,
        urgency: "NORMAL", reason: rand(REQ_REASONS), doctorName: rand(DOCTORS), reqStatus: status, createdAt: created, fulfilledAt });

      // notifikasi + audit sesuai lifecycle
      if (pmi) {
        notifs.push({ id: rid(), userId: patient.userId, type: "REQUEST_STATUS_UPDATE", title: "Permintaan diterima PMI",
          body: `${pmi.name} menerima & memproses permintaan darah Anda.`, isRead: chance(0.6),
          meta: { requestId: reqId, newStatus: "PROCESSING", pmiName: pmi.name }, createdAt: addDays(created, 1) });
        audits.push({ id: rid(), userId: pmi.userId, action: "STATUS_CHANGE", entity: "PermintaanDonor", entityId: reqId,
          before: { status: "PENDING" }, after: { status: "PROCESSING" }, ipAddress: "127.0.0.1", createdAt: addDays(created, 1) });
      }
      if (status === "IN_TRANSIT" && pmi) {
        notifs.push({ id: rid(), userId: patient.userId, type: "REQUEST_STATUS_UPDATE", title: "Darah sedang dikirim 🚑",
          body: `${pmi.name} sedang mengirim darah ke ${rand(HOSPITALS)}.`, isRead: chance(0.4),
          meta: { requestId: reqId, newStatus: "IN_TRANSIT" }, createdAt: addDays(created, 2) });
      }
      if (status === "FULFILLED" && pmi) {
        notifs.push({ id: rid(), userId: patient.userId, type: "REQUEST_STATUS_UPDATE", title: "Permintaan terpenuhi 🎉",
          body: `Permintaan darah Anda telah dipenuhi oleh ${pmi.name}.`, isRead: chance(0.5),
          meta: { requestId: reqId, newStatus: "FULFILLED" }, createdAt: fulfilledAt! });
        audits.push({ id: rid(), userId: pmi.userId, action: "STOCK_ALLOCATE", entity: "PermintaanDonor", entityId: reqId,
          after: { status: "FULFILLED", quantity: qty }, ipAddress: "127.0.0.1", createdAt: fulfilledAt! });
        // alokasi stok dari batch PMI yang accept
        let remaining = qty;
        const usable = pickSome(pmi.stockIds as string[], Math.min(2, pmi.stockIds.length));
        for (const sId of usable) {
          if (remaining <= 0) break;
          const take = randInt(1, remaining);
          allocations.push({ id: rid(), requestId: reqId, stockId: sId, quantity: take, createdAt: fulfilledAt! });
          remaining -= take;
        }
      }
      if (status === "REJECTED" && pmi) {
        notifs.push({ id: rid(), userId: patient.userId, type: "REQUEST_STATUS_UPDATE", title: "Permintaan ditolak",
          body: `Maaf, permintaan darah Anda ditolak. Anda dapat mengajukan permintaan baru.`, isRead: chance(0.6),
          meta: { requestId: reqId, newStatus: "REJECTED" }, createdAt: addDays(created, 1) });
      }
      if (status === "CANCELLED") {
        notifs.push({ id: rid(), userId: patient.userId, type: "REQUEST_STATUS_UPDATE", title: "Permintaan dibatalkan",
          body: `Permintaan darah Anda telah dibatalkan.`, isRead: true,
          meta: { requestId: reqId, newStatus: "CANCELLED" }, createdAt: addDays(created, randInt(1, 3)) });
      }
      if (status === "PENDING") allRequestIdsPending.push(reqId);
    }
  }

  // ============================= 11) BROADCAST PMI → DONOR =============================
  for (const pmi of verifiedPmis) {
    for (let i = 0; i < C.broadcastsPerPmi; i++) {
      const bt = bloodType(), rh = rhesus();
      const created = daysAgo(randInt(1, 120));
      const st = rand(["OPEN", "CLOSED", "EXPIRED", "OPEN"]);
      const target = randInt(3, 12);
      const bId = rid();
      broadcasts.push({ id: bId, pmiId: pmi.id, bloodType: bt, rhesusType: rh, targetQuantity: target,
        filledQuantity: st === "CLOSED" ? target : randInt(0, target - 1), message: chance(0.5) ? `Butuh segera ${bt}${rhSym(rh)} untuk pasien darurat` : null,
        status: st, expiresAt: st === "EXPIRED" ? daysAgo(randInt(1, 10)) : (st === "OPEN" ? daysAhead(randInt(3, 20)) : null), createdAt: created });
      // notif ke beberapa donor sekota yang kompatibel
      const cityDonors = donorObjs.filter((d) => d.city === pmi.city);
      for (const d of pickSome(cityDonors, Math.min(randInt(2, 6), cityDonors.length))) {
        notifs.push({ id: rid(), userId: d.userId, type: "PMI_BROADCAST", title: `🩸 ${pmi.name} butuh donor ${bt}${rhSym(rh)}`,
          body: `PMI di kota Anda butuh ${target} kantong darah ${bt}${rhSym(rh)}. Silakan daftar jadwal donor.`,
          isRead: chance(0.5), meta: { broadcastId: bId, pmiId: pmi.id }, createdAt: created });
      }
    }
  }

  // ============================= 12) DONOR NOTIFICATION (match-system: donor diundang utk request) =============================
  // pasangkan beberapa donor ke beberapa request PENDING (unik [donorId, requestId])
  const dnPairs = new Set<string>();
  for (let i = 0; i < 40 && allRequestIdsPending.length; i++) {
    const reqId = rand(allRequestIdsPending);
    const donor = rand(donorObjs);
    const key = `${donor.id}|${reqId}`;
    if (dnPairs.has(key)) continue;
    dnPairs.add(key);
    const responded = chance(0.6);
    donorNotifs.push({ id: rid(), donorId: donor.id, requestId: reqId, notifiedAt: daysAgo(randInt(1, 30)),
      responded, accepted: responded ? chance(0.7) : null, respondedAt: responded ? daysAgo(randInt(0, 20)) : null });
  }

  // ============================= 13) NOTIF tambahan acak (biar inbox berisi) =============================
  for (const d of pickSome(donorObjs, 20)) {
    notifs.push({ id: rid(), userId: d.userId, type: "SCHEDULE_UPDATE", title: "Pengingat jadwal donor",
      body: "Jangan lupa jadwal donor Anda. Istirahat cukup & makan sebelum donor.", isRead: chance(0.5), createdAt: daysAgo(randInt(1, 60)) });
  }

  // ============================= 14) INSERT (createMany, batched) =============================
  console.log("💾 Menulis ke database…");
  await prisma.user.createMany({ data: users });
  await prisma.pMI.createMany({ data: pmis });
  await prisma.pendonor.createMany({ data: donors });
  await prisma.pasien.createMany({ data: patients });
  await prisma.screeningAnswer.createMany({ data: screenings });
  await prisma.pemeriksaanDonor.createMany({ data: checkups });
  await prisma.stokDarah.createMany({ data: stocks });
  await prisma.jadwalDonor.createMany({ data: schedules });
  await prisma.donorHistory.createMany({ data: histories });
  await prisma.permintaanDonor.createMany({ data: requests });
  await prisma.stockAllocation.createMany({ data: allocations, skipDuplicates: true });
  await prisma.pmiBroadcast.createMany({ data: broadcasts });
  await prisma.donorNotification.createMany({ data: donorNotifs, skipDuplicates: true });
  await prisma.notification.createMany({ data: notifs });
  await prisma.auditLog.createMany({ data: audits });

  // ============================= 15) SUMMARY =============================
  const counts: Record<string, number> = {
    User: await prisma.user.count(), PMI: await prisma.pMI.count(),
    Pendonor: await prisma.pendonor.count(), Pasien: await prisma.pasien.count(),
    ScreeningAnswer: await prisma.screeningAnswer.count(), PemeriksaanDonor: await prisma.pemeriksaanDonor.count(),
    JadwalDonor: await prisma.jadwalDonor.count(), DonorHistory: await prisma.donorHistory.count(),
    StokDarah: await prisma.stokDarah.count(), PermintaanDonor: await prisma.permintaanDonor.count(),
    StockAllocation: await prisma.stockAllocation.count(), PmiBroadcast: await prisma.pmiBroadcast.count(),
    DonorNotification: await prisma.donorNotification.count(), Notification: await prisma.notification.count(),
    AuditLog: await prisma.auditLog.count(),
  };
  console.log("\n🎉 RICH SEED selesai! Ringkasan record:");
  console.log("====================================");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(18)}: ${v}`);
  console.log("====================================");
  console.log("Login lama tetap jalan: admin@bloodconnect.id / admin12345,");
  console.log("donor1@test.com, pasien1@test.com, pmi.jakarta@test.com (password123).");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
