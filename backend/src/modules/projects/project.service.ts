import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { ProjectStatus, ProjectType, Priority, UserRole } from '../../types/enums.js';
import { emailService } from '../../services/email.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { AuditService } from '../../services/audit.service.js';

export interface CreateProjectInput {
  name: string;
  description?: string;
  scope?: string;
  projectType: ProjectType;
  leadId?: string;
  clientId?: string;
  referencePerson?: string;
  priority?: Priority;
  startDate?: string;
  targetEndDate?: string;
  maintenanceRequired?: boolean;
  maintenanceNotes?: string;
  memberIds?: string[];
  createdBy: string;
}

export class ProjectService {
  static async createProject(input: CreateProjectInput) {
    if (input.leadId) {
      const lead = await prisma.user.findUnique({ where: { id: input.leadId } });
      if (!lead) throw new AppError('Specified assigned member does not exist', 404);
    }

    const memberSet = new Set<string>(input.memberIds || []);
    if (input.leadId) {
      memberSet.add(input.leadId);
    }

    const project = await prisma.project.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim(),
        scope: input.scope?.trim(),
        projectType: input.projectType,
        leadId: input.leadId || null,
        clientId: input.clientId || null,
        referencePerson: input.referencePerson?.trim() || null,
        priority: input.priority || Priority.MEDIUM,
        startDate: input.startDate ? new Date(input.startDate) : null,
        targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
        maintenanceRequired: Boolean(input.maintenanceRequired),
        maintenanceNotes: input.maintenanceNotes?.trim(),
        createdBy: input.createdBy,
        members: {
          create: Array.from(memberSet).map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
      },
    });

    // Notify assigned members via Email & In-App Notification (batch fetch to avoid N+1)
    const assignedUserIds = Array.from(memberSet);
    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: assignedUserIds } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    // Fire notifications concurrently for better performance
    await Promise.allSettled(
      assignedUsers.map(async (userObj) => {
        await NotificationService.createNotification(userObj.id, {
          type: 'PROJECT_ASSIGNED',
          title: 'Assigned to Project',
          message: `You have been assigned to project "${project.name}".`,
          link: `/projects/${project.id}`,
        });

        await emailService.sendProjectAssignmentEmail(
          userObj.email,
          `${userObj.firstName} ${userObj.lastName}`,
          project.name,
          project.scope || undefined,
          project.targetEndDate
        );
      })
    );

    return project;
  }

  static async checkExpiredProjectDeadlines() {
    try {
      const now = new Date();
      const expiredProjects = await prisma.project.findMany({
        where: {
          targetEndDate: { lt: now },
          status: { notIn: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED, ProjectStatus.AT_RISK] },
        },
        include: {
          lead: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      for (const project of expiredProjects) {
        const deadlineDate = project.targetEndDate
          ? new Date(project.targetEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'target date';
        const reason = `Project deadline expired on ${deadlineDate}. Automatically moved to AT_RISK category.`;

        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: ProjectStatus.AT_RISK,
            statusReason: reason,
          },
        });

        const admins = await prisma.user.findMany({
          where: { role: UserRole.ADMIN, isActive: true },
          select: { id: true, email: true, firstName: true, lastName: true },
        });

        const notifyUsersMap = new Map<string, { id: string; email: string; name: string }>();
        if (project.lead) {
          notifyUsersMap.set(project.lead.id, {
            id: project.lead.id,
            email: project.lead.email,
            name: `${project.lead.firstName} ${project.lead.lastName}`,
          });
        }
        admins.forEach((a) => {
          notifyUsersMap.set(a.id, {
            id: a.id,
            email: a.email,
            name: `${a.firstName} ${a.lastName}`,
          });
        });

        for (const [, userObj] of notifyUsersMap.entries()) {
          await NotificationService.createNotification(userObj.id, {
            type: 'PROJECT_AT_RISK',
            title: `🚨 Project Deadline Expired: ${project.name}`,
            message: `Project "${project.name}" target deadline has expired (${deadlineDate}). Status set to AT_RISK.`,
            link: `/projects/${project.id}`,
          });

          if (userObj.email) {
            await emailService.sendProjectAssignmentEmail(
              userObj.email,
              userObj.name,
              `🚨 DEADLINE EXPIRED: ${project.name} (AT RISK)`,
              `Project "${project.name}" target deadline has expired. System automatically updated status to AT_RISK. Please review project progress.`,
              project.targetEndDate
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to process expired project deadlines:', err);
    }
  }

  static async listProjects(user: { id: string; role: UserRole }, filters: { status?: ProjectStatus; search?: string }) {
    await ProjectService.checkExpiredProjectDeadlines();
    const where: any = {};

    // Filter by role visibility: Non-Admin users ONLY see projects explicitly assigned to them
    if (user.role !== UserRole.ADMIN) {
      where.OR = [
        { leadId: user.id },
        { members: { some: { userId: user.id } } },
      ];
    }

    if (filters.status) {
      if (filters.status === 'ONGOING' || filters.status === 'ACTIVE') {
        where.status = { in: ['ONGOING', 'ACTIVE'] };
      } else {
        where.status = filters.status;
      }
    }

    if (filters.search) {
      where.name = { contains: filters.search };
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        previousLead: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: { id: true, name: true, phone: true, email: true, address: true, referencePerson: true },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectIds = projects.map((p: any) => p.id);
    const completedCounts = await prisma.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        status: 'COMPLETED',
      },
      _count: { id: true },
    });

    const completedMap = new Map(completedCounts.map((c: any) => [c.projectId, c._count.id]));

    return projects.map((p: any) => ({
      ...p,
      totalTasks: p._count.tasks,
      completedTasks: completedMap.get(p.id) || 0,
      memberCount: p._count.members,
    }));
  }

  static async getProjectById(projectId: string) {
    await ProjectService.checkExpiredProjectDeadlines();
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        previousLead: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        client: {
          select: { id: true, name: true, phone: true, email: true, address: true, referencePerson: true },
        },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, memberType: true } },
          },
        },
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const completedTasks = await prisma.task.count({
      where: { projectId, status: 'COMPLETED' },
    });

    return {
      ...project,
      totalTasks: project._count.tasks,
      completedTasks,
    };
  }

  static async updateProjectStatus(projectId: string, status: ProjectStatus, statusReason?: string) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new AppError('Project not found', 404);

    const updateData: any = {
      status,
      statusReason: statusReason?.trim() || null,
    };

    if (status === ProjectStatus.COMPLETED) {
      updateData.actualEndDate = new Date();
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return updated;
  }

  static async updateProject(projectId: string, data: any) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new AppError('Project not found', 404);

    let previousLeadId = existing.previousLeadId;
    let handedOverAt = existing.handedOverAt;

    // Track handover if lead/responsible member changes
    if (data.leadId && data.leadId !== existing.leadId) {
      previousLeadId = existing.leadId;
      handedOverAt = new Date();

      const isMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: data.leadId } },
      });
      if (!isMember) {
        await prisma.projectMember.create({
          data: { projectId, userId: data.leadId },
        });
      }

      // Notify new assigned lead
      const newLeadUser = await prisma.user.findUnique({ where: { id: data.leadId } });
      if (newLeadUser) {
        await NotificationService.createNotification(newLeadUser.id, {
          type: 'PROJECT_HANDOVER',
          title: 'Project Responsibility Handover',
          message: `You are now responsible for project "${existing.name}".`,
          link: `/projects/${projectId}`,
        });

        await emailService.sendProjectAssignmentEmail(
          newLeadUser.email,
          `${newLeadUser.firstName} ${newLeadUser.lastName}`,
          existing.name,
          existing.scope || undefined,
          existing.targetEndDate
        );
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim(),
        scope: data.scope?.trim(),
        projectType: data.projectType,
        leadId: data.leadId,
        clientId: data.clientId !== undefined ? data.clientId || null : undefined,
        referencePerson: data.referencePerson !== undefined ? data.referencePerson?.trim() || null : undefined,
        previousLeadId,
        handedOverAt,
        priority: data.priority,
        status: data.status,
        statusReason: data.statusReason?.trim(),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined,
        maintenanceRequired: data.maintenanceRequired !== undefined ? Boolean(data.maintenanceRequired) : undefined,
        maintenanceNotes: data.maintenanceNotes?.trim(),
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        previousLead: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, name: true, phone: true, email: true, address: true, referencePerson: true } },
      },
    });

    return updated;
  }

  static async deleteProject(projectId: string) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new AppError('Project not found', 404);

    await prisma.$transaction(async (tx) => {
      // 1. Delete task dependencies
      const projectTasks = await tx.task.findMany({
        where: { projectId },
        select: { id: true },
      });
      const taskIds = projectTasks.map((t) => t.id);

      if (taskIds.length > 0) {
        await tx.taskDependency.deleteMany({
          where: {
            OR: [{ taskId: { in: taskIds } }, { dependsOnId: { in: taskIds } }],
          },
        });
      }

      // 2. Delete comments & attachments linked to tasks or project
      await tx.comment.deleteMany({
        where: { OR: [{ projectId }, { taskId: { in: taskIds } }] },
      });
      await tx.attachment.deleteMany({
        where: { OR: [{ projectId }, { taskId: { in: taskIds } }] },
      });

      // 3. Delete work activities linked to project
      await tx.workActivity.deleteMany({ where: { projectId } });

      // 4. Delete tasks & subtasks
      await tx.task.deleteMany({ where: { projectId } });

      // 5. Delete milestones
      await tx.milestone.deleteMany({ where: { projectId } });

      // 6. Delete project members
      await tx.projectMember.deleteMany({ where: { projectId } });

      // 7. Delete activity logs referencing project
      await tx.activityLog.deleteMany({ where: { projectId } });

      // 8. Hard delete project
      await tx.project.delete({ where: { id: projectId } });
    });

    return { message: 'Project and all associated data permanently removed.' };
  }
}
