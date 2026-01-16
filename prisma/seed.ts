import prisma from '../src/lib/db';
import { hashPassword } from '../src/lib/password';

async function main() {
  // Roles - CEO is superadmin, higher than Admin
  const roles = ['CEO', 'Admin', 'Manager', 'Engineer', 'Operator'];
  const roleRecords = await Promise.all(
    roles.map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // Departments (sample)
  const depA = await prisma.department.upsert({
    where: { name: 'Production' },
    update: {},
    create: { name: 'Production' }
  });
  const depB = await prisma.department.upsert({
    where: { name: 'Design' },
    update: {},
    create: { name: 'Design' }
  });
  
  // Admin user
  const adminRole = roleRecords.find((r) => r.name === 'Admin')!;
  const adminEmail = 'admin@hexa.local';
  const adminPwd = await hashPassword('Admin@12345');
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'System Admin',
      email: adminEmail,
      password: adminPwd,
      status: 'active',
      roleId: adminRole.id,
      departmentId: depA.id
    }
  });

  // Create a sample client
  const client = await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'ABC Construction',
      email: 'contact@abcconstruction.com',
      phone: '+1234567890',
      address: '123 Main Street, Industrial Zone',
      country: 'Saudi Arabia',
    }
  });

  // Project 277
  const project277 = await prisma.project.upsert({
    where: { projectNumber: '277' },
    update: {},
    create: {
      projectNumber: '277',
      name: 'Industrial Complex 277',
      clientId: client.id,
      projectManagerId: admin.id,
      status: 'In Progress',
      plannedStartDate: new Date('2024-01-15'),
      plannedEndDate: new Date('2025-12-31'),
      scopeOfWork: 'Large scale industrial facility construction',
      galvanized: false,
    }
  });

  // Buildings for Project 277
  await prisma.building.createMany({
    data: [
      {
        projectId: project277.id,
        designation: 'EXT',
        name: 'External Structure',
        description: 'Main external framework',
      },
      {
        projectId: project277.id,
        designation: 'INT',
        name: 'Internal Structure',
        description: 'Interior support structures',
      },
      {
        projectId: project277.id,
        designation: 'WH',
        name: 'Warehouse',
        description: 'Storage facility building',
      },
      {
        projectId: project277.id,
        designation: 'ADM',
        name: 'Administration Building',
        description: 'Office and administrative spaces',
      },
    ],
    skipDuplicates: true,
  });

  // Project 257
  const project257 = await prisma.project.upsert({
    where: { projectNumber: '257' },
    update: {},
    create: {
      projectNumber: '257',
      name: 'Commercial Tower 257',
      clientId: client.id,
      projectManagerId: admin.id,
      status: 'In Progress',
      plannedStartDate: new Date('2024-03-01'),
      plannedEndDate: new Date('2026-06-30'),
      scopeOfWork: 'High-rise commercial building project',
      galvanized: true,
    }
  });

  // Buildings for Project 257
  await prisma.building.createMany({
    data: [
      {
        projectId: project257.id,
        designation: 'MAIN',
        name: 'Main Tower',
        description: 'Primary tower structure',
      },
      {
        projectId: project257.id,
        designation: 'PODIUM',
        name: 'Podium Level',
        description: 'Ground level commercial podium',
      },
      {
        projectId: project257.id,
        designation: 'PARK',
        name: 'Parking Structure',
        description: 'Multi-level parking facility',
      },
    ],
    skipDuplicates: true,
  });

  // Project 274
  const project274 = await prisma.project.upsert({
    where: { projectNumber: '274' },
    update: {},
    create: {
      projectNumber: '274',
      name: 'Manufacturing Plant 274',
      clientId: client.id,
      projectManagerId: admin.id,
      status: 'Planning',
      plannedStartDate: new Date('2024-06-01'),
      plannedEndDate: new Date('2025-09-30'),
      scopeOfWork: 'Automotive parts manufacturing facility',
      galvanized: true,
    }
  });

  // Buildings for Project 274
  await prisma.building.createMany({
    data: [
      {
        projectId: project274.id,
        designation: 'FAB',
        name: 'Fabrication Hall',
        description: 'Main fabrication and assembly area',
      },
      {
        projectId: project274.id,
        designation: 'QC',
        name: 'Quality Control Building',
        description: 'Testing and quality assurance facility',
      },
      {
        projectId: project274.id,
        designation: 'UTIL',
        name: 'Utilities Building',
        description: 'Power and utilities infrastructure',
      },
      {
        projectId: project274.id,
        designation: 'SHIP',
        name: 'Shipping & Receiving',
        description: 'Logistics and distribution center',
      },
    ],
    skipDuplicates: true,
  });

  // Assign admin to all projects
  await prisma.projectAssignment.createMany({
    data: [
      { projectId: project277.id, userId: admin.id },
      { projectId: project257.id, userId: admin.id },
      { projectId: project274.id, userId: admin.id },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
