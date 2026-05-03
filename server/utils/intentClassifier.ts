/**
 * Gemini-powered intent classifier.
 *
 * Used by the events worker for FREE-TEXT signals (contact-form messages,
 * inquiry messages, chatbot transcripts) — anything where rule-based
 * keyword matching gives a thin or wrong signal.
 *
 * Behaviour:
 *   • Returns null when GEMINI_API_KEY is missing (caller falls back
 *     to the rule-based classifier in `eventsWorker.ts`).
 *   • Cached in Redis for 24h keyed on a SHA-256 of the input text so
 *     the same boilerplate ("Hi, I'm interested in this property") never
 *     burns a Gemini call twice.
 *   • Fails open: any error returns null and the caller continues with
 *     rule-based intent.
 *
 * Cost guard:
 *   • Only called when text is at least MIN_TEXT_LENGTH chars and the
 *     rule-based pass returned null/`other`.
 *
 * Per the user's directive: USE GEMINI, NOT HUGGING FACE.
 */
import crypto from 'crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getCached, setCache } from './redis'

export type Intent = 'buyer' | 'seller' | 'renter' | 'investor' | 'researcher' | 'other'

const VALID_INTENTS: Intent[] = ['buyer', 'seller', 'renter', 'investor', 'researcher', 'other']
const MIN_TEXT_LENGTH = 30
const CACHE_TTL_SECONDS = 60 * 60 * 24 // 24h

let gemini: GoogleGenerativeAI | null = null
function getClient(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  if (!gemini) gemini = new GoogleGenerativeAI(key)
  return gemini
}

function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16)
}

const PROMPT = `You classify the buying intent of a real-estate website visitor based on a short message.

Return EXACTLY one of these labels (lowercase, no punctuation, no explanation):
buyer | seller | renter | investor | researcher | other

Definitions:
- buyer: looking to purchase a home to live in
- seller: wants to list / sell their home OR get a home value estimate
- renter: looking for a rental
- investor: looking for cash-flow / ROI / cap-rate properties
- researcher: just gathering information, students, journalists, no transactional intent
- other: cannot be classified

Message:
"""
{text}
"""

Label:`

/**
 * Classify a free-text message. Returns null when the API key is missing,
 * the text is too short to be useful, or any error occurs.
 */
export async function classifyIntent(text: string): Promise<Intent | null> {
  if (!text || text.trim().length < MIN_TEXT_LENGTH) return null
  const client = getClient()
  if (!client) return null

  const cacheKey = `intent:${hash(text.trim().toLowerCase())}`
  const cached = await getCached<Intent>(cacheKey)
  if (cached && VALID_INTENTS.includes(cached)) return cached

  try {
    const model = client.getGenerativeModel({ model: 'gemini-pro' })
    const result = await model.generateContent(PROMPT.replace('{text}', text.slice(0, 2000)))
    const raw = result.response.text().trim().toLowerCase().replace(/[^a-z]/g, '')
    const intent = (VALID_INTENTS as readonly string[]).includes(raw) ? (raw as Intent) : 'other'
    await setCache(cacheKey, intent, CACHE_TTL_SECONDS)
    return intent
  } catch (err) {
    console.warn('[intentClassifier] Gemini call failed, falling back to null', err)
    return null
  }
}
