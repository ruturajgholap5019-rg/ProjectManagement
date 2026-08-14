import { prisma } from '../../config/database.js';

export class DashboardService {
  static async getDashboard(user: { id: string; role: string }, filters?: { category?: string }) {
    const pWhere = filters?.category ? { projectType: filters.category } : {};
    if (user.role === 'ADMIN') {
      return this.getAdminDashboard(pWhere);
    } else if (user.role === 'PROJECT_LEAD') {
      return this.getLeadDashboard(user.id, pWhere);
    } else {
      return this.getMemberDashboard(user.id, pWhere);
    }
  }

  private static async getAdminDashboard(pWhere: any = {}) {
    const [totalProjects, activeProjects, atRiskProjects, totalUsers, activeTasks] = await Promise.all([
      prisma.project.count({ where: { ...pWhere, status: { not: 'CANCELLED' } } }),
      prisma.project.count({ where: { ...pWhere, status: { in: ['ACTIVE', 'ONGOING'] } } }),
      prisma.project.count({ where: { ...pWhere, status: 'AT_RISK' } }),
      prisma.user.count({ where: { isActive: true, role: { not: 'ADMIN' } } }),
      prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION'] }, ...(pWhere.projectType ? { project: { projectType: pWhere.projectType } } : {}) } }),
    ]);

    const attentionRequired = await prisma.project.findMany({
      where: { ...pWhere, status: { in: ['AT_RISK', 'ON_HOLD'] } },
      select: {
        id: true,
        name: true,
        status: true,
        statusReason: true,
        lead: { select: { firstName: true, lastName: true } },
      },
      take: 5,
    });

    const recentProjects = await prisma.project.findMany({
      where: pWhere,
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        projectType: true,
        priority: true,
        lead: { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    const recentProjectsWithStats = await Promise.all(
      recentProjects.map(async (p: any) => {
        const completedTasks = await prisma.task.count({
          where: { projectId: p.id, status: 'COMPLETED' },
        });
        return {
          ...p,
          totalTasks: p._count.tasks,
          completedTasks,
          memberCount: p._count.members,
        };
      })
    );

    const recentActivities = await prisma.activityLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
    });

    return {
      type: 'ADMIN',
      stats: { totalProjects, activeProjects, atRiskProjects, totalUsers, activeTasks },
      attentionRequired,
      recentProjects: recentProjectsWithStats,
      recentActivities,
    };
  }

  private static async getLeadDashboard(leadId: string, pWhere: any = {}) {
    const myProjects = await prisma.project.findMany({
      where: { leadId, ...pWhere },
      select: { id: true, name: true, status: true, statusReason: true },
    });

    const projectIds = myProjects.map((p: { id: string }) => p.id);

    const [totalTasks, pendingReviews, blockedTasks] = await Promise.all([
      prisma.task.count({ where: { projectId: { in: projectIds } } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, status: 'REVIEW' } }),
      prisma.task.count({ where: { projectId: { in: projectIds }, isBlocked: true } }),
    ]);

    const pendingReviewList = await prisma.task.findMany({
      where: { projectId: { in: projectIds }, status: 'REVIEW' },
      include: {
        assignee: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
      },
      take: 5,
    });

    return {
      type: 'LEAD',
      stats: { myProjectsCount: myProjects.length, totalTasks, pendingReviews, blockedTasks },
      myProjects,
      pendingReviews: pendingReviewList,
    };
  }

  private static async getMemberDashboard(memberId: string, pWhere: any = {}) {
    const [assignedTasks, assignedProjectsRaw, myActivities, hoursAgg] = await Promise.all([
      prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: memberId },
            { coAssigneeId: memberId }
          ],
          ...(pWhere.projectType ? { project: { projectType: pWhere.projectType } } : {}),
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { leadId: memberId },
            { members: { some: { userId: memberId } } }
          ],
          ...(pWhere.projectType ? { projectType: pWhere.projectType } : {}),
        },
        select: {
          id: true,
          name: true,
          status: true,
          projectType: true,
          priority: true,
          targetEndDate: true,
          _count: {
            select: { tasks: true, members: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.workActivity.findMany({
        where: { userId: memberId },
        take: 5,
        orderBy: { dateTime: 'desc' },
        include: {
          project: { select: { id: true, name: true } },
        }
      }),
      prisma.workActivity.aggregate({
        where: { userId: memberId },
        _sum: { hoursSpent: true },
        _count: { id: true }
      })
    ]);

    // Calculate progress for each assigned project
    const projectIds = assignedProjectsRaw.map(p => p.id);
    const completedCounts = projectIds.length > 0 ? await prisma.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        status: 'COMPLETED',
      },
      _count: { id: true },
    }) : [];

    const completedMap = new Map(completedCounts.map((c: any) => [c.projectId, c._count.id]));

    const myProjects = assignedProjectsRaw.map((p: any) => {
      const totalTasks = p._count.tasks;
      const completedTasks = completedMap.get(p.id) || 0;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        projectType: p.projectType,
        priority: p.priority,
        targetEndDate: p.targetEndDate,
        totalTasks,
        completedTasks,
        progress,
        memberCount: p._count.members,
      };
    });

    const now = new Date();

    // Prioritized "Work Next" algorithm
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

    return {
      type: 'MEMBER',
      stats: {
        // Project stats
        totalProjects: assignedProjectsRaw.length,
        activeProjects: assignedProjectsRaw.filter((p: any) => p.status === 'ONGOING' || p.status === 'ACTIVE').length,
        completedProjects: assignedProjectsRaw.filter((p: any) => p.status === 'COMPLETED').length,
        // Task stats
        totalTasks: assignedTasks.length,
        inProgressTasks: assignedTasks.filter((t: any) => ['IN_PROGRESS', 'REVIEW'].includes(t.status)).length,
        completedTasks: assignedTasks.filter((t: any) => t.status === 'COMPLETED').length,
        todoTasks: assignedTasks.filter((t: any) => t.status === 'TODO').length,
        revisionTasks: assignedTasks.filter((t: any) => t.status === 'REVISION').length,
        // Activity stats
        totalHoursLogged: Number((hoursAgg._sum.hoursSpent || 0).toFixed(1)),
        totalActivities: hoursAgg._count.id || 0,
      },
      myProjects: myProjects.slice(0, 4),
      workNext: workNext.slice(0, 5),
      myActivities,
    };
  }
}
