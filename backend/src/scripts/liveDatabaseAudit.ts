import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import supertest from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/database.js';
import fs from 'fs';
import path from 'path';

interface StepResult {
  step: number;
  category: string;
  method: string;
  endpoint: string;
  status: number;
  expectedStatus: number;
  passed: boolean;
  message: string;
}

const results: StepResult[] = [];
let stepCounter = 1;

function recordStep(category: string, method: string, endpoint: string, status: number, expectedStatus: number, message: string) {
  const passed = status === expectedStatus || (Array.isArray(expectedStatus) && (expectedStatus as any).includes(status));
  results.push({
    step: stepCounter++,
    category,
    method,
    endpoint,
    status,
    expectedStatus,
    passed,
    message
  });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [Step ${stepCounter - 1}] ${category.padEnd(16)} | ${method.padEnd(6)} ${endpoint.padEnd(45)} | Status: ${status} | ${message}`);
  if (!passed) {
    throw new Error(`Step failed: ${method} ${endpoint} returned ${status}, expected ${expectedStatus}`);
  }
}

async function runLiveAtlasAudit() {
  console.log('\n======================================================================');
  console.log('🌐 RUNNING LIVE MONGO DB ATLAS END-TO-END SYSTEM & API AUDIT');
  console.log('======================================================================\n');

  try {
    await connectDB();
    console.log('📡 Connected to Live MongoDB Atlas Cluster.');
    const request = supertest(app);

    // 1. HEALTH CHECK
    console.log('\n--- 1. SYSTEM HEALTH CHECK ---');
    const healthRes = await request.get('/api/v1/health');
    recordStep('Health', 'GET', '/api/v1/health', healthRes.status, 200, 'API Service health and uptime verified');

    // 2. AUTHENTICATION & SESSIONS
    console.log('\n--- 2. AUTHENTICATION & SESSIONS ---');
    // Admin Login
    const adminLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@organization.com', password: 'Password123!' });
    recordStep('Auth', 'POST', '/api/v1/auth/login (Admin)', adminLoginRes.status, 200, 'Admin authenticated, access token issued');
    const adminToken = adminLoginRes.body.data.accessToken;
    const adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0] : '';

    // Team Member Login
    const memberLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'sahil.patil@organization.com', password: 'Password123!' });
    recordStep('Auth', 'POST', '/api/v1/auth/login (Member)', memberLoginRes.status, 200, 'Team member authenticated');
    const memberToken = memberLoginRes.body.data.accessToken;

    // Bad credentials check
    const badLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@organization.com', password: 'InvalidPasswordXYZ!' });
    recordStep('Auth', 'POST', '/api/v1/auth/login (Bad Pass)', badLoginRes.status, 401, 'Rejected unauthorized login correctly');

    // Get current user profile (/me)
    const meRes = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Auth', 'GET', '/api/v1/auth/me', meRes.status, 200, `Retrieved profile for: ${meRes.body.data.email}`);

    // Update current user profile
    const updateMeRes = await request
      .put('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'System',
        lastName: 'Administrator',
        phone: '9876543200',
        bio: 'Chief System Administrator & Operations Lead',
        githubUrl: 'https://github.com/admin',
        linkedinUrl: 'https://linkedin.com/in/admin'
      });
    recordStep('Auth', 'PUT', '/api/v1/auth/me', updateMeRes.status, 200, 'Updated user profile form data in Atlas');

    // Token refresh
    if (adminCookie) {
      const refreshRes = await request
        .post('/api/v1/auth/refresh')
        .set('Cookie', [adminCookie]);
      recordStep('Auth', 'POST', '/api/v1/auth/refresh', refreshRes.status, 200, 'Token refreshed successfully via secure cookie');
    }

    // 3. USER MANAGEMENT (ADMIN)
    console.log('\n--- 3. USER MANAGEMENT CRUD ---');
    const testUserEmail = `audit.user.${Date.now()}@organization.com`;
    const createUserRes = await request
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: testUserEmail,
        firstName: 'Audit',
        lastName: 'Engineer',
        role: 'TEAM_MEMBER',
        memberType: 'EMPLOYEE',
        phone: '9988771122',
        skills: 'TypeScript, MongoDB Atlas, Node.js, Express',
        tempPassword: 'AuditPassword123!'
      });
    recordStep('Users', 'POST', '/api/v1/users', createUserRes.status, 201, 'New user created with encrypted credentials');
    const createdUserId = createUserRes.body.data.user.id;

    // List users with search
    const listUsersRes = await request
      .get('/api/v1/users?search=Audit')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Users', 'GET', '/api/v1/users?search=Audit', listUsersRes.status, 200, `Found ${listUsersRes.body.data.length} matching user(s)`);

    // Get user details
    const getUserRes = await request
      .get(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Users', 'GET', `/api/v1/users/${createdUserId}`, getUserRes.status, 200, `Fetched user: ${getUserRes.body.data.firstName} ${getUserRes.body.data.lastName}`);

    // Update user
    const updateUserRes = await request
      .put(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        phone: '9988773344',
        bio: 'Senior QA and Integration Testing Specialist'
      });
    recordStep('Users', 'PUT', `/api/v1/users/${createdUserId}`, updateUserRes.status, 200, 'Updated user details');

    // Toggle activate/deactivate
    const deactRes = await request
      .patch(`/api/v1/users/${createdUserId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Users', 'PATCH', `/api/v1/users/${createdUserId}/deactivate`, deactRes.status, 200, 'User deactivated');

    const actRes = await request
      .patch(`/api/v1/users/${createdUserId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Users', 'PATCH', `/api/v1/users/${createdUserId}/activate`, actRes.status, 200, 'User reactivated');

    // Admin reset password
    const resetPassRes = await request
      .post(`/api/v1/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tempPassword: 'ResetPassword123!' });
    recordStep('Users', 'POST', `/api/v1/users/${createdUserId}/reset-password`, resetPassRes.status, 200, 'Admin reset user password');

    // 4. PROJECT CATEGORIES
    console.log('\n--- 4. PROJECT CATEGORIES ---');
    const getCatRes = await request
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Categories', 'GET', '/api/v1/categories', getCatRes.status, 200, `Retrieved ${getCatRes.body.data.length} categories`);

    const newCatCode = `CUSTOM_CAT_${Date.now()}`;
    const createCatRes = await request
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: newCatCode,
        name: `Live Audit Category ${Date.now()}`,
        icon: '⚡',
        sortOrder: 99
      });
    recordStep('Categories', 'POST', '/api/v1/categories', createCatRes.status, 201, 'Created custom category');
    const createdCategoryId = createCatRes.body.data.id;

    const updateCatRes = await request
      .put(`/api/v1/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Updated Live Audit Category ${Date.now()}`,
        icon: '🚀'
      });
    recordStep('Categories', 'PUT', `/api/v1/categories/${createdCategoryId}`, updateCatRes.status, 200, 'Updated custom category');

    // 5. PROJECTS MANAGEMENT
    console.log('\n--- 5. PROJECTS MANAGEMENT CRUD ---');
    const createProjRes = await request
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Live Atlas Audit Project ${Date.now()}`,
        description: 'End-to-end verification project created on live Atlas cluster',
        scope: 'Test all forms, relations, and operations',
        projectType: 'WEBSITE_WEBAPP',
        priority: 'CRITICAL',
        startDate: '2026-01-01',
        targetEndDate: '2026-12-31',
        budget: 50000,
        leadId: createdUserId,
        memberIds: [createdUserId]
      });
    recordStep('Projects', 'POST', '/api/v1/projects', createProjRes.status, 201, 'Project created with lead & members');
    const createdProjectId = createProjRes.body.data.id;

    // List projects with filters
    const listProjRes = await request
      .get('/api/v1/projects?priority=CRITICAL')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Projects', 'GET', '/api/v1/projects?priority=CRITICAL', listProjRes.status, 200, `Found ${listProjRes.body.data.length} CRITICAL project(s)`);

    // Get single project
    const getProjRes = await request
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Projects', 'GET', `/api/v1/projects/${createdProjectId}`, getProjRes.status, 200, `Retrieved project: ${getProjRes.body.data.name}`);

    // Update project
    const updateProjRes = await request
      .put(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated project description during live audit',
        budget: 65000
      });
    recordStep('Projects', 'PUT', `/api/v1/projects/${createdProjectId}`, updateProjRes.status, 200, 'Updated project details');

    // Update status
    const updateStatusRes = await request
      .patch(`/api/v1/projects/${createdProjectId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'ONGOING',
        statusReason: 'Active development and live testing underway'
      });
    recordStep('Projects', 'PATCH', `/api/v1/projects/${createdProjectId}/status`, updateStatusRes.status, 200, 'Updated project status to ONGOING');

    // Project members
    const projMembersRes = await request
      .get(`/api/v1/projects/${createdProjectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Projects', 'GET', `/api/v1/projects/${createdProjectId}/members`, projMembersRes.status, 200, `Project has ${projMembersRes.body.data.length} member(s)`);

    // 6. CLIENTS
    console.log('\n--- 6. CLIENT MANAGEMENT ---');
    const createClientRes = await request
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Apex Global Enterprises',
        address: '404 Innovation Drive, Pune, Maharashtra',
        referencePerson: 'Mr. Arvind Deshpande',
        phone: '9822012345',
        email: 'contact@apexglobal.example',
        projectId: createdProjectId
      });
    recordStep('Clients', 'POST', '/api/v1/clients', createClientRes.status, 201, 'Created client and linked to project');
    const createdClientId = createClientRes.body.data.id;

    const listClientsRes = await request
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Clients', 'GET', '/api/v1/clients', listClientsRes.status, 200, `Retrieved ${listClientsRes.body.data.length} client(s)`);

    const updateClientRes = await request
      .put(`/api/v1/clients/${createdClientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        phone: '9822099999',
        referencePerson: 'Mr. Arvind Deshpande (Director)'
      });
    recordStep('Clients', 'PUT', `/api/v1/clients/${createdClientId}`, updateClientRes.status, 200, 'Updated client details');

    // 7. MILESTONES
    console.log('\n--- 7. MILESTONES MANAGEMENT ---');
    const createMsRes = await request
      .post(`/api/v1/projects/${createdProjectId}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Milestone 1: Database Migration & Live Verification',
        description: 'Verify all collections in MongoDB Atlas',
        sortOrder: 1,
        dueDate: '2026-06-30'
      });
    recordStep('Milestones', 'POST', `/api/v1/projects/${createdProjectId}/milestones`, createMsRes.status, 201, 'Created milestone');
    const createdMilestoneId = createMsRes.body.data.id;

    const listMsRes = await request
      .get(`/api/v1/projects/${createdProjectId}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Milestones', 'GET', `/api/v1/projects/${createdProjectId}/milestones`, listMsRes.status, 200, `Found ${listMsRes.body.data.length} milestone(s)`);

    const updateMsRes = await request
      .put(`/api/v1/milestones/${createdMilestoneId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'IN_PROGRESS'
      });
    recordStep('Milestones', 'PUT', `/api/v1/milestones/${createdMilestoneId}`, updateMsRes.status, 200, 'Updated milestone status to IN_PROGRESS');

    // 8. TASKS & TASK LIFECYCLE
    console.log('\n--- 8. TASKS & WORKFLOW TRANSITIONS ---');
    const createTaskRes = await request
      .post(`/api/v1/projects/${createdProjectId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Verify MongoDB Atlas Queries & Aggregation Pipelines',
        description: 'Check find, populate, sort, aggregate on cloud cluster',
        assigneeId: createdUserId,
        milestoneId: createdMilestoneId,
        priority: 'HIGH',
        dueDate: '2026-05-30'
      });
    recordStep('Tasks', 'POST', `/api/v1/projects/${createdProjectId}/tasks`, createTaskRes.status, 201, 'Created task');
    const createdTaskId = createTaskRes.body.data.id;

    // List project tasks
    const listTasksRes = await request
      .get(`/api/v1/projects/${createdProjectId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Tasks', 'GET', `/api/v1/projects/${createdProjectId}/tasks`, listTasksRes.status, 200, `Found ${listTasksRes.body.data.length} task(s)`);

    // Get single task
    const getTaskRes = await request
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Tasks', 'GET', `/api/v1/tasks/${createdTaskId}`, getTaskRes.status, 200, `Retrieved task: ${getTaskRes.body.data.title}`);

    // Update task
    const updateTaskRes = await request
      .put(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        priority: 'CRITICAL',
        description: 'Updated task description for high priority testing'
      });
    recordStep('Tasks', 'PUT', `/api/v1/tasks/${createdTaskId}`, updateTaskRes.status, 200, 'Updated task details');

    // Status transition: IN_PROGRESS
    const taskProgRes = await request
      .patch(`/api/v1/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    recordStep('Tasks', 'PATCH', `/api/v1/tasks/${createdTaskId}/status (IN_PROGRESS)`, taskProgRes.status, 200, 'Transitioned to IN_PROGRESS');

    // Status transition: COMPLETED
    const taskCompRes = await request
      .patch(`/api/v1/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED', completionNotes: 'All Atlas cluster queries verified successfully' });
    recordStep('Tasks', 'PATCH', `/api/v1/tasks/${createdTaskId}/status (COMPLETED)`, taskCompRes.status, 200, 'Transitioned to COMPLETED');

    // Block/Unblock task
    const blockTaskRes = await request
      .patch(`/api/v1/tasks/${createdTaskId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBlocked: true, blockedReason: 'Awaiting client security sign-off' });
    recordStep('Tasks', 'PATCH', `/api/v1/tasks/${createdTaskId}/block (Blocked)`, blockTaskRes.status, 200, 'Task flagged as blocked');

    const unblockTaskRes = await request
      .patch(`/api/v1/tasks/${createdTaskId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBlocked: false });
    recordStep('Tasks', 'PATCH', `/api/v1/tasks/${createdTaskId}/block (Unblocked)`, unblockTaskRes.status, 200, 'Task unblocked');

    // 9. WORK ACTIVITIES / TIME TRACKING
    console.log('\n--- 9. WORK ACTIVITIES & TIME TRACKING ---');
    const logActRes = await request
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: createdUserId,
        projectId: createdProjectId,
        workDescription: 'Live database migration validation and load testing',
        hoursSpent: 4.5,
        dateTime: new Date().toISOString()
      });
    recordStep('Activities', 'POST', '/api/v1/activities', logActRes.status, 201, 'Logged work activity');
    const createdActivityId = logActRes.body.data.id;

    // List activities with monthly filter
    const listActRes = await request
      .get('/api/v1/activities?period=monthly')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Activities', 'GET', '/api/v1/activities?period=monthly', listActRes.status, 200, `Listed activities, Total Hours logged: ${listActRes.body.data.totalHours}`);

    // Update activity
    const updateActRes = await request
      .put(`/api/v1/activities/${createdActivityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        hoursSpent: 5.0,
        workDescription: 'Live database migration validation and automated E2E testing'
      });
    recordStep('Activities', 'PUT', `/api/v1/activities/${createdActivityId}`, updateActRes.status, 200, 'Updated activity log hours & description');

    // Export CSV
    const exportCsvRes = await request
      .get('/api/v1/activities/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Activities', 'GET', '/api/v1/activities/export/csv', exportCsvRes.status, 200, 'Generated CSV activity report stream');

    // 10. SKILLS MATRIX
    console.log('\n--- 10. SKILLS MATRIX ---');
    const addSkillRes = await request
      .post(`/api/v1/skills/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skillName: 'MongoDB Atlas Administration',
        proficiency: 'EXPERT',
        notes: 'Experienced with sharding, replica sets, and Atlas Search'
      });
    recordStep('Skills', 'POST', `/api/v1/skills/${createdUserId}`, addSkillRes.status, 201, 'Added skill to user profile');

    const getSkillsRes = await request
      .get(`/api/v1/skills/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Skills', 'GET', `/api/v1/skills/${createdUserId}`, getSkillsRes.status, 200, `Retrieved ${getSkillsRes.body.data?.length ?? 0} user skills`);

    const getTimelineRes = await request
      .get(`/api/v1/skills/${createdUserId}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Skills', 'GET', `/api/v1/skills/${createdUserId}/timeline`, getTimelineRes.status, 200, `Retrieved skill timeline with ${getTimelineRes.body.data.skills.length} skill(s)`);

    // 11. DASHBOARD METRICS (ADMIN & MEMBER)
    console.log('\n--- 11. DASHBOARD METRICS ---');
    const adminDashRes = await request
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Dashboard', 'GET', '/api/v1/dashboard (Admin)', adminDashRes.status, 200, `Admin Dashboard: ${adminDashRes.body.data?.stats?.totalProjects ?? 0} projects, ${adminDashRes.body.data?.stats?.totalUsers ?? 0} users`);

    const memberDashRes = await request
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${memberToken}`);
    recordStep('Dashboard', 'GET', '/api/v1/dashboard (Member)', memberDashRes.status, 200, 'Member Dashboard retrieved with personalized work queue');

    // 12. COLLABORATION (COMMENTS & ATTACHMENTS)
    console.log('\n--- 12. COLLABORATION (COMMENTS & ATTACHMENTS) ---');
    const createCommentRes = await request
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId: createdProjectId,
        content: 'Database migration to MongoDB Atlas has been verified. All collections responding normally.'
      });
    recordStep('Comments', 'POST', '/api/v1/comments', createCommentRes.status, 201, 'Posted collaboration comment');

    const listCommentsRes = await request
      .get(`/api/v1/comments?projectId=${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Comments', 'GET', `/api/v1/comments?projectId=${createdProjectId}`, listCommentsRes.status, 200, `Found ${listCommentsRes.body.data.length} comment(s)`);

    // File Attachment upload
    const tempFilePath = path.join(process.cwd(), 'audit_test_doc.txt');
    fs.writeFileSync(tempFilePath, 'MongoDB Atlas Migration Audit Log - All Systems Operational');

    const uploadRes = await request
      .post('/api/v1/attachments')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('projectId', createdProjectId)
      .attach('file', tempFilePath);

    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    recordStep('Attachments', 'POST', '/api/v1/attachments', uploadRes.status, 201, `Uploaded file: ${uploadRes.body.data?.originalName || 'audit_test_doc.txt'}`);
    const createdAttachmentId = uploadRes.body.data?.id;

    if (createdAttachmentId) {
      const downloadRes = await request
        .get(`/api/v1/attachments/${createdAttachmentId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);
      recordStep('Attachments', 'GET', `/api/v1/attachments/${createdAttachmentId}/download`, downloadRes.status, 200, 'Downloaded attachment stream successfully');
    }

    // 13. NOTIFICATIONS
    console.log('\n--- 13. NOTIFICATIONS ---');
    const listNotifRes = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Notifications', 'GET', '/api/v1/notifications', listNotifRes.status, 200, `Retrieved ${listNotifRes.body.data.length} notification(s)`);

    const readAllNotifRes = await request
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Notifications', 'PATCH', '/api/v1/notifications/read-all', readAllNotifRes.status, 200, 'Marked all notifications as read');

    // 14. EXCEL REPORTS
    console.log('\n--- 14. EXECUTIVE REPORTS ---');
    const excelRes = await request
      .get('/api/v1/reports/export/excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true);
    recordStep('Reports', 'GET', '/api/v1/reports/export/excel', excelRes.status, 200, 'Generated multi-sheet styled Excel workbook');

    // 15. GLOBAL SEARCH
    console.log('\n--- 15. GLOBAL FULL-TEXT SEARCH ---');
    const searchRes = await request
      .get('/api/v1/search?q=Atlas')
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Search', 'GET', '/api/v1/search?q=Atlas', searchRes.status, 200, `Search returned ${searchRes.body.data.projects?.length || 0} project(s), ${searchRes.body.data.users?.length || 0} user(s)`);

    // 16. CLEANUP / DELETE OPERATIONS
    console.log('\n--- 16. DELETE / DECOMMISSION OPERATIONS ---');
    const delActRes = await request
      .delete(`/api/v1/activities/${createdActivityId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Activities', 'DELETE', `/api/v1/activities/${createdActivityId}`, delActRes.status, 200, 'Deleted test activity log');

    const delTaskRes = await request
      .delete(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Tasks', 'DELETE', `/api/v1/tasks/${createdTaskId}`, delTaskRes.status, 200, 'Deleted test task');

    const delMsRes = await request
      .delete(`/api/v1/milestones/${createdMilestoneId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Milestones', 'DELETE', `/api/v1/milestones/${createdMilestoneId}`, delMsRes.status, 200, 'Deleted test milestone');

    const delClientRes = await request
      .delete(`/api/v1/clients/${createdClientId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Clients', 'DELETE', `/api/v1/clients/${createdClientId}`, delClientRes.status, 200, 'Deleted test client');

    const delProjRes = await request
      .delete(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Projects', 'DELETE', `/api/v1/projects/${createdProjectId}`, delProjRes.status, 200, 'Deleted test project');

    const delUserRes = await request
      .delete(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Users', 'DELETE', `/api/v1/users/${createdUserId}`, delUserRes.status, 200, 'Deleted test user');

    const delCatRes = await request
      .delete(`/api/v1/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    recordStep('Categories', 'DELETE', `/api/v1/categories/${createdCategoryId}`, delCatRes.status, 200, 'Deleted test category');

    console.log('\n======================================================================');
    console.log(`🎉 ALL ${results.length} END-TO-END AUDIT OPERATIONS PASSED WITH 100% SUCCESS ON MONGODB ATLAS!`);
    console.log('======================================================================\n');

  } catch (error: any) {
    console.error('\n❌ AUDIT FAILED AT STEP:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runLiveAtlasAudit();
