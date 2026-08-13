/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with 10 dummy users and 10 dummy projects...');

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

  // 2. Default Student User
  const defaultStudent = await prisma.user.upsert({
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

  // 3. 10 Dummy Team Members (Students)
  const dummyUserData = [
    { firstName: 'Ruturaj', lastName: 'Gholap', email: 'ruturaj.gholap@organization.com', mobileNumber: '9876543210' },
    { firstName: 'Omkar', lastName: 'Sonawane', email: 'omkar.sonawane@organization.com', mobileNumber: '9876543211' },
    { firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@organization.com', mobileNumber: '9876543212' },
    { firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@organization.com', mobileNumber: '9876543213' },
    { firstName: 'Ananya', lastName: 'Deshmukh', email: 'ananya.deshmukh@organization.com', mobileNumber: '9876543214' },
    { firstName: 'Siddharth', lastName: 'Patil', email: 'siddharth.patil@organization.com', mobileNumber: '9876543215' },
    { firstName: 'Neha', lastName: 'Kulkarni', email: 'neha.kulkarni@organization.com', mobileNumber: '9876543216' },
    { firstName: 'Rohit', lastName: 'Joshi', email: 'rohit.joshi@organization.com', mobileNumber: '9876543217' },
    { firstName: 'Tanvi', lastName: 'Mehta', email: 'tanvi.mehta@organization.com', mobileNumber: '9876543218' },
    { firstName: 'Aditya', lastName: 'Pawar', email: 'aditya.pawar@organization.com', mobileNumber: '9876543219' },
  ];

  const dummyUsers = [];
  for (const u of dummyUserData) {
    const createdUser = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: commonPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.mobileNumber,
        role: 'TEAM_MEMBER',
        memberType: 'STUDENT',
        isActive: true,
        mustChangePassword: false,
      },
    });
    dummyUsers.push(createdUser);
  }

  console.log(`✅ 10 Dummy Student accounts initialized (Password: Password123!).`);

  // 4. 10 Dummy Projects with all details (Started Date, Target Delivery Date, Lead, Scope, Maintenance)
  const dummyProjectsData = [
    {
      id: 'dummy-project-001',
      name: 'E-Commerce Web Portal & Payment Gateway',
      description: 'Full-stack e-commerce marketplace platform with online payment integration.',
      scope: 'User authentication, product catalog, cart system, Razorpay payment gateway integration, and order management dashboard.',
      projectType: 'WEBSITE_WEBAPP',
      status: 'ONGOING',
      priority: 'HIGH',
      startDate: new Date('2026-02-01'),
      targetEndDate: new Date('2026-08-30'),
      leadIdx: 0, // Ruturaj Gholap
    },
    {
      id: 'dummy-project-002',
      name: 'Campus Student Mobile App',
      description: 'Cross-platform Android & iOS mobile app for campus navigation, notices, and class timetables.',
      scope: 'Push notifications, interactive map, timetable sync, assignment submissions, and student profile dashboard.',
      projectType: 'MOBILE_APP',
      status: 'ONGOING',
      priority: 'CRITICAL',
      startDate: new Date('2026-03-10'),
      targetEndDate: new Date('2026-09-15'),
      leadIdx: 1, // Omkar Sonawane
    },
    {
      id: 'dummy-project-003',
      name: 'Smart Campus Energy & BMS Automation',
      description: 'IoT-enabled building management system for real-time power and HVAC tracking.',
      scope: 'Sensor telemetry ingestion, energy usage analytics, automated alerts for power spikes, and HVAC control panel.',
      projectType: 'BMS',
      status: 'ONGOING',
      priority: 'MEDIUM',
      startDate: new Date('2026-01-15'),
      targetEndDate: new Date('2026-11-20'),
      leadIdx: 2, // Priya Sharma
    },
    {
      id: 'dummy-project-004',
      name: 'University NEP Credit & Curriculum Platform',
      description: 'National Education Policy compliant multi-disciplinary course credit tracking portal.',
      scope: 'Elective course registration, credit calculation, grade card generation, and NEP compliance audits.',
      projectType: 'UNIVERSITY_NEP',
      status: 'ONGOING',
      priority: 'HIGH',
      startDate: new Date('2026-04-01'),
      targetEndDate: new Date('2026-10-10'),
      leadIdx: 3, // Rahul Verma
    },
    {
      id: 'dummy-project-005',
      name: 'Annual Tech Fest Branding & Digital Media',
      description: 'Social media graphics, promotional videos, and website landing page for Tech Fest 2026.',
      scope: 'Poster design, Instagram reels, sponsorship pitch decks, and registration portal setup.',
      projectType: 'DESIGN_SOCIAL_MEDIA',
      status: 'ONGOING',
      priority: 'HIGH',
      startDate: new Date('2026-05-01'),
      targetEndDate: new Date('2026-08-20'),
      leadIdx: 4, // Ananya Deshmukh
    },
    {
      id: 'dummy-project-006',
      name: 'Digital Innovation Podcast & Video Series',
      description: 'Monthly podcast series featuring tech industry leaders, student innovators, and research faculty.',
      scope: 'Audio recording, editing, thumbnail creation, YouTube publishing, and Spotify RSS feed distribution.',
      projectType: 'PODCAST_MEDIA',
      status: 'ONGOING',
      priority: 'LOW',
      startDate: new Date('2026-06-01'),
      targetEndDate: new Date('2026-09-30'),
      leadIdx: 5, // Siddharth Patil
    },
    {
      id: 'dummy-project-007',
      name: 'AI Predictive Inventory Analytics',
      description: 'Machine learning research model to predict stock demand and minimize inventory shortages.',
      scope: 'Data preprocessing, model training with Scikit-learn, demand forecasting API, and evaluation metrics.',
      projectType: 'RESEARCH',
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: new Date('2026-02-15'),
      targetEndDate: new Date('2026-12-15'),
      leadIdx: 6, // Neha Kulkarni
    },
    {
      id: 'dummy-project-008',
      name: 'Automated Attendance & QR Access Portal',
      description: 'Touchless attendance marking using dynamically generated QR codes for lab access.',
      scope: 'QR code generation, scanner mobile interface, automated attendance logs, and monthly report export.',
      projectType: 'WEBSITE_WEBAPP',
      status: 'ONGOING',
      priority: 'HIGH',
      startDate: new Date('2026-03-01'),
      targetEndDate: new Date('2026-08-14'),
      leadIdx: 7, // Rohit Joshi
    },
    {
      id: 'dummy-project-009',
      name: 'Library Digital Catalog & RFID Tracking',
      description: 'RFID-integrated library book issuance and digital catalog search system.',
      scope: 'Book search catalog, RFID scan check-in/check-out, overdue fee calculations, and book reservation queue.',
      projectType: 'BMS',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      startDate: new Date('2026-01-20'),
      targetEndDate: new Date('2026-07-25'),
      leadIdx: 8, // Tanvi Mehta
    },
    {
      id: 'dummy-project-010',
      name: 'Alumni Network & Mentorship Portal',
      description: 'Web portal connecting current students with alumni for career guidance and job referrals.',
      scope: 'Alumni profiles, 1-on-1 mentorship scheduling, job board, and alumni donation drive portal.',
      projectType: 'WEBSITE_WEBAPP',
      status: 'ONGOING',
      priority: 'MEDIUM',
      startDate: new Date('2026-04-15'),
      targetEndDate: new Date('2026-10-31'),
      leadIdx: 9, // Aditya Pawar
    },
  ];

  for (const dp of dummyProjectsData) {
    const lead = dummyUsers[dp.leadIdx];
    const createdProject = await prisma.project.upsert({
      where: { id: dp.id },
      update: {
        startDate: dp.startDate,
        targetEndDate: dp.targetEndDate,
      },
      create: {
        id: dp.id,
        name: dp.name,
        description: dp.description,
        scope: dp.scope,
        projectType: dp.projectType,
        leadId: lead.id,
        status: dp.status,
        priority: dp.priority,
        startDate: dp.startDate,
        targetEndDate: dp.targetEndDate,
        maintenanceRequired: true,
        maintenanceNotes: 'Regular monthly maintenance and backup audits.',
        createdBy: admin.id,
      },
    });

    // Add Lead and extra member to project
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: createdProject.id, userId: lead.id } },
      update: {},
      create: { projectId: createdProject.id, userId: lead.id },
    });

    const secondMember = dummyUsers[(dp.leadIdx + 1) % dummyUsers.length];
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: createdProject.id, userId: secondMember.id } },
      update: {},
      create: { projectId: createdProject.id, userId: secondMember.id },
    });

    // Add sample task for project
    const sampleTask = await prisma.task.create({
      data: {
        projectId: createdProject.id,
        title: `Initial Architecture Setup — ${dp.name}`,
        description: 'Design software architecture, database schema, and interface components.',
        assigneeId: lead.id,
        assignedBy: admin.id,
        status: dp.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        priority: dp.priority,
        startDate: dp.startDate,
        dueDate: dp.targetEndDate,
        completedAt: dp.status === 'COMPLETED' ? new Date('2026-07-20') : null,
        createdById: admin.id,
      },
    });

    // Add sample activity log
    await prisma.workActivity.create({
      data: {
        userId: lead.id,
        projectId: createdProject.id,
        workDescription: `Worked on ${sampleTask.title} deliverables and technical documentation.`,
        hoursSpent: 4.5,
        assignedById: admin.id,
        dateTime: new Date(),
      },
    });
  }

  console.log('🎉 10 Dummy Projects and Tasks successfully created!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

