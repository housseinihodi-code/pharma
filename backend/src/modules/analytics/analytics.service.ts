import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Medication, MedicationDocument } from '../medications/schemas/medication.schema';
import { Pharmacy, PharmacyDocument } from '../pharmacies/schemas/pharmacy.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
    @InjectModel(Pharmacy.name) private pharmacyModel: Model<PharmacyDocument>,
  ) {}

  async getDashboardStats() {
    const [totalUsers, totalPharmacies, totalOrders, revenue] = await Promise.all([
      this.userModel.countDocuments({ isActive: true }),
      this.pharmacyModel.countDocuments({ isActive: true }),
      this.orderModel.countDocuments(),
      this.orderModel.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    return {
      totalUsers,
      totalPharmacies,
      totalOrders,
      totalRevenue: revenue[0]?.total || 0,
    };
  }

  async getOrdersByStatus() {
    return this.orderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async getRevenueByMonth(pharmacyId?: string) {
    const match: any = { paymentStatus: 'paid' };
    if (pharmacyId) match.pharmacyId = new Types.ObjectId(pharmacyId);

    return this.orderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);
  }

  async getTopMedications(pharmacyId?: string) {
    const match: any = {};
    if (pharmacyId) match.pharmacyId = new Types.ObjectId(pharmacyId);

    return this.orderModel.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicationId',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);
  }

  async getPharmacyStats(pharmacyId: string) {
    const [orders, revenue, topMeds, lowStock] = await Promise.all([
      this.orderModel.countDocuments({ pharmacyId }),
      this.orderModel.aggregate([
        { $match: { pharmacyId: new Types.ObjectId(pharmacyId), paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.getTopMedications(pharmacyId),
      this.medicationModel.find({
        pharmacyId,
        $expr: { $lte: ['$stock', '$minStock'] },
      }),
    ]);

    return {
      totalOrders: orders,
      totalRevenue: revenue[0]?.total || 0,
      topMedications: topMeds,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
    };
  }

  async getUserGrowth() {
    return this.userModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);
  }
}
