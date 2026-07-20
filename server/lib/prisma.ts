import { PrismaClient } from '@prisma/client'

let prismaInstance: PrismaClient | null = null

function getPrisma() {
  if (!prismaInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is missing! Harap tambahkan di dashboard Vercel Anda.')
    }
    prismaInstance = new PrismaClient()
  }
  return prismaInstance
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

