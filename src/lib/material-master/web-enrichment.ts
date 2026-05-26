import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface EnrichmentResult {
  dolibarr_id: number
  image_url: string | null
  tds_url: string | null
  technical_attrs_json: object | null
  manufacturer: string | null
}

export async function enrichConsumable(
  dolibarr_id: number,
  ref: string,
  label: string,
  aws_class: string | null,
  material_category: string
): Promise<EnrichmentResult> {
  const empty: EnrichmentResult = {
    dolibarr_id, image_url: null, tds_url: null,
    technical_attrs_json: null, manufacturer: null
  }

  if (!process.env.GEMINI_API_KEY) {
    logger.info({ dolibarr_id }, 'GEMINI_API_KEY not set — skipping web enrichment')
    return empty
  }

  const searchTerm = aws_class
    ? `${aws_class} welding electrode technical datasheet specifications`
    : `${label} technical datasheet specifications`

  const prompt = `Search for product information about: "${label}" (ref: ${ref})
${aws_class ? `AWS Classification: ${aws_class}` : ''}
Category: ${material_category}

Find:
1. A direct URL to the product image (from manufacturer or distributor site)
2. A direct URL to the technical data sheet (TDS) PDF
3. Key technical attributes: tensile strength, yield strength, elongation, current type, diameter, applicable standards

Return ONLY valid JSON (no markdown, no explanation):
{
  "image_url": "https://... or null",
  "tds_url": "https://... or null",
  "technical_attrs": {
    "tensile_strength_mpa": null,
    "yield_strength_mpa": null,
    "elongation_pct": null,
    "current_type": null,
    "standards": null,
    "notes": null
  },
  "manufacturer": "name or null"
}`

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ googleSearch: {} } as any],
    })

    const result = await model.generateContent([
      { text: `Search the web for: ${searchTerm}\n\n${prompt}` }
    ])

    const text = result.response.text()
    const clean = text.replace(/```json|```/g, '').trim()

    // Extract JSON from response
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return empty

    const parsed = JSON.parse(jsonMatch[0])
    return {
      dolibarr_id,
      image_url: parsed.image_url ?? null,
      tds_url: parsed.tds_url ?? null,
      technical_attrs_json: parsed.technical_attrs ?? null,
      manufacturer: parsed.manufacturer ?? null,
    }
  } catch (err) {
    logger.error({ err, dolibarr_id, ref }, 'Web enrichment failed — returning empty result')
    return empty
  }
}
