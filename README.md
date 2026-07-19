# Amar — Sistem Pemesanan

Manajemen klinik eyelash extension: booking online, jadwal artist, deposit & penalty otomatis, riwayat klien + foto before/after.

## Stack
- **Frontend**: Vite + React 19 + TypeScript + Tailwind + shadcn-style UI
- **Backend**: Express + Prisma + MySQL (via Laragon)
- **Email**: Nodemailer (SMTP mock kalau env kosong)
- **Storage**: Local filesystem (`uploads/`)

## Setup

### 1. Install dependencies
```cmd
npm install
```

### 2. Setup database (Laragon MySQL harus running di port 3306)
```cmd
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```
Pastikan Laragon MySQL running. **Jika eRaport MySQL service juga running, stop dulu salah satu** — keduanya rebutan port 3306.

### 3. Run dev (FE + BE bersamaan)
```cmd
npm run dev
```
- Frontend: http://localhost:5173 (Vite, proxy `/api` → 3000)
- Backend: http://localhost:3000

### 4. Build production
```cmd
npm run build
npm start
```
Server Express serve `dist/` + API di port 3000.

## Struktur
```
├── index.html, vite.config.ts, tailwind.config.ts
├── prisma/
│   ├── schema.prisma         (ERD PRD Section 6: clients, artists, business_rules, bookings, before_after_photos)
│   └── seed.ts               (demo admin + 2 artist)
├── src/                      (frontend)
│   ├── main.tsx, App.tsx, index.css
│   ├── components/ui/button.tsx
│   ├── lib/ (utils, api)
│   └── pages/ (booking, artist-dashboard, admin-dashboard, admin-rules, login)
├── server/                   (backend Express)
│   ├── index.ts
│   ├── lib/ (prisma, upload, email)
│   ├── routes/ (booking, artist, admin, auth, client)
│   └── middleware/auth.ts
├── shared/types.ts           (FE/BE shared)
└── uploads/                  (foto & bukti deposit — gitignored)
```

## Demo Akun (dari seed)
- Admin: `admin@amar.test` / `admin123`
- Artist: `rina@amar.test` / `artist123`
- Artist: `sari@amar.test` / `artist123`

## Status Implementasi
- [x] Project structure & Tailwind setup (shadcn-style: card, input, label, badge, dialog, button, sonner, separator, avatar)
- [x] Prisma schema + seed
- [x] Backend routes (booking, artist, admin, auth, client, photo)
- [x] AppShell with sidebar role-based nav + topbar user info
- [x] Home page: hero + feature cards + CTA
- [x] Public booking flow: multi-step (info → slot → confirm → success) with slot picker, QR code, deposit instructions
- [x] Slot picker: GET /api/booking/slots — computed from artist work hours + package duration + buffer
- [x] Booking manage: lookup by email (/booking/manage)
- [x] Booking detail: upload deposit + cancel with penalty display (/booking/:id)
- [x] Real-time booking calendar (FullCalendar) — artist dashboard
- [x] Artist dashboard: check-in + complete + drag-reschedule + photo upload dialog
- [x] Before/after photo upload (multer 5MB, maks 2 per booking) with caption
- [x] Session middleware (cookie-session + bcrypt) + login wired
- [x] Client profile & history + photo gallery
- [x] Admin dashboard: stat cards with icons + booking table + status filter + CSV export
- [x] Admin rules: form edit business_rules with descriptive fields
- [x] Admin artists management: list + create + edit dialog
- [x] Quick search client (artist dashboard, debounced)
- [x] Auto-cancel pending_deposit after 2h (setInterval, every 5 min)
- [x] Toast notifications (sonner) across all actions
- [ ] Email templates (Nodemailer sudah ready, template belum)
- [ ] Reminder 24 jam sebelum jadwal (butuh scheduler)
- [ ] Acceptance tests (Vitest + Playwright)

## Catatan Env
- MySQL via **Laragon** di `127.0.0.1:3306`, user `root`, tanpa password.
- Jika `SMTP_*` kosong, email di-mock ke console.log.
