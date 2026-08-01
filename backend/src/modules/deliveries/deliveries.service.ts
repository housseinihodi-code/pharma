import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Delivery, DeliveryDocument } from './schemas/delivery.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery.name) private deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async createFromOrder(orderId: string, pickupAddress: string, pickupCoordinates: [number, number]) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Commande non trouvée');
    if (order.deliveryType !== 'delivery') {
      throw new BadRequestException('Cette commande est en retrait, pas en livraison');
    }

    const existing = await this.deliveryModel.findOne({ orderId });
    if (existing) return existing;

    return this.deliveryModel.create({
      orderId: new Types.ObjectId(orderId),
      pickupLocation: { address: pickupAddress, coordinates: pickupCoordinates },
      deliveryLocation: {
        address: order.deliveryAddress,
        coordinates: order.deliveryLocation?.coordinates || [0, 0],
      },
    });
  }

  /**
   * Un client ne peut voir que ses propres livraisons, un pharmacien que celles
   * de sa pharmacie, un livreur que celles qui lui sont assignées. Admin: tout.
   */
  private assertCanAccessDelivery(
    delivery: DeliveryDocument,
    currentUserId: string,
    role: string,
    userPharmacyId?: string,
  ) {
    if (role === 'admin') return;

    const order = delivery.orderId as any;
    const orderUserId = order?.userId?._id?.toString() ?? order?.userId?.toString();
    const orderPharmacyId = order?.pharmacyId?._id?.toString() ?? order?.pharmacyId?.toString();

    if (role === 'client' && orderUserId === currentUserId) return;
    if (role === 'pharmacist' && userPharmacyId && orderPharmacyId === userPharmacyId.toString()) return;
    if (role === 'driver' && delivery.driverId?.toString() === currentUserId) return;

    throw new ForbiddenException('Accès refusé à cette livraison');
  }

  async findById(deliveryId: string, currentUserId: string, role: string, userPharmacyId?: string) {
    const delivery = await this.deliveryModel
      .findById(deliveryId)
      .populate('driverId', 'firstName lastName phone')
      .populate({ path: 'orderId', populate: { path: 'userId', select: 'firstName lastName phone' } });
    if (!delivery) throw new NotFoundException('Livraison non trouvée');
    this.assertCanAccessDelivery(delivery, currentUserId, role, userPharmacyId);
    return delivery;
  }

  async findByOrder(orderId: string, currentUserId: string, role: string, userPharmacyId?: string) {
    const delivery = await this.deliveryModel
      .findOne({ orderId })
      .populate('driverId', 'firstName lastName phone')
      .populate('orderId');
    if (!delivery) throw new NotFoundException('Livraison non trouvée');
    this.assertCanAccessDelivery(delivery, currentUserId, role, userPharmacyId);
    return delivery;
  }

  async assignDriver(deliveryId: string, driverId: string, pharmacistId: string) {
    const delivery = await this.deliveryModel.findById(deliveryId).populate('orderId');
    if (!delivery) throw new NotFoundException('Livraison non trouvée');

    const order = delivery.orderId as any;
    const pharmacyId = order?.pharmacyId?.toString() ?? order?.toString();

    // Vérifier que le livreur appartient à la pharmacie
    const driver = await this.userModel.findById(driverId).select('role pharmacyId isActive');
    if (!driver) throw new NotFoundException('Livreur non trouvé');
    if (driver.role !== 'driver') throw new BadRequestException('Cet utilisateur n\'est pas un livreur');
    if (!driver.isActive) throw new BadRequestException('Ce livreur est désactivé');
    if (driver.pharmacyId?.toString() !== pharmacyId) {
      throw new ForbiddenException('Ce livreur n\'appartient pas à cette pharmacie');
    }

    delivery.driverId = new Types.ObjectId(driverId);
    delivery.status = 'assigned';
    delivery.estimatedDeliveryTime = new Date(Date.now() + 45 * 60 * 1000);
    await delivery.save();
    return delivery.populate('driverId', 'firstName lastName phone');
  }

  async getPharmacyAvailableDrivers(pharmacyId: string) {
    return this.userModel
      .find({ role: 'driver', pharmacyId: new Types.ObjectId(pharmacyId), isActive: true })
      .select('firstName lastName phone isActive')
      .lean();
  }

  async updateStatus(deliveryId: string, status: string, driverId: string) {
    const delivery = await this.deliveryModel.findById(deliveryId);
    if (!delivery) throw new NotFoundException('Livraison non trouvée');

    if (delivery.driverId?.toString() !== driverId) {
      throw new ForbiddenException('Vous n\'êtes pas assigné à cette livraison');
    }

    const validTransitions: Record<string, string[]> = {
      assigned: ['picked_up'],
      picked_up: ['in_transit'],
      in_transit: ['delivered', 'failed'],
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
      throw new BadRequestException(`Transition de statut invalide: ${delivery.status} -> ${status}`);
    }

    delivery.status = status;
    if (status === 'delivered') {
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
    return delivery;
  }

  async updateLocation(deliveryId: string, longitude: number, latitude: number, driverId: string) {
    const delivery = await this.deliveryModel.findById(deliveryId);
    if (!delivery) throw new NotFoundException('Livraison non trouvée');
    if (delivery.driverId?.toString() !== driverId) {
      throw new ForbiddenException('Accès refusé');
    }

    delivery.currentLocation = { coordinates: [longitude, latitude], updatedAt: new Date() };
    await delivery.save();
    return { coordinates: [longitude, latitude] };
  }

  async getDriverDeliveries(driverId: string, status?: string) {
    const filter: any = { driverId };
    if (status) filter.status = status;
    return this.deliveryModel
      .find(filter)
      .populate('orderId')
      .sort({ createdAt: -1 });
  }

  async getPendingDeliveries(pharmacyId?: string) {
    const deliveries = await this.deliveryModel
      .find({ status: { $in: ['pending', 'assigned'] } })
      .populate('orderId', 'totalAmount deliveryAddress userId pharmacyId')
      .populate('driverId', 'firstName lastName phone');

    if (!pharmacyId) return deliveries;
    return deliveries.filter(d => {
      const order = d.orderId as any;
      return order?.pharmacyId?.toString() === pharmacyId;
    });
  }

  async getDeliveryMessages(deliveryId: string, currentUserId: string, role: string, userPharmacyId?: string) {
    const delivery = await this.deliveryModel
      .findById(deliveryId)
      .populate({ path: 'orderId', select: 'userId pharmacyId' });
    if (!delivery) throw new NotFoundException('Livraison non trouvée');
    this.assertCanAccessDelivery(delivery, currentUserId, role, userPharmacyId);
    return delivery.messages || [];
  }

  async findByOrderForTracking(orderId: string, currentUserId: string, role: string, userPharmacyId?: string) {
    const delivery = await this.deliveryModel
      .findOne({ orderId })
      .populate('driverId', 'firstName lastName phone profilePicture')
      .populate({ path: 'orderId', populate: { path: 'userId', select: 'firstName lastName phone' } });
    if (!delivery) return null;
    this.assertCanAccessDelivery(delivery, currentUserId, role, userPharmacyId);
    return delivery.toObject();
  }
}
