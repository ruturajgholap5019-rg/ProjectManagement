import { Notification } from '../../models/index.js';

export class NotificationService {
  static async createNotification(userId: string, data: { type: string; title: string; message: string; link?: string }) {
    const notif = await Notification.create({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || null,
    });
    return { ...notif.toJSON(), id: notif._id };
  }

  static async getUserNotifications(userId: string) {
    const notifs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(20).lean();
    return notifs.map((n: any) => ({ ...n, id: n._id }));
  }

  static async markAllAsRead(userId: string) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }
}
