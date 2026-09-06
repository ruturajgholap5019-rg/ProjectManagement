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
      { upsert: true, returnDocument: 'after' }
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

    const [skills, memberships, recentActivities, activityAgg] = await Promise.all([
      MemberSkill.find({ userId }, 'skillName proficiency notes createdAt _id').lean(),
      ProjectMember.find({ userId }, 'projectId joinedAt _id').lean(),
      WorkActivity.find({ userId }, 'serialNo workDescription hoursSpent dateTime projectId _id')
        .sort({ dateTime: -1 })
        .limit(50)
        .lean(),
      WorkActivity.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalHours: { $sum: '$hoursSpent' } } },
      ]),
    ]);

    const totalHoursSpent = activityAgg[0]?.totalHours || 0;

    const projectIds = [
      ...new Set([
        ...memberships.map((m: any) => m.projectId),
        ...recentActivities.map((w: any) => w.projectId),
      ]),
    ];

    const projects = await Project.find({ _id: { $in: projectIds } }, 'name status projectType priority _id').lean();
    const projectMap = new Map(projects.map((p: any) => [p._id, { ...p, id: p._id }]));

    const allProjects = memberships.map((pm: any) => projectMap.get(pm.projectId)).filter(Boolean);
    const ongoingProjects = allProjects.filter((p: any) => ['ONGOING', 'ACTIVE', 'PLANNING'].includes(p.status));
    const completedProjects = allProjects.filter((p: any) => ['COMPLETED', 'HANDED_OVER'].includes(p.status));

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
      workActivities: recentActivities.map((w: any) => ({
        ...w,
        id: w._id,
        project: projectMap.get(w.projectId) || null,
      })),
    };
  }
}
