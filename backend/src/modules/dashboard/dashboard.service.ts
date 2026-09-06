import { Project, User, Task, ActivityLog, WorkActivity, ProjectMember } from '../../models/index.js';
import { cacheGet, cacheSet } from '../../config/redis.js';

type DashboardFilters = {
  category?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
};

/** Build a MongoDB date range filter from period / explicit startDate+endDate */
function buildDateFilter(filters: DashboardFilters): { start?: Date; end?: Date } {
  if (filters.startDate || filters.endDate) {
    return {
      start: filters.startDate ? new Date(filters.startDate) : undefined,
      end: filters.endDate ? new Date(filters.endDate) : undefined,
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filters.period) {
    case 'today':
      return { start: today, end: now };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      return { start: weekStart, end: now };
    }
    case 'month': {
      const monthStart = new Date(today);
      monthStart.setMonth(monthStart.getMonth() - 1);
      return { start: monthStart, end: now };
    }
    case 'year': {
      const yearStart = new Date(today);
      yearStart.setFullYear(yearStart.getFullYear() - 1);
      return { start: yearStart, end: now };
    }
    default:
      return {};
  }
}

export class DashboardService {
  static async getDashboard(user: { id: string; role: string }, filters?: DashboardFilters) {
    const dateKey = filters?.period || (filters?.startDate ? `${filters.startDate}_${filters.endDate}` : 'all');
    const cacheKey = `dashboard:${user.role}:${user.id}:${filters?.category || 'all'}:${dateKey}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const dateRange = buildDateFilter(filters || {});
    let result;
    const pWhere = filters?.category ? { projectType: filters.category } : {};
    if (user.role === 'ADMIN') {
      result = await this.getAdminDashboard(pWhere, dateRange);
    } else if (user.role === 'PROJECT_LEAD') {
      result = await this.getLeadDashboard(user.id, pWhere, dateRange);
    } else {
      result = await this.getMemberDashboard(user.id, pWhere, dateRange);
    }

    await cacheSet(cacheKey, result, 300); // 5-min TTL
    return result;
  }

  private static async getAdminDashboard(pWhere: any = {}, dateRange: { start?: Date; end?: Date } = {}) {
    let taskFilter: any = { status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION'] } };
    if (pWhere.projectType) {
      const categoryProjects = await Project.find({ projectType: pWhere.projectType }, '_id').lean();
      const catProjIds = categoryProjects.map((p: any) => p._id);
      taskFilter.projectId = { $in: catProjIds };
    }

    // Consolidated project status metrics via single aggregation
    const [projectCountsAgg, totalUsers, activeTasks] = await Promise.all([
      Project.aggregate([
        { $match: { ...pWhere, status: { $ne: 'CANCELLED' } } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            activeProjects: {
              $sum: { $cond: [{ $in: ['$status', ['ACTIVE', 'ONGOING']] }, 1, 0] },
            },
            atRiskProjects: {
              $sum: { $cond: [{ $eq: ['$status', 'AT_RISK'] }, 1, 0] },
            },
          },
        },
      ]),
      User.countDocuments({ isActive: true, role: { $ne: 'ADMIN' } }),
      Task.countDocuments(taskFilter),
    ]);

    const pStats = projectCountsAgg[0] || { totalProjects: 0, activeProjects: 0, atRiskProjects: 0 };
    const totalProjects = pStats.totalProjects;
    const activeProjects = pStats.activeProjects;
    const atRiskProjects = pStats.atRiskProjects;

    // Attention-required projects with lean field projection
    const attentionRequiredDocs = await Project.find(
      { ...pWhere, status: { $in: ['AT_RISK', 'ON_HOLD'] } },
      'name status statusReason leadId _id'
    )
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

    // Recent projects with lean field projection
    const recentProjectsDocs = await Project.find(
      pWhere,
      'name status projectType priority leadId updatedAt _id'
    )
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
    const projectIds = recentProjectsDocs.map((p: any) => p._id);

    // MongoDB Aggregation for task counts and member counts per project (zero in-memory nested loops)
    const [recentLeads, taskStatsAgg, memberStatsAgg] = await Promise.all([
      User.find({ _id: { $in: recentProjectsDocs.map((p: any) => p.leadId).filter(Boolean) } }, 'firstName lastName _id').lean(),
      Task.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        {
          $group: {
            _id: '$projectId',
            totalTasks: { $sum: 1 },
            completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
      ]),
      ProjectMember.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: '$projectId', memberCount: { $sum: 1 } } },
      ]),
    ]);

    const recentLeadMap = new Map(recentLeads.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName }]));
    const taskStatsMap = new Map(taskStatsAgg.map((t: any) => [t._id, t]));
    const memberStatsMap = new Map(memberStatsAgg.map((m: any) => [m._id, m.memberCount]));

    const recentProjectsWithStats = recentProjectsDocs.map((p: any) => {
      const tStats = taskStatsMap.get(p._id) || { totalTasks: 0, completedTasks: 0 };
      const memberCount = memberStatsMap.get(p._id) || 0;

      return {
        id: p._id,
        name: p.name,
        status: p.status,
        projectType: p.projectType,
        priority: p.priority,
        lead: p.leadId ? recentLeadMap.get(p.leadId) || null : null,
        totalTasks: tStats.totalTasks,
        completedTasks: tStats.completedTasks,
        memberCount,
      };
    });

    // Recent activities feed with lean projection
    const activityQuery: any = {};
    if (dateRange.start || dateRange.end) {
      activityQuery.createdAt = {};
      if (dateRange.start) activityQuery.createdAt.$gte = dateRange.start;
      if (dateRange.end) activityQuery.createdAt.$lte = dateRange.end;
    }
    const recentActivitiesDocs = await ActivityLog.find(
      activityQuery,
      'action details userId projectId createdAt _id'
    )
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

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

  private static async getLeadDashboard(leadId: string, pWhere: any = {}, _dateRange: { start?: Date; end?: Date } = {}) {
    const myProjectsDocs = await Project.find({ leadId, ...pWhere }, 'name status statusReason _id').lean();
    const projectIds = myProjectsDocs.map((p: any) => p._id);

    const [taskMetricsAgg, pendingReviewListDocs] = await Promise.all([
      Task.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            pendingReviews: { $sum: { $cond: [{ $eq: ['$status', 'REVIEW'] }, 1, 0] } },
            blockedTasks: { $sum: { $cond: [{ $eq: ['$isBlocked', true] }, 1, 0] } },
          },
        },
      ]),
      Task.find(
        { projectId: { $in: projectIds }, status: 'REVIEW' },
        'title status priority dueDate assigneeId projectId _id'
      )
        .limit(5)
        .lean(),
    ]);

    const prMetrics = taskMetricsAgg[0] || { totalTasks: 0, pendingReviews: 0, blockedTasks: 0 };
    const totalTasks = prMetrics.totalTasks;
    const pendingReviews = prMetrics.pendingReviews;
    const blockedTasks = prMetrics.blockedTasks;

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

  private static async getMemberDashboard(memberId: string, pWhere: any = {}, _dateRange: { start?: Date; end?: Date } = {}) {
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

    // High-performance parallel data retrieval:
    // 1. Task metrics aggregated in MongoDB
    // 2. Member WorkActivity hours & count aggregated in MongoDB (eliminates fetching 50,000 documents)
    // 3. Assigned projects with lean fields
    // 4. Pending tasks for Work Next queue (limited to 10)
    // 5. Recent activities (limited to 5)
    const [taskMetricsAgg, activityMetricsAgg, assignedProjectsDocs, workNextDocs, myActivitiesDocs] = await Promise.all([
      Task.aggregate([
        { $match: taskQuery },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
            inProgressTasks: { $sum: { $cond: [{ $in: ['$status', ['IN_PROGRESS', 'REVIEW']] }, 1, 0] } },
            todoTasks: { $sum: { $cond: [{ $eq: ['$status', 'TODO'] }, 1, 0] } },
            revisionTasks: { $sum: { $cond: [{ $eq: ['$status', 'REVISION'] }, 1, 0] } },
          },
        },
      ]),
      WorkActivity.aggregate([
        { $match: { userId: memberId } },
        {
          $group: {
            _id: null,
            totalHours: { $sum: '$hoursSpent' },
            totalActivities: { $sum: 1 },
          },
        },
      ]),
      Project.find(
        projectQuery,
        'name status projectType priority targetEndDate _id'
      )
        .sort({ updatedAt: -1 })
        .lean(),
      Task.find(
        { ...taskQuery, status: { $ne: 'COMPLETED' } },
        'title status priority dueDate projectId isBlocked blockedReason _id'
      )
        .sort({ dueDate: 1 })
        .limit(10)
        .lean(),
      WorkActivity.find(
        { userId: memberId },
        'serialNo workDescription hoursSpent dateTime projectId _id'
      )
        .sort({ dateTime: -1 })
        .limit(5)
        .lean(),
    ]);

    const taskMetrics = taskMetricsAgg[0] || {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      todoTasks: 0,
      revisionTasks: 0,
    };
    const totalHoursLogged = activityMetricsAgg[0]?.totalHours || 0;
    const totalActivities = activityMetricsAgg[0]?.totalActivities || 0;

    const assignedProjectIds = assignedProjectsDocs.map((p: any) => p._id);

    // Aggregate task stats and member counts across assigned projects directly in MongoDB
    const [assignedTaskStats, assignedMemberStats] = await Promise.all([
      Task.aggregate([
        { $match: { projectId: { $in: assignedProjectIds } } },
        {
          $group: {
            _id: '$projectId',
            totalTasks: { $sum: 1 },
            completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          },
        },
      ]),
      ProjectMember.aggregate([
        { $match: { projectId: { $in: assignedProjectIds } } },
        { $group: { _id: '$projectId', memberCount: { $sum: 1 } } },
      ]),
    ]);

    const taskStatsMap = new Map(assignedTaskStats.map((t: any) => [t._id, t]));
    const memberStatsMap = new Map(assignedMemberStats.map((m: any) => [m._id, m.memberCount]));

    const myProjects = assignedProjectsDocs.map((p: any) => {
      const tStats = taskStatsMap.get(p._id) || { totalTasks: 0, completedTasks: 0 };
      const totalTasks = tStats.totalTasks;
      const completedTasks = tStats.completedTasks;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const memberCount = memberStatsMap.get(p._id) || 0;

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

    // Resolve project headers for workNext and myActivities
    const neededProjectIds = [
      ...new Set([
        ...workNextDocs.map((t: any) => t.projectId),
        ...myActivitiesDocs.map((a: any) => a.projectId),
      ]),
    ];
    const projectHeaders = await Project.find({ _id: { $in: neededProjectIds } }, 'name _id').lean();
    const projectHeaderMap = new Map(projectHeaders.map((p: any) => [p._id, { id: p._id, name: p.name }]));

    const now = new Date();
    const workNext = workNextDocs.map((t: any) => {
      let reason = 'assigned';
      if (t.dueDate && new Date(t.dueDate) < now) {
        reason = 'overdue';
      } else if (t.status === 'REVISION') {
        reason = 'revision_requested';
      } else if (t.priority === 'HIGH' || t.priority === 'CRITICAL') {
        reason = 'high_priority';
      }

      return {
        task: {
          ...t,
          id: t._id,
          project: projectHeaderMap.get(t.projectId) || null,
        },
        reason,
      };
    });

    const myActivities = myActivitiesDocs.map((a: any) => {
      const p = projectHeaderMap.get(a.projectId);
      return {
        ...a,
        id: a._id,
        project: p || null,
      };
    });

    return {
      type: 'MEMBER',
      stats: {
        totalProjects: assignedProjectsDocs.length,
        activeProjects: assignedProjectsDocs.filter((p: any) => p.status === 'ONGOING' || p.status === 'ACTIVE').length,
        completedProjects: assignedProjectsDocs.filter((p: any) => p.status === 'COMPLETED').length,
        totalTasks: taskMetrics.totalTasks,
        inProgressTasks: taskMetrics.inProgressTasks,
        completedTasks: taskMetrics.completedTasks,
        todoTasks: taskMetrics.todoTasks,
        revisionTasks: taskMetrics.revisionTasks,
        totalHoursLogged: Number(totalHoursLogged.toFixed(1)),
        totalActivities,
      },
      myProjects: myProjects.slice(0, 4),
      workNext: workNext.slice(0, 5),
      myActivities,
    };
  }
}
