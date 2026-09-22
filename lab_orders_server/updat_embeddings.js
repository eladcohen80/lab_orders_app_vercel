const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
require('dotenv').config();

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_COLUMN = 'embedding_dimensions';
const EMBEDDING_DIMENSIONS = 768;

const TABLES = [
  {
    name: 'budgets',
    id: 'budget_id',
    columns: 'budget_id, budget_name, budget_balance',
    text: (row) => `תקציב: ${row.budget_name}. יתרה: ${row.budget_balance}.`,
  },
  {
    name: 'products',
    id: 'product_id',
    columns: 'product_id, product_name,  cat_number, supplier, price_in_last_order',
    text: (row) => `מוצר: ${row.product_name}. תיאור: ${row.description || ''}. מק"ט: ${row.cat_number || ''}. ספק: ${row.supplier || ''}.`,
  },
  {
    name: 'suppliers',
    id: 'supplier_id',
    columns: 'supplier_id, supplier_name, contact_person, email, phone',
    text: (row) => `ספק: ${row.supplier_name}. איש קשר: ${row.contact_person || ''}. אימייל: ${row.email || ''}. טלפון: ${row.phone || ''}.`,
  },
  {
    name: 'users',
    id: 'user_id',
    columns: 'user_id, user_name, email, role',
    text: (row) => `משתמש: ${row.user_name}. אימייל: ${row.email || ''}. תפקיד: ${row.role || ''}.`,
  },
  {
    name: 'orders',
    id: 'order_id',
    columns: 'order_id, order_date, description, cat_number, quote_number, po_number, supplier, budget, amount, price, currency, total_price_nis, status, comments',
    text: (row) => `הזמנה מתאריך: ${row.order_date}. תיאור: ${row.description || ''}. מק"ט: ${row.cat_number || ''}. מספר הצעת מחיר: ${row.quote_number || ''}. מספר PO: ${row.po_number || ''}. ספק: ${row.supplier || ''}. תקציב: ${row.budget || ''}. כמות: ${row.amount ?? ''}. מחיר יחידה: ${row.price ?? ''} ${row.currency || ''}. סך הכל בש"ח: ${row.total_price_nis ?? ''}. סטטוס: ${row.status || ''}. הערות: ${row.comments || ''}.`,
  },
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function validateEmbeddingColumns() {
  for (const table of TABLES) {
    const result = await pool.query(`
      SELECT data_type, udt_name, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    `, [table.name, EMBEDDING_COLUMN]);

    if (result.rows.length === 0) {
      throw new Error(`בטבלה ${table.name} לא קיימת עמודה ${EMBEDDING_COLUMN}.`);
    }

    const column = result.rows[0];
    if (column.udt_name !== 'vector') {
      throw new Error(`העמודה ${table.name}.${EMBEDDING_COLUMN} אינה מסוג vector (נמצא: ${column.udt_name}).`);
    }
  }
}

async function createEmbedding(model, text) {
  const response = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  });
  const values = response?.embedding?.values;

  if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Gemini החזיר וקטור לא תקין (נמצאו ${values?.length || 0} ממדים).`);
  }

  return `[${values.join(',')}]`;
}

async function updateTable(model, table) {
  const tableIdentifier = quoteIdentifier(table.name);
  const idIdentifier = quoteIdentifier(table.id);
  const embeddingIdentifier = quoteIdentifier(EMBEDDING_COLUMN);
  const result = await pool.query(`
    SELECT ${table.columns}
    FROM ${tableIdentifier}
    WHERE ${embeddingIdentifier} IS NULL
  `);

  console.log(`📂 ${table.name}: נמצאו ${result.rows.length} שורות לעדכון.`);
  let updated = 0;

  for (const row of result.rows) {
    const text = table.text(row);
    if (!text.trim()) {
      continue;
    }

    try {
      console.log(`   מייצר embedding עבור ${table.name} ID ${row[table.id]}...`);
      const vector = await createEmbedding(model, text);
      await pool.query(`
        UPDATE ${tableIdentifier}
        SET ${embeddingIdentifier} = $1::vector
        WHERE ${idIdentifier} = $2
      `, [vector, row[table.id]]);
      updated += 1;
      console.log('      ✅ עודכן בהצלחה.');
    } catch (error) {
      throw new Error(`שגיאה בשורה ${row[table.id]} בטבלה ${table.name}: ${error.message}`);
    }
  }

  return updated;
}

async function migrateAllTables() {
  console.log('=== מתחיל תהליך עדכון Embeddings ===');

  if (!process.env.DATABASE_URL || !process.env.GEMINI_API_KEY) {
    throw new Error('DATABASE_URL או GEMINI_API_KEY חסרים בקובץ .env.');
  }

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ החיבור ל-Neon הצליח.');
    await validateEmbeddingColumns();
    console.log(`✅ כל הטבלאות מכילות ${EMBEDDING_COLUMN} מסוג vector(${EMBEDDING_DIMENSIONS}).`);

    const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
    let totalUpdated = 0;
    for (const table of TABLES) {
      totalUpdated += await updateTable(model, table);
    }

    console.log(`✨ הסתיים בהצלחה. עודכנו ${totalUpdated} שורות.`);
  } finally {
    await pool.end();
    console.log('=== החיבור ל-DB נסגר ===');
  }
}

migrateAllTables().catch((error) => {
  console.error(`❌ התהליך נכשל: ${error.message}`);
  process.exitCode = 1;
});
