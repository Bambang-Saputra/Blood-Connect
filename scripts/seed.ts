/**
 * Seed Script — Bootstrap Data Lengkap untuk Demo
 * ================================================
 * Jalankan: npm run seed
 *
 * Membuat:
 *   - 1 Admin
 *   - 2 Rumah Sakit (1 VERIFIED, 1 UNVERIFIED — untuk demo workflow verify)
 *   - 3 Pendonor (1 eligible-ready, 1 perlu skrining, 1 newbie)
 *   - 2 Pasien
 *   - Stok darah AVAILABLE di RS verified (siap dimatch)
 *   - Pemeriksaan donor + screening lulus untuk donor pertama
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
  console.log("🌱 Seeding data...\n");

  // ===== ADMIN =====
  const admin = await upsertUser({
    email: "admin@bloodconnect.id", name: "Super Admin",
    password: "admin12345", phoneNum: "021555000", city: "Jakarta", role: "ADMIN",
  });
  console.log(`✅ Admin: ${admin.email} / admin12345`);

  // ===== RUMAH SAKIT (1 verified, 1 unverified) =====
  const rsVerified = await upsertUser(
    {
      email: "rscm@test.com", name: "RSCM Admin", password: "password123",
      phoneNum: "021555111", city: "Jakarta", role: "RUMAH_SAKIT",
    },
    {
      rumahSakit: {
        create: {
          hospitalName: "RS Cipto Mangunkusumo",
          hospitalCode: "RSCM-01",
          hospitalLoc: "Jl. Diponegoro 71, Jakarta Pusat",
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      },
    }
  );
  console.log(`✅ RS Verified: ${rsVerified.email} / password123`);

  const rsUnverified = await upsertUser(
    {
      email: "rsfm@test.com", name: "RS Fatmawati", password: "password123",
      phoneNum: "021555222", city: "Jakarta", role: "RUMAH_SAKIT",
    },
    {
      rumahSakit: {
        create: {
          hospitalName: "RS Fatmawati",
          hospitalCode: "RSFM-01",
          hospitalLoc: "Jl. RS Fatmawati Raya, Jakarta Selatan",
          status: "UNVERIFIED",
        },
      },
    }
  );
  console.log(`✅ RS Unverified: ${rsUnverified.email} / password123 (demo verify workflow)`);

  // ===== PENDONOR (3 dengan status berbeda) =====
  const donor1 = await upsertUser(
    {
      email: "donor1@test.com", name: "Budi Donor", password: "password123",
      phoneNum: "081234567001", city: "Jakarta", role: "PENDONOR",
      birthDate: new Date("1995-05-15"),
    },
    { pendonor: { create: { bloodType: "O", rhesusType: "POSITIVE" } } }
  );
  console.log(`✅ Donor 1: ${donor1.email} / password123 (akan dibuatkan checkup+screening lulus)`);

  const donor2 = await upsertUser(
    {
      email: "donor2@test.com", name: "Siti Donor", password: "password123",
      phoneNum: "081234567002", city: "Jakarta", role: "PENDONOR",
      birthDate: new Date("1998-08-20"),
    },
    { pendonor: { create: { bloodType: "A", rhesusType: "POSITIVE" } } }
  );
  console.log(`✅ Donor 2: ${donor2.email} / password123 (kosong — untuk demo skrining)`);

  const donor3 = await upsertUser(
    {
      email: "donor3@test.com", name: "Andi Donor", password: "password123",
      phoneNum: "081234567003", city: "Surabaya", role: "PENDONOR",
      birthDate: new Date("2000-01-10"),
    },
    { pendonor: { create: { bloodType: "B", rhesusType: "NEGATIVE" } } }
  );
  console.log(`✅ Donor 3: ${donor3.email} / password123 (Surabaya — beda kota)`);

  // ===== PASIEN =====
  const patient1 = await upsertUser(
    {
      email: "pasien1@test.com", name: "Ani Pasien", password: "password123",
      phoneNum: "081234567101", city: "Jakarta", role: "PASIEN",
      birthDate: new Date("1985-03-20"),
    },
    { pasien: { create: {} } }
  );
  console.log(`✅ Pasien 1: ${patient1.email} / password123`);

  const patient2 = await upsertUser(
    {
      email: "pasien2@test.com", name: "Doni Pasien", password: "password123",
      phoneNum: "081234567102", city: "Jakarta", role: "PASIEN",
      birthDate: new Date("1990-07-12"),
    },
    { pasien: { create: {} } }
  );
  console.log(`✅ Pasien 2: ${patient2.email} / password123`);

  // ===== Pemeriksaan + Screening untuk Donor 1 (siap eligible) =====
  const donor1Profile = await prisma.pendonor.findUnique({ where: { userId: donor1.id } });
  if (donor1Profile) {
    const existingCheckup = await prisma.pemeriksaanDonor.findFirst({ where: { donorId: donor1Profile.id } });
    if (!existingCheckup) {
      await prisma.pemeriksaanDonor.create({
        data: {
          donorId: donor1Profile.id,
          hemoglobinLevel: 14.0, systolicBP: 120, diastolicBP: 80,
          bodyTempC: 36.7, pulseRate: 72, weight: 65,
          passed: true,
        },
      });
      await prisma.screeningAnswer.create({
        data: {
          donorId: donor1Profile.id,
          hasFever: false, recentSurgery: false, recentTattoo: false,
          isPregnantOrLactating: false, onMedication: false,
          hasHIVOrHepatitis: false, riskySexualBehavior: false,
          recentVaccination: false, passed: true,
        },
      });
      // Set isEligible = true
      await prisma.pendonor.update({
        where: { id: donor1Profile.id },
        data: { weight: 65, isEligible: true },
      });
      console.log(`✅ Donor 1 sudah punya checkup + screening lulus (siap donor)`);
    }
  }

  // ===== Stok Darah AVAILABLE di RS Verified =====
  const rsProfile = await prisma.rumahSakit.findUnique({ where: { userId: rsVerified.id } });
  if (rsProfile) {
    const existingStock = await prisma.stokDarah.findFirst({ where: { hospitalId: rsProfile.id } });
    if (!existingStock) {
      const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const stocksToCreate = [
        { bloodType: "O", rhesusType: "POSITIVE", quantity: 15 },
        { bloodType: "A", rhesusType: "POSITIVE", quantity: 10 },
        { bloodType: "B", rhesusType: "POSITIVE", quantity: 8 },
        { bloodType: "AB", rhesusType: "POSITIVE", quantity: 5 },
        { bloodType: "O", rhesusType: "NEGATIVE", quantity: 4 },
      ];
      for (const s of stocksToCreate) {
        await prisma.stokDarah.create({
          data: {
            hospitalId: rsProfile.id,
            bloodType: s.bloodType as any,
            rhesusType: s.rhesusType as any,
            component: "WHOLE_BLOOD",
            quantity: s.quantity,
            expiryDate: oneMonthLater,
            location: "RSCM Jakarta",
            status: "AVAILABLE",   // langsung AVAILABLE untuk demo
            source: "UTD PMI Jakarta",
          },
        });
      }
      console.log(`✅ 5 batch stok AVAILABLE dibuat di ${rsProfile.hospitalName}`);
    }
  }

  console.log("\n🎉 Seed selesai!\n");
  console.log("====================================");
  console.log("Akun untuk testing (semua password: password123 kecuali admin):");
  console.log("  Admin:   admin@bloodconnect.id / admin12345");
  console.log("  RS:      rscm@test.com  (VERIFIED, punya stok)");
  console.log("  RS:      rsfm@test.com  (UNVERIFIED, untuk demo verify)");
  console.log("  Donor:   donor1@test.com (sudah eligible, siap daftar)");
  console.log("  Donor:   donor2@test.com (perlu isi skrining + checkup)");
  console.log("  Donor:   donor3@test.com (di Surabaya)");
  console.log("  Pasien:  pasien1@test.com");
  console.log("  Pasien:  pasien2@test.com");
  console.log("====================================");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
