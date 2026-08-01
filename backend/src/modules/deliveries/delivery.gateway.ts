import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Delivery, DeliveryDocument } from './schemas/delivery.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/delivery',
})
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private userSockets = new Map<string, string>();
  private socketUsers = new Map<string, { userId: string; role: string; name: string }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'super-secret-key',
      });

      const userId = payload.sub?.toString();
      const role = payload.role || 'client';

      const user = await this.userModel.findById(userId).select('firstName lastName').lean();
      const name = user ? `${user.firstName} ${user.lastName}` : 'Inconnu';

      this.userSockets.set(userId, client.id);
      this.socketUsers.set(client.id, { userId, role, name });

      client.emit('connected', { userId, role });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = this.socketUsers.get(client.id);
    if (data) {
      this.userSockets.delete(data.userId);
      this.socketUsers.delete(client.id);
    }
  }

  /**
   * Vérifie que l'utilisateur connecté a bien un lien avec cette livraison
   * (client de la commande, pharmacien de la pharmacie, livreur assigné, ou admin)
   * avant de le laisser rejoindre la room ou agir dessus.
   */
  private async canAccessDelivery(
    deliveryId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    if (role === 'admin') return true;

    const delivery = await this.deliveryModel.findById(deliveryId).select('driverId orderId');
    if (!delivery) return false;

    if (role === 'driver') return delivery.driverId?.toString() === userId;

    const order = await this.orderModel.findById(delivery.orderId).select('userId pharmacyId');
    if (!order) return false;

    if (role === 'client') return order.userId.toString() === userId;
    if (role === 'pharmacist') {
      const user = await this.userModel.findById(userId).select('pharmacyId').lean();
      return !!user?.pharmacyId && user.pharmacyId.toString() === order.pharmacyId.toString();
    }
    return false;
  }

  @SubscribeMessage('join_delivery')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() deliveryId: string) {
    const user = this.socketUsers.get(client.id);
    if (!user) return;
    const allowed = await this.canAccessDelivery(deliveryId, user.userId, user.role);
    if (!allowed) return;
    client.join(`delivery:${deliveryId}`);
  }

  @SubscribeMessage('leave_delivery')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() deliveryId: string) {
    client.leave(`delivery:${deliveryId}`);
  }

  @SubscribeMessage('update_position')
  async handlePosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string; lat: number; lng: number },
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user || user.role !== 'driver') return;

    const delivery = await this.deliveryModel.findById(data.deliveryId).select('driverId');
    if (!delivery || delivery.driverId?.toString() !== user.userId) return;

    await this.deliveryModel.findByIdAndUpdate(data.deliveryId, {
      currentLocation: {
        coordinates: [data.lng, data.lat],
        updatedAt: new Date(),
      },
    });

    this.server.to(`delivery:${data.deliveryId}`).emit('position_updated', {
      lat: data.lat,
      lng: data.lng,
      updatedAt: new Date(),
    });
  }

  @SubscribeMessage('delivery_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string; content: string },
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user || !data.content?.trim()) return;
    const allowed = await this.canAccessDelivery(data.deliveryId, user.userId, user.role);
    if (!allowed) return;

    const message = {
      senderId: user.userId,
      senderName: user.name,
      senderRole: user.role,
      content: data.content.trim(),
      createdAt: new Date(),
    };

    await this.deliveryModel.findByIdAndUpdate(data.deliveryId, {
      $push: { messages: message },
    });

    const outMsg = { ...message, _id: `${user.userId}-${Date.now()}` };
    this.server.to(`delivery:${data.deliveryId}`).emit('delivery_message', outMsg);
  }

  @SubscribeMessage('update_delivery_status')
  async handleStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deliveryId: string; status: string },
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user || user.role !== 'driver') return;

    const delivery = await this.deliveryModel.findById(data.deliveryId);
    if (!delivery || delivery.driverId?.toString() !== user.userId) return;

    const validTransitions: Record<string, string[]> = {
      assigned: ['picked_up'],
      picked_up: ['in_transit'],
      in_transit: ['delivered', 'failed'],
    };

    if (!validTransitions[delivery.status]?.includes(data.status)) return;

    delivery.status = data.status;
    if (data.status === 'delivered') {
      delivery.actualDeliveryTime = new Date();
      const order = await this.orderModel.findByIdAndUpdate(
        delivery.orderId,
        { status: 'delivered' },
        { new: true },
      );
      if (order) {
        await this.notificationsService.notifyOrderStatus(
          order.userId.toString(),
          order._id.toString(),
          'delivered',
        );
      }
    }
    await delivery.save();

    this.server.to(`delivery:${data.deliveryId}`).emit('status_updated', {
      status: data.status,
      updatedAt: new Date(),
    });
  }

  notifyDeliveryRoom(deliveryId: string, event: string, data: any) {
    this.server.to(`delivery:${deliveryId}`).emit(event, data);
  }
}
