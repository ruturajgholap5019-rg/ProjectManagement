import { Milestone, Project, Task } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { MilestoneStatus } from '../../types/enums.js';

export class MilestoneService {
  static async createMilestone(
    projectId: string,
    data: { name: string; description?: string; sortOrder?: number; startDate?: string; dueDate?: string }
  ) {
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);

    const sortOrder = data.sortOrder ?? (await Milestone.countDocuments({ projectId }));

    const milestone = await Milestone.create({
      projectId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      sortOrder,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    });

    return {
      ...milestone.toJSON(),
      id: milestone._id,
    };
  }

  static async listMilestones(projectId: string) {
    const milestones = await Milestone.find({ projectId }).sort({ sortOrder: 1 }).lean();
    const milestoneIds = milestones.map((m: any) => m._id);

    const tasks = await Task.find({ milestoneId: { $in: milestoneIds } }, 'milestoneId status _id').lean();

    return milestones.map((m: any) => {
      const milestoneTasks = tasks.filter((t: any) => t.milestoneId === m._id);
      const completedTasks = milestoneTasks.filter((t: any) => t.status === 'COMPLETED').length;

      return {
        ...m,
        id: m._id,
        totalTasks: milestoneTasks.length,
        completedTasks,
      };
    });
  }

  static async updateMilestone(
    id: string,
    data: { name?: string; description?: string; status?: MilestoneStatus; sortOrder?: number; startDate?: string; dueDate?: string }
  ) {
    const existing = await Milestone.findById(id);
    if (!existing) throw new AppError('Milestone not found', 404);

    if (data.name !== undefined) existing.name = data.name.trim();
    if (data.description !== undefined) existing.description = data.description.trim() || null;
    if (data.status !== undefined) existing.status = data.status;
    if (data.sortOrder !== undefined) existing.sortOrder = data.sortOrder;
    if (data.startDate !== undefined) existing.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.dueDate !== undefined) existing.dueDate = data.dueDate ? new Date(data.dueDate) : null;

    await existing.save();

    return {
      ...existing.toJSON(),
      id: existing._id,
    };
  }

  static async deleteMilestone(id: string) {
    const existing = await Milestone.findById(id);
    if (!existing) throw new AppError('Milestone not found', 404);

    await Task.updateMany({ milestoneId: id }, { milestoneId: null });
    await Milestone.findByIdAndDelete(id);

    return { message: 'Milestone deleted. Tasks unlinked.' };
  }
}
