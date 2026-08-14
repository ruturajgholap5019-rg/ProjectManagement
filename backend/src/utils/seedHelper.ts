import { prisma } from '../config/database.js';
import { logger } from './logger.js';
import bcrypt from 'bcryptjs';

export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      logger.info(`✅ Database already initialized (${userCount} users found).`);
      return;
    }

    logger.info('🌱 Empty database detected in Supabase. Auto-seeding initial Admin and Project data...');

    const commonPassword = await bcrypt.hash('Password123!', 12);

    // 1. Organization Admin User
    const admin = await prisma.user.create({
      data: {
        email: 'admin@organization.com',
        passwordHash: commonPassword,
        rawPassword: 'Password123!',
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 2. Default Student User
    const student = await prisma.user.create({
      data: {
        email: 'student@organization.com',
        passwordHash: commonPassword,
        rawPassword: 'Password123!',
        firstName: 'Alex',
        lastName: 'Rivers',
        role: 'TEAM_MEMBER',
        memberType: 'STUDENT',
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 3. Indian Team Members
    const dummyUserData = [
      { firstName: 'Ruturaj', lastName: 'Gholap', email: 'ruturaj.gholap@organization.com', phone: '9876543210' },
      { firstName: 'Omkar', lastName: 'Sonawane', email: 'omkar.sonawane@organization.com', phone: '9876543211' },
      { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@organization.com', phone: '9876543212' },
      { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@organization.com', phone: '9876543213' },
      { firstName: 'Ananya', lastName: 'Deshmukh', email: 'ananya.deshmukh@organization.com', phone: '9876543214' },
      { firstName: 'Siddharth', lastName: 'Patil', email: 'siddharth.patil@organization.com', phone: '9876543215' },
    ];

    const createdUsers = [admin, student];
    for (const u of dummyUserData) {
      const user = await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: commonPassword,
          rawPassword: 'Password123!',
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          role: 'TEAM_MEMBER',
          memberType: 'STUDENT',
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUsers.push(user);
    }

    // 4. Initial Projects
    const sampleProjects = [
      {
        name: 'Web Deployment Initiative 18',
        description: 'End-to-end delivery of Web Deployment requirements including testing and deployment.',
        scope: 'Production deployment architecture, CI/CD pipeline setup, and staging validation.',
        projectType: 'WEB_DEPLOYMENT',
        priority: 'HIGH',
        status: 'ONGOING',
        referencePerson: 'Tushar Sir',
        leadId: createdUsers[2]?.id,
        createdBy: admin.id,
      },
      {
        name: 'AI/ML Initiative 20',
        description: 'Machine learning model pipeline and automated analytics.',
        scope: 'Model training, dataset evaluation, and prediction API endpoints.',
        projectType: 'AI_ML',
        priority: 'CRITICAL',
        status: 'ONGOING',
        referencePerson: 'Prof. Kulkarni',
        leadId: createdUsers[3]?.id,
        createdBy: admin.id,
      },
      {
        name: 'App Development Initiative 19',
        description: 'Cross-platform mobile application development with React Native.',
        scope: 'Authentication flow, dashboard screens, and offline sync module.',
        projectType: 'APP_DEVELOPMENT',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        referencePerson: 'Dr. Sharma',
        leadId: createdUsers[4]?.id,
        createdBy: admin.id,
      },
    ];

    for (const p of sampleProjects) {
      await prisma.project.create({
        data: {
          ...p,
          members: {
            create: createdUsers.slice(1).map(u => ({ userId: u.id }))
          }
        },
      });
    }

    logger.info('🎉 Auto-seed completed successfully! Default admin: admin@organization.com / Password123!');
  } catch (err: any) {
    logger.error(`⚠️ Auto-seed encountered an issue: ${err.message}`);
  }
}
