/**
 * Script Migrasi: Backfill province + zone untuk user lama
 * ========================================================
 * Jalankan: npm run backfill:regions
 *
 * Untuk user yang ter-register sebelum field province/zone ditambahkan.
 * Lookup city di regions data, isi province + zone otomatis kalau ketemu.
 * Untuk city yang tidak ada di dataset → log warning, biarkan null.
 *
 * Idempotent — aman dijalankan berkali-kali.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { CITIES } from "../app/lib/regions";

async function main() {
  console.log("🔧 Backfilling region data for existing users...\n");

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { province: null },
        { zone: null },
      ],
    },
    select: { id: true, email: true, city: true, province: true, zone: true },
  });

  console.log(`Found ${users.length} users without complete region data\n`);

  let updated = 0;
  let unmatched: { email: string; city: string }[] = [];

  for (const u of users) {
    // Cari kota di dataset (case-insensitive)
    const match = CITIES.find(
      (c) => c.name.toLowerCase() === u.city.toLowerCase()
    );

    if (match) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          province: match.province,
          zone: match.zone,
        },
      });
      console.log(`✅ ${u.email} (${u.city}) → ${match.province} / ${match.zone}`);
      updated++;
    } else {
      unmatched.push({ email: u.email, city: u.city });
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Unmatched: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Users with city not in regions dataset:`);
    unmatched.forEach((u) => console.log(`   - ${u.email}: "${u.city}"`));
    console.log(`\n   Tambahkan city tersebut ke app/lib/regions.ts kalau diperlukan.`);
  }

  console.log("\n🎉 Done.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
