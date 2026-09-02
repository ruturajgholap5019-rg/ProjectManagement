import { WorkActivity, Project, User } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';

export interface CreateActivityInput {
  userId: string;
  projectId: string;
  workDescription?: string;
  description?: string;
  hoursSpent: number;
  assignedById?: string;
  dateTime?: string;
}

export class ActivityService {
  static async logActivity(input: CreateActivityInput) {
    const project = await Project.findById(input.projectId);
    if (!project) throw new AppError('Project not found', 404);

    const desc = (input.workDescription || input.description || '').trim();
    if (!desc) throw new AppError('Work description is required', 400);

    const maxActivity = await WorkActivity.findOne().sort({ serialNo: -1 }).lean();
    const nextSerialNo = (maxActivity ? (maxActivity as any).serialNo || 0 : 0) + 1;

    const activity = await WorkActivity.create({
      serialNo: nextSerialNo,
      userId: input.userId,
      projectId: input.projectId,
      workDescription: desc,
      hoursSpent: Number(input.hoursSpent) || 1.0,
      assignedById: input.assignedById || null,
      dateTime: input.dateTime ? new Date(input.dateTime) : new Date(),
    });

    const [user, proj, assignedBy] = await Promise.all([
      User.findById(activity.userId, 'firstName lastName email _id').lean(),
      Project.findById(activity.projectId, 'name projectType status _id').lean(),
      activity.assignedById ? User.findById(activity.assignedById, 'firstName lastName _id').lean() : null,
    ]);

    return {
      ...activity.toJSON(),
      id: activity._id,
      user: user ? { id: (user as any)._id, firstName: (user as any).firstName, lastName: (user as any).lastName, email: (user as any).email } : null,
      project: proj ? { id: (proj as any)._id, name: (proj as any).name, projectType: (proj as any).projectType, status: (proj as any).status } : null,
      assignedBy: assignedBy ? { id: (assignedBy as any)._id, firstName: (assignedBy as any).firstName, lastName: (assignedBy as any).lastName } : null,
    };
  }

  static async listActivities(filters: {
    userId?: string;
    projectId?: string;
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const query: any = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.projectId) query.projectId = filters.projectId;

    // Time Period Filter Logic
    const now = new Date();
    if (filters.period === 'daily') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query.dateTime = { $gte: startOfDay };
    } else if (filters.period === 'weekly') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      query.dateTime = { $gte: startOfWeek };
    } else if (filters.period === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.dateTime = { $gte: startOfMonth };
    } else if (filters.period === 'yearly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      query.dateTime = { $gte: startOfYear };
    } else if (filters.period === 'custom' && (filters.startDate || filters.endDate)) {
      query.dateTime = {};
      if (filters.startDate) query.dateTime.$gte = new Date(filters.startDate);
      if (filters.endDate) query.dateTime.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
      query.workDescription = new RegExp(filters.search, 'i');
    }

    const activities = await WorkActivity.find(query).sort({ dateTime: -1 }).lean();

    const userIds = [
      ...new Set([
        ...activities.map((a: any) => a.userId).filter(Boolean),
        ...activities.map((a: any) => a.assignedById).filter(Boolean),
      ]),
    ];
    const projectIds = [...new Set(activities.map((a: any) => a.projectId).filter(Boolean))];

    const [users, projects] = await Promise.all([
      User.find({ _id: { $in: userIds } }, 'firstName lastName email _id').lean(),
      Project.find({ _id: { $in: projectIds } }, 'name projectType status _id').lean(),
    ]);

    const userMap = new Map(users.map((u: any) => [u._id, { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email }]));
    const projectMap = new Map(projects.map((p: any) => [p._id, { id: p._id, name: p.name, projectType: p.projectType, status: p.status }]));

    const formatted = activities.map((a: any) => ({
      ...a,
      id: a._id,
      user: userMap.get(a.userId) || null,
      project: projectMap.get(a.projectId) || null,
      assignedBy: a.assignedById ? userMap.get(a.assignedById) || null : null,
    }));

    const totalHours = formatted.reduce((acc: number, a: any) => acc + (a.hoursSpent || 0), 0);

    return {
      activities: formatted,
      totalHours,
      count: formatted.length,
    };
  }

  static async exportToCSV(filters: any) {
    const { activities, totalHours } = await this.listActivities(filters);

    let csv = '\uFEFF';
    csv += 'DIGITAL PROJECT TRACKER — WORK ACTIVITY LOG REPORT\n';
    csv += `Report Generated On: ${new Date().toLocaleString()}\n`;
    csv += `Total Time Logged: ${totalHours.toFixed(1)} Hours\n`;
    csv += `Total Activity Records: ${activities.length}\n\n`;

    csv += 'Serial Number,Date & Time,Team Member (Student),Project Name,Work Description,Hours Spent,Assigned By\n';

    activities.forEach((a: any) => {
      const dateStr = new Date(a.dateTime).toISOString().replace('T', ' ').slice(0, 19);
      const member = `"${(a.user?.firstName + ' ' + a.user?.lastName).replace(/"/g, '""')}"`;
      const proj = `"${(a.project?.name || 'General').replace(/"/g, '""')}"`;
      const desc = `"${(a.workDescription || '').replace(/"/g, '""')}"`;
      const assigner = a.assignedBy ? `"${(a.assignedBy.firstName + ' ' + a.assignedBy.lastName).replace(/"/g, '""')}"` : '"Admin"';

      csv += `${a.serialNo},${dateStr},${member},${proj},${desc},${a.hoursSpent},${assigner}\n`;
    });

    return csv;
  }

  static async updateActivity(
    id: string,
    input: { workDescription?: string; hoursSpent?: number; projectId?: string; dateTime?: string; userId?: string },
    currentUser: { id: string; role: string }
  ) {
    const activity = await WorkActivity.findById(id);
    if (!activity) throw new AppError('Work activity log not found', 404);

    if (currentUser.role !== 'ADMIN' && activity.userId !== currentUser.id) {
      throw new AppError('You do not have permission to edit this work activity log', 403);
    }

    if (input.projectId) {
      const project = await Project.findById(input.projectId);
      if (!project) throw new AppError('Project not found', 404);
    }

    if (input.workDescription !== undefined) activity.workDescription = input.workDescription.trim();
    if (input.hoursSpent !== undefined) activity.hoursSpent = Number(input.hoursSpent) || 1.0;
    if (input.projectId !== undefined) activity.projectId = input.projectId;
    if (input.userId !== undefined && currentUser.role === 'ADMIN') activity.userId = input.userId;
    if (input.dateTime !== undefined) activity.dateTime = new Date(input.dateTime);

    await activity.save();

    const [user, project, assignedBy] = await Promise.all([
      User.findById(activity.userId, 'firstName lastName email _id').lean(),
      Project.findById(activity.projectId, 'name projectType status _id').lean(),
      activity.assignedById ? User.findById(activity.assignedById, 'firstName lastName _id').lean() : null,
    ]);

    return {
      ...activity.toJSON(),
      id: activity._id,
      user: user ? { id: (user as any)._id, firstName: (user as any).firstName, lastName: (user as any).lastName, email: (user as any).email } : null,
      project: project ? { id: (project as any)._id, name: (project as any).name, projectType: (project as any).projectType, status: (project as any).status } : null,
      assignedBy: assignedBy ? { id: (assignedBy as any)._id, firstName: (assignedBy as any).firstName, lastName: (assignedBy as any).lastName } : null,
    };
  }

  static async deleteActivity(id: string, currentUser: { id: string; role: string }) {
    const activity = await WorkActivity.findById(id);
    if (!activity) throw new AppError('Work activity log not found', 404);

    if (currentUser.role !== 'ADMIN' && activity.userId !== currentUser.id) {
      throw new AppError('You do not have permission to delete this work activity log', 403);
    }

    await WorkActivity.findByIdAndDelete(id);
    return { success: true, message: 'Work activity log deleted successfully' };
  }
}
