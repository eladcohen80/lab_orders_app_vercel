import dotenv from 'dotenv'

import { sql } from '../db'
import { DIMENSIONS } from '../services/embeddingService'

dotenv.config()

async function initializeRagSchema() {
  if (!Number.isInteger(DIMENSIONS) || DIMENSIONS <= 0) {
    throw new Error('EMBEDDING_DIMENSIONS must be a positive integer')
  }

  await sql`CREATE EXTENSION IF NOT EXISTS vector`

  await sql.query(`
    CREATE TABLE IF NOT EXISTS documents (
      document_id SERIAL PRIMARY KEY,
      source_key TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding vector(${DIMENSIONS}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await sql`ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_key TEXT`

  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS documents_source_key_idx
    ON documents (source_key)
  `)

  await sql.query(`
    CREATE INDEX IF NOT EXISTS documents_embedding_idx
    ON documents USING hnsw (embedding vector_cosine_ops)
  `)

  console.log('RAG schema is ready.')
}

initializeRagSchema().catch(error => {
  console.error('Failed to initialize RAG schema:', error)
  process.exitCode = 1
})