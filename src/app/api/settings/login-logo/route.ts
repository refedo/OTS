import { NextResponse } from 'next/server';

// GET - Return null for login logo (feature disabled due to schema limitations)
// SystemSettings model doesn't support key-value storage
export async function GET() {
  return NextResponse.json({ logoUrl: null });
}
