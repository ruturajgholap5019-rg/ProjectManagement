import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';
import { cacheGet, cacheSet, cacheDelPattern } from '../../config/redis.js';

// Category Management Service

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

    let categories = await prisma.projectCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (categories.length === 0) {
      await prisma.projectCategory.createMany({
        data: DEFAULT_CATEGORIES,
      });
      categories = await prisma.projectCategory.findMany({
        orderBy: { sortOrder: 'asc' },
      });
    }

    await cacheSet('categories:all', categories, 60);
    return categories;
  }

  static async createCategory(data: { code: string; name: string; icon?: string; description?: string }) {
    const existing = await prisma.projectCategory.findFirst({
      where: {
        OR: [
          { code: data.code.trim().toUpperCase() },
          { name: data.name.trim() },
        ],
      },
    });

    if (existing) {
      throw new AppError('Category with this code or name already exists', 400);
    }

    const count = await prisma.projectCategory.count();

    const created = await prisma.projectCategory.create({
      data: {
        code: data.code.trim().toUpperCase().replace(/\s+/g, '_'),
        name: data.name.trim(),
        icon: data.icon?.trim() || '📁',
        description: data.description?.trim(),
        sortOrder: count + 1,
      },
    });

    await cacheDelPattern('categories*');
    return created;
  }

  static async updateCategory(id: string, data: { code?: string; name?: string; icon?: string; description?: string; sortOrder?: number }) {
    const category = await prisma.projectCategory.findUnique({ where: { id } });
    if (!category) throw new AppError('Category not found', 404);

    let newCode = category.code;
    if (data.code && data.code.trim() !== category.code) {
      newCode = data.code.trim().toUpperCase().replace(/\s+/g, '_');
      const existing = await prisma.projectCategory.findFirst({
        where: { code: newCode, NOT: { id } },
      });
      if (existing) {
        throw new AppError(`Category code "${newCode}" is already in use by another category`, 400);
      }

      // Cascade update to projects using this category code
      await prisma.project.updateMany({
        where: { projectType: category.code },
        data: { projectType: newCode },
      });
    }

    return prisma.projectCategory.update({
      where: { id },
      data: {
        code: newCode,
        ...(data.name && { name: data.name.trim() }),
        ...(data.icon && { icon: data.icon.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.sortOrder !== undefined && { sortOrder: Number(data.sortOrder) }),
      },
    });
  }

  static async deleteCategory(id: string) {
    const category = await prisma.projectCategory.findUnique({ where: { id } });
    if (!category) throw new AppError('Category not found', 404);

    // Check if any projects are currently using this category
    const projectCount = await prisma.project.count({
      where: { projectType: category.code },
    });

    if (projectCount > 0) {
      throw new AppError(
        `Cannot delete category "${category.name}" because ${projectCount} project(s) are assigned to it. Please reassign or update those projects first.`,
        400
      );
    }

    await prisma.projectCategory.delete({ where: { id } });
    return { success: true, message: `Category "${category.name}" deleted successfully.` };
  }
}
