import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { startStockExpiryCron } from "./jobs/stockExpiryJob";

const app = express();

// CORS whitelist — hanya origin yang dipercaya
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "blood-connect-api" }));
app.use("/api", routes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`🩸 Blood Connect API running on http://localhost:${port}`);
  console.log(`✅ CORS allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
  startStockExpiryCron();
});
