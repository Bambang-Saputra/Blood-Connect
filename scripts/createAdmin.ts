/**
 * Script: Bootstrap Admin User
 * ----------------------------------------------------
 * Jalankan: npm run admin:create
 *
 * Membuat / promote 1 user dengan role ADMIN.
 * Untuk production: ganti dengan proses provisioning yang lebih aman
 * (misal: admin pertama lewat env var saat first deploy).
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bloodconnect.id";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin12345";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Super Admin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    if (existing.role === "ADMIN") {
      console.log(`✅ Admin ${ADMIN_EMAIL} sudah ada.`);
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      });
      console.log(`✅ User ${ADMIN_EMAIL} di-promote ke ADMIN.`);
    }
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashed,
      name: ADMIN_NAME,
      phoneNum: "00000000",
      city: "Jakarta",
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin dibuat:`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`\n⚠️  Ganti password di production!`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
