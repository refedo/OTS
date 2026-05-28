import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { logger } from '@/lib/logger'

export interface AIClassificationInput {
  dolibarr_id: number
  ref: string
  label: string
}

export interface AIClassificationOutput {
  dolibarr_id: number
  item_class: string
  material_nature: string
  material_category: string
  grade: string | null
  profile_type: string | null
  profile_designation: string | null
  unit_of_measure: string
  aws_class: string | null
  fastener_thread: string | null
  fastener_grade: string | null
  manufacturer: string | null
  confidence: number
  notes: string | null
}

const SYSTEM_PROMPT = `You are a material classification expert for a structural steel fabrication company in Saudi Arabia.
Classify each product using ONLY these exact enum values.

item_class: RAW_MATERIAL | CONSUMABLE | SPARE_PART | SERVICE | TOOL | UNKNOWN
material_nature: CARBON_STEEL | STAINLESS_STEEL | ALUMINUM | GALVANIZED_STEEL | HARDWARE | WELDING_CONSUMABLE | CHEMICAL | PPE | GAS | ELECTRICAL | SERVICE | OTHER | UNKNOWN
material_category: SHEET | PLATE | CHECKERED_PLATE | PROFILE_H | PROFILE_I | PROFILE_C | PROFILE_ANGLE | FLAT_BAR | ROUND_BAR | SQUARE_BAR | PIPE_ROUND | PIPE_SQUARE | PIPE_RECTANGULAR | BOLT | NUT | WASHER | ANCHOR | STUD | WELDING_ELECTRODE | WELDING_WIRE_SOLID | WELDING_WIRE_FLUX | WELDING_FLUX_SAW | WELDING_PPE | WELDING_ACCESSORY | PAINT | PRIMER | THINNER | ABRASIVE | GAS_CYLINDER | SAFETY_PPE | ELECTRICAL | OTHER | UNKNOWN
unit_of_measure: KG | TON | M | LM | M2 | PC | SET | BOX | L | ROLL

Rules:
- Sheets and plates: unit_of_measure = KG (sold by weight, disbursed by m² or kg)
- Profiles/bars/pipes: unit_of_measure = KG
- Bolts/fasteners: unit_of_measure = PC
- Welding consumables (electrodes, wire): unit_of_measure = KG
- Gases: unit_of_measure = PC (cylinder)
- PPE/safety: unit_of_measure = PC
- confidence: 1.0 if certain, 0.75-0.95 if reasonably sure, below 0.75 if guessing

Respond ONLY with a valid JSON array. No markdown, no explanation. Format:
[{"dolibarr_id": N, "item_class": "...", "material_nature": "...", "material_category": "...", "grade": null, "profile_type": null, "profile_designation": null, "unit_of_measure": "...", "aws_class": null, "fastener_thread": null, "fastener_grade": null, "manufacturer": null, "confidence": 0.9, "notes": null}]`

// ── Provider priority ────────────────────────────────────────────────────────

function getProviderPriority(): string[] {
  const raw = process.env.AI_PROVIDER_PRIORITY ?? 'anthropic'
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

// ── Per-provider classify implementations ───────────────────────────────────

async function classifyWithAnthropic(userContent: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
  const client = new Anthropic({ apiKey })
  const model = process.env.AI_DEFAULT_MODEL_ANTHROPIC ?? 'claude-haiku-4-5-20251001'
  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: `Classify these products:\n${userContent}` }],
    system: SYSTEM_PROMPT,
  })
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('')
}

async function classifyWithGoogle(userContent: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set')
  const genAI = new GoogleGenerativeAI(apiKey)
  const modelName = process.env.AI_DEFAULT_MODEL_GOOGLE ?? 'gemini-2.0-flash'
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  })
  const result = await model.generateContent(`Classify these products:\n${userContent}`)
  return result.response.text()
}

async function classifyWithOpenAICompatible(
  userContent: string,
  provider: string
): Promise<string> {
  let apiKey: string | undefined
  let baseURL: string | undefined
  let model: string

  switch (provider) {
    case 'openai':
      apiKey = process.env.OPENAI_API_KEY
      model = process.env.AI_DEFAULT_MODEL_OPENAI ?? 'gpt-4o-mini'
      break
    case 'deepseek':
      apiKey = process.env.DEEPSEEK_API_KEY
      baseURL = 'https://api.deepseek.com/v1'
      model = process.env.AI_DEFAULT_MODEL_DEEPSEEK ?? 'deepseek-chat'
      break
    case 'groq':
      apiKey = process.env.GROQ_API_KEY
      baseURL = 'https://api.groq.com/openai/v1'
      model = process.env.AI_DEFAULT_MODEL_GROQ ?? 'llama-3.3-70b-versatile'
      break
    case 'qwen':
      apiKey = process.env.QWEN_API_KEY
      baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      model = process.env.AI_DEFAULT_MODEL_QWEN ?? 'qwen-plus'
      break
    default:
      throw new Error(`Unknown OpenAI-compatible provider: ${provider}`)
  }

  if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY not set or empty`)

  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  const response = await client.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Classify these products:\n${userContent}` },
    ],
  })
  return response.choices[0]?.message?.content ?? ''
}

// ── Main classify with fallback ──────────────────────────────────────────────

async function classifyWithFallback(userContent: string): Promise<string> {
  const providers = getProviderPriority()
  const errors: string[] = []

  for (const provider of providers) {
    try {
      let result: string
      if (provider === 'anthropic') {
        result = await classifyWithAnthropic(userContent)
      } else if (provider === 'google') {
        result = await classifyWithGoogle(userContent)
      } else {
        result = await classifyWithOpenAICompatible(userContent, provider)
      }
      logger.info({ provider }, 'AI classification succeeded')
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${provider}: ${msg}`)
      logger.warn({ provider, err: msg }, 'AI provider failed, trying next')
    }
  }

  throw new Error(`All AI providers failed: ${errors.join('; ')}`)
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function classifyBatch(
  products: AIClassificationInput[]
): Promise<AIClassificationOutput[]> {
  const userContent = products.map(p =>
    `{"id": ${p.dolibarr_id}, "ref": "${p.ref}", "label": "${p.label}"}`
  ).join('\n')

  const text = await classifyWithFallback(userContent)
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed: AIClassificationOutput[] = JSON.parse(clean)
  return parsed
}

export async function runAIBatchClassification(
  db: { query: (sql: string, params?: unknown[]) => Promise<unknown[][]> },
  batchSize = 80
): Promise<{ processed: number; errors: number }> {
  const [rows] = await db.query(
    `SELECT dolibarr_id, ref, label FROM dolibarr_products
     WHERE classified_by = 'UNCLASSIFIED' OR classified_by IS NULL
     ORDER BY dolibarr_id`
  ) as [AIClassificationInput[]]

  const unclassified = rows as unknown as AIClassificationInput[]

  let processed = 0, errors = 0

  for (let i = 0; i < unclassified.length; i += batchSize) {
    const batch = unclassified.slice(i, i + batchSize)
    try {
      const results = await classifyBatch(batch)
      for (const r of results) {
        await db.query(
          `UPDATE dolibarr_products SET
            item_class = ?, material_nature = ?, material_category = ?,
            grade = COALESCE(?, grade), profile_type = ?, profile_designation = ?,
            unit_of_measure = ?, aws_class = ?, fastener_thread = ?,
            fastener_grade = ?, manufacturer = ?,
            classified_by = 'AI_BATCH',
            classification_conf = ?,
            review_required = ?,
            enriched_at = NOW()
          WHERE dolibarr_id = ?`,
          [
            r.item_class, r.material_nature, r.material_category,
            r.grade, r.profile_type, r.profile_designation,
            r.unit_of_measure, r.aws_class, r.fastener_thread,
            r.fastener_grade, r.manufacturer,
            r.confidence,
            r.confidence < 0.75 ? 1 : 0,
            r.dolibarr_id
          ]
        )
        processed++
      }
      logger.info({ batch: Math.floor(i/batchSize)+1, classified: batch.length }, 'AI classification batch complete')
      if (i + batchSize < unclassified.length) {
        await new Promise(res => setTimeout(res, 500))
      }
    } catch (err) {
      logger.error({ err, batch: Math.floor(i/batchSize)+1 }, 'AI classification batch failed')
      errors++
    }
  }

  return { processed, errors }
}
