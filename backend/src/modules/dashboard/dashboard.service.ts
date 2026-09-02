import { Project, User, Task, ActivityLog, WorkActivity, ProjectMember } from '../../models/index.js';
import { cacheGet, cacheSet } from '../../config/redis.js';

export class DashboardService {
  static async getDashboard(user: { id: string; role: string }, filters?: { category?: string }) {
    const cacheKey = `dashboard:${user.role}:${user.id}:${filters?.category || 'all'}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    let result;
    const pWhere = filters?.category ? { projectType: filters.category } : {};
    if (user.role === 'ADMIN') {
      result = await this.getAdminDashboard(pWhere);
    } else if (user.role === 'PROJECT_LEAD') {
      result = await this.getLeadDashboard(user.id, pWhere);
    } else {
      result = await this.getMemberDashboard(user.id, pWhere);
    }

    await cacheSet(cacheKey, result, 600);
    return result;
  }

  private static async getAdminDashboard(pWhere: any = {}) {
    let taskFilter: any = { status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION'] } };
    if (pWhere.projectType) {
      const categoryProjects = await Project.find({ projectType: pWhere.projectType }, '_id').lean();
      const catProjIds = categoryProjects.map((p: any) => p._id);
      taskFilter.projectId = { $in: catProjIds };
    }

    const [totalProjects, activeProjects, atRiskProjects, totalUsers, activeTasks] = await Promise.all([
      Project.countDocuments({ ...pWhere, status: { $ne: 'CANCELLED' } }),
      Project.countDocuments({ ...pWhere, status: { $in: ['ACTIVE', 'ONGOING'] } }),
      Project.countDocuments({ ...pWhere, status: 'AT_RISK' }),
      User.countDocuments({ isActive: true, role: { $ne: 'ADMIN' } }),
      Task.countDocuments(taskFilter),
    ]);

    const attentionRequiredDocs = await Project.find({ ...pWhere, status: { $in: ['AT_RISK', 'ON_HOLD'] } })
      .limit(5)
      .lean();

    const attentionLeadIds = attentionRequiredDocs.map((p: any) => p.leadId).filter(Boolean);
    const attentionLeads = await User.find({ _id: { $in: attentionLeadIds } }, 'firstName lastName _id').lean();
    const attentionLeadMap = new Map(attentionLeads.map((u: any) => [u._id, { firstName: u.firstName, lastName: u.lastName }]));

    const attentionRequired = attentionRequiredDocs.map((p: any) => ({
      id: p._id,
      name: p.name,
      status: p.status,
      statusReason: p.statusReason,
      lead: p.leadId ? attentionLeadMap.get(p.leadId) || null : null,
    }));

    const recentProjectsDocs = await Project.find(pWhere).sort({ updatedAt: -1 }).limit(5).lean();
    const projectIds = recentProjectsDocs.map((p: any) => p._id);

    const [recentLeads, recentMemberships, recentTasks] = await Promise.all([
      User.find({ _id: { $in: recentProjectsDocs.map((p: any) => p.leadId).filter(Boolean) } }, 'firstName lastName _id').lean(),
      ProjectMember.find({ projectId: { $in: projectIds } }).lean(),
      Task.find({ projectId: { $in: projectIds } }, 'projectId status _id').lean(),
    ]);

    const recentLeadMap = new Map(recentLeads.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName }]));

    const recentProjectsWithStats = recentProjectsDocs.map((p: any) => {
      const projTasks = recentTasks.filter((t: any) => t.projectId === p._id);
      const completedTasks = projTasks.filter((t: any) => t.status === 'COMPLETED').length;
      const memberCount = recentMemberships.filter((m: any) => m.projectId === p._id).length;

      return {
        id: p._id,
        name: p.name,
        status: p.status,
        projectType: p.projectType,
        priority: p.priority,
        lead: p.leadId ? recentLeadMap.get(p.leadId) || null : null,
        totalTasks: projTasks.length,
        completedTasks,
        memberCount,
      };
    });

    const recentActivitiesDocs = await ActivityLog.find().sort({ createdAt: -1 }).limit(6).lean();
    const actUserIds = recentActivitiesDocs.map((a: any) => a.userId).filter(Boolean);
    const actProjectIds = recentActivitiesDocs.map((a: any) => a.projectId).filter(Boolean);

    const [actUsers, actProjects] = await Promise.all([
      User.find({ _id: { $in: actUserIds } }, 'firstName lastName _id').lean(),
      Project.find({ _id: { $in: actProjectIds } }, 'name _id').lean(),
    ]);

    const actUserMap = new Map(actUsers.map((u: any) => [u._id, { firstName: u.firstName, lastName: u.lastName }]));
    const actProjectMap = new Map(actProjects.map((p: any) => [p._id, { name: p.name }]));

    const recentActivities = recentActivitiesDocs.map((a: any) => ({
      ...a,
      id: a._id,
      user: actUserMap.get(a.userId) || null,
      project: actProjectMap.get(a.projectId) || null,
    }));

    return {
      type: 'ADMIN',
      stats: { totalProjects, activeProjects, atRiskProjects, totalUsers, activeTasks },
      attentionRequired,
      recentProjects: recentProjectsWithStats,
      recentActivities,
    };
  }

  private static async getLeadDashboard(leadId: string, pWhere: any = {}) {
    const myProjectsDocs = await Project.find({ leadId, ...pWhere }, 'name status statusReason _id').lean();
    const projectIds = myProjectsDocs.map((p: any) => p._id);

    const [totalTasks, pendingReviews, blockedTasks, pendingReviewListDocs] = await Promise.all([
      Task.countDocuments({ projectId: { $in: projectIds } }),
      Task.countDocuments({ projectId: { $in: projectIds }, status: 'REVIEW' }),
      Task.countDocuments({ projectId: { $in: projectIds }, isBlocked: true }),
      Task.find({ projectId: { $in: projectIds }, status: 'REVIEW' }).limit(5).lean(),
    ]);

    const prAssigneeIds = pendingReviewListDocs.map((t: any) => t.assigneeId).filter(Boolean);
    const prProjectIds = pendingReviewListDocs.map((t: any) => t.projectId).filter(Boolean);

    const [prUsers, prProjects] = await Promise.all([
      User.find({ _id: { $in: prAssigneeIds } }, 'firstName lastName _id').lean(),
      Project.find({ _id: { $in: prProjectIds } }, 'name _id').lean(),
    ]);

    const prUserMap = new Map(prUsers.map((u: any) => [u._id, { firstName: u.firstName, lastName: u.lastName }]));
    const prProjectMap = new Map(prProjects.map((p: any) => [p._id, { name: p.name }]));

    const pendingReviewsList = pendingReviewListDocs.map((t: any) => ({
      ...t,
      id: t._id,
      assignee: prUserMap.get(t.assigneeId) || null,
      project: prProjectMap.get(t.projectId) || null,
    }));

    return {
      type: 'LEAD',
      stats: { myProjectsCount: myProjectsDocs.length, totalTasks, pendingReviews, blockedTasks },
      myProjects: myProjectsDocs.map((p: any) => ({ id: p._id, name: p.name, status: p.status, statusReason: p.statusReason })),
      pendingReviews: pendingReviewsList,
    };
  }

  private static async getMemberDashboard(memberId: string, pWhere: any = {}) {
    const userMemberships = await ProjectMember.find({ userId: memberId }, 'projectId').lean();
    const memberProjectIds = userMemberships.map((m: any) => m.projectId);

    const projectQuery: any = {
      $or: [{ leadId: memberId }, { _id: { $in: memberProjectIds } }],
      ...(pWhere.projectType ? { projectType: pWhere.projectType } : {}),
    };

    const taskQuery: any = {
      $or: [{ assigneeId: memberId }, { coAssigneeId: memberId }],
    };

    if (pWhere.projectType) {
      const categoryProjects = await Project.find({ projectType: pWhere.projectType }, '_id').lean();
      const catProjIds = categoryProjects.map((p: any) => p._id);
      taskQuery.projectId = { $in: catProjIds };
    }

    const [assignedTasksDocs, assignedProjectsRaw, myActivitiesDocs, allUserActivities] = await Promise.all([
      Task.find(taskQuery).sort({ dueDate: 1 }).lean(),
      Project.find(projectQuery).sort({ updatedAt: -1 }).lean(),
      WorkActivity.find({ userId: memberId }).sort({ dateTime: -1 }).limit(5).lean(),
      WorkActivity.find({ userId: memberId }, 'hoursSpent').lean(),
    ]);

    const taskProjectIds = assignedTasksDocs.map((t: any) => t.projectId);
    const activityProjectIds = myActivitiesDocs.map((a: any) => a.projectId);
    const assignedProjectIds = assignedProjectsRaw.map((p: any) => p._id);

    const allProjectIds = [...new Set([...taskProjectIds, ...activityProjectIds, ...assignedProjectIds])];
    const projects = await Project.find({ _id: { $in: allProjectIds } }, 'name projectType status priority targetEndDate _id').lean();
    const projectMap = new Map(projects.map((p: any) => [p._id, p]));

    const [allAssignedProjectTasks, allAssignedMemberships] = await Promise.all([
      Task.find({ projectId: { $in: assignedProjectIds } }, 'projectId status _id').lean(),
      ProjectMember.find({ projectId: { $in: assignedProjectIds } }).lean(),
    ]);

    const myProjects = assignedProjectsRaw.map((p: any) => {
      const projTasks = allAssignedProjectTasks.filter((t: any) => t.projectId === p._id);
      const totalTasks = projTasks.length;
      const completedTasks = projTasks.filter((t: any) => t.status === 'COMPLETED').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const memberCount = allAssignedMemberships.filter((m: any) => m.projectId === p._id).length;

      return {
        id: p._id,
        name: p.name,
        status: p.status,
        projectType: p.projectType,
        priority: p.priority,
        targetEndDate: p.targetEndDate,
        totalTasks,
        completedTasks,
        progress,
        memberCount,
      };
    });

    const now = new Date();

    const assignedTasks = assignedTasksDocs.map((t: any) => {
      const p = projectMap.get(t.projectId);
      return {
        ...t,
        id: t._id,
        project: p ? { id: (p as any)._id, name: (p as any).name } : null,
      };
    });

    const workNext = assignedTasks
      .filter((t: any) => t.status !== 'COMPLETED')
      .map((t: any) => {
        let reason = 'assigned';
        if (t.dueDate && new Date(t.dueDate) < now) {
          reason = 'overdue';
        } else if (t.status === 'REVISION') {
          reason = 'revision_requested';
        } else if (t.priority === 'HIGH' || t.priority === 'CRITICAL') {
          reason = 'high_priority';
        }

        return { task: t, reason };
      });

    const totalHoursLogged = allUserActivities.reduce((acc: number, a: any) => acc + (a.hoursSpent || 0), 0);

    const myActivities = myActivitiesDocs.map((a: any) => {
      const p = projectMap.get(a.projectId);
      return {
        ...a,
        id: a._id,
        project: p ? { id: (p as any)._id, name: (p as any).name } : null,
      };
    });

    return {
      type: 'MEMBER',
      stats: {
        totalProjects: assignedProjectsRaw.length,
        activeProjects: assignedProjectsRaw.filter((p: any) => p.status === 'ONGOING' || p.status === 'ACTIVE').length,
        completedProjects: assignedProjectsRaw.filter((p: any) => p.status === 'COMPLETED').length,
        totalTasks: assignedTasks.length,
        inProgressTasks: assignedTasks.filter((t: any) => ['IN_PROGRESS', 'REVIEW'].includes(t.status)).length,
        completedTasks: assignedTasks.filter((t: any) => t.status === 'COMPLETED').length,
        todoTasks: assignedTasks.filter((t: any) => t.status === 'TODO').length,
        revisionTasks: assignedTasks.filter((t: any) => t.status === 'REVISION').length,
        totalHoursLogged: Number(totalHoursLogged.toFixed(1)),
        totalActivities: allUserActivities.length,
      },
      myProjects: myProjects.slice(0, 4),
      workNext: workNext.slice(0, 5),
      myActivities,
    };
  }
}
