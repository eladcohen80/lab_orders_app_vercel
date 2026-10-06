import sql from '../db'
import dotenv from 'dotenv'
dotenv.config()

async function migrate() {
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ`
        console.log('Migration completed successfully')
    } catch (error) {
        console.error('Migration failed:', error)
    } finally {
        process.exit(0)
    }
}

migrate()
