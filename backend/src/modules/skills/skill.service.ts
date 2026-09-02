import { MemberSkill, User, ProjectMember, Project, WorkActivity } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class SkillService {
  static async addSkill(userId: string, data: { skillName: string; proficiency?: string; notes?: string }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const skill = await MemberSkill.findOneAndUpdate(
      { userId, skillName: data.skillName.trim() },
      {
        userId,
        skillName: data.skillName.trim(),
        proficiency: data.proficiency || 'INTERMEDIATE',
        notes: data.notes?.trim() || null,
      },
      { upsert: true, new: true }
    );

    return {
      ...skill.toJSON(),
      id: skill._id,
    };
  }

  static async getUserSkills(userId: string) {
    const skills = await MemberSkill.find({ userId }).sort({ createdAt: -1 }).lean();
    return skills.map((s: any) => ({ ...s, id: s._id }));
  }

  static async getUserTimeline(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    const [skills, memberships, workActivities] = await Promise.all([
      MemberSkill.find({ userId }).lean(),
      ProjectMember.find({ userId }).lean(),
      WorkActivity.find({ userId }).sort({ dateTime: -1 }).lean(),
    ]);

    const projectIds = [
      ...new Set([
        ...memberships.map((m: any) => m.projectId),
        ...workActivities.map((w: any) => w.projectId),
      ]),
    ];

    const projects = await Project.find({ _id: { $in: projectIds } }).lean();
    const projectMap = new Map(projects.map((p: any) => [p._id, { ...p, id: p._id }]));

    const allProjects = memberships.map((pm: any) => projectMap.get(pm.projectId)).filter(Boolean);
    const ongoingProjects = allProjects.filter((p: any) => ['ONGOING', 'ACTIVE', 'PLANNING'].includes(p.status));
    const completedProjects = allProjects.filter((p: any) => ['COMPLETED', 'HANDED_OVER'].includes(p.status));
    const totalHoursSpent = workActivities.reduce((acc: number, a: any) => acc + (a.hoursSpent || 0), 0);

    return {
      user: {
        id: (user as any)._id,
        name: `${(user as any).firstName} ${(user as any).lastName}`,
        email: (user as any).email,
        role: (user as any).role,
        memberType: (user as any).memberType,
      },
      skills: skills.map((s: any) => ({ ...s, id: s._id })),
      ongoingProjects,
      completedProjects,
      allProjects,
      totalHoursSpent,
      workActivities: workActivities.map((w: any) => ({
        ...w,
        id: w._id,
        project: projectMap.get(w.projectId) || null,
      })),
    };
  }
}
