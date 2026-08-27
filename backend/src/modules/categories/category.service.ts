import { prisma } from '../../config/database.js';
import { AppError } from '../../middlewares/error.middleware.js';

// Category Management Service

const DEFAULT_CATEGORIES = [
  { code: 'WEBSITE_WEBAPP', name: 'Website / Web App', icon: '🖥️', sortOrder: 1 },
  { code: 'MOBILE_APP', name: 'Mobile Application', icon: '📱', sortOrder: 2 },
  { code: 'BMS', name: 'Enterprise System (BMS)', icon: '🏢', sortOrder: 3 },
  { code: 'UNIVERSITY_NEP', name: 'University / NEP Platform', icon: '🎓', sortOrder: 4 },
  { code: 'DESIGN_SOCIAL_MEDIA', name: 'Design & Social Media', icon: '🎨', sortOrder: 5 },
  { code: 'PODCAST_MEDIA', name: 'Podcast & Media', icon: '🎙️', sortOrder: 6 },
  { code: 'RESEARCH', name: 'Digital Research', icon: '🔬', sortOrder: 7 },
  { code: 'OTHER', name: 'Other Projects', icon: '📁', sortOrder: 8 },
];

export class CategoryService {
  static async listCategories() {
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

    return prisma.projectCategory.create({
      data: {
        code: data.code.trim().toUpperCase().replace(/\s+/g, '_'),
        name: data.name.trim(),
        icon: data.icon?.trim() || '📁',
        description: data.description?.trim(),
        sortOrder: count + 1,
      },
    });
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
