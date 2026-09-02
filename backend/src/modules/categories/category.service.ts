import { ProjectCategory, Project } from '../../models/index.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis.js';

const DEFAULT_CATEGORIES = [
  { code: 'PROJECT_DEVELOPMENT', name: 'Project Development', icon: '💻', sortOrder: 1 },
  { code: 'LIVE_STREAMING', name: 'Live Streaming', icon: '📡', sortOrder: 2 },
  { code: 'PODCAST_MEDIA', name: 'Podcast & Media', icon: '🎙️', sortOrder: 3 },
  { code: 'BMM_BMS_PROJECT', name: 'BMM & BMS Enterprise Project', icon: '🏢', sortOrder: 4 },
  { code: 'AI_INNOVATION', name: 'AI & Smart Systems', icon: '🤖', sortOrder: 5 },
];

export class CategoryService {
  static async listCategories() {
    const cached = await cacheGet<any[]>('categories:all');
    if (cached) return cached;

    let categories = await ProjectCategory.find().sort({ sortOrder: 1 }).lean();

    if (categories.length === 0) {
      await ProjectCategory.insertMany(DEFAULT_CATEGORIES);
      categories = await ProjectCategory.find().sort({ sortOrder: 1 }).lean();
    }

    const result = categories.map((c: any) => ({ ...c, id: c._id }));
    await cacheSet('categories:all', result, 600);
    return result;
  }

  static async createCategory(data: { code: string; name: string; icon?: string; description?: string }) {
    const code = data.code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await ProjectCategory.findOne({
      $or: [{ code }, { name: data.name.trim() }],
    });

    if (existing) {
      throw new AppError('Category with this code or name already exists', 400);
    }

    const count = await ProjectCategory.countDocuments();

    const created = await ProjectCategory.create({
      code,
      name: data.name.trim(),
      icon: data.icon?.trim() || '📁',
      description: data.description?.trim() || null,
      sortOrder: count + 1,
    });

    await cacheDelPattern('categories*');
    return { ...created.toJSON(), id: created._id };
  }

  static async updateCategory(
    id: string,
    data: { code?: string; name?: string; icon?: string; description?: string; sortOrder?: number }
  ) {
    const category = await ProjectCategory.findById(id);
    if (!category) throw new AppError('Category not found', 404);

    let newCode = category.code;
    if (data.code && data.code.trim() !== category.code) {
      newCode = data.code.trim().toUpperCase().replace(/\s+/g, '_');
      const existing = await ProjectCategory.findOne({ code: newCode, _id: { $ne: id } });
      if (existing) {
        throw new AppError(`Category code "${newCode}" is already in use by another category`, 400);
      }

      await Project.updateMany({ projectType: category.code }, { projectType: newCode });
    }

    category.code = newCode;
    if (data.name !== undefined) category.name = data.name.trim();
    if (data.icon !== undefined) category.icon = data.icon.trim();
    if (data.description !== undefined) category.description = data.description?.trim() || null;
    if (data.sortOrder !== undefined) category.sortOrder = Number(data.sortOrder);

    await category.save();
    await cacheDelPattern('categories*');

    return { ...category.toJSON(), id: category._id };
  }

  static async deleteCategory(id: string) {
    const category = await ProjectCategory.findById(id);
    if (!category) throw new AppError('Category not found', 404);

    const projectCount = await Project.countDocuments({ projectType: category.code });

    if (projectCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because ${projectCount} project(s) are assigned to it. Please reassign or update those projects first.`,
        400
      );
    }

    await ProjectCategory.findByIdAndDelete(id);
    await cacheDelPattern('categories*');
    return { success: true, message: `Category "${category.name}" deleted successfully.` };
  }
}
