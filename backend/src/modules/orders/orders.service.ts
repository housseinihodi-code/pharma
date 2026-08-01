import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Pharmacy, PharmacyDocument } from '../pharmacies/schemas/pharmacy.schema';
import { CreateOrderDto, UpdateOrderStatusDto, ValidatePrescriptionDto } from './dto/order.dto';
import { MedicationsService } from '../medications/medications.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Pharmacy.name) private pharmacyModel: Model<PharmacyDocument>,
    private medicationsService: MedicationsService,
    private cartService: CartService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of dto.items) {
      const medication = await this.medicationsService.findById(item.medicationId);
      if (!medication) throw new NotFoundException(`Médicament ${item.medicationId} non trouvé`);
      if (medication.stock < item.quantity) {
        throw new BadRequestException(`Stock insuffisant pour ${medication.name}. Disponible: ${medication.stock}`);
      }
      const medPharmacyId = (medication.pharmacyId as any)?._id?.toString()
        ?? medication.pharmacyId.toString();
      if (medPharmacyId !== dto.pharmacyId) {
        throw new BadRequestException(`${medication.name} n'appartient pas à cette pharmacie`);
      }
      // Règle métier : médicament hospitalier → pharmacie hospitalière uniquement
      if ((medication as any).isHospitalOnly) {
        const pharmacy = (medication.pharmacyId as any);
        const isHospital = pharmacy?.isHospitalPharmacy;
        if (!isHospital) {
          throw new BadRequestException(
            `"${medication.name}" est un médicament réservé aux pharmacies hospitalières et ne peut pas être commandé ici.`,
          );
        }
      }

      orderItems.push({
        medicationId: new Types.ObjectId(item.medicationId),
        name: medication.name,
        quantity: item.quantity,
        price: medication.price,
        imageUrl: medication.imageUrl,
      });
      totalAmount += medication.price * item.quantity;
    }

    // Si une ordonnance est fournie → statut spécial en attente de validation
    const hasPrescription = !!dto.prescriptionUrl;
    const initialStatus = hasPrescription ? 'pending_prescription' : 'pending';
    const prescriptionStatus = hasPrescription ? 'pending_review' : 'not_required';

    // Décrémentation du stock AVANT la création de la commande
    // En cas d'échec de la commande on restitue le stock (rollback manuel).
    for (const item of dto.items) {
      await this.medicationsService.updateStock(
        item.medicationId,
        { quantity: item.quantity, operation: 'remove' },
        userId,
        'system',
      );
    }

    let order: OrderDocument;
    try {
      order = await this.orderModel.create({
        userId: new Types.ObjectId(userId),
        pharmacyId: new Types.ObjectId(dto.pharmacyId),
        items: orderItems,
        totalAmount,
        deliveryType: dto.deliveryType,
        deliveryAddress: dto.deliveryAddress,
        deliveryLocation: dto.deliveryLocation
          ? { type: 'Point', coordinates: [dto.deliveryLocation.longitude, dto.deliveryLocation.latitude] }
          : undefined,
        notes: dto.notes,
        prescriptionUrl: dto.prescriptionUrl,
        paymentMethod: dto.paymentMethod,
        status: initialStatus,
        prescriptionStatus,
      });
    } catch (error) {
      for (const item of dto.items) {
        try {
          await this.medicationsService.updateStock(
            item.medicationId,
            { quantity: item.quantity, operation: 'add' },
            userId,
            'system',
          );
        } catch {
          // Ignorer les erreurs de rollback individuel pour ne pas masquer l'erreur originale
        }
      }
      throw error;
    }

    // Vider le panier
    await this.cartService.clearCart(userId);

    const populated = await order.populate([
      { path: 'pharmacyId', select: 'name address phone' },
      { path: 'userId', select: 'firstName lastName' },
    ]);

    // Notifier le pharmacien qu'une nouvelle commande vient d'arriver
    const pharmacy = await this.pharmacyModel.findById(dto.pharmacyId).select('ownerId');
    if (pharmacy?.ownerId) {
      const client = populated.userId as any;
      const clientName = client?.firstName ? `${client.firstName} ${client.lastName}` : 'Un client';
      await this.notificationsService.notifyNewOrder(
        pharmacy.ownerId.toString(),
        (order._id as Types.ObjectId).toString(),
        clientName,
        totalAmount,
        hasPrescription,
      );
    }

    return populated;
  }

  async findUserOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find({ userId })
        .populate('pharmacyId', 'name address phone imageUrl')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.orderModel.countDocuments({ userId }),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async findPharmacyOrders(pharmacyId: string, page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const filter: any = { pharmacyId };
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('userId', 'firstName lastName phone email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.orderModel.countDocuments(filter),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, userId?: string, userRole?: string) {
    const order = await this.orderModel.findById(id);

    if (!order) throw new NotFoundException('Commande non trouvée');

    if (userRole !== 'admin' && userRole !== 'pharmacist') {
      if (!userId) throw new ForbiddenException('Accès refusé');
      if (order.userId.toString() !== userId.toString()) throw new ForbiddenException('Accès refusé');
    }

    return order.populate([
      { path: 'pharmacyId', select: 'name address phone imageUrl' },
      { path: 'userId', select: 'firstName lastName phone email' },
    ]);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, userId: string, userRole: string) {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Commande non trouvée');

    const allowedRoles = ['admin', 'pharmacist', 'driver'];
    if (!allowedRoles.includes(userRole) && order.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('Accès refusé');
    }

    if (userRole === 'driver' && !['in_delivery', 'delivered'].includes(dto.status)) {
      throw new ForbiddenException('Les livreurs ne peuvent modifier que les statuts in_delivery et delivered');
    }

    if (dto.status === 'cancelled' && !['pending_prescription', 'pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException('Cette commande ne peut plus être annulée');
    }

    const updated = await this.orderModel
      .findByIdAndUpdate(id, { status: dto.status }, { new: true })
      .populate('pharmacyId', 'name address');

    if (dto.status === 'cancelled') {
      for (const item of order.items) {
        await this.medicationsService.updateStock(
          item.medicationId.toString(),
          { quantity: item.quantity, operation: 'add' },
          userId,
          'system',
        );
      }
    }

    // Notifier le client propriétaire de la commande
    await this.notificationsService.notifyOrderStatus(
      order.userId.toString(),
      id,
      dto.status,
    );

    return updated;
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find()
        .populate('userId', 'firstName lastName email')
        .populate('pharmacyId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.orderModel.countDocuments(),
    ]);
    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async validatePrescription(
    orderId: string,
    dto: ValidatePrescriptionDto,
    pharmacistId: string,
    userRole: string,
  ) {
    if (!['pharmacist', 'admin'].includes(userRole)) {
      throw new ForbiddenException('Accès réservé aux pharmaciens');
    }

    const order = await this.orderModel
      .findById(orderId)
      .populate('userId', 'firstName lastName');
    if (!order) throw new NotFoundException('Commande non trouvée');

    if (order.prescriptionStatus !== 'pending_review') {
      throw new BadRequestException('Cette ordonnance a déjà été traitée');
    }

    const client = order.userId as any;
    const clientId = client?._id?.toString() ?? order.userId.toString();
    const clientName = client?.firstName ? `${client.firstName} ${client.lastName}` : 'le client';

    if (dto.decision === 'approved') {
      order.prescriptionStatus = 'approved';
      order.status = 'pending';
      await order.save();

      await this.notificationsService.create(
        clientId,
        '✅ Ordonnance validée',
        'Votre ordonnance a été validée par la pharmacie. Votre commande est maintenant en cours de traitement.',
        'order',
        { orderId, prescriptionStatus: 'approved' },
      );
    } else {
      const reason = dto.reason || 'Non conforme';
      order.prescriptionStatus = 'rejected';
      order.status = 'prescription_rejected';
      order.prescriptionRejectionReason = reason;
      await order.save();

      // Restituer le stock décrémenté lors de la création de la commande
      for (const item of order.items) {
        await this.medicationsService.updateStock(
          item.medicationId.toString(),
          { quantity: item.quantity, operation: 'add' },
          pharmacistId,
          'system',
        );
      }

      await this.notificationsService.create(
        clientId,
        '❌ Ordonnance rejetée',
        `Votre ordonnance a été rejetée par la pharmacie. Motif : ${reason}`,
        'order',
        { orderId, prescriptionStatus: 'rejected', reason },
      );
    }

    return order;
  }

  async getPendingPrescriptions(pharmacyId: string) {
    return this.orderModel
      .find({ pharmacyId: new Types.ObjectId(pharmacyId), prescriptionStatus: 'pending_review' })
      .populate('userId', 'firstName lastName phone email')
      .sort({ createdAt: 1 });
  }

  async reorder(orderId: string, userId: string) {
    const original = await this.orderModel.findById(orderId);
    if (!original) throw new NotFoundException('Commande introuvable');
    if (original.userId.toString() !== userId.toString()) throw new ForbiddenException('Accès refusé');

    const unavailable: string[] = [];
    const available: Array<{ medicationId: string; name: string; quantity: number }> = [];

    for (const item of original.items) {
      try {
        const med = await this.medicationsService.findById(item.medicationId.toString());
        if (med.isAvailable && med.stock >= item.quantity) {
          available.push({ medicationId: item.medicationId.toString(), name: item.name, quantity: item.quantity });
        } else {
          unavailable.push(item.name);
        }
      } catch {
        unavailable.push(item.name);
      }
    }

    if (available.length === 0) {
      throw new BadRequestException('Aucun article disponible pour renouveler cette commande');
    }

    await this.cartService.clearCart(userId);
    for (const item of available) {
      await this.cartService.addItem(userId, item.medicationId, item.quantity);
    }

    return {
      message: `${available.length} article(s) ajouté(s) au panier`,
      pharmacyId: original.pharmacyId,
      unavailable,
      added: available.length,
    };
  }

  async getStats(pharmacyId?: string) {
    const match: any = pharmacyId ? { pharmacyId: new Types.ObjectId(pharmacyId) } : {};
    const stats = await this.orderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);
    return stats;
  }
}
