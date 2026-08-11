import { prisma } from '../../config/database.js';

export class GlobalSearchService {
  static async search(query: string) {
    const q = query.trim();
    if (!q) {
      return { members: [], projects: [] };
    }

    // 1. Search Team Members
    const members = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        memberType: true,
        skills: true,
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                projectType: true,
                startDate: true,
                targetEndDate: true,
              },
            },
          },
        },
        workActivities: {
          orderBy: { dateTime: 'desc' },
          take: 20,
          include: {
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Format Member Search Results
    const formattedMembers = members.map((m: any) => {
      const allProjects = m.projectMemberships.map((pm: any) => pm.project);
      const ongoingProjects = allProjects.filter((p: any) => p.status === 'ONGOING' || p.status === 'ACTIVE' || p.status === 'PLANNING');
      const completedProjects = allProjects.filter((p: any) => p.status === 'COMPLETED' || p.status === 'HANDED_OVER');
      const totalHoursSpent = m.workActivities.reduce((acc: number, a: any) => acc + a.hoursSpent, 0);

      return {
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        role: m.role,
        memberType: m.memberType,
        skills: m.skills,
        ongoingProjects,
        completedProjects,
        totalHoursSpent,
        recentActivities: m.workActivities,
      };
    });

    // 2. Search Projects
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { scope: { contains: q } },
          { description: { contains: q } },
        ],
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        previousLead: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          },
        },
        workActivities: {
          orderBy: { dateTime: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const formattedProjects = projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      projectType: p.projectType,
      status: p.status,
      statusReason: p.statusReason,
      priority: p.priority,
      scope: p.scope,
      startDate: p.startDate,
      targetEndDate: p.targetEndDate,
      actualEndDate: p.actualEndDate,
      maintenanceRequired: p.maintenanceRequired,
      maintenanceNotes: p.maintenanceNotes,
      currentLead: p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : 'Unassigned',
      previousLead: p.previousLead ? `${p.previousLead.firstName} ${p.previousLead.lastName}` : undefined,
      handedOverAt: p.handedOverAt,
      assignedMembers: p.members.map((m: any) => `${m.user.firstName} ${m.user.lastName}`),
      recentActivities: p.workActivities,
    }));

    return {
      members: formattedMembers,
      projects: formattedProjects,
    };
  }
}
