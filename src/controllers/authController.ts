import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * AUTH CONTROLLER
 *   POST /auth/login
 *   POST /auth/logout
 *   POST /auth/register        — hanya untuk Pendonor + Pasien
 *   POST /auth/pmiregister     — endpoint khusus PMI (link tersembunyi)
 *   GET  /auth/me              — profil + availableModes
 *   PATCH /auth/me             — update profil
 *   POST /auth/me/enable-mode  — toggle Pendonor/Pasien mode tambahan
 *   POST /auth/switch-role     — re-issue token dengan role lain
 */

// ===================== LOGIN =====================
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Email/password tidak valid" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) {
    return res.status(401).json({ error: "Email atau password salah" });
  }
  if (user.isBlocked) return res.status(403).json({ error: "Akun diblokir" });

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

export async function logout(_req: Request, res: Response) {
  return res.json({ message: "Logged out" });
}

// ===================== REGISTER (Pendonor + Pasien only) =====================
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phoneNum: z.string().min(8),
  city: z.string().min(2),
  province: z.string().optional(),
  zone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  role: z.enum(["PENDONOR", "PASIEN"]),  // PMI tidak via endpoint ini
  bloodType: z.enum(["A", "B", "AB", "O"]).optional(),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]).optional(),
  preferredPmiId: z.string().optional(),  // donor pilih PMI saat register
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Validasi umur untuk pendonor (≥17)
  if (parsed.data.role === "PENDONOR") {
    if (!parsed.data.birthDate) {
      return res.status(400).json({ error: "Tanggal lahir wajib untuk pendonor" });
    }
    const birthDate = new Date(parsed.data.birthDate);
    const age = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 17) {
      return res.status(400).json({
        error: "Pendonor harus berusia minimal 17 tahun",
        currentAge: Math.floor(age),
      });
    }
    if (age > 65) {
      return res.status(400).json({
        error: "Pendonor maksimal berusia 65 tahun",
        currentAge: Math.floor(age),
      });
    }
  }

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
      ...(parsed.data.role === "PENDONOR" &&
        parsed.data.bloodType &&
        parsed.data.rhesusType && {
          pendonor: {
            create: {
              bloodType: parsed.data.bloodType,
              rhesusType: parsed.data.rhesusType,
              preferredPmiId: parsed.data.preferredPmiId,
            },
          },
        }),
      ...(parsed.data.role === "PASIEN" && {
        pasien: { create: {} },
      }),
    },
  });

  return res.status(201).json({ id: user.id, email: user.email, role: user.role });
}

// ===================== REGISTER PMI (endpoint terpisah) =====================
const pmiRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phoneNum: z.string().min(8),
  city: z.string().min(2),
  province: z.string().optional(),
  zone: z.string().optional(),
  address: z.string().optional(),
  pmiName: z.string().min(2),
  pmiCode: z.string().min(2),
  pmiLoc: z.string().min(2),
});

export async function registerPmi(req: Request, res: Response) {
  const parsed = pmiRegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(409).json({ error: "Email sudah terdaftar" });

  const codeExists = await prisma.pMI.findUnique({ where: { pmiCode: parsed.data.pmiCode } });
  if (codeExists) return res.status(409).json({ error: "Kode PMI sudah terdaftar" });

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
      role: "PMI",
      pmi: {
        create: {
          pmiName: parsed.data.pmiName,
          pmiCode: parsed.data.pmiCode,
          pmiLoc: parsed.data.pmiLoc,
          status: "UNVERIFIED",
        },
      },
    },
  });

  return res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
    message: "PMI berhasil didaftarkan. Menunggu verifikasi admin.",
  });
}

// ===================== GET /auth/me =====================
export async function getMe(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, phoneNum: true, address: true,
      city: true, province: true, zone: true, birthDate: true, role: true,
      createdAt: true,
      pendonor: {
        select: {
          bloodType: true, rhesusType: true, isEligible: true, weight: true,
          preferredPmiId: true,
          preferredPmi: { select: { pmiName: true, pmiLoc: true } },
        },
      },
      pasien: { select: { nik: true } },
      pmi: { select: { pmiName: true, pmiCode: true, pmiLoc: true, status: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  const availableModes: string[] = [];
  if (user.pendonor) availableModes.push("PENDONOR");
  if (user.pasien) availableModes.push("PASIEN");
  if (user.pmi) availableModes.push("PMI");
  if (user.role === "ADMIN") availableModes.push("ADMIN");

  return res.json({ ...user, availableModes });
}

// ===================== PATCH /auth/me =====================
const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phoneNum: z.string().min(8).optional(),
  address: z.string().optional().nullable(),
  city: z.string().min(2).optional(),
  province: z.string().optional().nullable(),
  zone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  password: z.string().min(8).optional(),
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
  if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 10);

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

// ===================== ENABLE MODE (Pendonor + Pasien only) =====================
const enableModeSchema = z.object({
  mode: z.enum(["PENDONOR", "PASIEN"]),
  bloodType: z.enum(["A", "B", "AB", "O"]).optional(),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]).optional(),
  preferredPmiId: z.string().optional(),
});

export async function enableMode(req: AuthedRequest, res: Response) {
  const parsed = enableModeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pendonor: true, pasien: true, pmi: true },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });
  if (user.role === "PMI" || user.role === "ADMIN") {
    return res.status(403).json({ error: "Akun PMI/Admin tidak bisa enable mode personal" });
  }

  if (parsed.data.mode === "PENDONOR") {
    if (user.pendonor) return res.status(400).json({ error: "Mode Pendonor sudah aktif" });
    if (!parsed.data.bloodType || !parsed.data.rhesusType) {
      return res.status(400).json({ error: "bloodType & rhesusType wajib" });
    }
    if (!user.birthDate) {
      return res.status(400).json({ error: "Tanggal lahir wajib diisi" });
    }
    const age = (Date.now() - user.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 17 || age > 65) {
      return res.status(400).json({ error: "Usia harus 17-65 tahun untuk donor" });
    }
    await prisma.pendonor.create({
      data: {
        userId: user.id,
        bloodType: parsed.data.bloodType,
        rhesusType: parsed.data.rhesusType,
        preferredPmiId: parsed.data.preferredPmiId,
      },
    });
    return res.json({ message: "Mode Pendonor berhasil diaktifkan" });
  }

  if (parsed.data.mode === "PASIEN") {
    if (user.pasien) return res.status(400).json({ error: "Mode Pasien sudah aktif" });
    await prisma.pasien.create({ data: { userId: user.id } });
    return res.json({ message: "Mode Pasien berhasil diaktifkan" });
  }
}

// ===================== SWITCH ROLE =====================
const switchRoleSchema = z.object({
  role: z.enum(["PENDONOR", "PASIEN", "PMI", "ADMIN"]),
});

export async function switchRole(req: AuthedRequest, res: Response) {
  const parsed = switchRoleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pendonor: true, pasien: true, pmi: true },
  });
  if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

  const hasProfile =
    (parsed.data.role === "PENDONOR" && user.pendonor) ||
    (parsed.data.role === "PASIEN" && user.pasien) ||
    (parsed.data.role === "PMI" && user.pmi) ||
    (parsed.data.role === "ADMIN" && user.role === "ADMIN");

  if (!hasProfile) {
    return res.status(403).json({ error: `Anda belum punya profil ${parsed.data.role}` });
  }

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
