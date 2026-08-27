import bcrypt from 'bcryptjs';
import { UserRole, MemberType } from '../../types/enums.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis.js';

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
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new AppError('A user with this email address already exists.', 400);
    }

    const tempPassword = input.tempPassword?.trim() || `Temp#${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        rawPassword: tempPassword,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: input.role || UserRole.TEAM_MEMBER,
        memberType: input.memberType || MemberType.STUDENT,
        phone: input.phone?.trim() || null,
        mustChangePassword: true,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        memberType: true,
        phone: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    // Save comma-separated skills if provided
    if (input.skills) {
      const skillsArray = typeof input.skills === 'string'
        ? input.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : input.skills;

      for (const skillName of skillsArray) {
        try {
          await prisma.memberSkill.create({
            data: {
              userId: user.id,
              skillName,
              proficiency: 'INTERMEDIATE',
            },
          });
        } catch {
          // Ignore duplicate skill errors
        }
      }
    }

    // Assign user to project if projectId provided
    if (input.projectId) {
      try {
        await prisma.projectMember.create({
          data: {
            projectId: input.projectId,
            userId: user.id,
          },
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
      user,
      tempPassword,
    };
  }

  static async listUsers(query: { role?: UserRole; active?: boolean; search?: string; page?: number; limit?: number }) {
    const where: any = {};

    if (query.role) where.role = query.role;
    if (typeof query.active === 'boolean') where.isActive = query.active;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    const page = query.page && query.page > 0 ? Number(query.page) : undefined;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    const cacheKey = `users:${query.role || 'all'}:${query.active ?? 'all'}:${query.search || 'none'}:${page || 1}:${limit || 50}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) return cached;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(limit !== undefined && { take: limit }),
        select: {
          id: true,
          email: true,
          rawPassword: true,
          firstName: true,
          lastName: true,
          role: true,
          memberType: true,
          avatarUrl: true,
          phone: true,
          bio: true,
          instagramUrl: true,
          linkedinUrl: true,
          githubUrl: true,
          youtubeUrl: true,
          facebookUrl: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
          skills: { select: { id: true, skillName: true, proficiency: true } },
          projectMemberships: {
            include: {
              project: { select: { id: true, name: true, projectType: true, status: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const result = page && limit
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

    await cacheSet(cacheKey, result, 20);
    return result;
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        rawPassword: true,
        firstName: true,
        lastName: true,
        role: true,
        memberType: true,
        avatarUrl: true,
        phone: true,
        bio: true,
        instagramUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        youtubeUrl: true,
        facebookUrl: true,
        isActive: true,
        createdAt: true,
        skills: { select: { id: true, skillName: true, proficiency: true } },
        projectMemberships: {
          include: {
            project: { select: { id: true, name: true, projectType: true, status: true, scope: true } },
          },
        },
        assignedTasks: {
          include: {
            project: { select: { id: true, name: true, projectType: true } },
            milestone: { select: { id: true, name: true } },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        },
        workActivities: {
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  static async updateUser(userId: string, data: any) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new AppError('User not found', 404);

    if (data.email && data.email.toLowerCase().trim() !== existing.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (emailConflict) {
        throw new AppError('An account with this email address already exists.', 400);
      }
    }

    const updatePayload: any = {
      firstName: data.firstName ? data.firstName.trim() : existing.firstName,
      lastName: data.lastName ? data.lastName.trim() : existing.lastName,
      email: data.email ? data.email.toLowerCase().trim() : existing.email,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone,
      bio: data.bio !== undefined ? data.bio.trim() : existing.bio,
      instagramUrl: data.instagramUrl !== undefined ? data.instagramUrl.trim() : existing.instagramUrl,
      linkedinUrl: data.linkedinUrl !== undefined ? data.linkedinUrl.trim() : existing.linkedinUrl,
      githubUrl: data.githubUrl !== undefined ? data.githubUrl.trim() : existing.githubUrl,
      youtubeUrl: data.youtubeUrl !== undefined ? data.youtubeUrl.trim() : existing.youtubeUrl,
      facebookUrl: data.facebookUrl !== undefined ? data.facebookUrl.trim() : existing.facebookUrl,
      role: data.role || existing.role,
      memberType: data.memberType || existing.memberType || MemberType.STUDENT,
    };

    if (data.password || data.tempPassword || data.rawPassword) {
      const pass = (data.password || data.tempPassword || data.rawPassword).trim();
      if (pass) {
        updatePayload.passwordHash = await bcrypt.hash(pass, 12);
        updatePayload.rawPassword = pass;
        updatePayload.mustChangePassword = false;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        id: true,
        email: true,
        rawPassword: true,
        firstName: true,
        lastName: true,
        role: true,
        memberType: true,
        phone: true,
        bio: true,
        instagramUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        youtubeUrl: true,
        facebookUrl: true,
      },
    });

    // Update skills if provided
    if (data.skills !== undefined) {
      await prisma.memberSkill.deleteMany({ where: { userId } });

      const skillsArray = typeof data.skills === 'string'
        ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : data.skills || [];

      for (const skillName of skillsArray) {
        try {
          await prisma.memberSkill.create({
            data: { userId, skillName, proficiency: 'INTERMEDIATE' },
          });
        } catch {
          // Ignore duplicate skill errors
        }
      }
    }

    // Update project assignment if projectId provided
    if (data.projectId) {
      try {
        await prisma.projectMember.create({
          data: { projectId: data.projectId, userId },
        });
      } catch {
        // Ignore if already a member
      }
    }

    return updated;
  }

  static async updateMyProfile(userId: string, data: any) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new AppError('User not found', 404);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName !== undefined ? data.firstName.trim() : existing.firstName,
        lastName: data.lastName !== undefined ? data.lastName.trim() : existing.lastName,
        phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
        bio: data.bio !== undefined ? data.bio.trim() : existing.bio,
        instagramUrl: data.instagramUrl !== undefined ? data.instagramUrl.trim() : existing.instagramUrl,
        linkedinUrl: data.linkedinUrl !== undefined ? data.linkedinUrl.trim() : existing.linkedinUrl,
        githubUrl: data.githubUrl !== undefined ? data.githubUrl.trim() : existing.githubUrl,
        youtubeUrl: data.youtubeUrl !== undefined ? data.youtubeUrl.trim() : existing.youtubeUrl,
        facebookUrl: data.facebookUrl !== undefined ? data.facebookUrl.trim() : existing.facebookUrl,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl.trim() : existing.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        memberType: true,
        avatarUrl: true,
        phone: true,
        mustChangePassword: true,
        bio: true,
        instagramUrl: true,
        linkedinUrl: true,
        githubUrl: true,
        youtubeUrl: true,
        facebookUrl: true,
      },
    });

    return updated;
  }

  static async setUserActiveStatus(userId: string, isActive: boolean, projectId?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    if (isActive && projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project) {
        if (project.status === 'CANCELLED') {
          throw new AppError('Cannot assign team members to a cancelled project.', 400);
        }

        // Link member to project
        await prisma.projectMember.upsert({
          where: { projectId_userId: { projectId, userId } },
          update: {},
          create: { projectId, userId },
        });

        // Set lead if no lead currently
        if (!project.leadId) {
          await prisma.project.update({
            where: { id: projectId },
            data: { leadId: userId },
          });
        }

        // Send email & in-app notification
        const { NotificationService } = await import('../notifications/notification.service.js');
        const { emailService } = await import('../../services/email.service.js');

        await NotificationService.createNotification(userId, {
          type: 'PROJECT_ASSIGNED',
          title: 'Account Activated & Project Assigned',
          message: `Your account is active. You have been assigned to project "${project.name}".`,
          link: `/projects/${project.id}`,
        });

        await emailService.sendProjectAssignmentEmail(
          user.email,
          `${user.firstName} ${user.lastName}`,
          project.name,
          project.scope || undefined,
          project.targetEndDate
        );
      }
    }

    return updated;
  }

  static async resetPassword(userId: string, customTempPassword?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const tempPassword = customTempPassword?.trim() || `Reset#${Math.random().toString(36).slice(-6)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        rawPassword: tempPassword,
        mustChangePassword: true,
      },
    });

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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    if (user.role === UserRole.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) throw new AppError('Cannot delete the sole Administrator account.', 400);
    }

    // Find a fallback Admin user to reassign creator fields if needed
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', id: { not: userId } },
    });
    const fallbackCreatorId = adminUser ? adminUser.id : userId;

    await prisma.$transaction(async (tx) => {
      // 1. Remove project member linkages
      await tx.projectMember.deleteMany({ where: { userId } });

      // 2. Remove work activity logs where user is member or assigner
      await tx.workActivity.deleteMany({
        where: { OR: [{ userId }, { assignedById: userId }] },
      });

      // 3. Remove user comments & attachments
      await tx.comment.deleteMany({ where: { userId } });
      await tx.attachment.deleteMany({ where: { uploadedBy: userId } });

      // 4. Remove user activity logs & notifications & skills
      await tx.activityLog.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.memberSkill.deleteMany({ where: { userId } });

      // 5. Unassign lead references on projects
      await tx.project.updateMany({
        where: { leadId: userId },
        data: { leadId: null },
      });
      await tx.project.updateMany({
        where: { previousLeadId: userId },
        data: { previousLeadId: null },
      });

      // 6. Reassign project creator if necessary
      if (fallbackCreatorId !== userId) {
        await tx.project.updateMany({
          where: { createdBy: userId },
          data: { createdBy: fallbackCreatorId },
        });
      }

      // 7. Unassign task assignee and assigner references
      await tx.task.updateMany({
        where: { assigneeId: userId },
        data: { assigneeId: null },
      });
      await tx.task.updateMany({
        where: { assignedBy: userId },
        data: { assignedBy: null },
      });
      if (fallbackCreatorId !== userId) {
        await tx.task.updateMany({
          where: { createdById: userId },
          data: { createdById: fallbackCreatorId },
        });
      }

      // 8. Hard delete user account
      await tx.user.delete({ where: { id: userId } });
    });

    return { message: 'User account deleted successfully' };
  }
}
