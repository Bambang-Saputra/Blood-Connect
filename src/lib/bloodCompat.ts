/**
 * Blood Group Compatibility Matrix
 * ────────────────────────────────
 * Standar medis transfusi whole blood.
 *
 * Dua perspektif:
 *
 * 1) RECIPIENT_RECEIVES_FROM[recipientType] = [donor types yang bisa beri]
 *    Dipakai saat: PMI broadcast minta golongan X → cari semua donor type yg bisa kasih X.
 *
 * 2) DONOR_CAN_GIVE_TO[donorType] = [recipient types yang bisa terima]
 *    Dipakai saat: donor lihat broadcast yang relevan untuknya
 *    (mana saja broadcast yang dia bisa fulfill).
 *
 * Rules:
 *   - O- = universal donor (give to all 8 types)
 *   - AB+ = universal recipient (receive from all 8 types)
 *   - Same blood type: always compatible
 *   - Rhesus negative receives only from negative; positive receives from both
 */

import type { BloodType, RhesusType } from "@prisma/client";

export type BloodKey = `${BloodType}${"+" | "-"}`;

/**
 * Recipient → list of donor types yang bisa beri darah ke recipient ini.
 * Key: golongan recipient. Value: array donor types.
 */
export const RECIPIENT_RECEIVES_FROM: Record<BloodKey, BloodKey[]> = {
  "O-":  ["O-"],
  "O+":  ["O-", "O+"],
  "A-":  ["O-", "A-"],
  "A+":  ["O-", "O+", "A-", "A+"],
  "B-":  ["O-", "B-"],
  "B+":  ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // universal recipient
};

/**
 * Donor → list of recipient types yang bisa terima darah dari donor ini.
 * Key: golongan donor. Value: array recipient types yang compatible.
 */
export const DONOR_CAN_GIVE_TO: Record<BloodKey, BloodKey[]> = {
  "O-":  ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // universal donor
  "O+":  ["O+", "A+", "B+", "AB+"],
  "A-":  ["A-", "A+", "AB-", "AB+"],
  "A+":  ["A+", "AB+"],
  "B-":  ["B-", "B+", "AB-", "AB+"],
  "B+":  ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

/**
 * Helper: format golongan jadi "A+" / "B-" dst.
 */
export function bloodKey(bt: BloodType, rh: RhesusType): BloodKey {
  return `${bt}${rh === "POSITIVE" ? "+" : "-"}` as BloodKey;
}

/**
 * Helper: parse "A+" → { bloodType: "A", rhesusType: "POSITIVE" }
 */
export function parseBloodKey(key: BloodKey): { bloodType: BloodType; rhesusType: RhesusType } {
  const isPositive = key.endsWith("+");
  const bt = key.replace(/[+-]$/, "") as BloodType;
  return {
    bloodType: bt,
    rhesusType: isPositive ? "POSITIVE" : "NEGATIVE",
  };
}

/**
 * Untuk PMI broadcast: dapatkan list { bloodType, rhesusType } yang bisa donor
 * ke recipient yang diminta. Dipakai untuk filter Prisma `OR` clause.
 *
 * Contoh: PMI minta A+ → return [O-, O+, A-, A+] dalam format Prisma
 */
export function donorTypesForRecipient(
  recipientBloodType: BloodType,
  recipientRhesusType: RhesusType,
): Array<{ bloodType: BloodType; rhesusType: RhesusType }> {
  const key = bloodKey(recipientBloodType, recipientRhesusType);
  return RECIPIENT_RECEIVES_FROM[key].map(parseBloodKey);
}

/**
 * Untuk donor lihat broadcast: dapatkan list { bloodType, rhesusType } recipient
 * yang donor ini bisa fulfill. Dipakai untuk filter broadcast yang relevan.
 *
 * Contoh: donor O+ → return [O+, A+, B+, AB+] dalam format Prisma
 */
export function recipientTypesForDonor(
  donorBloodType: BloodType,
  donorRhesusType: RhesusType,
): Array<{ bloodType: BloodType; rhesusType: RhesusType }> {
  const key = bloodKey(donorBloodType, donorRhesusType);
  return DONOR_CAN_GIVE_TO[key].map(parseBloodKey);
}
