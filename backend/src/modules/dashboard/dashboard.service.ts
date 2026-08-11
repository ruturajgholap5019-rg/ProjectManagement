import { prisma } from '../../config/database.js';

export class DashboardService {
  static async getDashboard(user: { id: string; role: string }) {
    if (user.role === 'ADMIN') {
      return this.getAdminDashboard();
    } else if (user.role === 'PROJECT_LEAD') {
      return this.getLeadDashboard(user.id);
    } else {
      return this.getMemberDashboard(user.id);
    }
  }

  private static async getAdminDashboard() {
    const [totalProjects, activeProjects, atRiskProjects, totalUsers, activeTasks] = await Promise.all([
      prisma.project.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.project.count({ where: { status: { in: ['ACTIVE', 'ONGOING'] } } }),
      prisma.project.count({ where: { status: 'AT_RISK' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION'] } } }),
    ]);

    const attentionRequired = await prisma.project.findMany({
      where: { status: { in: ['AT_RISK', 'ON_HOLD'] } },
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

  private static async getLeadDashboard(leadId: string) {
    const myProjects = await prisma.project.findMany({
      where: { leadId },
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

  private static async getMemberDashboard(memberId: string) {
    const assignedTasks = await prisma.task.findMany({
      where: { assigneeId: memberId },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
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
        totalAssigned: assignedTasks.length,
        completed: assignedTasks.filter((t: any) => t.status === 'COMPLETED').length,
        inProgress: assignedTasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        revision: assignedTasks.filter((t: any) => t.status === 'REVISION').length,
      },
      workNext: workNext.slice(0, 5),
    };
  }
}
