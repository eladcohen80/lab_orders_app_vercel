import { sql } from '../db'

import { createEmbedding, toVectorString } from './embeddingService'

// ============================================
// ragSyncService
//
// מחשב Embedding עבור רשומה בודדת ושומר אותו
// בעמודת embedding_dimensions של אותה טבלה.
//
// נקרא מהקונטרולרים בכל create / update.
// כשל בסנכרון לא מפיל את הפעולה העסקית עצמה.
// ============================================

const embedText = async (text: string): Promise<string> => {
  const embedding = await createEmbedding(text)
  return toVectorString(embedding)
}

const syncSafely = async (syncAction: () => Promise<unknown>) => {
  try {
    await syncAction()
  } catch (error) {
    // חישוב ה-Embedding הוא Side Effect — לא מפילים את הבקשה המקורית.
    console.error('Failed to compute embedding:', error)
  }
}

export async function syncOrderDocument(orderId: number): Promise<void> {
  await syncSafely(async () => {
    const orders = await sql`SELECT * FROM orders WHERE order_id = ${orderId}`

    if (orders.length === 0) {
      return
    }

    const order = orders[0]
    const content = `Order date: ${order.order_date}. Description: ${order.description}. Catalog number: ${order.cat_number}. Quote number: ${order.quote_number}. PO number: ${order.po_number}. Supplier: ${order.supplier}. Budget: ${order.budget}. Quantity: ${order.amount}. Unit price: ${order.price} ${order.currency}. Total NIS: ${order.total_price_nis}. Status: ${order.status}. Comments: ${order.comments}.`
    const vector = await embedText(content)

    await sql`UPDATE orders SET embedding_dimensions = ${vector}::vector WHERE order_id = ${orderId}`
  })
}

export async function syncProductDocument(productId: number): Promise<void> {
  await syncSafely(async () => {
    const products = await sql`SELECT * FROM products WHERE product_id = ${productId}`

    if (products.length === 0) {
      return
    }

    const product = products[0]
    const content = `Product: ${product.product_name}. Catalog number: ${product.cat_number}. Supplier: ${product.supplier}.`
    const vector = await embedText(content)

    await sql`UPDATE products SET embedding_dimensions = ${vector}::vector WHERE product_id = ${productId}`
  })
}

export async function syncProductDocumentByKey(productName: string, catNumber: string, supplier: string): Promise<void> {
  await syncSafely(async () => {
    const trimmedCatNumber = catNumber?.trim() || ''
    const name = productName?.trim() || ''
    const supplierName = supplier?.trim() || ''

    const products = trimmedCatNumber
      ? await sql`SELECT * FROM products WHERE cat_number = ${trimmedCatNumber} AND supplier = ${supplierName}`
      : await sql`SELECT * FROM products WHERE product_name = ${name} AND supplier = ${supplierName}`

    for (const product of products) {
      const content = `Product: ${product.product_name}. Catalog number: ${product.cat_number}. Supplier: ${product.supplier}.`
      const vector = await embedText(content)

      await sql`UPDATE products SET embedding_dimensions = ${vector}::vector WHERE product_id = ${product.product_id}`
    }
  })
}

export async function syncSupplierDocument(supplierId: number): Promise<void> {
  await syncSafely(async () => {
    const suppliers = await sql`SELECT * FROM suppliers WHERE supplier_id = ${supplierId}`

    if (suppliers.length === 0) {
      return
    }

    const supplier = suppliers[0]
    const content = `Supplier: ${supplier.supplier_name}. Contact: ${supplier.contact_person}. Email: ${supplier.email}. Phone: ${supplier.phone}.`
    const vector = await embedText(content)

    await sql`UPDATE suppliers SET embedding_dimensions = ${vector}::vector WHERE supplier_id = ${supplierId}`
  })
}

export async function syncBudgetDocument(budgetId: number): Promise<void> {
  await syncSafely(async () => {
    const budgets = await sql`SELECT * FROM budgets WHERE budget_id = ${budgetId}`

    if (budgets.length === 0) {
      return
    }

    const budget = budgets[0]
    const content = `Budget: ${budget.budget_name}. Balance: ${budget.budget_balance}.`
    const vector = await embedText(content)

    await sql`UPDATE budgets SET embedding_dimensions = ${vector}::vector WHERE budget_id = ${budgetId}`
  })
}

// העמודות הן per-table — אין צורך במחיקה מטבלת documents.
export async function deleteDocumentBySourceKey(_sourceKey: string): Promise<void> {
  // no-op
}
