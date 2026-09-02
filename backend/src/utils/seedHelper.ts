import { User, ProjectCategory, MemberSkill, Project, ProjectMember, Task, Milestone, WorkActivity } from '../models/index.js';
import { logger } from './logger.js';
import bcrypt from 'bcryptjs';

export async function seedDatabaseIfEmpty(): Promise<void> {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      logger.info(`✅ Database already initialized (${userCount} users found).`);
      return;
    }

    logger.info('🌱 Empty database detected in MongoDB. Auto-seeding initial Admin, Students, and Projects data...');

    const commonPassword = await bcrypt.hash('Password123!', 12);

    // 1. Organization Admin User
    const admin = await User.create({
      email: 'admin@organization.com',
      passwordHash: commonPassword,
      rawPassword: 'Password123!',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    });

    // 2. Default Student User
    const defaultStudent = await User.create({
      email: 'student@organization.com',
      passwordHash: commonPassword,
      rawPassword: 'Password123!',
      firstName: 'Alex',
      lastName: 'Rivers',
      role: 'TEAM_MEMBER',
      memberType: 'STUDENT',
      isActive: true,
      mustChangePassword: false,
    });

    // 3. Categories
    const categoriesData = [
      { code: 'PROJECT_DEVELOPMENT', name: 'Project Development', icon: '💻', sortOrder: 1 },
      { code: 'LIVE_STREAMING', name: 'Live Streaming', icon: '📡', sortOrder: 2 },
      { code: 'PODCAST_MEDIA', name: 'Podcast & Media', icon: '🎙️', sortOrder: 3 },
      { code: 'BMM_BMS_PROJECT', name: 'BMM & BMS Enterprise Project', icon: '🏢', sortOrder: 4 },
      { code: 'AI_INNOVATION', name: 'AI & Smart Systems', icon: '🤖', sortOrder: 5 },
      { code: 'WEBSITE_WEBAPP', name: 'Website / Web App', icon: '🌐', sortOrder: 6 },
      { code: 'MOBILE_APP', name: 'Mobile Application', icon: '📱', sortOrder: 7 },
      { code: 'UNIVERSITY_NEP', name: 'University NEP System', icon: '🎓', sortOrder: 8 },
      { code: 'DESIGN_SOCIAL_MEDIA', name: 'Design & Social Media', icon: '🎨', sortOrder: 9 },
      { code: 'RESEARCH', name: 'Research & Innovation', icon: '🔬', sortOrder: 10 },
    ];

    for (const cat of categoriesData) {
      await ProjectCategory.findOneAndUpdate({ code: cat.code }, cat, { upsert: true });
    }

    // 4. Team Members
    const membersData = [
      { firstName: 'Sahil', lastName: 'Patil', email: 'sahil.patil@organization.com', phone: '9876543201', skills: 'React.js, Node.js, Next.js, TypeScript' },
      { firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@organization.com', phone: '9876543202', skills: 'Python, PyTorch, LLM Fine-tuning, FastAPI' },
      { firstName: 'Pratik', lastName: 'Deshmukh', email: 'pratik.deshmukh@organization.com', phone: '9876543203', skills: 'MongoDB, Express.js, Inventory ERP, React' },
      { firstName: 'Soham', lastName: 'Joshi', email: 'soham.joshi@organization.com', phone: '9876543204', skills: 'OBS Studio, Video Editing, Audio Engineering, WebRTC' },
      { firstName: 'Tejas', lastName: 'Kulkarni', email: 'tejas.kulkarni@organization.com', phone: '9876543205', skills: 'Flutter, Mobile App Dev, UI/UX Design, Firebase' },
      { firstName: 'Nishant', lastName: 'More', email: 'nishant.more@organization.com', phone: '9876543206', skills: 'DevOps, Docker, CI/CD, Cloud Architecture' },
      { firstName: 'Vaibhav', lastName: 'Shinde', email: 'vaibhav.shinde@organization.com', phone: '9876543207', skills: 'QA Automation, Cypress, API Testing, Security' },
    ];

    const createdUsers: Record<string, any> = {};
    for (const m of membersData) {
      const user = await User.create({
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
      });

      for (const sk of m.skills.split(', ')) {
        await MemberSkill.create({
          userId: user._id,
          skillName: sk,
          proficiency: 'INTERMEDIATE',
        });
      }

      createdUsers[m.firstName.toLowerCase()] = user;
    }

    // 5. Initial Projects
    const sampleProjects = [
      {
        name: 'VSS Project Tracker',
        description: 'Centralized engineering and digital team project management platform with real-time tracking.',
        scope: 'Interactive Kanban board, deliverable milestones, automated email notifications, and excel executive reports.',
        projectType: 'PROJECT_DEVELOPMENT',
        priority: 'HIGH',
        status: 'ONGOING',
        leadId: createdUsers['sahil']?._id,
        createdBy: admin._id,
        members: [createdUsers['nishant']?._id, createdUsers['vaibhav']?._id],
      },
      {
        name: 'Deepentra AI',
        description: 'Generative AI platform delivering contextual embeddings, LLM orchestration, and smart automation.',
        scope: 'Document vector indexing, retrieval-augmented generation (RAG) engine, and conversational web API.',
        projectType: 'AI_INNOVATION',
        priority: 'CRITICAL',
        status: 'ONGOING',
        leadId: createdUsers['rahul']?._id,
        createdBy: admin._id,
        members: [createdUsers['tejas']?._id, createdUsers['sahil']?._id],
      },
      {
        name: 'Inventory Management System',
        description: 'Enterprise ERP inventory system with barcode tracking, asset auditing, and stock automation.',
        scope: 'Real-time stock alerts, vendor purchase order workflows, warehouse distribution logs, and exportable audit summaries.',
        projectType: 'BMM_BMS_PROJECT',
        priority: 'HIGH',
        status: 'ONGOING',
        leadId: createdUsers['pratik']?._id,
        createdBy: admin._id,
        members: [createdUsers['vaibhav']?._id, createdUsers['nishant']?._id],
      },
      {
        name: 'Dadionthetrails Project',
        description: 'Outdoor adventure live broadcasting, podcast production, and multi-channel content streaming.',
        scope: '4K low-latency streaming infrastructure, podcast audio master post-production, interactive fan chat integration.',
        projectType: 'LIVE_STREAMING',
        priority: 'MEDIUM',
        status: 'ONGOING',
        leadId: createdUsers['soham']?._id,
        createdBy: admin._id,
        members: [createdUsers['tejas']?._id, createdUsers['sahil']?._id],
      },
    ];

    for (const p of sampleProjects) {
      const { members, ...projData } = p;
      const project = await Project.create(projData);

      if (project.leadId) {
        await ProjectMember.create({ projectId: project._id, userId: project.leadId });
      }

      for (const mId of members.filter(Boolean)) {
        await ProjectMember.create({ projectId: project._id, userId: mId });
      }

      // Add a sample milestone and task
      const milestone = await Milestone.create({
        projectId: project._id,
        name: 'Phase 1 - Core Deliverables',
        sortOrder: 1,
        status: 'IN_PROGRESS',
      });

      const task = await Task.create({
        projectId: project._id,
        milestoneId: milestone._id,
        title: `Architecture Setup — ${project.name}`,
        description: 'Core software design and functional implementation.',
        assigneeId: project.leadId,
        assignedBy: admin._id,
        priority: project.priority,
        status: 'IN_PROGRESS',
        createdById: admin._id,
      });

      if (project.leadId) {
        await WorkActivity.create({
          userId: project.leadId,
          projectId: project._id,
          workDescription: `Worked on setup for ${task.title}.`,
          hoursSpent: 4.0,
          assignedById: admin._id,
        });
      }
    }

    logger.info('🎉 Auto-seed completed successfully! Default admin: admin@organization.com / Password123!');
  } catch (err: any) {
    logger.error(`⚠️ Auto-seed encountered an issue: ${err.message}`);
  }
}
