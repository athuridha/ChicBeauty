import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Singleton business rules
  await prisma.businessRule.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })

  // Clean up old default seed accounts safely if they don't have bookings
  for (const email of ['admin@chicbeauty.test', 'rina@chicbeauty.test', 'sari@chicbeauty.test']) {
    try {
      const art = await prisma.artist.findUnique({ where: { email } })
      if (art) {
        const count = await prisma.booking.count({ where: { artist_id: art.id } })
        if (count === 0) {
          await prisma.artist.delete({ where: { email } })
        }
      }
    } catch (e) {}
  }

  // Demo admin (New)
  const adminHash = await bcrypt.hash('demo123', 10)
  await prisma.artist.upsert({
    where: { email: 'demo@mail.com' },
    create: {
      name: 'Chic Admin',
      email: 'demo@mail.com',
      phone: '08123456789',
      password_hash: adminHash,
      start_time: '09:00',
      end_time: '17:00',
      role: 'admin',
    },
    update: { password_hash: adminHash, role: 'admin' },
  })

  // Demo artist (New)
  const artistHash = await bcrypt.hash('demo123', 10)
  await prisma.artist.upsert({
    where: { email: 'demo-artist@mail.com' },
    create: {
      name: 'Demo Artist',
      email: 'demo-artist@mail.com',
      phone: '08123456780',
      password_hash: artistHash,
      start_time: '09:00',
      end_time: '17:00',
      role: 'artist',
    },
    update: { password_hash: artistHash },
  })

  // Clear existing packages to avoid stale records
  await prisma.servicePackage.deleteMany({})

  // Default service packages (New 6 Options)
  const defaultPackages = [
    {
      id: 'eyelash-extension',
      name: 'Eyelash Extension',
      duration: 90,
      price: 350000,
      desc: 'Layanan ini menyambungkan bulu mata artifisial (sintetis) satu per satu ke bulu mata asli menggunakan lem khusus. Anda bisa memilih berbagai gaya, mulai dari yang natural, volume, hingga bold. Jenis ini biasanya bertahan sekitar 4 minggu dan membutuhkan retouch (pengisian ulang).'
    },
    {
      id: 'lash-lift',
      name: 'Lash Lift',
      duration: 45,
      price: 200000,
      desc: 'Perawatan untuk melentikkan dan mengangkat bulu mata asli menggunakan larutan atau serum khusus. Hasilnya membuat bulu mata terlihat lebih panjang dan seperti memakai maskara. Layanan ini cocok untuk Anda yang menginginkan tampilan sangat natural dan tahan hingga 2 bulan.'
    },
    {
      id: 'lash-filler',
      name: 'Lash Filler',
      duration: 60,
      price: 250000,
      desc: 'Varian lanjutan dari lash lift. Selain melentikkan, layanan ini juga memberikan nutrisi tambahan untuk menebalkan dan membuat bulu mata asli tampak lebih sehat serta berkilau.'
    },
    {
      id: 'led-lash-eyelash-extension',
      name: 'LED Lash Eyelash Extension',
      duration: 90,
      price: 450000,
      desc: 'Inovasi terbaru di mana lem perekat ekstensi bulu mata dikeringkan menggunakan alat sinar LED. Teknologi ini membuat proses pengeringan lebih instan, tahan lebih lama, dan meminimalisir risiko perih pada mata.'
    },
    {
      id: 'lash-removal',
      name: 'Lash Removal',
      duration: 30,
      price: 100000,
      desc: 'Layanan khusus untuk melepaskan eyelash extension dengan menggunakan cairan pelepas (remover) khusus agar bulu mata asli tidak rontok atau rusak.'
    },
    {
      id: 'retouch-eyelash',
      name: 'Retouch Eyelash',
      duration: 60,
      price: 175000,
      desc: 'Sesi perawatan ulang untuk mengisi kembali ekstensi bulu mata yang rontok setelah beberapa minggu pemakaian, agar kembali terlihat lebat dan rapi.'
    }
  ]

  for (const p of defaultPackages) {
    await prisma.servicePackage.create({
      data: {
        id: p.id,
        name: p.name,
        duration_minutes: p.duration,
        price: p.price,
        description: p.desc,
      }
    })
  }

  console.log('[seed] OK')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
