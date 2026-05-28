/**
 * Seed Script — Bootstrap Data Demo (v3 PMI)
 * Jalankan: npm run seed
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function upsertUser(data: any, sub?: any) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  const hashed = await bcrypt.hash(data.password ?? "password123", 10);
  return prisma.user.create({ data: { ...data, password: hashed, ...sub } });
}

async function main() {
  console.log("🌱 Seeding data (v3 PMI)...\n");

  // ===== ADMIN =====
  const admin = await upsertUser({
    email: "admin@bloodconnect.id", name: "Super Admin",
    password: "admin12345", phoneNum: "021555000",
    city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
    role: "ADMIN",
  });
  console.log(`✅ Admin: ${admin.email} / admin12345`);

  // ===== PMI Verified =====
  const pmiJkt = await upsertUser(
    {
      email: "pmi-jakarta@test.com", name: "PMI Jakarta Pusat",
      phoneNum: "021555111",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PMI",
    },
    {
      pmi: {
        create: {
          pmiName: "PMI Jakarta Pusat",
          pmiCode: "PMI-JKT-01",
          pmiLoc: "Jl. Kramat Raya No. 47, Jakarta Pusat",
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
      },
    }
  );
  console.log(`✅ PMI Verified: ${pmiJkt.email} / password123`);

  // ===== PMI Unverified (untuk demo verifikasi admin) =====
  const pmiBdg = await upsertUser(
    {
      email: "pmi-bandung@test.com", name: "PMI Bandung",
      phoneNum: "022555222",
      city: "Bandung", province: "Jawa Barat", zone: "Bandung Raya",
      role: "PMI",
    },
    {
      pmi: {
        create: {
          pmiName: "PMI Bandung",
          pmiCode: "PMI-BDG-01",
          pmiLoc: "Jl. Aceh No. 79, Bandung",
          status: "UNVERIFIED",
        },
      },
    }
  );
  console.log(`✅ PMI Unverified: ${pmiBdg.email} / password123 (demo verify)`);

  // Get PMI Jakarta ID untuk donor reference
  const pmiJktRecord = await prisma.pMI.findUnique({ where: { userId: pmiJkt.id } });
  const pmiBdgRecord = await prisma.pMI.findUnique({ where: { userId: pmiBdg.id } });

  // ===== PENDONOR =====
  const donor1 = await upsertUser(
    {
      email: "donor1@test.com", name: "Budi Donor",
      phoneNum: "081234567001",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PENDONOR",
      birthDate: new Date("1995-05-15"),
    },
    {
      pendonor: {
        create: {
          bloodType: "O", rhesusType: "POSITIVE",
          preferredPmiId: pmiJktRecord?.id,
        },
      },
    }
  );
  console.log(`✅ Donor 1: ${donor1.email} / password123 (eligible)`);

  const donor2 = await upsertUser(
    {
      email: "donor2@test.com", name: "Siti Donor",
      phoneNum: "081234567002",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PENDONOR",
      birthDate: new Date("1998-08-20"),
    },
    {
      pendonor: {
        create: {
          bloodType: "A", rhesusType: "POSITIVE",
          preferredPmiId: pmiJktRecord?.id,
        },
      },
    }
  );
  console.log(`✅ Donor 2: ${donor2.email} / password123 (perlu skrining)`);

  const donor3 = await upsertUser(
    {
      email: "donor3@test.com", name: "Andi Donor",
      phoneNum: "081234567003",
      city: "Bandung", province: "Jawa Barat", zone: "Bandung Raya",
      role: "PENDONOR",
      birthDate: new Date("2000-01-10"),
    },
    {
      pendonor: {
        create: {
          bloodType: "B", rhesusType: "NEGATIVE",
          preferredPmiId: pmiBdgRecord?.id,
        },
      },
    }
  );
  console.log(`✅ Donor 3: ${donor3.email} / password123 (Bandung)`);

  // ===== PASIEN =====
  const patient1 = await upsertUser(
    {
      email: "pasien1@test.com", name: "Ani Pasien",
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
      email: "pasien2@test.com", name: "Doni Pasien",
      phoneNum: "081234567102",
      city: "Jakarta", province: "DKI Jakarta", zone: "Jabodetabek",
      role: "PASIEN",
      birthDate: new Date("1990-07-12"),
    },
    { pasien: { create: {} } }
  );
  console.log(`✅ Pasien 2: ${patient2.email} / password123`);

  // ===== Donor 1: kasih skrining lolos + checkup lolos (untuk demo "siap donor") =====
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
      await prisma.pemeriksaanDonor.create({
        data: {
          donorId: donor1Profile.id,
          hemoglobinLevel: 14.0, systolicBP: 120, diastolicBP: 80,
          bodyTempC: 36.7, pulseRate: 72, weight: 65, passed: true,
        },
      });
      await prisma.pendonor.update({
        where: { id: donor1Profile.id },
        data: { weight: 65, isEligible: true },
      });
      console.log(`✅ Donor 1 sudah punya screening + checkup lolos`);
    }
  }

  // ===== Stok Darah AVAILABLE di PMI Jakarta =====
  if (pmiJktRecord) {
    const existingStock = await prisma.stokDarah.findFirst({ where: { pmiId: pmiJktRecord.id } });
    if (!existingStock) {
      const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const stocks = [
        { bloodType: "O", rhesusType: "POSITIVE", qty: 15 },
        { bloodType: "A", rhesusType: "POSITIVE", qty: 10 },
        { bloodType: "B", rhesusType: "POSITIVE", qty: 8 },
        { bloodType: "AB", rhesusType: "POSITIVE", qty: 5 },
        { bloodType: "O", rhesusType: "NEGATIVE", qty: 4 },
      ];
      for (const s of stocks) {
        await prisma.stokDarah.create({
          data: {
            pmiId: pmiJktRecord.id,
            bloodType: s.bloodType as any,
            rhesusType: s.rhesusType as any,
            component: "WHOLE_BLOOD",
            quantity: s.qty,
            expiryDate: oneMonthLater,
            location: "PMI Jakarta Pusat",
            status: "AVAILABLE",
            source: "Stok awal",
          },
        });
      }
      console.log(`✅ 5 batch stok AVAILABLE di PMI Jakarta`);
    }
  }

  console.log("\n🎉 Seed selesai!\n");
  console.log("================================================");
  console.log("Akun demo (password kecuali admin = password123):");
  console.log("  Admin:    admin@bloodconnect.id / admin12345");
  console.log("  PMI:      pmi-jakarta@test.com  (VERIFIED + stok)");
  console.log("  PMI:      pmi-bandung@test.com  (UNVERIFIED — demo)");
  console.log("  Donor:    donor1@test.com (eligible, siap donor)");
  console.log("  Donor:    donor2@test.com (perlu skrining)");
  console.log("  Donor:    donor3@test.com (Bandung)");
  console.log("  Pasien:   pasien1@test.com");
  console.log("  Pasien:   pasien2@test.com");
  console.log("================================================");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
