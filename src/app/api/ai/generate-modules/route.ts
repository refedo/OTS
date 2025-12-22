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
          content: 'You are a helpful assistant that analyzes feature descriptions and identifies which system modules will be affected. Available modules include: Production, QC, Design, Planning, Reporting, System, Tasks, Projects, Engineering, Business Planning, Operations, Documents, Users, Settings. Return ONLY a comma-separated list of module names, nothing else.',
        },
        {
          role: 'user',
          content: `Which modules will be affected by this feature?\n\n${description}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 50,
    });

    const modules = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ modules });
  } catch (error) {
    console.error('Error generating affected modules:', error);
    return NextResponse.json(
      { error: 'Failed to generate affected modules' },
      { status: 500 }
    );
  }
}
