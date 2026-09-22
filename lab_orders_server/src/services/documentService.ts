import { sql } from '../db'

import {
  createEmbedding,
  toVectorString
} from './embeddingService'

// ============================================
// documentService
//
// האחריות:
// 1. לשמור מסמכים יחד עם ה-Embedding שלהם.
// 2. לבצע Vector Search.
//
// כאן אין שום קריאה למודל היוצר תשובות.
// ============================================

export type DocumentRow = {
  document_id: string
  title: string
  content: string
}

export type SearchResult =
  DocumentRow & {
    distance: number
  }

export async function addDocument(
  title: string,
  content: string
): Promise<DocumentRow> {

  // הטקסט -> Embedding
  const embedding =
    await createEmbedding(content)

  const vector =
    toVectorString(embedding)

  const result = await sql`
    INSERT INTO documents (
      title,
      content,
      embedding
    )
    VALUES (
      ${title},
      ${content},
      ${vector}::vector
    )
    RETURNING
      document_id,
      title,
      content
  `

  return result[0] as DocumentRow
}

export async function upsertDocument(
  sourceKey: string,
  title: string,
  content: string
): Promise<DocumentRow> {

  const embedding =
    await createEmbedding(content)

  const vector =
    toVectorString(embedding)

  const result = await sql`
    INSERT INTO documents (
      source_key,
      title,
      content,
      embedding
    )
    VALUES (
      ${sourceKey},
      ${title},
      ${content},
      ${vector}::vector
    )
    ON CONFLICT (source_key)
    DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      embedding = EXCLUDED.embedding
    RETURNING
      document_id,
      title,
      content
  `

  return result[0] as DocumentRow
}


// ============================================
// Vector Search
//
// החיפוש מתבצע ישירות מול עמודות embedding_dimensions
// בטבלאות העסק (orders, products, suppliers, budgets).
// <=> הוא אופרטור של pgvector.
// הוא מחשב Distance בין שני Vectors.
// Distance קטן יותר = קרוב יותר במשמעות.
//
// limit     = Top K   (כמה רשומות להחזיר)
// threshold = מרחק מקסימלי שעדיין נחשב רלוונטי
// ============================================

export async function searchDocuments(
  question: string,
  limit: number = 3,
  threshold: number = 0.7
): Promise<SearchResult[]> {

  // גם השאלה הופכת ל-Vector,
  // באותו מודל ובאותו מספר מימדים.
  const embedding =
    await createEmbedding(question)

  const vector =
    toVectorString(embedding)

  const documents = await sql`
    SELECT * FROM (
      SELECT
        ('order:' || order_id) AS document_id,
        ('Order ' || order_id) AS title,
        CONCAT('Order date: ', order_date, '. Description: ', description, '. Catalog number: ', cat_number, '. Quote number: ', quote_number, '. PO number: ', po_number, '. Supplier: ', supplier, '. Budget: ', budget, '. Quantity: ', amount, '. Unit price: ', price, ' ', currency, '. Status: ', status, '. Comments: ', comments, '.') AS content,
        embedding_dimensions <=> ${vector}::vector AS distance
      FROM orders
      WHERE embedding_dimensions IS NOT NULL

      UNION ALL

      SELECT
        ('product:' || product_id) AS document_id,
        ('Product: ' || product_name) AS title,
        CONCAT('Product: ', product_name, '. Catalog number: ', cat_number, '. Supplier: ', supplier, '.') AS content,
        embedding_dimensions <=> ${vector}::vector AS distance
      FROM products
      WHERE embedding_dimensions IS NOT NULL

      UNION ALL

      SELECT
        ('supplier:' || supplier_id) AS document_id,
        ('Supplier: ' || supplier_name) AS title,
        CONCAT('Supplier: ', supplier_name, '. Contact: ', contact_person, '. Email: ', email, '. Phone: ', phone, '.') AS content,
        embedding_dimensions <=> ${vector}::vector AS distance
      FROM suppliers
      WHERE embedding_dimensions IS NOT NULL

      UNION ALL

      SELECT
        ('budget:' || budget_id) AS document_id,
        ('Budget: ' || budget_name) AS title,
        CONCAT('Budget: ', budget_name, '. Balance: ', budget_balance, '.') AS content,
        embedding_dimensions <=> ${vector}::vector AS distance
      FROM budgets
      WHERE embedding_dimensions IS NOT NULL
    ) AS all_documents
    WHERE distance < ${threshold}
    ORDER BY distance
    LIMIT ${limit}
  `

  return documents as SearchResult[]
}


export async function getAllDocuments(): Promise<DocumentRow[]> {

  const documents = await sql`
    SELECT * FROM (
      SELECT
        ('order:' || order_id) AS document_id,
        ('Order ' || order_id) AS title,
        CONCAT('Order date: ', order_date, '. Description: ', description, '. Catalog number: ', cat_number, '. Quote number: ', quote_number, '. PO number: ', po_number, '. Supplier: ', supplier, '. Budget: ', budget, '. Quantity: ', amount, '. Unit price: ', price, ' ', currency, '. Status: ', status, '. Comments: ', comments, '.') AS content
      FROM orders

      UNION ALL

      SELECT
        ('product:' || product_id) AS document_id,
        ('Product: ' || product_name) AS title,
        CONCAT('Product: ', product_name, '. Catalog number: ', cat_number, '. Supplier: ', supplier, '.') AS content
      FROM products

      UNION ALL

      SELECT
        ('supplier:' || supplier_id) AS document_id,
        ('Supplier: ' || supplier_name) AS title,
        CONCAT('Supplier: ', supplier_name, '. Contact: ', contact_person, '. Email: ', email, '. Phone: ', phone, '.') AS content
      FROM suppliers

      UNION ALL

      SELECT
        ('budget:' || budget_id) AS document_id,
        ('Budget: ' || budget_name) AS title,
        CONCAT('Budget: ', budget_name, '. Balance: ', budget_balance, '.') AS content
      FROM budgets
    ) AS all_documents
    ORDER BY document_id
  `

  return documents as DocumentRow[]
}


export async function countDocuments(): Promise<number> {

  const result = await sql`
    SELECT (
      (SELECT COUNT(*) FROM orders) +
      (SELECT COUNT(*) FROM products) +
      (SELECT COUNT(*) FROM suppliers) +
      (SELECT COUNT(*) FROM budgets)
    )::int AS count
  `

  return (result[0] as { count: number }).count
}