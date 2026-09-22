import { useEffect, useRef, useState } from 'react'
import './AskDocuments.css'
import { BASE_URL } from '../services/apiConfig'

// ============================================
// AskDocuments
//
// שלב 9 של התרגיל:
// להציג למשתמש Answer + Sources.
// ============================================

const API_URL = `${BASE_URL}/api/rag/ask`

type RagResponse = {
  answer: string
  fromGeneralKnowledge?: boolean
}

type ConversationItem = {
  question: string
  answer: string
  fromGeneralKnowledge?: boolean
}

type PanelPosition = {
  left: number
  top: number
}

function containsHebrew(text: string) {
  return /[\u0590-\u05FF]/.test(text)
}

function AskDocuments() {

  const [question, setQuestion] =
    useState('')

  const [conversation, setConversation] =
    useState<ConversationItem[]>([])

  const historyRef =
    useRef<HTMLDivElement>(null)

  const panelRef =
    useRef<HTMLElement>(null)

  const dragRef =
    useRef({
      pointerId: -1,
      offsetX: 0,
      offsetY: 0
    })

  const [panelPosition, setPanelPosition] =
    useState<PanelPosition | null>(null)

  const [isCollapsed, setIsCollapsed] =
    useState(true)

  const [loading, setLoading] =
    useState(false)

  useEffect(() => {
    const history = historyRef.current

    if (history) {
      history.scrollTop = history.scrollHeight
    }
  }, [conversation.length])

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    const panel = panelRef.current

    if (!panel) {
      return
    }

    const bounds = panel.getBoundingClientRect()

    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    setPanelPosition({
      left: bounds.left,
      top: bounds.top
    })
  }

  function handleDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId !== event.pointerId) {
      return
    }

    const panel = panelRef.current

    if (!panel) {
      return
    }

    const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth)
    const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight)

    setPanelPosition({
      left: Math.min(
        maxLeft,
        Math.max(0, event.clientX - dragRef.current.offsetX)
      ),
      top: Math.min(
        maxTop,
        Math.max(0, event.clientY - dragRef.current.offsetY)
      )
    })
  }

  function handleDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId !== event.pointerId) {
      return
    }

    dragRef.current.pointerId = -1
    event.currentTarget.releasePointerCapture(event.pointerId)
    event.currentTarget.classList.remove('is-dragging')
  }

  async function askQuestion() {

    const submittedQuestion = question.trim()

    if (!submittedQuestion) {
      return
    }

    try {

      setLoading(true)
      setQuestion('')

      const response =
        await fetch(API_URL, {

          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            question: submittedQuestion
          })
        })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error ?? 'Server error')
      }

      const data: RagResponse =
        await response.json()

      setConversation(current => [
        ...current,
        {
          question: submittedQuestion,
          answer: data.answer,
          fromGeneralKnowledge: data.fromGeneralKnowledge
        }
      ])

    } catch (error) {

      console.error(error)

      setConversation(current => [
        ...current,
        {
          question: submittedQuestion,
          answer: error instanceof Error
            ? error.message
            : 'Something went wrong'
        }
      ])

    } finally {

      setLoading(false)
    }
  }

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="ai-assistant-expand"
        onClick={() => setIsCollapsed(false)}
        aria-label="Open AI chat"
        title="Open AI chat"
      >
        <span aria-hidden="true">←</span> AI
      </button>
    )
  }

  return (
    <aside
      ref={panelRef}
      className="ai-assistant-panel"
      aria-label="Ask My Company assistant"
      style={panelPosition ?? undefined}
    >

      <div
        className="ai-assistant-header"
        onPointerDown={handleDragStart}
        onPointerMove={handleDrag}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <div>
          <h2>Ask AI</h2>

          <p>
            Ask about your orders, suppliers, budgets or products
          </p>
        </div>

        <div className="ai-assistant-header-actions">
          <button
            type="button"
            className="ai-assistant-clear"
            onPointerDown={event => event.stopPropagation()}
            onClick={() => setConversation([])}
            disabled={conversation.length === 0}
            aria-label="Clear chat history"
            title="Clear chat history"
          >
            Clear
          </button>

          <button
            type="button"
            className="ai-assistant-collapse"
            onPointerDown={event => event.stopPropagation()}
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse AI chat"
            title="Collapse AI chat"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="ai-assistant-body">
        <div
          ref={historyRef}
          className="ai-assistant-history"
          aria-live="polite"
        >
          {conversation.map((item, index) => (
            <div className="ai-assistant-conversation" key={`${item.question}-${index}`}>
              <div className="ai-assistant-question">
                <h3>Question</h3>
                <p>{item.question}</p>
              </div>

              <div
                className="ai-assistant-answer"
                dir={containsHebrew(item.answer) ? 'rtl' : 'ltr'}
              >
                <h3>Answer</h3>
                <p>{item.answer}</p>

                {item.fromGeneralKnowledge && (
                  <span className="ai-assistant-general-note">
                    Based on general knowledge, not internal documents
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="ai-assistant-composer">
          <textarea
            value={question}
            onChange={
              event =>
                setQuestion(event.target.value)
            }
            placeholder="Ask a question..."
            rows={4}
          />

          <button
            type="button"
            className="ai-assistant-submit"
            onClick={askQuestion}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Ask'}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default AskDocuments