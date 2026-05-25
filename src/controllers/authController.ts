import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * Use Case: LOGIN (Sequence Diagram #1)
 *   App → AuthService.validateCredentials → DB.getUserByEmail → JWT
 */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email/password tidak valid" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    // [Exception 1.1] kredensial salah
    return res.status(401).json({ error: "Email atau password salah" });
  }
  if (user.isBlocked) return res.status(403).json({ error: "Akun diblokir" });

  // [Activity 2.2] Buat sesi (JWT)
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" } as unknown as jwt.SignOptions
  );

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

// Use Case: LOGOUT — stateless JWT, client cukup hapus token. Endpoint ini
// hanya untuk logging/audit. Untuk blacklist server-side, tambahkan Redis.
export async function logout(_req: Request, res: Response) {
  return res.json({ message: "Logged out" });
}

// Registration sederhana — pilih role saat signup
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phoneNum: z.string().min(8),
  city: z.string().min(2),
  province: z.string().optional(),
  zone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),       // ISO date — wajib untuk pendonor & pasien
  role: z.enum(["PENDONOR", "PASIEN", "RUMAH_SAKIT"]),
  bloodType: z.enum(["A", "B", "AB", "O"]).optional(),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]).optional(),
  hospitalName: z.string().optional(),
  hospitalCode: z.string().optional(),
  hospitalLoc: z.string().optional(),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(409).json({ error: "Email sudah terdaftar" });

  const hashed = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      password: hashed,
      name: parsed.data.name,
      phoneNum: parsed.data.phoneNum,
      city: parsed.data.city,
      province: parsed.data.province,
      zone: parsed.data.zone,
      address: parsed.data.address,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
      role: parsed.data.role as Role,
      // buat sub-profile sesuai role
      ...(parsed.data.role === "PENDONOR" &&
        parsed.data.bloodType &&
        parsed.data.rhesusType && {
          pendonor: {
            create: { bloodType: parsed.data.bloodType, rhesusType: parsed.data.rhesusType },
          },
        }),
      ...(parsed.data.role === "PASIEN" && {
        pasien: { create: {} },   // Pasien sub-profile (NIK opsional, isi belakangan)
      }),
      ...(parsed.data.role === "RUMAH_SAKIT" &&
        parsed.data.hospitalName &&
        parsed.data.hospitalCode &&
        parsed.data.hospitalLoc && {
          rumahSakit: {
            create: {
              hospitalName: parsed.data.hospitalName,
              hospitalCode: parsed.data.hospitalCode,
              hospitalLoc: parsed.data.hospitalLoc,
            },
          },
        }),
    },
  });

  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
}

// =====================================================================
// GET /api/auth/me — profil user yang login (Use Case UPDATE PROFIL — load)
// =====================================================================
export async function getMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, phoneNum: true, address: true,
      city: true, province: true, zone: true, birthDate: true, role: true,
      createdAt: true,
      pendonor: { select: { bloodType: true, rhesusType: true, isEligible: true, weight: true } },
      pasien: { select: { nik: true } },
      rumahSakit: { select: { hospitalName: true, hospitalCode: true, hospitalLoc: true, status: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  // Hitung available modes — sub-profile mana yang sudah aktif
  const availableModes: string[] = [];
  if (user.pendonor) availableModes.push("PENDONOR");
  if (user.pasien) availableModes.push("PASIEN");
  if (user.rumahSakit) availableModes.push("RUMAH_SAKIT");
  if (user.role === "ADMIN") availableModes.push("ADMIN");

  return res.json({ ...user, availableModes });
}

// =====================================================================
// POST /api/auth/me/enable-mode — aktifkan mode tambahan
// User Pendonor bisa enable Pasien, dan sebaliknya.
// RS & Admin TIDAK BOLEH enable mode lain (security).
// =====================================================================
const enableModeSchema = z.object({
  mode: z.enum(["PENDONOR", "PASIEN"]),
  bloodType: z.enum(["A", "B", "AB", "O"]).optional(),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]).optional(),
});

export async function enableMode(req: AuthedRequest, res: Response) {
  const parsed = enableModeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pendonor: true, pasien: true, rumahSakit: true },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  // Block RS/Admin dari enable mode personal
  if (user.role === "RUMAH_SAKIT") {
    return res.status(403).json({ error: "Akun Rumah Sakit tidak bisa enable mode personal" });
  }
  if (user.role === "ADMIN") {
    return res.status(403).json({ error: "Akun Admin tidak bisa enable mode personal" });
  }

  // === Aktifkan PENDONOR ===
  if (parsed.data.mode === "PENDONOR") {
    if (user.pendonor) return res.status(400).json({ error: "Mode Pendonor sudah aktif" });
    if (!parsed.data.bloodType || !parsed.data.rhesusType) {
      return res.status(400).json({ error: "bloodType & rhesusType wajib untuk mode Pendonor" });
    }
    if (!user.birthDate) {
      return res.status(400).json({ error: "Tanggal lahir wajib diisi dulu di profil (untuk validasi usia donor)" });
    }
    await prisma.pendonor.create({
      data: {
        userId: user.id,
        bloodType: parsed.data.bloodType,
        rhesusType: parsed.data.rhesusType,
      },
    });
    return res.json({ message: "Mode Pendonor berhasil diaktifkan" });
  }

  // === Aktifkan PASIEN ===
  if (parsed.data.mode === "PASIEN") {
    if (user.pasien) return res.status(400).json({ error: "Mode Pasien sudah aktif" });
    await prisma.pasien.create({ data: { userId: user.id } });
    return res.json({ message: "Mode Pasien berhasil diaktifkan" });
  }

  return res.status(400).json({ error: "Mode tidak valid" });
}

// =====================================================================
// POST /api/auth/switch-role — re-issue JWT dengan role berbeda
// Untuk user multi-profile, bisa switch antar mode tanpa logout.
// =====================================================================
const switchRoleSchema = z.object({
  role: z.enum(["PENDONOR", "PASIEN", "RUMAH_SAKIT", "ADMIN"]),
});

export async function switchRole(req: AuthedRequest, res: Response) {
  const parsed = switchRoleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pendonor: true, pasien: true, rumahSakit: true },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  // Validasi: user harus PUNYA sub-profile untuk role yang diminta
  const hasProfile =
    (parsed.data.role === "PENDONOR" && user.pendonor) ||
    (parsed.data.role === "PASIEN" && user.pasien) ||
    (parsed.data.role === "RUMAH_SAKIT" && user.rumahSakit) ||
    (parsed.data.role === "ADMIN" && user.role === "ADMIN");

  if (!hasProfile) {
    return res.status(403).json({ error: `Anda belum punya profil ${parsed.data.role}` });
  }

  // Issue token baru dengan role baru
  const token = jwt.sign(
    { id: user.id, role: parsed.data.role, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" } as unknown as jwt.SignOptions
  );

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: parsed.data.role },
  });
}

// =====================================================================
// PATCH /api/auth/me — update profil (Use Case UPDATE PROFIL — save)
// =====================================================================
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNum: z.string().min(8).optional(),
  address: z.string().optional().nullable(),
  city: z.string().min(2).optional(),
  province: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  password: z.string().min(8).optional(), // ganti password
});

export async function updateMe(req: AuthedRequest, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const before = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!before) return res.status(404).json({ error: "User tidak ditemukan" });

  const data: any = {
    ...(parsed.data.name && { name: parsed.data.name }),
    ...(parsed.data.phoneNum && { phoneNum: parsed.data.phoneNum }),
    ...(parsed.data.address !== undefined && { address: parsed.data.address }),
    ...(parsed.data.city && { city: parsed.data.city }),
    ...(parsed.data.province !== undefined && { province: parsed.data.province }),
    ...(parsed.data.zone !== undefined && { zone: parsed.data.zone }),
    ...(parsed.data.birthDate !== undefined && {
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
    }),
  };
  if (parsed.data.password) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }

  const updated = await prisma.user.update({ where: { id: req.user!.id }, data });

  await writeAudit({
    userId: req.user!.id,
    action: "UPDATE",
    entity: "User",
    entityId: updated.id,
    before: { name: before.name, phoneNum: before.phoneNum, city: before.city },
    after: { name: updated.name, phoneNum: updated.phoneNum, city: updated.city },
    ipAddress: req.ip,
  });

  return res.json({ message: "Profil diperbarui", user: { id: updated.id, name: updated.name } });
}
