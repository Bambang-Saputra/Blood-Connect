import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export interface AuthedRequest extends Request {
  user?: { id: string; role: Role; email: string };
}

// Use Case: LOGIN postcondition → semua request bawa JWT pada header Authorization
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any;
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Guard role-based — gunakan setelah requireAuth
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden — role tidak diizinkan" });
    }
    next();
  };
}
