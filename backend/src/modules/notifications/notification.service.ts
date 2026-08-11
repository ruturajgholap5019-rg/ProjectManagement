import { prisma } from '../../config/database.js';

export class NotificationService {
  static async createNotification(userId: string, data: { type: string; title: string; message: string; link?: string }) {
    return prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
      },
    });
  }

  static async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
