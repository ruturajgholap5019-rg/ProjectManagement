import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { TaskStatus, Priority, UserRole } from '../../types/enums.js';

export interface CreateTaskInput {
  projectId: string;
  milestoneId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: Priority;
  startDate?: string;
  dueDate?: string;
  createdById: string;
}

export class TaskService {
  static async createTask(input: CreateTaskInput) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new AppError('Project not found', 404);

    // If assigneeId specified, verify assignee is a project member or lead
    if (input.assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: input.projectId, userId: input.assigneeId } },
      });
      const isLead = project.leadId === input.assigneeId;
      if (!isMember && !isLead) {
        throw new AppError('Assignee must be a member of the project.', 400);
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId: input.projectId,
        milestoneId: input.milestoneId || null,
        parentTaskId: input.parentTaskId || null,
        title: input.title.trim(),
        description: input.description?.trim(),
        assigneeId: input.assigneeId || null,
        assignedBy: input.assigneeId ? input.createdById : null,
        assignedAt: input.assigneeId ? new Date() : null,
        priority: input.priority || Priority.MEDIUM,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdById: input.createdById,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    // Send email notification to assigned team member
    if (task.assignee && task.assignee.email) {
      const { emailService } = await import('../../services/email.service.js');
      try {
        await emailService.sendTaskAssignmentEmail(
          task.assignee.email,
          `${task.assignee.firstName} ${task.assignee.lastName}`,
          task.title,
          project.name,
          task.priority,
          task.dueDate,
          task.description || undefined
        );
      } catch (emailErr) {
        console.error('Failed to send task assignment email notification:', emailErr);
      }
    }

    return task;
  }

  static async listTasks(filters: { projectId?: string; assigneeId?: string; status?: TaskStatus; milestoneId?: string; search?: string }) {
    const where: any = {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.status) where.status = filters.status;
    if (filters.milestoneId) where.milestoneId = filters.milestoneId;
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        milestone: { select: { id: true, name: true } },
        subtasks: {
          select: { id: true, title: true, status: true, assigneeId: true },
        },
        dependsOn: {
          include: {
            dependsOn: { select: { id: true, title: true, status: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks;
  }

  static async getMyTasks(user: { id: string; role: UserRole }) {
    const where: any = {};

    if (user.role !== UserRole.ADMIN) {
      where.OR = [
        { assigneeId: user.id },
        { project: { leadId: user.id } },
        { project: { members: { some: { userId: user.id } } } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectType: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return tasks;
  }

  static async getTaskById(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true, leadId: true } },
        milestone: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        assigner: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        subtasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        dependsOn: {
          include: {
            dependsOn: { select: { id: true, title: true, status: true } },
          },
        },
        dependedOnBy: {
          include: {
            task: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!task) throw new AppError('Task not found', 404);

    // Compute derived dependency status (are any predecessors incomplete?)
    const incompleteDeps = task.dependsOn.filter((d) => d.dependsOn.status !== 'COMPLETED');
    const isDependencyBlocked = incompleteDeps.length > 0;

    return {
      ...task,
      isDependencyBlocked,
      blockedByDependencies: incompleteDeps.map((d) => d.dependsOn),
    };
  }

  static async updateTaskStatus(taskId: string, newStatus: TaskStatus, user: { id: string; role: UserRole }, completionNotes?: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) throw new AppError('Task not found', 404);

    const isAssignee = task.assigneeId === user.id;
    const isLead = task.project.leadId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAssignee && !isLead && !isAdmin) {
      throw new AppError('Only the assigned Team Member, Project Lead, or Admin can update task status.', 403);
    }

    const data: any = { status: newStatus };
    if (completionNotes !== undefined && completionNotes !== null) {
      data.completionNotes = completionNotes.trim() || null;
    }

    if (newStatus === TaskStatus.COMPLETED) {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const { AuditService } = await import('../../services/audit.service.js');
    await AuditService.log({
      userId: user.id,
      action: 'TASK_STATUS_UPDATED',
      projectId: task.projectId,
      taskId,
      details: { previousStatus: task.status, newStatus },
    });

    return updated;
  }

  static async updateTask(taskId: string, input: any, user: { id: string; role: UserRole }) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) throw new AppError('Task not found', 404);

    const isAssignee = task.assigneeId === user.id;
    const isLead = task.project.leadId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAssignee && !isLead && !isAdmin) {
      throw new AppError('Only the assignee, Project Lead, or Admin can edit task details.', 403);
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.milestoneId !== undefined) updateData.milestoneId = input.milestoneId;
    if (input.startDate !== undefined) updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;

    if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
      if (input.assigneeId) {
        const isMember = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: task.projectId, userId: input.assigneeId } },
        });
        const isProjectLead = task.project.leadId === input.assigneeId;
        if (!isMember && !isProjectLead) {
          throw new AppError('Assignee must be a member of the project.', 400);
        }
      }
      updateData.assigneeId = input.assigneeId;
      updateData.assignedBy = user.id;
      updateData.assignedAt = new Date();
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    const { AuditService } = await import('../../services/audit.service.js');
    await AuditService.log({
      userId: user.id,
      action: 'TASK_UPDATED',
      projectId: task.projectId,
      taskId,
      details: { updatedFields: Object.keys(updateData) },
    });

    // Send email notification to new assignee if assignee changed
    if (input.assigneeId && input.assigneeId !== task.assigneeId && updated.assignee && updated.assignee.email) {
      const { emailService } = await import('../../services/email.service.js');
      try {
        await emailService.sendTaskAssignmentEmail(
          updated.assignee.email,
          `${updated.assignee.firstName} ${updated.assignee.lastName}`,
          updated.title,
          task.project.name,
          updated.priority,
          updated.dueDate,
          updated.description || undefined
        );
      } catch (emailErr) {
        console.error('Failed to send task assignment email notification:', emailErr);
      }
    }

    return updated;
  }

  static async addDependency(taskId: string, dependsOnId: string) {
    if (taskId === dependsOnId) {
      throw new AppError('A task cannot depend on itself.', 400);
    }

    // DFS check to prevent circular dependency cycles
    const wouldCreateCycle = await this.detectCycle(taskId, dependsOnId);
    if (wouldCreateCycle) {
      throw new AppError('Circular dependency detected! Adding this dependency would create a cycle loop.', 400);
    }

    const dep = await prisma.taskDependency.create({
      data: { taskId, dependsOnId },
      include: {
        dependsOn: { select: { id: true, title: true, status: true } },
      },
    });

    return dep;
  }

  static async removeDependency(taskId: string, dependsOnId: string) {
    await prisma.taskDependency.delete({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });
    return { message: 'Dependency removed' };
  }

  static async toggleManualBlocker(taskId: string, isBlocked: boolean, blockedReason?: string) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError('Task not found', 404);

    if (isBlocked && (!blockedReason || !blockedReason.trim())) {
      throw new AppError('A reason is required when marking a task as blocked.', 400);
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        isBlocked,
        blockedReason: isBlocked ? blockedReason?.trim() : null,
      },
    });

    return updated;
  }

  // Helper DFS algorithm for circular dependency detection
  private static async detectCycle(startTaskId: string, targetTaskId: string): Promise<boolean> {
    const visited = new Set<string>();

    async function dfs(currentId: string): Promise<boolean> {
      if (currentId === startTaskId) return true; // Cycle found
      if (visited.has(currentId)) return false;

      visited.add(currentId);

      // Find all tasks that currentId depends on
      const deps = await prisma.taskDependency.findMany({
        where: { taskId: currentId },
        select: { dependsOnId: true },
      });

      for (const d of deps) {
        if (await dfs(d.dependsOnId)) return true;
      }

      return false;
    }

    return await dfs(targetTaskId);
  }
}
