import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSystemSettings() {
  console.log('🔧 Seeding system settings...');

  // Check if settings already exist
  const existingSettings = await prisma.systemSettings.findFirst();

  if (existingSettings) {
    console.log('✅ System settings already exist');
    return;
  }

  // Create default settings
  await prisma.systemSettings.create({
    data: {
      companyName: 'HEXA STEEL',
      companyTagline: 'THRIVE DIFFERENT',
      companyLogo: null,
      companyAddress: null,
      companyPhone: null,
      companyEmail: null,
      companyWebsite: null,
      defaultReportTheme: 'blue',
      reportFooterText: 'HEXA STEEL - Professional Report',
      dateFormat: 'DD-MM-YYYY',
      timezone: 'UTC+03:00',
      currency: 'SAR',
      emailNotifications: true,
      smsNotifications: false,
    },
  });

  console.log('✅ System settings seeded successfully');
}

// Run if executed directly
seedSystemSettings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
