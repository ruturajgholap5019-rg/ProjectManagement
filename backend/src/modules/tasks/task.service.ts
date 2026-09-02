import {
  Task,
  Project,
  ProjectMember,
  User,
  Milestone,
  TaskDependency,
  Comment,
  ActivityLog,
} from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { TaskStatus, Priority, UserRole } from '../../types/enums.js';

export interface CreateTaskInput {
  projectId: string;
  milestoneId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  coAssigneeId?: string;
  priority?: Priority;
  startDate?: string;
  dueDate?: string;
  createdById: string;
}

export class TaskService {
  static async createTask(input: CreateTaskInput) {
    const project = await Project.findById(input.projectId);
    if (!project) throw new AppError('Project not found', 404);

    if (input.assigneeId) {
      const isMember = await ProjectMember.findOne({
        projectId: input.projectId,
        userId: input.assigneeId,
      });
      const isLead = project.leadId === input.assigneeId;
      if (!isMember && !isLead) {
        throw new AppError('Assignee must be a member of the project.', 400);
      }
    }

    const task = await Task.create({
      projectId: input.projectId,
      milestoneId: input.milestoneId || null,
      parentTaskId: input.parentTaskId || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      assigneeId: input.assigneeId || null,
      coAssigneeId: input.coAssigneeId || null,
      assignedBy: input.assigneeId || input.coAssigneeId ? input.createdById : null,
      assignedAt: input.assigneeId || input.coAssigneeId ? new Date() : null,
      priority: input.priority || Priority.MEDIUM,
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdById: input.createdById,
    });

    const [assignee, coAssignee, milestone] = await Promise.all([
      task.assigneeId ? User.findById(task.assigneeId, 'firstName lastName email avatarUrl _id').lean() : null,
      task.coAssigneeId ? User.findById(task.coAssigneeId, 'firstName lastName email avatarUrl _id').lean() : null,
      task.milestoneId ? Milestone.findById(task.milestoneId, 'name _id').lean() : null,
    ]);

    // Send email notification to assigned team member
    if (assignee && (assignee as any).email) {
      const { emailService } = await import('../../services/email.service.js');
      try {
        await emailService.sendTaskAssignmentEmail(
          (assignee as any).email,
          `${(assignee as any).firstName} ${(assignee as any).lastName}`,
          task.title,
          project.name,
          task.priority,
          task.dueDate || undefined,
          task.description || undefined
        );
      } catch (emailErr) {
        console.error('Failed to send task assignment email notification:', emailErr);
      }
    }

    return {
      ...task.toJSON(),
      id: task._id,
      assignee: assignee ? { id: (assignee as any)._id, firstName: (assignee as any).firstName, lastName: (assignee as any).lastName, email: (assignee as any).email, avatarUrl: (assignee as any).avatarUrl } : null,
      coAssignee: coAssignee ? { id: (coAssignee as any)._id, firstName: (coAssignee as any).firstName, lastName: (coAssignee as any).lastName, email: (coAssignee as any).email, avatarUrl: (coAssignee as any).avatarUrl } : null,
      milestone: milestone ? { id: (milestone as any)._id, name: (milestone as any).name } : null,
    };
  }

  static async listTasks(filters: { projectId?: string; assigneeId?: string; status?: TaskStatus; milestoneId?: string; search?: string }) {
    const query: any = {};

    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.assigneeId) query.assigneeId = filters.assigneeId;
    if (filters.status) query.status = filters.status;
    if (filters.milestoneId) query.milestoneId = filters.milestoneId;
    if (filters.search) query.title = new RegExp(filters.search, 'i');

    const tasks = await Task.find(query).sort({ dueDate: 1, createdAt: -1 }).lean();
    const taskIds = tasks.map((t: any) => t._id);

    const userIds = [
      ...new Set([
        ...tasks.map((t: any) => t.assigneeId).filter(Boolean),
        ...tasks.map((t: any) => t.coAssigneeId).filter(Boolean),
      ]),
    ];

    const milestoneIds = [...new Set(tasks.map((t: any) => t.milestoneId).filter(Boolean))];

    const [users, milestones, subtasks, dependencies] = await Promise.all([
      User.find({ _id: { $in: userIds } }, 'firstName lastName email avatarUrl _id').lean(),
      Milestone.find({ _id: { $in: milestoneIds } }, 'name _id').lean(),
      Task.find({ parentTaskId: { $in: taskIds } }, 'title status assigneeId coAssigneeId parentTaskId _id').lean(),
      TaskDependency.find({ taskId: { $in: taskIds } }).lean(),
    ]);

    const userMap = new Map(users.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, avatarUrl: u.avatarUrl }]));
    const milestoneMap = new Map(milestones.map((m: any) => [m._id, { id: m._id, name: m.name }]));

    const depTargetIds = [...new Set(dependencies.map((d: any) => d.dependsOnId))];
    const depTasks = await Task.find({ _id: { $in: depTargetIds } }, 'title status _id').lean();
    const depTaskMap = new Map(depTasks.map((t: any) => [t._id, { id: t._id, title: t.title, status: t.status }]));

    return tasks.map((t: any) => {
      const taskSubtasks = subtasks
        .filter((st: any) => st.parentTaskId === t._id)
        .map((st: any) => ({
          id: st._id,
          title: st.title,
          status: st.status,
          assigneeId: st.assigneeId,
          coAssigneeId: st.coAssigneeId,
        }));

      const taskDeps = dependencies
        .filter((d: any) => d.taskId === t._id)
        .map((d: any) => ({
          id: d._id,
          taskId: d.taskId,
          dependsOnId: d.dependsOnId,
          dependsOn: depTaskMap.get(d.dependsOnId) || null,
        }));

      return {
        ...t,
        id: t._id,
        assignee: t.assigneeId ? userMap.get(t.assigneeId) || null : null,
        coAssignee: t.coAssigneeId ? userMap.get(t.coAssigneeId) || null : null,
        milestone: t.milestoneId ? milestoneMap.get(t.milestoneId) || null : null,
        subtasks: taskSubtasks,
        dependsOn: taskDeps,
      };
    });
  }

  static async getMyTasks(user: { id: string; role: UserRole }) {
    let query: any = {};

    if (user.role !== UserRole.ADMIN) {
      const userMemberships = await ProjectMember.find({ userId: user.id }, 'projectId').lean();
      const memberProjectIds = userMemberships.map((m: any) => m.projectId);
      const leadProjects = await Project.find({ leadId: user.id }, '_id').lean();
      const leadProjectIds = leadProjects.map((p: any) => p._id);
      const allAllowedProjectIds = [...new Set([...memberProjectIds, ...leadProjectIds])];

      query = {
        $or: [
          { assigneeId: user.id },
          { coAssigneeId: user.id },
          { projectId: { $in: allAllowedProjectIds } },
        ],
      };
    }

    const tasks = await Task.find(query).sort({ dueDate: 1, createdAt: -1 }).lean();

    const projectIds = [...new Set(tasks.map((t: any) => t.projectId))];
    const milestoneIds = [...new Set(tasks.map((t: any) => t.milestoneId).filter(Boolean))];
    const userIds = [
      ...new Set([
        ...tasks.map((t: any) => t.assigneeId).filter(Boolean),
        ...tasks.map((t: any) => t.coAssigneeId).filter(Boolean),
      ]),
    ];

    const [projects, milestones, users] = await Promise.all([
      Project.find({ _id: { $in: projectIds } }, 'name projectType _id').lean(),
      Milestone.find({ _id: { $in: milestoneIds } }, 'name _id').lean(),
      User.find({ _id: { $in: userIds } }, 'firstName lastName email avatarUrl _id').lean(),
    ]);

    const projectMap = new Map(projects.map((p: any) => [p._id, { id: p._id, name: p.name, projectType: p.projectType }]));
    const milestoneMap = new Map(milestones.map((m: any) => [m._id, { id: m._id, name: m.name }]));
    const userMap = new Map(users.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, avatarUrl: u.avatarUrl }]));

    return tasks.map((t: any) => ({
      ...t,
      id: t._id,
      project: projectMap.get(t.projectId) || null,
      milestone: t.milestoneId ? milestoneMap.get(t.milestoneId) || null : null,
      assignee: t.assigneeId ? userMap.get(t.assigneeId) || null : null,
      coAssignee: t.coAssigneeId ? userMap.get(t.coAssigneeId) || null : null,
    }));
  }

  static async getTaskById(taskId: string) {
    const task = await Task.findById(taskId).lean();
    if (!task) throw new AppError('Task not found', 404);

    const [
      project,
      milestone,
      assignee,
      coAssignee,
      assigner,
      creator,
      subtasks,
      dependencies,
      dependedOnByList,
    ] = await Promise.all([
      Project.findById((task as any).projectId, 'name leadId _id').lean(),
      (task as any).milestoneId ? Milestone.findById((task as any).milestoneId, 'name _id').lean() : null,
      (task as any).assigneeId ? User.findById((task as any).assigneeId, 'firstName lastName email avatarUrl _id').lean() : null,
      (task as any).coAssigneeId ? User.findById((task as any).coAssigneeId, 'firstName lastName email avatarUrl _id').lean() : null,
      (task as any).assignedBy ? User.findById((task as any).assignedBy, 'firstName lastName _id').lean() : null,
      (task as any).createdById ? User.findById((task as any).createdById, 'firstName lastName _id').lean() : null,
      Task.find({ parentTaskId: taskId }).lean(),
      TaskDependency.find({ taskId }).lean(),
      TaskDependency.find({ dependsOnId: taskId }).lean(),
    ]);

    const subtaskAssigneeIds = subtasks.map((st: any) => st.assigneeId).filter(Boolean);
    const subtaskUsers = await User.find({ _id: { $in: subtaskAssigneeIds } }, 'firstName lastName _id').lean();
    const subtaskUserMap = new Map(subtaskUsers.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName }]));

    const depTargetIds = dependencies.map((d: any) => d.dependsOnId);
    const depTasks = await Task.find({ _id: { $in: depTargetIds } }, 'title status _id').lean();
    const depTaskMap = new Map(depTasks.map((t: any) => [t._id, { id: t._id, title: t.title, status: t.status }]));

    const depOnBySourceIds = dependedOnByList.map((d: any) => d.taskId);
    const depOnByTasks = await Task.find({ _id: { $in: depOnBySourceIds } }, 'title status _id').lean();
    const depOnByTaskMap = new Map(depOnByTasks.map((t: any) => [t._id, { id: t._id, title: t.title, status: t.status }]));

    const formattedDeps = dependencies.map((d: any) => ({
      id: d._id,
      taskId: d.taskId,
      dependsOnId: d.dependsOnId,
      dependsOn: depTaskMap.get(d.dependsOnId) || null,
    }));

    const incompleteDeps = formattedDeps.filter((d: any) => d.dependsOn && d.dependsOn.status !== 'COMPLETED');
    const isDependencyBlocked = incompleteDeps.length > 0;

    return {
      ...(task as any),
      id: (task as any)._id,
      project: project ? { id: (project as any)._id, name: (project as any).name, leadId: (project as any).leadId } : null,
      milestone: milestone ? { id: (milestone as any)._id, name: (milestone as any).name } : null,
      assignee: assignee ? { id: (assignee as any)._id, firstName: (assignee as any).firstName, lastName: (assignee as any).lastName, email: (assignee as any).email, avatarUrl: (assignee as any).avatarUrl } : null,
      coAssignee: coAssignee ? { id: (coAssignee as any)._id, firstName: (coAssignee as any).firstName, lastName: (coAssignee as any).lastName, email: (coAssignee as any).email, avatarUrl: (coAssignee as any).avatarUrl } : null,
      assigner: assigner ? { id: (assigner as any)._id, firstName: (assigner as any).firstName, lastName: (assigner as any).lastName } : null,
      createdBy: creator ? { id: (creator as any)._id, firstName: (creator as any).firstName, lastName: (creator as any).lastName } : null,
      subtasks: subtasks.map((st: any) => ({
        ...st,
        id: st._id,
        assignee: st.assigneeId ? subtaskUserMap.get(st.assigneeId) || null : null,
      })),
      dependsOn: formattedDeps,
      dependedOnBy: dependedOnByList.map((d: any) => ({
        id: d._id,
        taskId: d.taskId,
        dependsOnId: d.dependsOnId,
        task: depOnByTaskMap.get(d.taskId) || null,
      })),
      isDependencyBlocked,
      blockedByDependencies: incompleteDeps.map((d: any) => d.dependsOn),
    };
  }

  static async updateTaskStatus(taskId: string, newStatus: TaskStatus, user: { id: string; role: UserRole }, completionNotes?: string) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404);

    const project = await Project.findById(task.projectId);
    if (!project) throw new AppError('Project not found', 404);

    const isAssignee = task.assigneeId === user.id || task.coAssigneeId === user.id;
    const isLead = project.leadId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAssignee && !isLead && !isAdmin) {
      throw new AppError('Only the assigned Team Member, Project Lead, or Admin can update task status.', 403);
    }

    const previousStatus = task.status;
    task.status = newStatus;
    if (completionNotes !== undefined && completionNotes !== null) {
      task.completionNotes = completionNotes.trim() || null;
    }

    if (newStatus === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();

    const { AuditService } = await import('../../services/audit.service.js');
    await AuditService.log({
      userId: user.id,
      action: 'TASK_STATUS_UPDATED',
      projectId: task.projectId,
      taskId,
      details: { previousStatus, newStatus },
    });

    return this.getTaskById(taskId);
  }

  static async updateTask(taskId: string, input: any, user: { id: string; role: UserRole }) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404);

    const project = await Project.findById(task.projectId);
    if (!project) throw new AppError('Project not found', 404);

    const isAssignee = task.assigneeId === user.id || task.coAssigneeId === user.id;
    const isLead = project.leadId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;

    if (!isAssignee && !isLead && !isAdmin) {
      throw new AppError('Only the assignee, Project Lead, or Admin can edit task details.', 403);
    }

    if (input.title !== undefined) task.title = input.title.trim();
    if (input.description !== undefined) task.description = input.description.trim() || null;
    if (input.priority !== undefined) task.priority = input.priority;
    if (input.milestoneId !== undefined) task.milestoneId = input.milestoneId || null;
    if (input.startDate !== undefined) task.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.dueDate !== undefined) task.dueDate = input.dueDate ? new Date(input.dueDate) : null;

    if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
      if (input.assigneeId) {
        const isMember = await ProjectMember.findOne({
          projectId: task.projectId,
          userId: input.assigneeId,
        });
        const isProjectLead = project.leadId === input.assigneeId;
        if (!isMember && !isProjectLead) {
          throw new AppError('Assignee must be a member of the project.', 400);
        }
      }
      task.assigneeId = input.assigneeId || null;
      task.assignedBy = user.id;
      task.assignedAt = new Date();
    }

    if (input.coAssigneeId !== undefined && input.coAssigneeId !== task.coAssigneeId) {
      if (input.coAssigneeId) {
        const isMember = await ProjectMember.findOne({
          projectId: task.projectId,
          userId: input.coAssigneeId,
        });
        const isProjectLead = project.leadId === input.coAssigneeId;
        if (!isMember && !isProjectLead) {
          throw new AppError('Co-Assignee must be a member of the project.', 400);
        }
      }
      task.coAssigneeId = input.coAssigneeId || null;
      task.assignedBy = user.id;
      task.assignedAt = new Date();
    }

    await task.save();

    const { AuditService } = await import('../../services/audit.service.js');
    await AuditService.log({
      userId: user.id,
      action: 'TASK_UPDATED',
      projectId: task.projectId,
      taskId,
      details: { updatedFields: Object.keys(input) },
    });

    // Send email notification to new assignee if assignee changed
    if (input.assigneeId && input.assigneeId !== task.assigneeId) {
      const newAssignee = await User.findById(input.assigneeId);
      if (newAssignee && newAssignee.email) {
        const { emailService } = await import('../../services/email.service.js');
        try {
          await emailService.sendTaskAssignmentEmail(
            newAssignee.email,
            `${newAssignee.firstName} ${newAssignee.lastName}`,
            task.title,
            project.name,
            task.priority,
            task.dueDate || undefined,
            task.description || undefined
          );
        } catch (emailErr) {
          console.error('Failed to send task assignment email notification:', emailErr);
        }
      }
    }

    return this.getTaskById(taskId);
  }

  static async addDependency(taskId: string, dependsOnId: string) {
    if (taskId === dependsOnId) {
      throw new AppError('A task cannot depend on itself.', 400);
    }

    const wouldCreateCycle = await this.detectCycle(taskId, dependsOnId);
    if (wouldCreateCycle) {
      throw new AppError('Circular dependency detected! Adding this dependency would create a cycle loop.', 400);
    }

    const dep = await TaskDependency.create({ taskId, dependsOnId });
    const targetTask = await Task.findById(dependsOnId, 'title status _id').lean();

    return {
      id: dep._id,
      taskId: dep.taskId,
      dependsOnId: dep.dependsOnId,
      dependsOn: targetTask ? { id: (targetTask as any)._id, title: (targetTask as any).title, status: (targetTask as any).status } : null,
    };
  }

  static async removeDependency(taskId: string, dependsOnId: string) {
    await TaskDependency.findOneAndDelete({ taskId, dependsOnId });
    return { message: 'Dependency removed' };
  }

  static async toggleManualBlocker(taskId: string, isBlocked: boolean, blockedReason?: string) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404);

    if (isBlocked && (!blockedReason || !blockedReason.trim())) {
      throw new AppError('A reason is required when marking a task as blocked.', 400);
    }

    task.isBlocked = isBlocked;
    task.blockedReason = isBlocked ? blockedReason?.trim() || null : null;
    await task.save();

    return task;
  }

  private static async detectCycle(startTaskId: string, targetTaskId: string): Promise<boolean> {
    const visited = new Set<string>();

    async function dfs(currentId: string): Promise<boolean> {
      if (currentId === startTaskId) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);

      const deps = await TaskDependency.find({ taskId: currentId }, 'dependsOnId').lean();

      for (const d of deps) {
        if (await dfs((d as any).dependsOnId)) return true;
      }

      return false;
    }

    return await dfs(targetTaskId);
  }

  static async deleteTask(taskId: string, user: { id: string; role: UserRole }) {
    const task = await Task.findById(taskId);
    if (!task) throw new AppError('Task not found', 404);

    const project = await Project.findById(task.projectId);
    if (!project) throw new AppError('Project not found', 404);

    const isLead = project.leadId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    const isAssignee = task.assigneeId === user.id;

    if (!isLead && !isAdmin && !isAssignee) {
      throw new AppError('Only the assigned member, Project Lead, or Administrator can delete project tasks.', 403);
    }

    await TaskDependency.deleteMany({
      $or: [{ taskId }, { dependsOnId: taskId }],
    });
    await Comment.deleteMany({ taskId });
    await ActivityLog.deleteMany({ taskId });
    await Task.findByIdAndDelete(taskId);

    return { message: 'Task deleted successfully' };
  }
}
