import { promises as fs } from 'node:fs'
import path from 'node:path'
import multer from 'multer'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
      cb(null, name)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per PRD Section 3
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png']
    if (ok.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Hanya JPG/PNG'))
    }
  },
})
