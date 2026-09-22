import dotenv from 'dotenv'

import { sql } from '../db'

dotenv.config()

/**
 * One-time script: imports all products that appear in the orders table
 * into the products table, without creating duplicates.
 *
 * Deduplication logic (matches addProductIfMissing in orderController):
 * - If the order has a catalog number -> a product is a duplicate when
 *   (cat_number, supplier) already exists in products.
 * - If there is no catalog number -> a product is a duplicate when
 *   (product_name, supplier) already exists in products.
 * - DISTINCT prevents duplicates between the orders themselves.
 */
async function importProductsFromOrders() {
  const inserted = await sql`
    WITH latest_orders AS (
      SELECT DISTINCT ON (
        TRIM(COALESCE(o.cat_number, '')),
        TRIM(COALESCE(o.description, '')),
        TRIM(COALESCE(o.supplier, ''))
      )
        TRIM(COALESCE(o.description, '')) AS product_name,
        TRIM(COALESCE(o.cat_number, '')) AS cat_number,
        TRIM(COALESCE(o.supplier, '')) AS supplier,
        o.price,
        o.currency
      FROM orders o
      ORDER BY
        TRIM(COALESCE(o.cat_number, '')),
        TRIM(COALESCE(o.description, '')),
        TRIM(COALESCE(o.supplier, '')),
        o.order_date DESC NULLS LAST,
        o.order_id DESC
    )
    INSERT INTO products (product_name, cat_number, supplier, price_in_last_order)
    SELECT
      lo.product_name,
      lo.cat_number,
      lo.supplier,
      TRIM(CONCAT(COALESCE(lo.price::text, ''), ' ', COALESCE(lo.currency, '')))
    FROM latest_orders lo
    WHERE (
      lo.product_name <> ''
      OR lo.cat_number <> ''
    )
    AND NOT EXISTS (
      SELECT 1 FROM products p
      WHERE (
        lo.cat_number <> ''
        AND p.cat_number = lo.cat_number
        AND p.supplier = lo.supplier
      ) OR (
        lo.cat_number = ''
        AND p.product_name = lo.product_name
        AND p.supplier = lo.supplier
      )
    )
    RETURNING *
  `

  console.log(`Imported ${inserted.length} products from orders.`)
  for (const product of inserted) {
    console.log(` + ${product.product_name} (${product.cat_number || 'no cat number'}) - ${product.supplier} - last price: ${product.price_in_last_order || '-'}`)
  }

  // Update price_in_last_order and currency for products that already exist,
  // based on each product's most recent order.
  const updated = await sql`
    WITH latest_orders AS (
      SELECT DISTINCT ON (
        TRIM(COALESCE(o.cat_number, '')),
        TRIM(COALESCE(o.description, '')),
        TRIM(COALESCE(o.supplier, ''))
      )
        TRIM(COALESCE(o.description, '')) AS product_name,
        TRIM(COALESCE(o.cat_number, '')) AS cat_number,
        TRIM(COALESCE(o.supplier, '')) AS supplier,
        o.price,
        o.currency
      FROM orders o
      ORDER BY
        TRIM(COALESCE(o.cat_number, '')),
        TRIM(COALESCE(o.description, '')),
        TRIM(COALESCE(o.supplier, '')),
        o.order_date DESC NULLS LAST,
        o.order_id DESC
    )
    UPDATE products p
    SET price_in_last_order = TRIM(CONCAT(COALESCE(lo.price::text, ''), ' ', COALESCE(lo.currency, '')))
    FROM latest_orders lo
    WHERE (
      lo.cat_number <> ''
      AND p.cat_number = lo.cat_number
      AND p.supplier = lo.supplier
    ) OR (
      lo.cat_number = ''
      AND p.product_name = lo.product_name
      AND p.supplier = lo.supplier
    )
    RETURNING p.product_id
  `

  console.log(`Updated last order price for ${updated.length} existing products.`)
}

importProductsFromOrders().catch(error => {
  console.error('Failed to import products from orders:', error)
  process.exitCode = 1
})
