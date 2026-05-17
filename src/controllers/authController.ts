import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

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
