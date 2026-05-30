/**
 * Seed Script — Bootstrap Data Lengkap untuk Demo (v3 — PMI flow)
 * ================================================================
 * Jalankan: npm run seed
 *
 * Membuat:
 *   - 1 Admin
 *   - 2 PMI (1 VERIFIED dengan stok, 1 UNVERIFIED untuk demo verify)
 *   - 3 Pendonor (1 sudah skrining lulus, 1 perlu skrining, 1 di Surabaya)
 *   - 2 Pasien
 *
 * Aman dijalankan ulang (idempotent): cek email sebelum create.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function upsertUser(data: any, sub?: any) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  const hashed = await bcrypt.hash(data.password ?? "password123", 10);
  const created = await prisma.user.create({
    data: { ...data, password: hashed, ...sub },
  });
  return created;
}

async function main() {
  console.log("🌱 Seeding data (PMI flow)...\n");

  // ===== ADMIN =====
  const admin = await upsertUser({
    email: "admin@bloodconnect.id", name: "Super Admin",
    password: "admin12345", phoneNum: "021555000",
    city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
    role: "ADMIN",
  });
  console.log(`✅ Admin: ${admin.email} / admin12345`);

  // ===== PMI VERIFIED (Jakarta) =====
  const pmiJkt = await upsertUser(
    {
      email: "pmi.jakarta@test.com", name: "Admin PMI Jakarta", password: "password123",
      phoneNum: "021555111",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PMI",
    },
    {
      pmi: {
        create: {
          pmiName: "PMI Provinsi DKI Jakarta",
          pmiCode: "PMI-DKI-01",
          pmiLoc: "Jl. Joe Lenteng Agung No.7, Jakarta Selatan",
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      },
    }
  );
  console.log(`✅ PMI Verified: ${pmiJkt.email} / password123`);

  // ===== PMI VERIFIED (Surabaya) — untuk testing donor di kota lain =====
  const pmiSby = await upsertUser(
    {
      email: "pmi.surabaya@test.com", name: "Admin PMI Surabaya", password: "password123",
      phoneNum: "031555111",
      city: "Surabaya", province: "Jawa Timur", zone: "Gerbangkertosusila",
      role: "PMI",
    },
    {
      pmi: {
        create: {
          pmiName: "PMI Kota Surabaya",
          pmiCode: "PMI-SBY-01",
          pmiLoc: "Jl. Embong Ploso No.14, Surabaya",
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      },
    }
  );
  console.log(`✅ PMI Verified (Sby): ${pmiSby.email} / password123`);

  // ===== PMI UNVERIFIED — untuk demo verify workflow di admin =====
  const pmiUnverified = await upsertUser(
    {
      email: "pmi.bandung@test.com", name: "Admin PMI Bandung", password: "password123",
      phoneNum: "022555111",
      city: "Bandung", province: "Jawa Barat", zone: "Bandung Raya",
      role: "PMI",
    },
    {
      pmi: {
        create: {
          pmiName: "PMI Kota Bandung",
          pmiCode: "PMI-BDG-01",
          pmiLoc: "Jl. Aceh No.79, Bandung",
          status: "UNVERIFIED",
        },
      },
    }
  );
  console.log(`✅ PMI Unverified: ${pmiUnverified.email} / password123 (demo verify workflow)`);

  // ===== PENDONOR =====
  const donor1 = await upsertUser(
    {
      email: "donor1@test.com", name: "Budi Donor", password: "password123",
      phoneNum: "081234567001",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PENDONOR",
      birthDate: new Date("1995-05-15"),
    },
    { pendonor: { create: { bloodType: "O", rhesusType: "POSITIVE" } } }
  );
  console.log(`✅ Donor 1: ${donor1.email} / password123 (skrining lulus, siap daftar jadwal)`);

  const donor2 = await upsertUser(
    {
      email: "donor2@test.com", name: "Siti Donor", password: "password123",
      phoneNum: "081234567002",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PENDONOR",
      birthDate: new Date("1998-08-20"),
    },
    { pendonor: { create: { bloodType: "A", rhesusType: "POSITIVE" } } }
  );
  console.log(`✅ Donor 2: ${donor2.email} / password123 (kosong — untuk demo skrining)`);

  const donor3 = await upsertUser(
    {
      email: "donor3@test.com", name: "Andi Donor", password: "password123",
      phoneNum: "081234567003",
      city: "Surabaya", province: "Jawa Timur", zone: "Gerbangkertosusila",
      role: "PENDONOR",
      birthDate: new Date("2000-01-10"),
    },
    { pendonor: { create: { bloodType: "B", rhesusType: "NEGATIVE" } } }
  );
  console.log(`✅ Donor 3: ${donor3.email} / password123 (Surabaya — beda kota)`);

  // ===== PASIEN =====
  const patient1 = await upsertUser(
    {
      email: "pasien1@test.com", name: "Ani Pasien", password: "password123",
      phoneNum: "081234567101",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PASIEN",
      birthDate: new Date("1985-03-20"),
    },
    { pasien: { create: {} } }
  );
  console.log(`✅ Pasien 1: ${patient1.email} / password123`);

  const patient2 = await upsertUser(
    {
      email: "pasien2@test.com", name: "Doni Pasien", password: "password123",
      phoneNum: "081234567102",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PASIEN",
      birthDate: new Date("1990-07-12"),
    },
    { pasien: { create: {} } }
  );
  console.log(`✅ Pasien 2: ${patient2.email} / password123`);

  // ===== Screening lulus untuk Donor 1 (siap daftar jadwal) =====
  const donor1Profile = await prisma.pendonor.findUnique({ where: { userId: donor1.id } });
  if (donor1Profile) {
    const existingScreening = await prisma.screeningAnswer.findFirst({ where: { donorId: donor1Profile.id } });
    if (!existingScreening) {
      await prisma.screeningAnswer.create({
        data: {
          donorId: donor1Profile.id,
          hasFever: false, recentSurgery: false, recentTattoo: false,
          isPregnantOrLactating: false, onMedication: false,
          hasHIVOrHepatitis: false, riskySexualBehavior: false,
          recentVaccination: false, passed: true,
        },
      });
      console.log(`✅ Donor 1 sudah punya screening lulus`);
    }
  }

  // ===== Stok Darah AVAILABLE di PMI Jakarta =====
  const pmiJktProfile = await prisma.pMI.findUnique({ where: { userId: pmiJkt.id } });
  if (pmiJktProfile) {
    const existingStock = await prisma.stokDarah.findFirst({ where: { pmiId: pmiJktProfile.id } });
    if (!existingStock) {
      const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const stocksToCreate = [
        { bloodType: "O", rhesusType: "POSITIVE", quantity: 15 },
        { bloodType: "A", rhesusType: "POSITIVE", quantity: 10 },
        { bloodType: "B", rhesusType: "POSITIVE", quantity: 8 },
        { bloodType: "AB", rhesusType: "POSITIVE", quantity: 5 },
        { bloodType: "O", rhesusType: "NEGATIVE", quantity: 4 },
        { bloodType: "A", rhesusType: "NEGATIVE", quantity: 3 },
      ];
      for (const s of stocksToCreate) {
        await prisma.stokDarah.create({
          data: {
            pmiId: pmiJktProfile.id,
            bloodType: s.bloodType as any,
            rhesusType: s.rhesusType as any,
            component: "WHOLE_BLOOD",
            quantity: s.quantity,
            expiryDate: oneMonthLater,
            location: "Gudang Pusat PMI DKI",
            status: "AVAILABLE",
            source: "UTD PMI Jakarta",
          },
        });
      }
      console.log(`✅ ${stocksToCreate.length} batch stok AVAILABLE dibuat di ${pmiJktProfile.pmiName}`);
    }
  }

  console.log("\n🎉 Seed selesai!\n");
  console.log("====================================");
  console.log("Akun untuk testing (password: password123 kecuali admin):");
  console.log("  Admin:        admin@bloodconnect.id / admin12345");
  console.log("  PMI Jakarta:  pmi.jakarta@test.com   (VERIFIED, punya stok)");
  console.log("  PMI Surabaya: pmi.surabaya@test.com  (VERIFIED, kota lain)");
  console.log("  PMI Bandung:  pmi.bandung@test.com   (UNVERIFIED, demo verify)");
  console.log("  Donor:        donor1@test.com         (skrining lulus, siap daftar)");
  console.log("  Donor:        donor2@test.com         (perlu skrining)");
  console.log("  Donor:        donor3@test.com         (Surabaya)");
  console.log("  Pasien:       pasien1@test.com");
  console.log("  Pasien:       pasien2@test.com");
  console.log("====================================");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
