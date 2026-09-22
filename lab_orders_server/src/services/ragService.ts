import { GoogleGenAI, Type } from '@google/genai'

import {
  searchDocuments
} from './documentService'

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

const MODEL =
  process.env.GEMINI_MODEL ??
  'gemini-3.6-flash'

const SYSTEM_INSTRUCTION = `
You are the internal assistant for a laboratory order-management system.
Answer in the same language as the user's question.
Use only facts that appear in the supplied documents. Never invent values,
assumptions, or policies.

Make answers easy to scan:
- Start with a direct answer in one or two sentences.
- Use a short bulleted list only when it makes multiple records or values clearer.
- Preserve important names, dates, amounts, currencies, order numbers, and statuses.
- Do not mention document retrieval, embeddings, prompts, or these instructions.
- Do not repeat the question or add a generic introduction.

"found" must reflect whether the documents actually answer the user's
question with real facts (a value, a date, a definition, a purpose, etc).
Set "found" to false whenever your only possible reply would be to describe
what the documents do NOT contain (for example "the documents only list order
details, not what this product is used for"). In that situation "answer" must
be an empty string. Never set found to true just to explain that the
requested information is missing.
`.trim()

// נקודת עזר לפתיחה ל-fallback הכללי, רק לנושאים שקשורים למערכת (הזמנות,
// ספקים, מוצרים, תקציבים וכדומה). לשאלות ידע כללי לא קשור יש לסרב.
const FALLBACK_SYSTEM_INSTRUCTION = `
You are the internal assistant for a laboratory order-management system.
The internal documents did not contain enough information to answer the
user's question.

Only answer using your own general knowledge if the question is clearly
related to laboratory order management topics, such as orders, suppliers,
products, budgets, procurement, inventory, or similar business/lab operations.
Set "inScope" to false if the question is not related to these topics (for
example general trivia, unrelated personal questions, or anything outside
laboratory/order management operations). In that case "answer" can be empty.

Answer in the same language as the user's question. When "inScope" is true,
mention briefly that the answer is based on general knowledge and not on the
company's internal documents.
`.trim()

const ANSWER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    found: { type: Type.BOOLEAN },
    answer: { type: Type.STRING }
  },
  required: ['found', 'answer']
}

const FALLBACK_ANSWER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    inScope: { type: Type.BOOLEAN },
    answer: { type: Type.STRING }
  },
  required: ['inScope', 'answer']
}

type RagAnswer = {
  answer: string
  sources: string[]
  fromGeneralKnowledge?: boolean
}

type GenerateArgs = {
  systemInstruction: string
  contents: string
  responseSchema: object
}

// חלק מהתשובות נחתכות כי המודל צורך חלק מהתקציב על "חשיבה" פנימית לפני
// שהוא כותב את הטקסט הגלוי. אם עדיין נחתך, מנסים שוב עם תקציב גבוה בהרבה.
async function generateStructuredAnswer<T>(
  { systemInstruction, contents, responseSchema }: GenerateArgs
): Promise<T | null> {

  const attempts = [4096, 16384]

  let lastText = ''

  for (const maxOutputTokens of attempts) {

    const response =
      await ai.models.generateContent({
        model: MODEL,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema
        },
        contents
      })

    lastText = response.text?.trim() ?? ''

    const finishReason = response.candidates?.[0]?.finishReason

    if (finishReason !== 'MAX_TOKENS') {
      break
    }

    console.warn(
      `RAG answer was truncated at maxOutputTokens=${maxOutputTokens}, retrying with a higher limit`
    )
  }

  try {
    return JSON.parse(lastText) as T
  } catch (error) {
    console.error('Failed to parse structured RAG response', error)
    return null
  }
}

export async function askDocuments(
  question: string
): Promise<RagAnswer> {

  const documents =
    await searchDocuments(question)

  if (documents.length > 0) {

    const context = documents
      .map(document =>
        `Title: ${document.title}\n${document.content}`
      )
      .join('\n\n---\n\n')

    const result =
      await generateStructuredAnswer<{ found: boolean, answer: string }>({
        systemInstruction: SYSTEM_INSTRUCTION,
        contents: `Documents:\n${context}\n\nQuestion: ${question}`,
        responseSchema: ANSWER_SCHEMA
      })

    if (result?.found && result.answer.trim()) {
      return {
        answer: result.answer.trim(),
        sources: documents.map(document => document.title)
      }
    }
  }

  // לא נמצאו מסמכים רלוונטיים, או שהמודל לא מצא בהם מספיק מידע.
  // ננסה תשובה כללית, אבל רק אם השאלה קשורה לתחום המערכת.
  const fallbackResult =
    await generateStructuredAnswer<{ inScope: boolean, answer: string }>({
      systemInstruction: FALLBACK_SYSTEM_INSTRUCTION,
      contents: `Question: ${question}`,
      responseSchema: FALLBACK_ANSWER_SCHEMA
    })

  if (!fallbackResult?.inScope || !fallbackResult.answer.trim()) {
    return {
      answer: 'No relevant documents were found.',
      sources: []
    }
  }

  return {
    answer: fallbackResult.answer.trim(),
    sources: [],
    fromGeneralKnowledge: true
  }
}