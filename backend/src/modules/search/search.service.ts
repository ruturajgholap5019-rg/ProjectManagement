import { User, Project, MemberSkill, ProjectMember, WorkActivity } from '../../models/index.js';

export class GlobalSearchService {
  static async search(query: string) {
    const q = query.trim();
    if (!q) {
      return { members: [], projects: [] };
    }

    const regex = new RegExp(q, 'i');

    // 1. Search Team Members
    const membersDocs = await User.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
    }).lean();

    const memberUserIds = membersDocs.map((m: any) => m._id);

    const [allSkills, allMemberships, allActivities] = await Promise.all([
      MemberSkill.find({ userId: { $in: memberUserIds } }).lean(),
      ProjectMember.find({ userId: { $in: memberUserIds } }).lean(),
      WorkActivity.find({ userId: { $in: memberUserIds } }).sort({ dateTime: -1 }).lean(),
    ]);

    const projectIds = [
      ...new Set([
        ...allMemberships.map((m: any) => m.projectId),
        ...allActivities.map((a: any) => a.projectId),
      ]),
    ];

    const projects = await Project.find({ _id: { $in: projectIds } }).lean();
    const projectMap = new Map(projects.map((p: any) => [p._id, { id: p._id, name: p.name, status: p.status, projectType: p.projectType, startDate: p.startDate, targetEndDate: p.targetEndDate }]));

    const formattedMembers = membersDocs.map((m: any) => {
      const userSkills = allSkills.filter((s: any) => s.userId === m._id).map((s: any) => ({ ...s, id: s._id }));
      const userMemberships = allMemberships.filter((pm: any) => pm.userId === m._id);
      const userProjects = userMemberships.map((pm: any) => projectMap.get(pm.projectId)).filter(Boolean);

      const ongoingProjects = userProjects.filter((p: any) => ['ONGOING', 'ACTIVE', 'PLANNING'].includes(p.status));
      const completedProjects = userProjects.filter((p: any) => ['COMPLETED', 'HANDED_OVER'].includes(p.status));

      const userActivities = allActivities
        .filter((a: any) => a.userId === m._id)
        .slice(0, 20)
        .map((a: any) => ({
          ...a,
          id: a._id,
          project: projectMap.get(a.projectId) ? { id: a.projectId, name: projectMap.get(a.projectId)!.name } : null,
        }));

      const totalHoursSpent = userActivities.reduce((acc: number, a: any) => acc + (a.hoursSpent || 0), 0);

      return {
        id: m._id,
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        role: m.role,
        memberType: m.memberType,
        skills: userSkills,
        ongoingProjects,
        completedProjects,
        totalHoursSpent,
        recentActivities: userActivities,
      };
    });

    // 2. Search Projects
    const projectDocs = await Project.find({
      $or: [{ name: regex }, { scope: regex }, { description: regex }],
    }).lean();

    const searchProjectIds = projectDocs.map((p: any) => p._id);
    const searchLeadIds = [
      ...new Set([
        ...projectDocs.map((p: any) => p.leadId).filter(Boolean),
        ...projectDocs.map((p: any) => p.previousLeadId).filter(Boolean),
      ]),
    ];

    const [projectLeads, projectMemberships, projectActivities] = await Promise.all([
      User.find({ _id: { $in: searchLeadIds } }, 'firstName lastName email _id').lean(),
      ProjectMember.find({ projectId: { $in: searchProjectIds } }).lean(),
      WorkActivity.find({ projectId: { $in: searchProjectIds } }).sort({ dateTime: -1 }).limit(100).lean(),
    ]);

    const leadMap = new Map(projectLeads.map((u: any) => [u._id, { id: u._id, name: `${u.firstName} ${u.lastName}` }]));

    const memberUserIds2 = projectMemberships.map((m: any) => m.userId);
    const memberUsers = await User.find({ _id: { $in: memberUserIds2 } }, 'firstName lastName _id').lean();
    const memberUserMap = new Map(memberUsers.map((u: any) => [u._id, `${u.firstName} ${u.lastName}`]));

    const actUserIds = projectActivities.map((a: any) => a.userId);
    const actUsers = await User.find({ _id: { $in: actUserIds } }, 'firstName lastName _id').lean();
    const actUserMap = new Map(actUsers.map((u: any) => [u._id, { firstName: u.firstName, lastName: u.lastName }]));

    const formattedProjects = projectDocs.map((p: any) => {
      const projMemberships = projectMemberships.filter((m: any) => m.projectId === p._id);
      const assignedMembers = projMemberships.map((m: any) => memberUserMap.get(m.userId) || 'Member');

      const projActivities = projectActivities
        .filter((a: any) => a.projectId === p._id)
        .slice(0, 20)
        .map((a: any) => ({
          ...a,
          id: a._id,
          user: actUserMap.get(a.userId) || null,
        }));

      return {
        id: p._id,
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
        currentLead: p.leadId ? leadMap.get(p.leadId)?.name || 'Unassigned' : 'Unassigned',
        previousLead: p.previousLeadId ? leadMap.get(p.previousLeadId)?.name : undefined,
        handedOverAt: p.handedOverAt,
        assignedMembers,
        recentActivities: projActivities,
      };
    });

    return {
      members: formattedMembers,
      projects: formattedProjects,
    };
  }
}
