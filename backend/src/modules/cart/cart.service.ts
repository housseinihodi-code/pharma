import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { MedicationsService } from '../medications/medications.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private medicationsService: MedicationsService,
  ) {}

  async getCart(userId: string) {
    let cart = await this.cartModel
      .findOne({ userId })
      .populate('pharmacyId', 'name address phone isOpen')
      .populate('items.medicationId', 'name price stock imageUrl requiresPrescription');
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }
    return cart;
  }

  async addItem(userId: string, medicationId: string, quantity: number) {
    const medication = await this.medicationsService.findById(medicationId);
    if (!medication) throw new NotFoundException('Médicament non trouvé');
    if (medication.stock < quantity) {
      throw new BadRequestException(`Stock insuffisant. Disponible: ${medication.stock}`);
    }

    let cart = await this.cartModel.findOne({ userId });
    if (!cart) {
      cart = await this.cartModel.create({ userId, items: [] });
    }

    if (cart.pharmacyId && (cart.pharmacyId.toString() !== (((medication.pharmacyId as any)?._id) ?? medication.pharmacyId).toString())) {
      throw new BadRequestException('Vous ne pouvez commander que depuis une seule pharmacie à la fois. Videz votre panier d\'abord.');
    }

    const existingItem = cart.items.find(
      (item) => item.medicationId.toString() === medicationId,
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (medication.stock < newQty) {
        throw new BadRequestException(`Stock insuffisant. Disponible: ${medication.stock}`);
      }
      existingItem.quantity = newQty;
    } else {
      cart.items.push({
        medicationId: new Types.ObjectId(medicationId),
        name: medication.name,
        quantity,
        price: medication.price,
        imageUrl: medication.imageUrl,
        requiresPrescription: medication.requiresPrescription,
      });
    }

    cart.pharmacyId = medication.pharmacyId;
    await cart.save();
    return this.getCart(userId);
  }

  async updateItemQuantity(userId: string, medicationId: string, quantity: number) {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) throw new NotFoundException('Panier non trouvé');

    const item = cart.items.find((i) => i.medicationId.toString() === medicationId);
    if (!item) throw new NotFoundException('Article non trouvé dans le panier');

    if (quantity <= 0) {
      return this.removeItem(userId, medicationId);
    }

    const medication = await this.medicationsService.findById(medicationId);
    if (medication.stock < quantity) {
      throw new BadRequestException(`Stock insuffisant. Disponible: ${medication.stock}`);
    }

    item.quantity = quantity;
    await cart.save();
    return this.getCart(userId);
  }

  async removeItem(userId: string, medicationId: string) {
    const cart = await this.cartModel.findOne({ userId });
    if (!cart) throw new NotFoundException('Panier non trouvé');

    cart.items = cart.items.filter((i) => i.medicationId.toString() !== medicationId);

    if (cart.items.length === 0) {
      await this.cartModel.updateOne(
        { _id: cart._id },
        { $set: { items: [] }, $unset: { pharmacyId: '' } },
      );
    } else {
      await cart.save();
    }

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.cartModel.findOneAndUpdate(
      { userId },
      { $set: { items: [] }, $unset: { pharmacyId: '' } },
    );
    return { message: 'Panier vidé' };
  }

  async getCartTotal(userId: string) {
    const cart = await this.getCart(userId);
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { total, itemCount: cart.items.length };
  }
}
