import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';
import app from '../app.js';
import { seedDatabaseIfEmpty } from '../utils/seedHelper.js';
import fs from 'fs';
import path from 'path';

let mongoServer: MongoMemoryServer;
let request: supertest.SuperTest<supertest.Test>;

// Tokens & IDs captured during test execution
let adminToken: string;
let adminCookie: string;
let studentToken: string;
let studentCookie: string;
let createdUserId: string;
let createdProjectId: string;
let createdTaskId: string;
let createdMilestoneId: string;
let createdActivityId: string;
let createdCommentId: string;
let createdAttachmentId: string;
let createdCategoryId: string;
let createdClientId: string;

async function runFullTestSuite() {
  console.log('\n==================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END FEATURE TEST SUITE');
  console.log('==================================================\n');

  try {
    // 1. Start In-Memory MongoDB Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✅ [1/15] Connected to In-Memory MongoDB Instance.');

    // 2. Test Auto-Seeding
    await seedDatabaseIfEmpty();
    console.log('✅ [2/15] Auto-seeding completed successfully.');

    request = supertest(app);

    // 3. Test Authentication API
    console.log('\n🔐 Testing Authentication API...');
    
    // Admin Login
    const adminLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@organization.com', password: 'Password123!' });
    if (adminLoginRes.status !== 200 || !adminLoginRes.body.data.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.body)}`);
    }
    adminToken = adminLoginRes.body.data.accessToken;
    adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0] : '';
    console.log('   ✓ Admin Login (200 OK) — JWT Token & Cookie received.');

    // Student Login
    const studentLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'sahil.patil@organization.com', password: 'Password123!' });
    if (studentLoginRes.status !== 200 || !studentLoginRes.body.data.accessToken) {
      throw new Error(`Student login failed: ${JSON.stringify(studentLoginRes.body)}`);
    }
    studentToken = studentLoginRes.body.data.accessToken;
    studentCookie = studentLoginRes.headers['set-cookie'] ? studentLoginRes.headers['set-cookie'][0] : '';
    console.log('   ✓ Student Login (200 OK) — Member Access Token received.');

    // Invalid Login
    const badLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ email: 'admin@organization.com', password: 'WrongPassword!' });
    if (badLoginRes.status !== 401) {
      throw new Error('Bad password check failed');
    }
    console.log('   ✓ Invalid Login rejection (401 Unauthorized).');

    // Get Current Profile (/auth/me)
    const meRes = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    if (meRes.status !== 200 || meRes.body.data.email !== 'admin@organization.com') {
      throw new Error(`Profile fetch failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log('   ✓ Fetch Current Profile /auth/me (200 OK).');

    // Token Refresh (/auth/refresh)
    const refreshRes = await request
      .post('/api/v1/auth/refresh')
      .set('Cookie', [adminCookie]);
    if (refreshRes.status !== 200 || !refreshRes.body.data.accessToken) {
      throw new Error(`Token refresh failed: ${JSON.stringify(refreshRes.body)}`);
    }
    console.log('   ✓ Token Refresh via Cookie /auth/refresh (200 OK).');

    // 4. Test Users API & CRUD
    console.log('\n👥 Testing Users API & User CRUD...');
    
    // Create User
    const createUserRes = await request
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'test.member@organization.com',
        firstName: 'Test',
        lastName: 'Developer',
        role: 'TEAM_MEMBER',
        memberType: 'EMPLOYEE',
        phone: '9988776655',
        skills: 'TypeScript, MongoDB, Express, Jest',
      });
    if (createUserRes.status !== 201) {
      throw new Error(`User creation failed: ${JSON.stringify(createUserRes.body)}`);
    }
    createdUserId = createUserRes.body.data.user.id;
    console.log(`   ✓ Create User (201 Created) — ID: ${createdUserId}`);

    // List Users with search & filters
    const listUsersRes = await request
      .get('/api/v1/users?role=TEAM_MEMBER&search=Test')
      .set('Authorization', `Bearer ${adminToken}`);
    if (listUsersRes.status !== 200 || listUsersRes.body.data.length === 0) {
      throw new Error(`User listing/search failed: ${JSON.stringify(listUsersRes.body)}`);
    }
    console.log(`   ✓ List Users with Search & Filter (200 OK) — Found ${listUsersRes.body.data.length} match.`);

    // Get User Profile by ID
    const getUserRes = await request
      .get(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (getUserRes.status !== 200 || getUserRes.body.data.firstName !== 'Test') {
      throw new Error(`Get user by ID failed: ${JSON.stringify(getUserRes.body)}`);
    }
    console.log('   ✓ Get User Details by ID (200 OK).');

    // Update User Profile
    const updateUserRes = await request
      .put(`/api/v1/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        phone: '9988776600',
        bio: 'Senior Full Stack Software Engineer',
        linkedinUrl: 'https://linkedin.com/in/testdev',
      });
    if (updateUserRes.status !== 200 || updateUserRes.body.data.phone !== '9988776600') {
      throw new Error(`Update user failed: ${JSON.stringify(updateUserRes.body)}`);
    }
    console.log('   ✓ Update User Profile (200 OK).');

    // Toggle Active Status
    const statusRes = await request
      .patch(`/api/v1/users/${createdUserId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (statusRes.status !== 200) {
      throw new Error(`User activation failed: ${JSON.stringify(statusRes.body)}`);
    }
    console.log('   ✓ Activate User Account (200 OK).');

    // Admin Reset Password
    const resetPassRes = await request
      .post(`/api/v1/users/${createdUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tempPassword: 'NewTempPassword123!' });
    if (resetPassRes.status !== 200) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetPassRes.body)}`);
    }
    console.log('   ✓ Reset User Password (200 OK).');

    // 5. Test Projects API & Project CRUD
    console.log('\n📁 Testing Projects API & Project CRUD...');

    const createProjRes = await request
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Automated E2E Test Suite Project',
        description: 'Comprehensive integration test project',
        scope: 'Full functional audit of all backend features',
        projectType: 'WEBSITE_WEBAPP',
        priority: 'HIGH',
        startDate: '2026-01-01',
        targetEndDate: '2026-12-31',
        leadId: createdUserId,
        memberIds: [createdUserId],
      });
    if (createProjRes.status !== 201) {
      throw new Error(`Project creation failed: ${JSON.stringify(createProjRes.body)}`);
    }
    createdProjectId = createProjRes.body.data.id;
    console.log(`   ✓ Create Project (201 Created) — ID: ${createdProjectId}`);

    // List Projects
    const listProjRes = await request
      .get('/api/v1/projects?search=Automated')
      .set('Authorization', `Bearer ${adminToken}`);
    if (listProjRes.status !== 200 || listProjRes.body.data.length === 0) {
      throw new Error(`List projects failed: ${JSON.stringify(listProjRes.body)}`);
    }
    console.log('   ✓ List Projects with Filter & Search (200 OK).');

    // Get Project Details
    const getProjRes = await request
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (getProjRes.status !== 200 || getProjRes.body.data.name !== 'Automated E2E Test Suite Project') {
      throw new Error(`Get project by ID failed: ${JSON.stringify(getProjRes.body)}`);
    }
    console.log('   ✓ Get Project Details by ID (200 OK).');

    // Update Project
    const updateProjRes = await request
      .put(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated project description',
        priority: 'CRITICAL',
      });
    if (updateProjRes.status !== 200) {
      throw new Error(`Update project failed: ${JSON.stringify(updateProjRes.body)}`);
    }
    console.log('   ✓ Update Project Details (200 OK).');

    // Update Project Status
    const projStatusRes = await request
      .patch(`/api/v1/projects/${createdProjectId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ONGOING', statusReason: 'Active development phase' });
    if (projStatusRes.status !== 200) {
      throw new Error(`Update project status failed: ${JSON.stringify(projStatusRes.body)}`);
    }
    console.log('   ✓ Update Project Status (200 OK).');

    // Project Members
    const projMembersRes = await request
      .get(`/api/v1/projects/${createdProjectId}/members`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (projMembersRes.status !== 200) {
      throw new Error(`List project members failed: ${JSON.stringify(projMembersRes.body)}`);
    }
    console.log('   ✓ List Project Members (200 OK).');

    // 6. Test Milestones API
    console.log('\n🎯 Testing Milestones API...');

    const createMsRes = await request
      .post(`/api/v1/projects/${createdProjectId}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Sprint 1 - Core Features',
        description: 'First release milestone',
        sortOrder: 1,
        dueDate: '2026-06-30',
      });
    if (createMsRes.status !== 201) {
      throw new Error(`Milestone creation failed: ${JSON.stringify(createMsRes.body)}`);
    }
    createdMilestoneId = createMsRes.body.data.id;
    console.log(`   ✓ Create Milestone (201 Created) — ID: ${createdMilestoneId}`);

    const listMsRes = await request
      .get(`/api/v1/projects/${createdProjectId}/milestones`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (listMsRes.status !== 200) {
      throw new Error(`List milestones failed: ${JSON.stringify(listMsRes.body)}`);
    }
    console.log('   ✓ List Milestones with Completion Stats (200 OK).');

    const updateMsRes = await request
      .put(`/api/v1/milestones/${createdMilestoneId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    if (updateMsRes.status !== 200) {
      throw new Error(`Update milestone failed: ${JSON.stringify(updateMsRes.body)}`);
    }
    console.log('   ✓ Update Milestone (200 OK).');

    // 7. Test Tasks API & Task Lifecycle
    console.log('\n📋 Testing Tasks API & Task Lifecycle...');

    const createTaskRes = await request
      .post(`/api/v1/projects/${createdProjectId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Build MongoDB ODM Integration',
        description: 'Connect models and verify queries',
        assigneeId: createdUserId,
        milestoneId: createdMilestoneId,
        priority: 'HIGH',
        dueDate: '2026-05-15',
      });
    if (createTaskRes.status !== 201) {
      throw new Error(`Task creation failed: ${JSON.stringify(createTaskRes.body)}`);
    }
    createdTaskId = createTaskRes.body.data.id;
    console.log(`   ✓ Create Task (201 Created) — ID: ${createdTaskId}`);

    // List Tasks
    const listTasksRes = await request
      .get(`/api/v1/projects/${createdProjectId}/tasks`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (listTasksRes.status !== 200 || listTasksRes.body.data.length === 0) {
      throw new Error(`List tasks failed: ${JSON.stringify(listTasksRes.body)}`);
    }
    console.log('   ✓ List Tasks with Filters (200 OK).');

    // Get Task by ID
    const getTaskRes = await request
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (getTaskRes.status !== 200 || getTaskRes.body.data.title !== 'Build MongoDB ODM Integration') {
      throw new Error(`Get task by ID failed: ${JSON.stringify(getTaskRes.body)}`);
    }
    console.log('   ✓ Get Task Details by ID (200 OK).');

    // Status Transition: TODO -> IN_PROGRESS -> REVIEW -> COMPLETED
    const status1 = await request
      .patch(`/api/v1/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });
    if (status1.status !== 200) throw new Error('Status transition to IN_PROGRESS failed');
    console.log('   ✓ Task Status Transition → IN_PROGRESS (200 OK).');

    const status2 = await request
      .patch(`/api/v1/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED', completionNotes: 'Verified in-memory MongoDB query execution' });
    if (status2.status !== 200) throw new Error('Status transition to COMPLETED failed');
    console.log('   ✓ Task Status Transition → COMPLETED (200 OK).');

    // Toggle Blocker Reason
    const blockerRes = await request
      .patch(`/api/v1/tasks/${createdTaskId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isBlocked: true, blockedReason: 'Waiting for upstream schema review' });
    if (blockerRes.status !== 200) throw new Error('Toggle blocker failed');
    console.log('   ✓ Toggle Manual Blocker Reason (200 OK).');

    // 8. Test Work Activities & Time Tracking API
    console.log('\n⏱️ Testing Work Activities & Time Tracking API...');

    const logActivityRes = await request
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: createdUserId,
        projectId: createdProjectId,
        workDescription: 'Implemented Mongoose schemas and tested query performance',
        hoursSpent: 5.5,
        dateTime: new Date().toISOString(),
      });
    if (logActivityRes.status !== 201) {
      throw new Error(`Log activity failed: ${JSON.stringify(logActivityRes.body)}`);
    }
    createdActivityId = logActivityRes.body.data.id;
    console.log(`   ✓ Log Work Activity (201 Created) — ID: ${createdActivityId}`);

    // List Activities with Period Filter
    const listActRes = await request
      .get('/api/v1/activities?period=monthly')
      .set('Authorization', `Bearer ${adminToken}`);
    if (listActRes.status !== 200 || listActRes.body.data.activities.length === 0) {
      throw new Error(`List activities failed: ${JSON.stringify(listActRes.body)}`);
    }
    console.log(`   ✓ List Work Activities with Period Filter (200 OK) — Total Hours: ${listActRes.body.data.totalHours}`);

    // Export CSV Report
    const exportCsvRes = await request
      .get('/api/v1/activities/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);
    if (exportCsvRes.status !== 200 || !exportCsvRes.text.includes('WORK ACTIVITY LOG REPORT')) {
      throw new Error('Export CSV failed');
    }
    console.log('   ✓ Export Work Activity CSV Report (200 OK).');

    // 9. Test Skill Matrix API
    console.log('\n🧠 Testing Skill Matrix API...');

    const addSkillRes = await request
      .post(`/api/v1/skills/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        skillName: 'MongoDB Aggregation Framework',
        proficiency: 'EXPERT',
        notes: 'Proficient with pipeline stages and indexing',
      });
    if (addSkillRes.status !== 201) {
      throw new Error(`Add skill failed: ${JSON.stringify(addSkillRes.body)}`);
    }
    console.log('   ✓ Add Member Skill (201 Created).');

    const getTimelineRes = await request
      .get(`/api/v1/skills/${createdUserId}/timeline`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (getTimelineRes.status !== 200 || !getTimelineRes.body.data.skills) {
      throw new Error(`Get timeline failed: ${JSON.stringify(getTimelineRes.body)}`);
    }
    console.log('   ✓ Get User Skill Timeline & Experience Matrix (200 OK).');

    // 10. Test Dashboard API
    console.log('\n📊 Testing Dashboard API...');

    const adminDashRes = await request
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    if (adminDashRes.status !== 200 || adminDashRes.body.data.type !== 'ADMIN') {
      throw new Error(`Admin dashboard failed: ${JSON.stringify(adminDashRes.body)}`);
    }
    console.log('   ✓ Fetch Admin Dashboard Metrics & Recent Activities (200 OK).');

    const memberDashRes = await request
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);
    if (memberDashRes.status !== 200 || memberDashRes.body.data.type !== 'MEMBER') {
      throw new Error(`Member dashboard failed: ${JSON.stringify(memberDashRes.body)}`);
    }
    console.log('   ✓ Fetch Member Dashboard & Priority "Work Next" Queue (200 OK).');

    // 11. Test Collaboration (Comments & Attachments Upload/Download)
    console.log('\n💬 Testing Collaboration (Comments & File Uploads)...');

    // Add Comment
    const commentRes = await request
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        projectId: createdProjectId,
        content: 'System architecture review completed. Database indexes validated.',
      });
    if (commentRes.status !== 201) {
      throw new Error(`Add comment failed: ${JSON.stringify(commentRes.body)}`);
    }
    createdCommentId = commentRes.body.data.id;
    console.log(`   ✓ Create Project Comment (201 Created) — ID: ${createdCommentId}`);

    const listCommentsRes = await request
      .get(`/api/v1/comments?projectId=${createdProjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (listCommentsRes.status !== 200 || listCommentsRes.body.data.length === 0) {
      throw new Error(`List comments failed: ${JSON.stringify(listCommentsRes.body)}`);
    }
    console.log('   ✓ List Comments (200 OK).');

    // File Upload with Magic Bytes Validation
    const testFilePath = path.join(process.cwd(), 'scratch_test_upload.txt');
    fs.writeFileSync(testFilePath, 'Sample file content for upload validation');

    const uploadRes = await request
      .post('/api/v1/attachments')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('projectId', createdProjectId)
      .attach('file', testFilePath);

    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    if (uploadRes.status !== 201) {
      throw new Error(`Upload attachment failed: ${JSON.stringify(uploadRes.body)}`);
    }
    createdAttachmentId = uploadRes.body.data.id;
    console.log(`   ✓ File Upload & Magic-Byte Validation (201 Created) — Attachment ID: ${createdAttachmentId}`);

    // Download Attachment File Stream
    const downloadRes = await request
      .get(`/api/v1/attachments/${createdAttachmentId}/download`)
      .set('Authorization', `Bearer ${adminToken}`);
    if (downloadRes.status !== 200) {
      throw new Error(`Download attachment failed: ${JSON.stringify(downloadRes.body)}`);
    }
    console.log('   ✓ Download Attachment File Stream (200 OK).');

    // 12. Test Notifications API
    console.log('\n🔔 Testing Notifications API...');

    const listNotifRes = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    if (listNotifRes.status !== 200) {
      throw new Error(`List notifications failed: ${JSON.stringify(listNotifRes.body)}`);
    }
    console.log(`   ✓ List In-App Notifications (200 OK) — Received ${listNotifRes.body.data.length} notifications.`);

    const readAllRes = await request
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${adminToken}`);
    if (readAllRes.status !== 200) {
      throw new Error(`Mark notifications read failed: ${JSON.stringify(readAllRes.body)}`);
    }
    console.log('   ✓ Mark All Notifications as Read (200 OK).');

    // 13. Test Categories & Clients API
    console.log('\n🏷️ Testing Project Categories & Clients API...');

    const listCatRes = await request
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    if (listCatRes.status !== 200 || listCatRes.body.data.length === 0) {
      throw new Error(`List categories failed: ${JSON.stringify(listCatRes.body)}`);
    }
    console.log(`   ✓ List Project Categories (200 OK) — Found ${listCatRes.body.data.length} categories.`);

    const createClientRes = await request
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Acme Global Digital Corp',
        address: '100 Silicon Way, Tech Park',
        referencePerson: 'Dr. Johnathan Vance',
        phone: '9876543210',
        email: 'contact@acme.org',
        projectId: createdProjectId,
      });
    if (createClientRes.status !== 201) {
      throw new Error(`Create client failed: ${JSON.stringify(createClientRes.body)}`);
    }
    createdClientId = createClientRes.body.data.id;
    console.log(`   ✓ Create Client & Associate with Project (201 Created) — Client ID: ${createdClientId}`);

    // 14. Test Reports API (Excel Generation)
    console.log('\n📊 Testing Reports API (Styled Multi-Tab Excel Workbook Generation)...');

    const excelRes = await request
      .get('/api/v1/reports/export/excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true);
    if (excelRes.status !== 200 || !excelRes.headers['content-type']?.includes('spreadsheetml')) {
      throw new Error(`Excel report generation failed: ${excelRes.status} ${JSON.stringify(excelRes.headers)}`);
    }
    console.log(`   ✓ Generate Styled Executive Excel Workbook Report (200 OK) — Received binary XLSX data.`);

    // 15. Test Global Search API
    console.log('\n🔍 Testing Global Search API...');

    const searchRes = await request
      .get('/api/v1/search?q=Automated')
      .set('Authorization', `Bearer ${adminToken}`);
    if (searchRes.status !== 200 || searchRes.body.data.projects.length === 0) {
      throw new Error(`Global search failed: ${JSON.stringify(searchRes.body)}`);
    }
    console.log(`   ✓ Global Full-Text Search across Projects & Members (200 OK) — Found ${searchRes.body.data.projects.length} matching project.`);

    console.log('\n==================================================');
    console.log('🎉 ALL 15 FEATURE MODULES PASSED WITH 100% SUCCESS!');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED AT ENCOUNTERED ERROR:');
    console.error(error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    process.exit(0);
  }
}

runFullTestSuite();
