import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { startStockExpiryCron } from "./jobs/stockExpiryJob";

const app = express();

// CORS — di dev mode, izinkan SEMUA localhost (port apa saja)
// Di production, gunakan whitelist via ALLOWED_ORIGINS env var
const isDev = process.env.NODE_ENV !== "production";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests tanpa origin (curl, Postman, etc)
    if (!origin) return cb(null, true);

    // Dev mode: allow semua localhost/127.0.0.1 dengan port apa saja
    if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }

    // Production: cek whitelist
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);

    console.warn(`[cors] BLOCKED origin: ${origin}`);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

// Log setiap request untuk debugging
app.use((req, _res, next) => {
  if (isDev) console.log(`[${req.method}] ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "blood-connect-api" }));
app.use("/api", routes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`🩸 Blood Connect API running on http://localhost:${port}`);
  console.log(`✅ CORS: ${isDev ? "Dev mode (all localhost allowed)" : `Whitelist: ${ALLOWED_ORIGINS.join(", ")}`}`);
  startStockExpiryCron();
});
