// server/index.ts
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import express from "express";

// server/routes/booking.ts
import { Router } from "express";
import { z } from "zod";

// server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
var prismaInstance = null;
function getPrisma() {
  if (!prismaInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is missing! Harap tambahkan di dashboard Vercel Anda.");
    }
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
}
var prisma = new Proxy({}, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});

// server/lib/email.ts
import nodemailer from "nodemailer";
var transporter = process.env.SMTP_HOST && process.env.SMTP_PORT ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ?? ""
  } : void 0
}) : null;
async function sendEmail(to, subject, text) {
  if (!transporter) {
    console.log("[email mock]", { to, subject, text });
    return;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@amar.test",
    to,
    subject,
    text
  });
}

// server/lib/upload.ts
import path from "node:path";
import multer from "multer";
var UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
var upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5 MB per PRD Section 3
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png"];
    if (ok.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Hanya JPG/PNG"));
    }
  }
});

// server/routes/booking.ts
var router = Router();
var SERVICE_PACKAGES = [
  { id: "classic", name: "Classic Lash", duration_minutes: 60, price: 25e4 },
  { id: "volume", name: "Volume Lash", duration_minutes: 90, price: 4e5 },
  { id: "mega-volume", name: "Mega Volume", duration_minutes: 120, price: 55e4 }
];
function pkgDuration(name) {
  if (/mega/i.test(name)) return 120;
  if (/volume/i.test(name)) return 90;
  return 60;
}
var createSchema = z.object({
  client: z.object({
    full_name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6)
  }),
  artist_id: z.number().int(),
  scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid datetime format" }),
  service_package: z.string().min(1),
  location_type: z.enum(["studio", "home_service"]),
  address: z.string().optional()
});
router.post("/create", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { client, artist_id, scheduled_at, service_package, location_type, address } = parsed.data;
  const artist = await prisma.artist.findUnique({ where: { id: artist_id } });
  if (!artist || !artist.is_active) {
    res.status(404).json({ error: "Artist tidak ditemukan" });
    return;
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const bufferMin = rules?.buffer_minutes ?? 30;
  const start = new Date(scheduled_at);
  const duration = pkgDuration(service_package);
  const end = new Date(start.getTime() + duration * 60 * 1e3);
  const conflicting = await prisma.booking.findFirst({
    where: {
      artist_id,
      status: { in: ["pending_deposit", "confirmed", "checked_in"] },
      AND: [
        { scheduled_at: { lt: new Date(end.getTime() + bufferMin * 6e4) } },
        { scheduled_at: { gt: new Date(start.getTime() - bufferMin * 6e4) } }
      ]
    }
  });
  if (conflicting) {
    res.status(409).json({ error: "Slot bentrok dengan booking lain" });
    return;
  }
  const clientRow = await prisma.client.upsert({
    where: { email: client.email },
    create: {
      full_name: client.full_name,
      email: client.email,
      phone: client.phone
    },
    update: { full_name: client.full_name, phone: client.phone }
  });
  const booking = await prisma.booking.create({
    data: {
      client_id: clientRow.id,
      artist_id,
      scheduled_at: start,
      service_package,
      location_type,
      address
    }
  });
  await sendEmail(
    client.email,
    "Konfirmasi Booking \u2014 Amar Klinik",
    `Booking ID #${booking.id}. Status: pending_deposit. Upload bukti deposit dalam 2 jam.`
  ).catch(() => {
  });
  res.status(201).json(booking);
});
router.post("/:id/deposit-upload", upload.single("file"), async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true }
  });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  if (booking.status !== "pending_deposit" && booking.status !== "confirmed") {
    res.status(409).json({ error: `Booking berstatus ${booking.status}, tidak bisa upload deposit` });
    return;
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const pct = rules?.deposit_percentage ?? 50;
  const pkg = SERVICE_PACKAGES.find((p) => p.name === booking.service_package);
  const price = pkg?.price ?? 0;
  const depositAmount = price * pct / 100;
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: "confirmed",
      deposit_paid: depositAmount
    },
    include: { client: true }
  });
  await sendEmail(
    booking.client?.email ?? "",
    "Deposit Diterima \u2014 Amar Klinik",
    `Booking ID #${id} terkonfirmasi. Deposit: Rp${depositAmount.toLocaleString("id-ID")}.`
  ).catch(() => {
  });
  res.json(updated);
});
router.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const thresholdHours = rules?.cancel_threshold_hours ?? 24;
  const penaltyPct = rules?.penalty_percentage ?? 100;
  const now = /* @__PURE__ */ new Date();
  const hoursUntil = (booking.scheduled_at.getTime() - now.getTime()) / 36e5;
  const applyPenalty = hoursUntil < thresholdHours;
  const penalty = applyPenalty ? Number(booking.deposit_paid ?? 0) * (penaltyPct / 100) : null;
  await prisma.booking.update({
    where: { id },
    data: {
      status: applyPenalty ? "cancelled_penalty_applied" : "cancelled",
      penalty_applied: penalty
    }
  });
  res.json({ ok: true, penalty_applied: penalty });
});
router.get("/", async (req, res) => {
  const artist_id = Number(req.query.artist_id);
  const from = req.query.from;
  const to = req.query.to;
  const date = req.query.date;
  if (!artist_id) {
    res.status(400).json({ error: "artist_id wajib" });
    return;
  }
  let start;
  let end;
  if (from && to) {
    start = /* @__PURE__ */ new Date(`${from}T00:00:00`);
    end = /* @__PURE__ */ new Date(`${to}T23:59:59`);
  } else if (date) {
    start = /* @__PURE__ */ new Date(`${date}T00:00:00`);
    end = /* @__PURE__ */ new Date(`${date}T23:59:59`);
  } else {
    res.status(400).json({ error: "from/to atau date wajib" });
    return;
  }
  const bookings = await prisma.booking.findMany({
    where: {
      artist_id,
      scheduled_at: { gte: start, lte: end }
    },
    include: { client: true },
    orderBy: { scheduled_at: "asc" }
  });
  res.json(bookings);
});
router.post("/:id/check-in", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  if (booking.status !== "confirmed" && booking.status !== "checked_in") {
    res.status(409).json({
      error: `Check-in hanya untuk booking confirmed. Status saat ini: ${booking.status}`
    });
    return;
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "checked_in" },
    include: { client: true }
  });
  res.json(updated);
});
router.post("/:id/complete", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  if (booking.status !== "checked_in") {
    res.status(409).json({
      error: `Complete hanya untuk booking checked_in. Status saat ini: ${booking.status}`
    });
    return;
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "completed" },
    include: { client: true }
  });
  res.json(updated);
});
var rescheduleSchema = z.object({
  scheduled_at: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid datetime format" })
});
router.post("/:id/reschedule", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  if (["cancelled", "cancelled_penalty_applied", "completed"].includes(booking.status)) {
    res.status(409).json({ error: "Booking yang sudah selesai/dibatalkan tidak bisa reschedule" });
    return;
  }
  const newStart = new Date(parsed.data.scheduled_at);
  const durationMin = /mega/i.test(booking.service_package) ? 120 : /volume/i.test(booking.service_package) ? 90 : 60;
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const bufferMin = rules?.buffer_minutes ?? 30;
  const newEnd = new Date(newStart.getTime() + durationMin * 6e4);
  const conflicting = await prisma.booking.findFirst({
    where: {
      artist_id: booking.artist_id,
      id: { not: id },
      status: { in: ["pending_deposit", "confirmed", "checked_in"] },
      AND: [
        { scheduled_at: { lt: new Date(newEnd.getTime() + bufferMin * 6e4) } },
        { scheduled_at: { gt: new Date(newStart.getTime() - bufferMin * 6e4) } }
      ]
    }
  });
  if (conflicting) {
    res.status(409).json({ error: "Slot tujuan bentrok dengan booking lain" });
    return;
  }
  const updated = await prisma.booking.update({
    where: { id },
    data: { scheduled_at: newStart },
    include: { client: true }
  });
  res.json(updated);
});
router.get("/slots", async (req, res) => {
  const artist_id = Number(req.query.artist_id);
  const date = req.query.date;
  const pkgId = req.query.package ?? "classic";
  if (!artist_id || !date) {
    res.status(400).json({ error: "artist_id & date wajib" });
    return;
  }
  const artist = await prisma.artist.findUnique({ where: { id: artist_id } });
  if (!artist || !artist.is_active) {
    res.status(404).json({ error: "Artist tidak ditemukan" });
    return;
  }
  const pkg = SERVICE_PACKAGES.find((p) => p.id === pkgId) ?? SERVICE_PACKAGES[0];
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const bufferMin = rules?.buffer_minutes ?? 30;
  const durationMin = pkg.duration_minutes;
  const [sh, sm] = artist.start_time.split(":").map(Number);
  const [eh, em] = artist.end_time.split(":").map(Number);
  const dayStart = /* @__PURE__ */ new Date(`${date}T00:00:00`);
  const workStart = new Date(dayStart);
  workStart.setHours(sh, sm, 0, 0);
  const workEnd = new Date(dayStart);
  workEnd.setHours(eh, em, 0, 0);
  const existing = await prisma.booking.findMany({
    where: {
      artist_id,
      status: { in: ["pending_deposit", "confirmed", "checked_in"] },
      scheduled_at: {
        gte: new Date(workStart.getTime() - bufferMin * 6e4),
        lte: new Date(workEnd.getTime() + bufferMin * 6e4)
      }
    },
    orderBy: { scheduled_at: "asc" }
  });
  const slots = [];
  const now = /* @__PURE__ */ new Date();
  for (let t = new Date(workStart); t.getTime() + durationMin * 6e4 <= workEnd.getTime(); t = new Date(t.getTime() + 30 * 6e4)) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t.getTime() + durationMin * 6e4);
    const bufStart = new Date(slotStart.getTime() - bufferMin * 6e4);
    const bufEnd = new Date(slotEnd.getTime() + bufferMin * 6e4);
    const conflict = existing.find((b) => {
      const bStart = b.scheduled_at;
      const bDur = pkgDuration(b.service_package);
      const bEnd = new Date(bStart.getTime() + bDur * 6e4);
      return bStart < bufEnd && bEnd > bufStart;
    });
    const inPast = slotStart.getTime() < now.getTime();
    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !conflict && !inPast
    });
  }
  res.json({ artist, package: pkg, slots });
});
router.get("/lookup", async (req, res) => {
  const email = req.query.email?.toLowerCase().trim();
  if (!email) {
    res.status(400).json({ error: "email wajib" });
    return;
  }
  const client = await prisma.client.findUnique({
    where: { email },
    include: {
      bookings: {
        include: { artist: true },
        orderBy: { scheduled_at: "desc" },
        take: 20
      }
    }
  });
  if (!client) {
    res.status(404).json({ error: "Tidak ada booking dengan email tersebut" });
    return;
  }
  res.json(client);
});
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true, artist: true, photos: true }
  });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  res.json(booking);
});
var booking_default = router;

// server/routes/artist.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/", async (_req, res) => {
  const artists = await prisma.artist.findMany({
    where: { is_active: true, role: "artist" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      created_at: true
    }
  });
  res.json(artists);
});
var artist_default = router2;

// server/routes/admin.ts
import { Router as Router3 } from "express";
import { z as z2 } from "zod";

// server/middleware/auth.ts
function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  next();
}

// server/routes/admin.ts
var router3 = Router3();
var rulesSchema = z2.object({
  deposit_percentage: z2.number().int().min(0).max(100).optional(),
  cancel_threshold_hours: z2.number().int().min(0).optional(),
  penalty_percentage: z2.number().int().min(0).max(100).optional(),
  buffer_minutes: z2.number().int().min(0).optional()
});
router3.get("/rules", async (_req, res) => {
  const rules = await prisma.businessRule.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {}
  });
  res.json(rules);
});
router3.put("/rules", requireAdmin, async (req, res) => {
  const parsed = rulesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.businessRule.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed.data },
    update: parsed.data
  });
  res.json(updated);
});
router3.get("/stats", requireAdmin, async (_req, res) => {
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = /* @__PURE__ */ new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const [bookings_today, pending_deposits, cancelled, total] = await Promise.all([
    prisma.booking.count({
      where: { scheduled_at: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.booking.count({ where: { status: "pending_deposit" } }),
    prisma.booking.count({
      where: { status: { startsWith: "cancelled" } }
    }),
    prisma.booking.count()
  ]);
  const topArtists = await prisma.booking.groupBy({
    by: ["artist_id"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1
  });
  let top_artist = null;
  if (topArtists[0]) {
    const a = await prisma.artist.findUnique({
      where: { id: topArtists[0].artist_id }
    });
    if (a) top_artist = { name: a.name, bookings: topArtists[0]._count.id };
  }
  res.json({
    bookings_today,
    pending_deposits,
    cancel_rate: total > 0 ? Math.round(cancelled / total * 100) : 0,
    top_artist
  });
});
router3.get("/bookings", requireAuth, async (req, res) => {
  const status = req.query.status ?? null;
  const from = req.query.from;
  const to = req.query.to;
  const where = {};
  if (status && status !== "all") where.status = status;
  if (from || to) {
    where.scheduled_at = {};
    if (from) where.scheduled_at.gte = /* @__PURE__ */ new Date(`${from}T00:00:00`);
    if (to) where.scheduled_at.lte = /* @__PURE__ */ new Date(`${to}T23:59:59`);
  }
  const bookings = await prisma.booking.findMany({
    where,
    include: { client: true, artist: true },
    orderBy: { scheduled_at: "desc" },
    take: 200
  });
  res.json(bookings);
});
router3.get("/bookings/export.csv", requireAdmin, async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    include: { client: true, artist: true },
    orderBy: { scheduled_at: "desc" }
  });
  const headers = [
    "id",
    "client_name",
    "client_email",
    "client_phone",
    "artist_name",
    "scheduled_at",
    "service_package",
    "status",
    "deposit_paid",
    "penalty_applied",
    "created_at"
  ];
  const escape = (v) => {
    const s = v === null || v === void 0 ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = bookings.map(
    (b) => [
      b.id,
      b.client?.full_name ?? "",
      b.client?.email ?? "",
      b.client?.phone ?? "",
      b.artist?.name ?? "",
      b.scheduled_at.toISOString(),
      b.service_package,
      b.status,
      b.deposit_paid?.toString() ?? "",
      b.penalty_applied?.toString() ?? "",
      b.created_at.toISOString()
    ].map(escape).join(",")
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="bookings-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
  );
  res.send([headers.join(","), ...rows].join("\n"));
});
router3.get("/artists", requireAdmin, async (_req, res) => {
  const artists = await prisma.artist.findMany({
    where: { role: "artist" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      role: true,
      created_at: true
    }
  });
  res.json(artists);
});
var artistSchema = z2.object({
  name: z2.string().min(2),
  email: z2.string().email(),
  phone: z2.string().min(6),
  password: z2.string().min(6).optional(),
  start_time: z2.string().regex(/^\d{2}:\d{2}$/),
  end_time: z2.string().regex(/^\d{2}:\d{2}$/),
  is_active: z2.boolean().optional()
});
router3.post("/artists", requireAdmin, async (req, res) => {
  const parsed = artistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, email, phone, password, start_time, end_time, is_active } = parsed.data;
  const bcrypt2 = await import("bcryptjs");
  const password_hash = await bcrypt2.hash(password ?? "artist123", 10);
  const artist = await prisma.artist.create({
    data: {
      name,
      email,
      phone,
      password_hash,
      start_time,
      end_time,
      is_active: is_active ?? true,
      role: "artist"
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      role: true,
      created_at: true
    }
  });
  res.status(201).json(artist);
});
router3.patch("/artists/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = artistSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = { ...parsed.data };
  if (parsed.data.password) {
    const bcrypt2 = await import("bcryptjs");
    data.password_hash = await bcrypt2.hash(parsed.data.password, 10);
    delete data.password;
  }
  const updated = await prisma.artist.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      start_time: true,
      end_time: true,
      is_active: true,
      role: true,
      created_at: true
    }
  });
  res.json(updated);
});
router3.delete("/artists/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const artist = await prisma.artist.findUnique({ where: { id } });
    if (!artist) {
      res.status(404).json({ error: "Artist tidak ditemukan" });
      return;
    }
    const bookingsCount = await prisma.booking.count({
      where: { artist_id: id }
    });
    if (bookingsCount > 0) {
      res.status(400).json({
        error: "Artist tidak bisa dihapus karena memiliki riwayat booking. Silakan nonaktifkan artist jika sudah tidak bertugas."
      });
      return;
    }
    await prisma.artist.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus artist" });
  }
});
router3.get("/clients/search", requireAuth, async (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) {
    res.json([]);
    return;
  }
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { full_name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } }
      ]
    },
    take: 20,
    orderBy: { created_at: "desc" },
    include: { _count: { select: { bookings: true } } }
  });
  res.json(clients);
});
router3.get("/clients", requireAdmin, async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { created_at: "desc" },
    include: { _count: { select: { bookings: true } } }
  });
  res.json(clients);
});
router3.post("/bookings/:id/confirm-deposit", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  if (booking.status !== "pending_deposit" && booking.status !== "confirmed") {
    res.status(409).json({
      error: `Booking berstatus ${booking.status}, tidak bisa konfirmasi deposit`
    });
    return;
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const pct = rules?.deposit_percentage ?? 50;
  const pkg = await prisma.servicePackage.findFirst({ where: { name: booking.service_package } });
  const price = pkg?.price ?? 0;
  const depositAmount = price * pct / 100;
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "confirmed", deposit_paid: depositAmount },
    include: { client: true, artist: true }
  });
  res.json(updated);
});
router3.post("/bookings/:id/cancel", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    res.status(404).json({ error: "Booking tidak ditemukan" });
    return;
  }
  if (booking.status.startsWith("cancelled") || booking.status === "completed") {
    res.status(409).json({
      error: `Booking berstatus ${booking.status}, tidak bisa dibatalkan`
    });
    return;
  }
  const rules = await prisma.businessRule.findUnique({ where: { id: 1 } });
  const thresholdHours = rules?.cancel_threshold_hours ?? 24;
  const penaltyPct = rules?.penalty_percentage ?? 100;
  const hoursUntil = (booking.scheduled_at.getTime() - Date.now()) / 36e5;
  const applyPenalty = hoursUntil < thresholdHours;
  const penalty = applyPenalty ? Number(booking.deposit_paid ?? 0) * (penaltyPct / 100) : null;
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: applyPenalty ? "cancelled_penalty_applied" : "cancelled",
      penalty_applied: penalty
    },
    include: { client: true, artist: true }
  });
  res.json(updated);
});
var admin_default = router3;

// server/routes/auth.ts
import { Router as Router4 } from "express";
import bcrypt from "bcryptjs";
var router4 = Router4();
router4.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email & password wajib" });
    return;
  }
  const artist = await prisma.artist.findUnique({ where: { email } });
  if (!artist || !artist.password_hash) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }
  const ok = await bcrypt.compare(password, artist.password_hash);
  if (!ok) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }
  const user = { id: artist.id, role: artist.role, name: artist.name };
  req.session.user = user;
  res.json({ user });
});
router4.post("/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});
router4.get("/me", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(req.user);
});
var auth_default = router4;

// server/routes/client.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    res.status(404).json({ error: "Client tidak ditemukan" });
    return;
  }
  res.json(client);
});
router5.get("/:id/bookings", async (req, res) => {
  const id = Number(req.params.id);
  const bookings = await prisma.booking.findMany({
    where: { client_id: id },
    include: { artist: true, photos: true },
    orderBy: { scheduled_at: "desc" }
  });
  res.json(bookings);
});
var client_default = router5;

// server/routes/photo.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/booking/:id/photos", async (req, res) => {
  const id = Number(req.params.id);
  const photos = await prisma.beforeAfterPhoto.findMany({
    where: { booking_id: id },
    orderBy: { uploaded_at: "asc" }
  });
  res.json(photos);
});
router6.post(
  "/booking/:id/photos",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) {
      res.status(400).json({ error: "File wajib diupload" });
      return;
    }
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      res.status(404).json({ error: "Booking tidak ditemukan" });
      return;
    }
    const count = await prisma.beforeAfterPhoto.count({
      where: { booking_id: id }
    });
    if (count >= 2) {
      res.status(409).json({ error: "Maksimal 2 foto per booking" });
      return;
    }
    const caption = req.body.caption ?? null;
    const photo = await prisma.beforeAfterPhoto.create({
      data: {
        booking_id: id,
        file_path: `/uploads/${req.file.filename}`,
        caption,
        uploaded_by_artist_id: req.user.id
      }
    });
    res.status(201).json(photo);
  }
);
router6.delete("/photo/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const photo = await prisma.beforeAfterPhoto.findUnique({ where: { id } });
  if (!photo) {
    res.status(404).json({ error: "Foto tidak ditemukan" });
    return;
  }
  if (photo.uploaded_by_artist_id !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ error: "Tidak punya akses" });
    return;
  }
  await prisma.beforeAfterPhoto.delete({ where: { id } });
  res.json({ ok: true });
});
var photo_default = router6;

// server/routes/service.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get("/", async (_req, res) => {
  try {
    const packages = await prisma.servicePackage.findMany({
      where: { is_active: true },
      orderBy: { created_at: "asc" }
    });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat paket layanan" });
  }
});
router7.get("/admin", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const packages = await prisma.servicePackage.findMany({
      orderBy: { created_at: "asc" }
    });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat semua paket layanan" });
  }
});
router7.post("/admin", requireAuth, requireAdmin, async (req, res) => {
  const { name, duration_minutes, price, description, is_active } = req.body;
  if (!name || !duration_minutes || !price || !description) {
    res.status(400).json({ error: "Semua kolom data (nama, durasi, harga, deskripsi) wajib diisi" });
    return;
  }
  const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id } });
    if (existing) {
      res.status(409).json({ error: "Layanan dengan nama/ID tersebut sudah ada" });
      return;
    }
    const pkg = await prisma.servicePackage.create({
      data: {
        id,
        name,
        duration_minutes: Number(duration_minutes),
        price: Number(price),
        description,
        is_active: is_active !== void 0 ? Boolean(is_active) : true
      }
    });
    res.status(201).json(pkg);
  } catch (err) {
    res.status(500).json({ error: "Gagal menyimpan paket layanan baru" });
  }
});
router7.put("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, duration_minutes, price, description, is_active } = req.body;
  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Paket layanan tidak ditemukan" });
      return;
    }
    const pkg = await prisma.servicePackage.update({
      where: { id },
      data: {
        name: name !== void 0 ? name : existing.name,
        duration_minutes: duration_minutes !== void 0 ? Number(duration_minutes) : existing.duration_minutes,
        price: price !== void 0 ? Number(price) : existing.price,
        description: description !== void 0 ? description : existing.description,
        is_active: is_active !== void 0 ? Boolean(is_active) : existing.is_active
      }
    });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: "Gagal memperbarui data paket layanan" });
  }
});
router7.delete("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.servicePackage.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Paket layanan tidak ditemukan" });
      return;
    }
    await prisma.servicePackage.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus paket layanan" });
  }
});
var service_default = router7;

// server/index.ts
import multer2 from "multer";
var app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cookieSession({
    name: "amar_session",
    keys: [process.env.SESSION_SECRET ?? "amar-dev-secret-change-me"],
    maxAge: 24 * 60 * 60 * 1e3,
    // 24 hours
    httpOnly: true,
    sameSite: "lax"
  })
);
app.use((req, _res, next) => {
  if (req.session?.user) {
    ;
    req.user = req.session.user;
  } else {
    ;
    req.user = null;
  }
  next();
});
app.use("/uploads", express.static(process.cwd() + "/uploads"));
app.use("/api/booking", booking_default);
app.use("/api/artists", artist_default);
app.use("/api/admin", admin_default);
app.use("/api/auth", auth_default);
app.use("/api/clients", client_default);
app.use("/api", photo_default);
app.use("/api/services", service_default);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use((err, _req, res, _next) => {
  if (err instanceof multer2.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Ukuran file terlalu besar. Maksimal adalah 5 MB." });
      return;
    }
    res.status(400).json({ error: `Gagal upload file: ${err.message}` });
    return;
  }
  if (err.message === "Hanya JPG/PNG") {
    res.status(400).json({ error: "Format file tidak didukung. Hanya diperbolehkan JPG/PNG." });
    return;
  }
  console.error("[server error]", err);
  res.status(500).json({ error: "Terjadi kesalahan internal server." });
});
var index_default = app;
export {
  index_default as default
};
