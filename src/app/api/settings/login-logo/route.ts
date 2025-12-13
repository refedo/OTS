import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET - Fetch login logo URL (public, no auth required for login page)
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'login_logo' },
    });

    return NextResponse.json({
      logoUrl: setting?.value || null,
    });
  } catch (error) {
    console.error('Error fetching login logo:', error);
    return NextResponse.json({ logoUrl: null });
  }
}

// POST - Upload new login logo (requires admin)
export async function POST(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPG, SVG, WebP' }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'login-logo');
    await mkdir(uploadDir, { recursive: true });

    // Generate filename with timestamp
    const ext = file.name.split('.').pop();
    const filename = `login-logo-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Save URL to database
    const logoUrl = `/uploads/login-logo/${filename}`;
    await prisma.systemSetting.upsert({
      where: { key: 'login_logo' },
      update: { value: logoUrl },
      create: { key: 'login_logo', value: logoUrl },
    });

    return NextResponse.json({
      success: true,
      logoUrl,
    });
  } catch (error) {
    console.error('Error uploading login logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove login logo (requires admin)
export async function DELETE() {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.systemSetting.delete({
      where: { key: 'login_logo' },
    }).catch(() => {
      // Ignore if setting doesn't exist
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting login logo:', error);
    return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
  }
}
