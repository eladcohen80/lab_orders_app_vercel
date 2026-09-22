import express from 'express'

import {
  ask,
  search,
  list
} from '../controllers/ragController'

const router = express.Router()

// POST /api/rag/ask      - השאלה המלאה, RAG מלא
router.post('/ask', ask)

// POST /api/rag/search   - Vector Search בלבד, לבדיקה
router.post('/search', search)

// GET  /api/rag/documents - רשימת המסמכים שנשמרו
router.get('/documents', list)

export default router