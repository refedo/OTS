import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes feature descriptions and identifies the expected business value. Focus on tangible benefits like efficiency gains, cost savings, improved quality, better user experience, or risk reduction. Keep it concise (2-3 sentences).',
        },
        {
          role: 'user',
          content: `Analyze this feature and describe its expected business value:\n\n${description}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const value = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ value });
  } catch (error) {
    console.error('Error generating expected value:', error);
    return NextResponse.json(
      { error: 'Failed to generate expected value' },
      { status: 500 }
    );
  }
}
