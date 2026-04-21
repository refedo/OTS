/**
 * POST /api/hr/letters/translate
 * Translates HR letter content between Arabic and English using Claude.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { anthropic } from '@/lib/agents/anthropic-client';

const schema = z.object({
  content: z.string().min(1).max(50000),
  sourceLang: z.enum(['ARABIC', 'ENGLISH']),
});

export const POST = withApiContext(async (req: NextRequest) => {
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { content, sourceLang } = parsed.data;
  const targetLang = sourceLang === 'ARABIC' ? 'English' : 'Arabic';
  const sourceLangLabel = sourceLang === 'ARABIC' ? 'Arabic' : 'English';

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `You are a professional HR document translator specializing in formal business correspondence.

Translate the following HR letter content from ${sourceLangLabel} to ${targetLang}.

Rules:
- Keep the formal, professional HR tone
- Preserve paragraph structure and line breaks exactly
- Do not add any explanations, notes, or headers — return only the translated text
- If the text contains employee names, letter numbers, or dates, keep them as-is

Text to translate:
${content}`,
        },
      ],
    });

    const translated = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    return NextResponse.json({ translated });
  } catch (error) {
    logger.error({ error }, '[Letters] Translation failed');
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
});
