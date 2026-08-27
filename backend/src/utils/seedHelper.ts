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

    // 2. Categories
    const categoriesData = [
      { code: 'PROJECT_DEVELOPMENT', name: 'Project Development', icon: '💻', sortOrder: 1 },
      { code: 'LIVE_STREAMING', name: 'Live Streaming', icon: '📡', sortOrder: 2 },
      { code: 'PODCAST_MEDIA', name: 'Podcast & Media', icon: '🎙️', sortOrder: 3 },
      { code: 'BMM_BMS_PROJECT', name: 'BMM & BMS Enterprise Project', icon: '🏢', sortOrder: 4 },
      { code: 'AI_INNOVATION', name: 'AI & Smart Systems', icon: '🤖', sortOrder: 5 },
    ];

    for (const cat of categoriesData) {
      await prisma.projectCategory.create({ data: cat }).catch(() => {});
    }

    // 3. Team Members (Sahil, Rahul, Pratik, Soham, Tejas, Nishant, Vaibhav)
    const membersData = [
      { firstName: 'Sahil', lastName: 'Patil', email: 'sahil.patil@organization.com', phone: '9876543201', skills: 'React.js, Node.js, Next.js, TypeScript' },
      { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@organization.com', phone: '9876543202', skills: 'Python, PyTorch, LLM Fine-tuning, FastAPI' },
      { firstName: 'Pratik', lastName: 'Deshmukh', email: 'pratik.deshmukh@organization.com', phone: '9876543203', skills: 'PostgreSQL, Express.js, Inventory ERP, React' },
      { firstName: 'Soham', lastName: 'Joshi', email: 'soham.joshi@organization.com', phone: '9876543204', skills: 'OBS Studio, Video Editing, Audio Engineering, WebRTC' },
      { firstName: 'Tejas', lastName: 'Kulkarni', email: 'tejas.kulkarni@organization.com', phone: '9876543205', skills: 'Flutter, Mobile App Dev, UI/UX Design, Firebase' },
      { firstName: 'Nishant', lastName: 'More', email: 'nishant.more@organization.com', phone: '9876543206', skills: 'DevOps, Docker, CI/CD, Cloud Architecture' },
      { firstName: 'Vaibhav', lastName: 'Shinde', email: 'vaibhav.shinde@organization.com', phone: '9876543207', skills: 'QA Automation, Cypress, API Testing, Security' },
    ];

    const createdUsers: Record<string, any> = {};
    for (const m of membersData) {
      const user = await prisma.user.create({
        data: {
          email: m.email,
          passwordHash: commonPassword,
          rawPassword: 'Password123!',
          firstName: m.firstName,
          lastName: m.lastName,
          phone: m.phone,
          role: 'TEAM_MEMBER',
          memberType: 'STUDENT',
          isActive: true,
          mustChangePassword: false,
          skills: {
            create: m.skills.split(', ').map((sk) => ({ skillName: sk })),
          },
        },
      });
      createdUsers[m.firstName.toLowerCase()] = user;
    }

    // 4. Initial Projects
    const sampleProjects = [
      {
        name: 'VSS Project Tracker',
        description: 'Centralized engineering and digital team project management platform with real-time tracking.',
        scope: 'Interactive Kanban board, deliverable milestones, automated Resend email notifications, and PDF executive reports.',
        projectType: 'PROJECT_DEVELOPMENT',
        priority: 'HIGH',
        status: 'ONGOING',
        leadId: createdUsers['sahil']?.id,
        createdBy: admin.id,
        members: [createdUsers['nishant']?.id, createdUsers['vaibhav']?.id],
      },
      {
        name: 'Deepentra AI',
        description: 'Generative AI platform delivering contextual embeddings, LLM orchestration, and smart automation.',
        scope: 'Document vector indexing, retrieval-augmented generation (RAG) engine, and conversational web API.',
        projectType: 'AI_INNOVATION',
        priority: 'CRITICAL',
        status: 'ONGOING',
        leadId: createdUsers['rahul']?.id,
        createdBy: admin.id,
        members: [createdUsers['tejas']?.id, createdUsers['sahil']?.id],
      },
      {
        name: 'Inventory Management System',
        description: 'Enterprise ERP inventory system with barcode tracking, asset auditing, and stock automation.',
        scope: 'Real-time stock alerts, vendor purchase order workflows, warehouse distribution logs, and exportable audit summaries.',
        projectType: 'BMM_BMS_PROJECT',
        priority: 'HIGH',
        status: 'ONGOING',
        leadId: createdUsers['pratik']?.id,
        createdBy: admin.id,
        members: [createdUsers['vaibhav']?.id, createdUsers['nishant']?.id],
      },
      {
        name: 'Dadionthetrails Project',
        description: 'Outdoor adventure live broadcasting, podcast production, and multi-channel content streaming.',
        scope: '4K low-latency streaming infrastructure, podcast audio master post-production, interactive fan chat integration.',
        projectType: 'LIVE_STREAMING',
        priority: 'MEDIUM',
        status: 'ONGOING',
        leadId: createdUsers['soham']?.id,
        createdBy: admin.id,
        members: [createdUsers['tejas']?.id, createdUsers['sahil']?.id],
      },
    ];

    for (const p of sampleProjects) {
      const { members, ...projData } = p;
      await prisma.project.create({
        data: {
          ...projData,
          members: {
            create: members.filter(Boolean).map((userId) => ({ userId })),
          },
        },
      });
    }

    logger.info('🎉 Auto-seed completed successfully! Default admin: admin@organization.com / Password123!');
  } catch (err: any) {
    logger.error(`⚠️ Auto-seed encountered an issue: ${err.message}`);
  }
}
