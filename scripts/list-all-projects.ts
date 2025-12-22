import prisma from '../src/lib/db';

async function listAllProjects() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        name: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            tasks: true,
            buildings: true,
            assignments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n' + '='.repeat(80));
    console.log('📋 ALL PROJECTS IN DATABASE');
    console.log('='.repeat(80) + '\n');

    if (projects.length === 0) {
      console.log('No projects found in database.\n');
    } else {
      console.log(`Total projects: ${projects.length}\n`);
      
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name || 'Unnamed Project'}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Number: ${project.projectNumber || 'N/A'}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Created: ${project.createdAt.toLocaleDateString()}`);
        console.log(`   Related: ${project._count.tasks} tasks, ${project._count.buildings} buildings, ${project._count.assignments} assignments`);
        console.log('');
      });
    }

    console.log('='.repeat(80) + '\n');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error listing projects:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

listAllProjects();
