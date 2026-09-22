import dotenv from 'dotenv'

import { sql } from '../db'
import { upsertDocument } from '../services/documentService'

dotenv.config()

type SourceDocument = {
  source_key: string
  title: string
  content: string
}

const sourceQueries = [
  `
    SELECT
      'budget:' || budget_id AS source_key,
      'Budget: ' || budget_name AS title,
      CONCAT('Budget: ', budget_name, '. Balance: ', budget_balance, '.') AS content
    FROM budgets
  `,
  `
    SELECT
      'product:' || product_id AS source_key,
      'Product: ' || product_name AS title,
      CONCAT('Product: ', product_name, '. Catalog number: ', cat_number, '. Supplier: ', supplier, '.') AS content
    FROM products
  `,
  `
    SELECT
      'supplier:' || supplier_id AS source_key,
      'Supplier: ' || supplier_name AS title,
      CONCAT('Supplier: ', supplier_name, '. Contact: ', contact_person, '. Email: ', email, '. Phone: ', phone, '.') AS content
    FROM suppliers
  `,
  `
    SELECT
      'order:' || order_id AS source_key,
      'Order ' || order_id AS title,
      CONCAT('Order date: ', order_date, '. Description: ', description, '. Catalog number: ', cat_number, '. Quote number: ', quote_number, '. PO number: ', po_number, '. Supplier: ', supplier, '. Budget: ', budget, '. Quantity: ', amount, '. Unit price: ', price, ' ', currency, '. Total NIS: ', total_price_nis, '. Status: ', status, '. Comments: ', comments, '.') AS content
    FROM orders
  `
]

async function synchronizeRagDocuments() {
  let synchronized = 0

  for (const sourceQuery of sourceQueries) {
    const documents =
      await sql.query(sourceQuery) as SourceDocument[]

    for (const document of documents) {
      await upsertDocument(
        document.source_key,
        document.title,
        document.content
      )
      synchronized += 1
    }
  }

  console.log(`Synchronized ${synchronized} RAG documents.`)
}

synchronizeRagDocuments().catch(error => {
  console.error('Failed to synchronize RAG documents:', error)
  process.exitCode = 1
})