import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';

export class SkillService {
  static async addSkill(userId: string, data: { skillName: string; proficiency?: string; notes?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const skill = await prisma.memberSkill.upsert({
      where: { userId_skillName: { userId, skillName: data.skillName.trim() } },
      update: {
        proficiency: data.proficiency || 'INTERMEDIATE',
        notes: data.notes?.trim(),
      },
      create: {
        userId,
        skillName: data.skillName.trim(),
        proficiency: data.proficiency || 'INTERMEDIATE',
        notes: data.notes?.trim(),
      },
    });

    return skill;
  }

  static async getUserSkills(userId: string) {
    return prisma.memberSkill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getUserTimeline(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        projectMemberships: {
          include: {
            project: true,
          },
        },
        workActivities: {
          include: {
            project: { select: { id: true, name: true } },
          },
          orderBy: { dateTime: 'desc' },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    const allProjects = user.projectMemberships.map((pm: any) => pm.project);
    const ongoingProjects = allProjects.filter((p: any) => ['ONGOING', 'ACTIVE', 'PLANNING'].includes(p.status));
    const completedProjects = allProjects.filter((p: any) => ['COMPLETED', 'HANDED_OVER'].includes(p.status));
    const totalHoursSpent = user.workActivities.reduce((acc: number, a: any) => acc + a.hoursSpent, 0);

    return {
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        memberType: user.memberType,
      },
      skills: user.skills,
      ongoingProjects,
      completedProjects,
      allProjects,
      totalHoursSpent,
      workActivities: user.workActivities,
    };
  }
}
