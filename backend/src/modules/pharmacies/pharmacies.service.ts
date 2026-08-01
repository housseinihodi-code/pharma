import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pharmacy, PharmacyDocument } from './schemas/pharmacy.schema';
import { CreatePharmacyDto, UpdatePharmacyDto } from './dto/pharmacy.dto';

@Injectable()
export class PharmaciesService {
  constructor(
    @InjectModel(Pharmacy.name) private pharmacyModel: Model<PharmacyDocument>,
  ) {}

  async create(dto: CreatePharmacyDto, ownerId: string) {
    const pharmacy = await this.pharmacyModel.create({
      ...dto,
      ownerId,
      location: {
        type: 'Point',
        coordinates: [dto.location.longitude, dto.location.latitude],
      },
    });
    return pharmacy;
  }

  async findAll(page = 1, limit = 20, unownedOnly = false) {
    page = Math.max(1, page || 1);
    limit = Math.max(1, Math.min(100, limit || 20));
    const skip = (page - 1) * limit;
    const filter: any = { isActive: true };
    if (unownedOnly) filter.$or = [{ ownerId: { $exists: false } }, { ownerId: null }];
    const [pharmacies, total] = await Promise.all([
      this.pharmacyModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
      this.pharmacyModel.countDocuments(filter),
    ]);
    return { pharmacies, total, page, pages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const pharmacy = await this.pharmacyModel.findById(id);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
    return pharmacy;
  }

  async findNearby(longitude: number, latitude: number, radius = 5000) {
    const pharmacies = await this.pharmacyModel.find({
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radius,
        },
      },
    });
    return pharmacies;
  }

  async search(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = query
      ? { isActive: true, $text: { $search: query } }
      : { isActive: true };

    const [pharmacies, total] = await Promise.all([
      this.pharmacyModel.find(filter).skip(skip).limit(limit),
      this.pharmacyModel.countDocuments(filter),
    ]);
    return { pharmacies, total, page, pages: Math.ceil(total / limit) };
  }

  async update(id: string, dto: UpdatePharmacyDto, userId: string, userRole: string) {
    const pharmacy = await this.pharmacyModel.findById(id);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');

    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Vous ne pouvez modifier que votre pharmacie');
    }

    const updated = await this.pharmacyModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    return updated;
  }

  async toggleOpen(id: string, userId: string, userRole: string) {
    const pharmacy = await this.pharmacyModel.findById(id);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');

    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Accès refusé');
    }

    pharmacy.isOpen = !pharmacy.isOpen;
    await pharmacy.save();
    return { isOpen: pharmacy.isOpen, message: `Pharmacie ${pharmacy.isOpen ? 'ouverte' : 'fermée'}` };
  }

  async getMyPharmacies(ownerId: string) {
    return this.pharmacyModel.find({ ownerId, isActive: true });
  }

  async findHospitalPharmacies(specialty?: string) {
    const filter: any = { isActive: true, isHospitalPharmacy: true };
    if (specialty) filter.chronicSpecialties = specialty;
    return this.pharmacyModel.find(filter).sort({ hospitalName: 1, name: 1 });
  }

  async findOnDuty() {
    const now = new Date();
    return this.pharmacyModel.find({
      isActive: true,
      isOnDuty: true,
      $or: [
        { dutyEnd: { $exists: false } },
        { dutyEnd: null },
        { dutyEnd: { $gte: now } },
      ],
    }).sort({ name: 1 });
  }

  async findOpen24_7() {
    return this.pharmacyModel.find({ isActive: true, is24_7: true }).sort({ name: 1 });
  }

  async findOpenAllDays() {
    return this.pharmacyModel.find({
      isActive: true,
      $or: [{ openAllDays: true }, { is24_7: true }],
    }).sort({ name: 1 });
  }

  async setDutyStatus(
    id: string,
    userId: string,
    userRole: string,
    isOnDuty: boolean,
    dutyStart?: string,
    dutyEnd?: string,
  ) {
    const pharmacy = await this.pharmacyModel.findById(id);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Accès refusé');
    }
    const update: any = { isOnDuty };
    if (dutyStart) update.dutyStart = new Date(dutyStart);
    if (dutyEnd) update.dutyEnd = new Date(dutyEnd);
    const updated = await this.pharmacyModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    return { message: `Pharmacie ${isOnDuty ? 'mise en garde' : 'retirée de la garde'}`, pharmacy: updated };
  }

  async delete(id: string, userId: string, userRole: string) {
    const pharmacy = await this.pharmacyModel.findById(id);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');

    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Accès refusé');
    }

    await this.pharmacyModel.findByIdAndUpdate(id, { isActive: false });
    return { message: 'Pharmacie supprimée' };
  }
}
