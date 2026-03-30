import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const emptyStringToNull = z.string().transform(val => val.trim() === '' ? null : val).nullable();

const settingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyTagline: z.string().optional(),
  companyLogo: emptyStringToNull.optional(),
  companyAddress: emptyStringToNull.optional(),
  companyPhone: emptyStringToNull.optional(),
  companyEmail: z.string().email().or(z.literal('')).transform(val => val === '' ? null : val).nullable().optional(),
  companyWebsite: z.string().url().or(z.literal('')).transform(val => val === '' ? null : val).nullable().optional(),
  defaultReportTheme: z.enum(['blue', 'green', 'orange', 'purple', 'red']).optional(),
  reportFooterText: z.string().optional(),
  dateFormat: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create settings (singleton pattern)
    let settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {},
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error({ error }, 'Error fetching settings');
    return NextResponse.json({ 
      error: 'Failed to fetch settings', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC permission for managing settings
    const { checkPermission } = await import('@/lib/permission-checker');
    const canManage = await checkPermission('settings.edit');
    
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden - You do not have permission to update settings' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn({ details: parsed.error.format() }, 'Settings validation failed');
      return NextResponse.json({
        error: 'Invalid input',
        details: parsed.error.format()
      }, { status: 400 });
    }

    // Get or create settings
    let settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: parsed.data,
      });
    } else {
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: parsed.data,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error({ error }, 'Error updating settings');
    return NextResponse.json({ 
      error: 'Failed to update settings', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
