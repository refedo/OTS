import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Upload company logo for reports
 * POST /api/reports/upload-logo
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        { status: 'error', error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { status: 'error', error: 'Invalid file type. Only PNG, JPG, and SVG are allowed.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'reports');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = 'company-logo' + path.extname(file.name);
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    return NextResponse.json({
      status: 'success',
      message: 'Logo uploaded successfully',
      path: `/uploads/reports/${filename}`,
      filename,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

/**
 * Get current logo
 * GET /api/reports/upload-logo
 */
export async function GET() {
  try {
    const logoPath = '/uploads/reports/company-logo.png';
    return NextResponse.json({
      status: 'success',
      path: logoPath,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'No logo found' },
      { status: 404 }
    );
  }
}
