/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting clean database seed (Admin & Student roles)...');

  const commonPassword = await bcrypt.hash('Password123!', 12);

  // 1. Organization Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@organization.com' },
    update: {},
    create: {
      email: 'admin@organization.com',
      passwordHash: commonPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 2. Team Member (Student User)
  const student = await prisma.user.upsert({
    where: { email: 'student@organization.com' },
    update: {},
    create: {
      email: 'student@organization.com',
      passwordHash: commonPassword,
      firstName: 'Alex',
      lastName: 'Rivers',
      role: 'TEAM_MEMBER',
      memberType: 'STUDENT',
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log('✅ Accounts initialized:');
  console.log(`   Admin User:   admin@organization.com   / Password123!`);
  console.log(`   Student User: student@organization.com / Password123!`);

  // Initial Student Skill Matrix
  await prisma.memberSkill.upsert({
    where: { userId_skillName: { userId: student.id, skillName: 'Web & Mobile Development' } },
    update: {},
    create: { userId: student.id, skillName: 'Web & Mobile Development', proficiency: 'ADVANCED', notes: 'Primary developer' },
  });

  // Initial Real Project Created & Assigned by Admin
  const sampleProject = await prisma.project.upsert({
    where: { id: 'initial-project-001' },
    update: {},
    create: {
      id: 'initial-project-001',
      name: 'Digital Platform Overhaul',
      description: 'Centralized web application for organization team tracking.',
      scope: 'Database schema, authentication, direct project assignments, activity logging, and reporting.',
      projectType: 'WEBSITE_WEBAPP',
      leadId: student.id,
      status: 'ONGOING',
      priority: 'HIGH',
      startDate: new Date('2026-01-01'),
      targetEndDate: new Date('2026-10-31'),
      maintenanceRequired: true,
      maintenanceNotes: 'Monthly database backups and security updates.',
      createdBy: admin.id,
    },
  });

  // Add Member relation
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: sampleProject.id, userId: student.id } },
    update: {},
    create: { projectId: sampleProject.id, userId: student.id },
  });

  // Log Initial Activity
  await prisma.workActivity.create({
    data: {
      serialNo: 1,
      userId: student.id,
      projectId: sampleProject.id,
      workDescription: 'Initial setup of project tracking architecture and database schema.',
      hoursSpent: 3.5,
      assignedById: admin.id,
      dateTime: new Date(),
    },
  });

  console.log('🎉 Clean seeding completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
