import bcrypt from 'bcryptjs';
import { UserRole, MemberType } from '../../types/enums.js';
import {
  User,
  MemberSkill,
  ProjectMember,
  Project,
  Task,
  WorkActivity,
  Comment,
  Attachment,
  Notification,
  ActivityLog,
} from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { cacheGet, cacheSet } from '../../config/redis.js';

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  memberType?: MemberType;
  phone?: string;
  tempPassword?: string;
  skills?: string | string[];
  projectId?: string;
  projectRole?: string;
}

export class UserService {
  static async createUser(input: CreateUserInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      throw new AppError('A user with this email address already exists.', 400);
    }

    const tempPassword = input.tempPassword?.trim() || `Temp#${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      rawPassword: tempPassword,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role || UserRole.TEAM_MEMBER,
      memberType: input.memberType || MemberType.STUDENT,
      phone: input.phone?.trim() || null,
      mustChangePassword: true,
      isActive: true,
    });

    // Save comma-separated skills if provided
    if (input.skills) {
      const skillsArray =
        typeof input.skills === 'string'
          ? input.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : input.skills;

      for (const skillName of skillsArray) {
        try {
          await MemberSkill.create({
            userId: user._id,
            skillName,
            proficiency: 'INTERMEDIATE',
          });
        } catch {
          // Ignore duplicate skill errors
        }
      }
    }

    // Assign user to project if projectId provided
    if (input.projectId) {
      try {
        await ProjectMember.create({
          projectId: input.projectId,
          userId: user._id,
        });
      } catch {
        // Ignore duplicate project membership errors
      }
    }

    // Send welcome email with login credentials
    const { emailService } = await import('../../services/email.service.js');
    try {
      await emailService.sendWelcomeAccountEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        tempPassword,
        user.role
      );
    } catch (emailErr) {
      console.error('Failed to send welcome email notification:', emailErr);
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        memberType: user.memberType,
        phone: user.phone,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
      tempPassword,
    };
  }

  static async listUsers(query: { role?: UserRole; active?: boolean; search?: string; page?: number; limit?: number }) {
    const filter: any = {};

    if (query.role) filter.role = query.role;
    if (typeof query.active === 'boolean') filter.isActive = query.active;
    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }];
    }

    const page = query.page && query.page > 0 ? Number(query.page) : undefined;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    const cacheKey = `users:${query.role || 'all'}:${query.active ?? 'all'}:${query.search || 'none'}:${page || 1}:${limit || 50}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return cached;

    const total = await User.countDocuments(filter);

    let queryBuilder = User.find(filter).sort({ createdAt: -1 });
    if (skip !== undefined) queryBuilder = queryBuilder.skip(skip);
    if (limit !== undefined) queryBuilder = queryBuilder.limit(limit);

    const userDocs = await queryBuilder.lean();
    const userIds = userDocs.map((u: any) => u._id);

    // Fetch skills and project memberships for all users in batch
    const [allSkills, allMemberships] = await Promise.all([
      MemberSkill.find({ userId: { $in: userIds } }).lean(),
      ProjectMember.find({ userId: { $in: userIds } }).lean(),
    ]);

    const projectIds = [...new Set(allMemberships.map((m: any) => m.projectId))];
    const projects = await Project.find({ _id: { $in: projectIds } }, 'name projectType status _id').lean();
    const projectMap = new Map(projects.map((p: any) => [p._id, { id: p._id, name: p.name, projectType: p.projectType, status: p.status }]));

    const users = userDocs.map((u: any) => {
      const userSkills = allSkills
        .filter((s: any) => s.userId === u._id)
        .map((s: any) => ({ id: s._id, skillName: s.skillName, proficiency: s.proficiency }));

      const userMemberships = allMemberships
        .filter((m: any) => m.userId === u._id)
        .map((m: any) => ({
          id: m._id,
          projectId: m.projectId,
          userId: m.userId,
          joinedAt: m.joinedAt,
          project: projectMap.get(m.projectId) || null,
        }));

      return {
        id: u._id,
        email: u.email,
        rawPassword: u.rawPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        memberType: u.memberType,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        bio: u.bio,
        instagramUrl: u.instagramUrl,
        linkedinUrl: u.linkedinUrl,
        githubUrl: u.githubUrl,
        youtubeUrl: u.youtubeUrl,
        facebookUrl: u.facebookUrl,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        skills: userSkills,
        projectMemberships: userMemberships,
      };
    });

    const result =
      page && limit
        ? {
            users,
            meta: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          }
        : users;

    await cacheSet(cacheKey, result, 600);
    return result;
  }

  static async getUserById(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    const [skills, memberships, assignedTasks, workActivities] = await Promise.all([
      MemberSkill.find({ userId }).lean(),
      ProjectMember.find({ userId }).lean(),
      Task.find({ assigneeId: userId }).sort({ dueDate: 1, createdAt: -1 }).lean(),
      WorkActivity.find({ userId }).sort({ createdAt: -1 }).limit(30).lean(),
    ]);

    const projectIds = [
      ...new Set([
        ...memberships.map((m: any) => m.projectId),
        ...assignedTasks.map((t: any) => t.projectId),
        ...workActivities.map((w: any) => w.projectId),
      ]),
    ];

    const projects = await Project.find({ _id: { $in: projectIds } }).lean();
    const projectMap = new Map(projects.map((p: any) => [p._id, { id: p._id, name: p.name, projectType: p.projectType, status: p.status, scope: p.scope }]));

    return {
      id: (user as any)._id,
      email: (user as any).email,
      rawPassword: (user as any).rawPassword,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,
      role: (user as any).role,
      memberType: (user as any).memberType,
      avatarUrl: (user as any).avatarUrl,
      phone: (user as any).phone,
      bio: (user as any).bio,
      instagramUrl: (user as any).instagramUrl,
      linkedinUrl: (user as any).linkedinUrl,
      githubUrl: (user as any).githubUrl,
      youtubeUrl: (user as any).youtubeUrl,
      facebookUrl: (user as any).facebookUrl,
      isActive: (user as any).isActive,
      createdAt: (user as any).createdAt,
      skills: skills.map((s: any) => ({ id: s._id, skillName: s.skillName, proficiency: s.proficiency })),
      projectMemberships: memberships.map((m: any) => ({
        id: m._id,
        project: projectMap.get(m.projectId) || null,
      })),
      assignedTasks: assignedTasks.map((t: any) => ({
        ...t,
        id: t._id,
        project: projectMap.get(t.projectId) || null,
      })),
      workActivities: workActivities.map((w: any) => ({
        ...w,
        id: w._id,
        project: projectMap.get(w.projectId) || null,
      })),
    };
  }

  static async updateUser(userId: string, data: any) {
    const existing = await User.findById(userId);
    if (!existing) throw new AppError('User not found', 404);

    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const emailConflict = await User.findOne({
        email: data.email.toLowerCase().trim(),
        _id: { $ne: userId },
      });
      if (emailConflict) {
        throw new AppError('An account with this email address already exists.', 400);
      }
      existing.email = data.email.toLowerCase().trim();
    }

    if (data.firstName !== undefined) existing.firstName = data.firstName.trim();
    if (data.lastName !== undefined) existing.lastName = data.lastName.trim();
    if (data.phone !== undefined) existing.phone = data.phone ? data.phone.trim() : null;
    if (data.bio !== undefined) existing.bio = data.bio.trim();
    if (data.instagramUrl !== undefined) existing.instagramUrl = data.instagramUrl.trim();
    if (data.linkedinUrl !== undefined) existing.linkedinUrl = data.linkedinUrl.trim();
    if (data.githubUrl !== undefined) existing.githubUrl = data.githubUrl.trim();
    if (data.youtubeUrl !== undefined) existing.youtubeUrl = data.youtubeUrl.trim();
    if (data.facebookUrl !== undefined) existing.facebookUrl = data.facebookUrl.trim();
    if (data.role !== undefined) existing.role = data.role;
    if (data.memberType !== undefined) existing.memberType = data.memberType;

    if (data.password || data.tempPassword || data.rawPassword) {
      const pass = (data.password || data.tempPassword || data.rawPassword).trim();
      if (pass) {
        existing.passwordHash = await bcrypt.hash(pass, 12);
        existing.rawPassword = pass;
        existing.mustChangePassword = false;
      }
    }

    await existing.save();

    // Update skills if provided
    if (data.skills !== undefined) {
      await MemberSkill.deleteMany({ userId });

      const skillsArray =
        typeof data.skills === 'string'
          ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : data.skills || [];

      for (const skillName of skillsArray) {
        try {
          await MemberSkill.create({ userId, skillName, proficiency: 'INTERMEDIATE' });
        } catch {
          // Ignore duplicate skill errors
        }
      }
    }

    // Update project assignment if projectId provided
    if (data.projectId) {
      try {
        await ProjectMember.create({ projectId: data.projectId, userId });
      } catch {
        // Ignore if already a member
      }
    }

    return {
      id: existing._id,
      email: existing.email,
      rawPassword: existing.rawPassword,
      firstName: existing.firstName,
      lastName: existing.lastName,
      role: existing.role,
      memberType: existing.memberType,
      phone: existing.phone,
      bio: existing.bio,
      instagramUrl: existing.instagramUrl,
      linkedinUrl: existing.linkedinUrl,
      githubUrl: existing.githubUrl,
      youtubeUrl: existing.youtubeUrl,
      facebookUrl: existing.facebookUrl,
    };
  }

  static async updateMyProfile(userId: string, data: any) {
    const existing = await User.findById(userId);
    if (!existing) throw new AppError('User not found', 404);

    if (data.firstName !== undefined) existing.firstName = data.firstName.trim();
    if (data.lastName !== undefined) existing.lastName = data.lastName.trim();
    if (data.phone !== undefined) existing.phone = data.phone.trim();
    if (data.bio !== undefined) existing.bio = data.bio.trim();
    if (data.instagramUrl !== undefined) existing.instagramUrl = data.instagramUrl.trim();
    if (data.linkedinUrl !== undefined) existing.linkedinUrl = data.linkedinUrl.trim();
    if (data.githubUrl !== undefined) existing.githubUrl = data.githubUrl.trim();
    if (data.youtubeUrl !== undefined) existing.youtubeUrl = data.youtubeUrl.trim();
    if (data.facebookUrl !== undefined) existing.facebookUrl = data.facebookUrl.trim();
    if (data.avatarUrl !== undefined) existing.avatarUrl = data.avatarUrl.trim();

    await existing.save();

    return {
      id: existing._id,
      email: existing.email,
      firstName: existing.firstName,
      lastName: existing.lastName,
      role: existing.role,
      memberType: existing.memberType,
      avatarUrl: existing.avatarUrl,
      phone: existing.phone,
      mustChangePassword: existing.mustChangePassword,
      bio: existing.bio,
      instagramUrl: existing.instagramUrl,
      linkedinUrl: existing.linkedinUrl,
      githubUrl: existing.githubUrl,
      youtubeUrl: existing.youtubeUrl,
      facebookUrl: existing.facebookUrl,
    };
  }

  static async setUserActiveStatus(userId: string, isActive: boolean, projectId?: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.isActive = isActive;
    await user.save();

    if (isActive && projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        if (project.status === 'CANCELLED') {
          throw new AppError('Cannot assign team members to a cancelled project.', 400);
        }

        // Link member to project
        await ProjectMember.findOneAndUpdate(
          { projectId, userId },
          { projectId, userId },
          { upsert: true, returnDocument: 'after' }
        );

        // Set lead if no lead currently
        if (!project.leadId) {
          project.leadId = userId;
          await project.save();
        }

        // Send email & in-app notification
        const { NotificationService } = await import('../notifications/notification.service.js');
        const { emailService } = await import('../../services/email.service.js');

        await NotificationService.createNotification(userId, {
          type: 'PROJECT_ASSIGNED',
          title: 'Account Activated & Project Assigned',
          message: `Your account is active. You have been assigned to project "${project.name}".`,
          link: `/projects/${project._id}`,
        });

        await emailService.sendProjectAssignmentEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          project.name,
          project.scope || undefined,
          project.targetEndDate || undefined
        );
      }
    }

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    };
  }

  static async resetPassword(userId: string, customTempPassword?: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tempPassword = customTempPassword?.trim() || `Reset#${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    user.passwordHash = passwordHash;
    user.rawPassword = tempPassword;
    user.mustChangePassword = true;
    await user.save();

    // Send password reset email notification
    const { emailService } = await import('../../services/email.service.js');
    try {
      await emailService.sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        tempPassword
      );
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr);
    }

    return { userId, tempPassword };
  }

  static async deleteUser(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    if (user.role === UserRole.ADMIN) {
      const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
      if (adminCount <= 1) throw new AppError('Cannot delete the sole Administrator account.', 400);
    }

    // Find a fallback Admin user to reassign creator fields if needed
    const adminUser = await User.findOne({ role: 'ADMIN', _id: { $ne: userId } });
    const fallbackCreatorId = adminUser ? adminUser._id : userId;

    // 1. Remove project member linkages
    await ProjectMember.deleteMany({ userId });

    // 2. Remove work activity logs where user is member or assigner
    await WorkActivity.deleteMany({
      $or: [{ userId }, { assignedById: userId }],
    });

    // 3. Remove user comments & attachments
    await Comment.deleteMany({ userId });
    await Attachment.deleteMany({ uploadedBy: userId });

    // 4. Remove user activity logs & notifications & skills
    await ActivityLog.deleteMany({ userId });
    await Notification.deleteMany({ userId });
    await MemberSkill.deleteMany({ userId });

    // 5. Unassign lead references on projects
    await Project.updateMany({ leadId: userId }, { leadId: null });
    await Project.updateMany({ previousLeadId: userId }, { previousLeadId: null });

    // 6. Reassign project creator if necessary
    if (fallbackCreatorId !== userId) {
      await Project.updateMany({ createdBy: userId }, { createdBy: fallbackCreatorId });
    }

    // 7. Unassign task assignee and assigner references
    await Task.updateMany({ assigneeId: userId }, { assigneeId: null });
    await Task.updateMany({ assignedBy: userId }, { assignedBy: null });
    if (fallbackCreatorId !== userId) {
      await Task.updateMany({ createdById: userId }, { createdById: fallbackCreatorId });
    }

    // 8. Delete user account
    await User.findByIdAndDelete(userId);

    return { message: 'User account deleted successfully' };
  }
}
