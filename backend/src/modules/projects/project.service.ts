import {
  Project,
  User,
  ProjectMember,
  Task,
  TaskDependency,
  Milestone,
  WorkActivity,
  Comment,
  Attachment,
  ActivityLog,
  Client,
} from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { ProjectStatus, ProjectType, Priority, UserRole } from '../../types/enums.js';
import { emailService } from '../../services/email.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis.js';

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
      const lead = await User.findById(input.leadId);
      if (!lead) throw new AppError('Specified assigned member does not exist', 404);
    }

    const memberSet = new Set<string>(input.memberIds || []);
    if (input.leadId) {
      memberSet.add(input.leadId);
    }

    const project = await Project.create({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      scope: input.scope?.trim() || null,
      projectType: input.projectType,
      leadId: input.leadId || null,
      clientId: input.clientId || null,
      referencePerson: input.referencePerson?.trim() || null,
      priority: input.priority || Priority.MEDIUM,
      startDate: input.startDate ? new Date(input.startDate) : null,
      targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
      maintenanceRequired: Boolean(input.maintenanceRequired),
      maintenanceNotes: input.maintenanceNotes?.trim() || null,
      createdBy: input.createdBy,
    });

    for (const userId of memberSet) {
      try {
        await ProjectMember.create({
          projectId: project._id,
          userId,
        });
      } catch {
        // Ignore duplicate project member errors
      }
    }

    // Notify assigned members via Email & In-App Notification
    const assignedUserIds = Array.from(memberSet);
    const assignedUsers = await User.find({ _id: { $in: assignedUserIds } }).lean();

    await Promise.allSettled(
      assignedUsers.map(async (userObj: any) => {
        await NotificationService.createNotification(userObj._id, {
          type: 'PROJECT_ASSIGNED',
          title: 'Assigned to Project',
          message: `You have been assigned to project "${project.name}".`,
          link: `/projects/${project._id}`,
        });

        await emailService.sendProjectAssignmentEmail(
          userObj.email,
          `${userObj.firstName} ${userObj.lastName}`,
          project.name,
          project.scope || undefined,
          project.targetEndDate || undefined
        );
      })
    );

    await cacheDelPattern('projects:*');
    await cacheDelPattern('dashboard:*');

    return this.getProjectById(project._id);
  }

  private static lastDeadlineCheck = 0;

  static async checkExpiredProjectDeadlines() {
    const now = Date.now();
    if (now - ProjectService.lastDeadlineCheck < 15 * 60 * 1000) {
      return;
    }
    ProjectService.lastDeadlineCheck = now;

    (async () => {
      try {
        const nowDate = new Date();
        const expiredProjects = await Project.find({
          targetEndDate: { $lt: nowDate },
          status: { $nin: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED, ProjectStatus.AT_RISK] },
        }).lean();

        for (const project of expiredProjects) {
          const deadlineDate = (project as any).targetEndDate
            ? new Date((project as any).targetEndDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'target date';
          const reason = `Project deadline expired on ${deadlineDate}. Automatically moved to AT_RISK category.`;

          await Project.findByIdAndUpdate((project as any)._id, {
            status: ProjectStatus.AT_RISK,
            statusReason: reason,
          });

          const admins = await User.find({ role: UserRole.ADMIN, isActive: true }).lean();
          const leadUser = (project as any).leadId ? await User.findById((project as any).leadId).lean() : null;

          const notifyUsersMap = new Map<string, { id: string; email: string; name: string }>();
          if (leadUser) {
            notifyUsersMap.set((leadUser as any)._id, {
              id: (leadUser as any)._id,
              email: (leadUser as any).email,
              name: `${(leadUser as any).firstName} ${(leadUser as any).lastName}`,
            });
          }
          admins.forEach((a: any) => {
            notifyUsersMap.set(a._id, {
              id: a._id,
              email: a.email,
              name: `${a.firstName} ${a.lastName}`,
            });
          });

          for (const [, userObj] of notifyUsersMap.entries()) {
            await NotificationService.createNotification(userObj.id, {
              type: 'PROJECT_AT_RISK',
              title: `🚨 Project Deadline Expired: ${(project as any).name}`,
              message: `Project "${(project as any).name}" target deadline has expired (${deadlineDate}). Status set to AT_RISK.`,
              link: `/projects/${(project as any)._id}`,
            });

            if (userObj.email) {
              await emailService.sendProjectAssignmentEmail(
                userObj.email,
                userObj.name,
                `🚨 DEADLINE EXPIRED: ${(project as any).name} (AT RISK)`,
                `Project "${(project as any).name}" target deadline has expired. System automatically updated status to AT_RISK. Please review project progress.`,
                (project as any).targetEndDate || undefined
              );
            }
          }
        }
      } catch (err) {
        console.error('Failed to process expired project deadlines:', err);
      }
    })().catch((err) => console.error('Deadline background check error:', err));
  }

  static async listProjects(user: { id: string; role: UserRole }, filters: { status?: ProjectStatus; search?: string }) {
    await ProjectService.checkExpiredProjectDeadlines();
    const query: any = {};

    if (user.role !== UserRole.ADMIN) {
      const userMemberships = await ProjectMember.find({ userId: user.id }, 'projectId').lean();
      const memberProjectIds = userMemberships.map((m: any) => m.projectId);
      query.$or = [{ leadId: user.id }, { _id: { $in: memberProjectIds } }];
    }

    if (filters.status) {
      if (filters.status === 'ONGOING' || filters.status === 'ACTIVE') {
        query.status = { $in: ['ONGOING', 'ACTIVE'] };
      } else {
        query.status = filters.status;
      }
    }

    if (filters.search) {
      query.name = new RegExp(filters.search, 'i');
    }

    const cacheKey = `projects:${user.role}:${user.id}:${filters.status || 'all'}:${filters.search || 'none'}`;
    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) return cached;

    const projectDocs = await Project.find(query).sort({ createdAt: -1 }).lean();
    const projectIds = projectDocs.map((p: any) => p._id);

    const [allLeads, allPrevLeads, allCreators, allClients, allMemberships, allTasks] = await Promise.all([
      User.find({ _id: { $in: projectDocs.map((p: any) => p.leadId).filter(Boolean) } }, 'firstName lastName email avatarUrl _id').lean(),
      User.find({ _id: { $in: projectDocs.map((p: any) => p.previousLeadId).filter(Boolean) } }, 'firstName lastName email _id').lean(),
      User.find({ _id: { $in: projectDocs.map((p: any) => p.createdBy).filter(Boolean) } }, 'firstName lastName email _id').lean(),
      Client.find({ _id: { $in: projectDocs.map((p: any) => p.clientId).filter(Boolean) } }).lean(),
      ProjectMember.find({ projectId: { $in: projectIds } }).lean(),
      Task.find({ projectId: { $in: projectIds } }, 'projectId status _id').lean(),
    ]);

    const leadMap = new Map(allLeads.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, avatarUrl: u.avatarUrl }]));
    const prevLeadMap = new Map(allPrevLeads.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email }]));
    const creatorMap = new Map(allCreators.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email }]));
    const clientMap = new Map(allClients.map((c: any) => [c._id, { id: c._id, name: c.name, phone: c.phone, email: c.email, address: c.address, referencePerson: c.referencePerson }]));

    const result = projectDocs.map((p: any) => {
      const projTasks = allTasks.filter((t: any) => t.projectId === p._id);
      const completedTasks = projTasks.filter((t: any) => t.status === 'COMPLETED').length;
      const memberCount = allMemberships.filter((m: any) => m.projectId === p._id).length;

      return {
        ...p,
        id: p._id,
        lead: p.leadId ? leadMap.get(p.leadId) || null : null,
        previousLead: p.previousLeadId ? prevLeadMap.get(p.previousLeadId) || null : null,
        creator: creatorMap.get(p.createdBy) || null,
        client: p.clientId ? clientMap.get(p.clientId) || null : null,
        totalTasks: projTasks.length,
        completedTasks,
        memberCount,
      };
    });

    await cacheSet(cacheKey, result, 600);
    return result;
  }

  static async getProjectById(projectId: string) {
    await ProjectService.checkExpiredProjectDeadlines();
    const project = await Project.findById(projectId).lean();

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const [lead, previousLead, creator, client, memberships, milestones, tasks] = await Promise.all([
      (project as any).leadId ? User.findById((project as any).leadId, 'firstName lastName email avatarUrl _id').lean() : null,
      (project as any).previousLeadId ? User.findById((project as any).previousLeadId, 'firstName lastName email _id').lean() : null,
      User.findById((project as any).createdBy, 'firstName lastName email role _id').lean(),
      (project as any).clientId ? Client.findById((project as any).clientId).lean() : null,
      ProjectMember.find({ projectId }).lean(),
      Milestone.find({ projectId }).sort({ sortOrder: 1 }).lean(),
      Task.find({ projectId }).lean(),
    ]);

    const memberUserIds = memberships.map((m: any) => m.userId);
    const memberUsers = await User.find(
      { _id: { $in: memberUserIds } },
      'firstName lastName email role memberType _id'
    ).lean();
    const memberUserMap = new Map(memberUsers.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, memberType: u.memberType }]));

    const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;

    return {
      ...(project as any),
      id: (project as any)._id,
      lead: lead ? { id: (lead as any)._id, firstName: (lead as any).firstName, lastName: (lead as any).lastName, email: (lead as any).email, avatarUrl: (lead as any).avatarUrl } : null,
      previousLead: previousLead ? { id: (previousLead as any)._id, firstName: (previousLead as any).firstName, lastName: (previousLead as any).lastName, email: (previousLead as any).email } : null,
      creator: creator ? { id: (creator as any)._id, firstName: (creator as any).firstName, lastName: (creator as any).lastName, email: (creator as any).email, role: (creator as any).role } : null,
      client: client ? { id: (client as any)._id, name: (client as any).name, phone: (client as any).phone, email: (client as any).email, address: (client as any).address, referencePerson: (client as any).referencePerson } : null,
      members: memberships.map((m: any) => ({
        id: m._id,
        projectId: m.projectId,
        userId: m.userId,
        joinedAt: m.joinedAt,
        user: memberUserMap.get(m.userId) || null,
      })),
      milestones: milestones.map((ms: any) => ({ ...ms, id: ms._id })),
      totalTasks: tasks.length,
      completedTasks,
    };
  }

  static async updateProjectStatus(projectId: string, status: ProjectStatus, statusReason?: string) {
    const existing = await Project.findById(projectId);
    if (!existing) throw new AppError('Project not found', 404);

    existing.status = status;
    existing.statusReason = statusReason?.trim() || null;
    if (status === ProjectStatus.COMPLETED) {
      existing.actualEndDate = new Date();
    }

    await existing.save();
    return this.getProjectById(projectId);
  }

  static async updateProject(projectId: string, data: any) {
    const existing = await Project.findById(projectId);
    if (!existing) throw new AppError('Project not found', 404);

    let previousLeadId = existing.previousLeadId;
    let handedOverAt = existing.handedOverAt;

    if (data.leadId && data.leadId !== existing.leadId) {
      previousLeadId = existing.leadId;
      handedOverAt = new Date();

      await ProjectMember.findOneAndUpdate(
        { projectId, userId: data.leadId },
        { projectId, userId: data.leadId },
        { upsert: true }
      );

      const newLeadUser = await User.findById(data.leadId);
      if (newLeadUser) {
        await NotificationService.createNotification(newLeadUser._id, {
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
          existing.targetEndDate || undefined
        );
      }
    }

    if (data.name !== undefined) existing.name = data.name.trim();
    if (data.description !== undefined) existing.description = data.description?.trim() || null;
    if (data.scope !== undefined) existing.scope = data.scope?.trim() || null;
    if (data.projectType !== undefined) existing.projectType = data.projectType;
    if (data.leadId !== undefined) existing.leadId = data.leadId;
    if (data.clientId !== undefined) existing.clientId = data.clientId || null;
    if (data.referencePerson !== undefined) existing.referencePerson = data.referencePerson?.trim() || null;
    if (data.priority !== undefined) existing.priority = data.priority;
    if (data.status !== undefined) existing.status = data.status;
    if (data.statusReason !== undefined) existing.statusReason = data.statusReason?.trim() || null;
    if (data.startDate !== undefined) existing.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.targetEndDate !== undefined) existing.targetEndDate = data.targetEndDate ? new Date(data.targetEndDate) : null;
    if (data.maintenanceRequired !== undefined) existing.maintenanceRequired = Boolean(data.maintenanceRequired);
    if (data.maintenanceNotes !== undefined) existing.maintenanceNotes = data.maintenanceNotes?.trim() || null;

    existing.previousLeadId = previousLeadId;
    existing.handedOverAt = handedOverAt;

    await existing.save();
    return this.getProjectById(projectId);
  }

  static async deleteProject(projectId: string) {
    const existing = await Project.findById(projectId);
    if (!existing) throw new AppError('Project not found', 404);

    const projectTasks = await Task.find({ projectId }, '_id').lean();
    const taskIds = projectTasks.map((t: any) => t._id);

    if (taskIds.length > 0) {
      await TaskDependency.deleteMany({
        $or: [{ taskId: { $in: taskIds } }, { dependsOnId: { $in: taskIds } }],
      });
    }

    await Comment.deleteMany({
      $or: [{ projectId }, { taskId: { $in: taskIds } }],
    });
    await Attachment.deleteMany({
      $or: [{ projectId }, { taskId: { $in: taskIds } }],
    });

    await WorkActivity.deleteMany({ projectId });
    await Task.deleteMany({ projectId });
    await Milestone.deleteMany({ projectId });
    await ProjectMember.deleteMany({ projectId });
    await ActivityLog.deleteMany({ projectId });
    await Project.findByIdAndDelete(projectId);

    return { message: 'Project and all associated data permanently removed.' };
  }
}
