import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const DATA_FILE = path.join(process.cwd(), 'data', 'login-logo.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'login-logo');

async function getStoredLogoPath(): Promise<string | null> {
  if (!existsSync(DATA_FILE)) return null;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw).logoUrl || null;
  } catch {
    return null;
  }
}

async function saveStoredLogoPath(logoUrl: string | null) {
  const dir = path.dirname(DATA_FILE);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify({ logoUrl }), 'utf8');
}

async function requireAdmin() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  return session;
}

export async function GET() {
  return NextResponse.json({ logoUrl: await getStoredLogoPath() });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPEG, SVG, or WebP.' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = file.name.split('.').pop() || 'png';
    const filename = `login-logo.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const logoUrl = `/uploads/login-logo/${filename}`;
    await saveStoredLogoPath(logoUrl);

    logger.info({ logoUrl }, 'Login logo uploaded');
    return NextResponse.json({ logoUrl });
  } catch (error) {
    logger.error({ error }, 'Failed to upload login logo');
    return NextResponse.json({ error: 'Failed to upload login logo' }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const current = await getStoredLogoPath();
    if (current) {
      const filePath = path.join(process.cwd(), 'public', current);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }
    await saveStoredLogoPath(null);
    logger.info('Login logo removed');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete login logo');
    return NextResponse.json({ error: 'Failed to delete login logo' }, { status: 500 });
  }
}
