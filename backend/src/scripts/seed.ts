import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/database.js';
import { seedDatabaseIfEmpty } from '../utils/seedHelper.js';
import { logger } from '../utils/logger.js';
import { User, Project, ProjectCategory, ProjectMember, Task, Milestone, WorkActivity, MemberSkill, Comment, Attachment, Notification, ActivityLog, Client } from '../models/index.js';

async function seed() {
  try {
    await connectDB();
    logger.info('🧹 Clearing existing database collections for fresh seed...');

    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      ProjectCategory.deleteMany({}),
      ProjectMember.deleteMany({}),
      Task.deleteMany({}),
      Milestone.deleteMany({}),
      WorkActivity.deleteMany({}),
      MemberSkill.deleteMany({}),
      Comment.deleteMany({}),
      Attachment.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({}),
      Client.deleteMany({}),
    ]);

    await seedDatabaseIfEmpty();
    logger.info('🌱 Database seed finished successfully.');
  } catch (error) {
    logger.error('❌ Seed script error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

seed();
