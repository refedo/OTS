import { NextResponse } from 'next/server';

export async function GET() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json({ error: 'Push notifications not configured' }, { status: 503 });
  }

  return NextResponse.json({ publicKey: vapidPublicKey });
}
