import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(userId: string, title: string, message: string, type: string, data?: any) {
    return this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      title,
      message,
      type,
      data,
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.notificationModel.countDocuments({ userId }),
      this.notificationModel.countDocuments({ userId, isRead: false }),
    ]);
    return { notifications, total, unread, page, pages: Math.ceil(total / limit) };
  }

  async markAsRead(notificationId: string, userId: string) {
    await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
    );
    return { message: 'Notification lue' };
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true });
    return { message: 'Toutes les notifications lues' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({ userId, isRead: false });
    return { count };
  }

  async notifyOrderStatus(userId: string, orderId: string, status: string) {
    const messages: Record<string, string> = {
      confirmed: 'Votre commande a été confirmée',
      preparing: 'Votre commande est en cours de préparation',
      ready: 'Votre commande est prête',
      in_delivery: 'Votre commande est en cours de livraison',
      delivered: 'Votre commande a été livrée avec succès',
      cancelled: 'Votre commande a été annulée',
    };
    const message = messages[status] || 'Statut de commande mis à jour';
    return this.create(userId, 'Mise à jour commande', message, 'order', { orderId, status });
  }

  async notifyNewOrder(
    pharmacyOwnerId: string,
    orderId: string,
    clientName: string,
    totalAmount: number,
    hasPrescription: boolean,
  ) {
    const title = hasPrescription ? '📋 Nouvelle ordonnance à valider' : '🛒 Nouvelle commande reçue';
    const message = hasPrescription
      ? `${clientName} a passé une commande de ${totalAmount} FCFA avec ordonnance à valider.`
      : `${clientName} a passé une commande de ${totalAmount} FCFA.`;
    return this.create(pharmacyOwnerId, title, message, 'order', { orderId, isNewOrder: true });
  }
}
