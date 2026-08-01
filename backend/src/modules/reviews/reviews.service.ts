import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private reviewModel: Model<ReviewDocument>) {}

  async getByPharmacy(pharmacyId: string) {
    const reviews = await this.reviewModel
      .find({ pharmacyId: new Types.ObjectId(pharmacyId) })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const count = reviews.length;
    const avg = count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;

    const distribution = [1, 2, 3, 4, 5].reduce((acc, n) => {
      acc[n] = reviews.filter(r => r.rating === n).length;
      return acc;
    }, {} as Record<number, number>);

    return { reviews, count, average: avg, distribution };
  }

  async create(pharmacyId: string, userId: string, rating: number, comment?: string) {
    const existing = await this.reviewModel.findOne({
      pharmacyId: new Types.ObjectId(pharmacyId),
      userId: new Types.ObjectId(userId),
    });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment || '';
      await existing.save();
      return existing.populate('userId', 'firstName lastName');
    }
    const review = await this.reviewModel.create({
      pharmacyId: new Types.ObjectId(pharmacyId),
      userId: new Types.ObjectId(userId),
      rating,
      comment: comment || '',
    });
    return review.populate('userId', 'firstName lastName');
  }

  async delete(pharmacyId: string, userId: string) {
    const review = await this.reviewModel.findOneAndDelete({
      pharmacyId: new Types.ObjectId(pharmacyId),
      userId: new Types.ObjectId(userId),
    });
    if (!review) throw new NotFoundException('Avis non trouvé');
    return { message: 'Avis supprimé' };
  }

  async getMyReview(pharmacyId: string, userId: string) {
    return this.reviewModel.findOne({
      pharmacyId: new Types.ObjectId(pharmacyId),
      userId: new Types.ObjectId(userId),
    }).lean();
  }
}
