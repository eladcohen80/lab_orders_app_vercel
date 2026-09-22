
import dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
dotenv.config()

const databaseUrl = process.env.DATABASE_URL as string

if (!databaseUrl) {
  console.error('WARNING: DATABASE_URL is not set')
}

export const sql = databaseUrl
  ? neon(databaseUrl)
  : (() => { throw new Error('DATABASE_URL is not set') }) as any

export default sql