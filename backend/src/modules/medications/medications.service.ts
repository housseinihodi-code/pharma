import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Medication, MedicationDocument } from './schemas/medication.schema';
import { CreateMedicationDto, UpdateMedicationDto, UpdateStockDto } from './dto/medication.dto';
import { PharmaciesService } from '../pharmacies/pharmacies.service';

@Injectable()
export class MedicationsService {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
    private pharmaciesService: PharmaciesService,
  ) {}

  async create(dto: CreateMedicationDto, userId: string, userRole: string) {
    const pharmacy = await this.pharmaciesService.findById(dto.pharmacyId);
    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Vous ne pouvez ajouter des médicaments qu\'à votre pharmacie');
    }
    // Règle métier : médicament hospitalier → pharmacie hospitalière obligatoire
    if (dto.isHospitalOnly && !(pharmacy as any).isHospitalPharmacy) {
      throw new BadRequestException(
        'Ce médicament est réservé aux pharmacies hospitalières. Votre pharmacie doit être enregistrée comme pharmacie d\'hôpital.',
      );
    }
    // Si catégorie maladie chronique → prescription obligatoire
    if (dto.chronicDiseaseCategory) {
      dto.requiresPrescription = true;
    }
    return this.medicationModel.create(dto);
  }

  async findByPharmacy(pharmacyId: string, page = 1, limit = 20, category?: string) {
    const skip = (page - 1) * limit;
    const filter: any = { pharmacyId: new Types.ObjectId(pharmacyId), isAvailable: true };
    if (category) filter.category = category;

    const [medications, total] = await Promise.all([
      this.medicationModel.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
      this.medicationModel.countDocuments(filter),
    ]);
    return { medications, total, page, pages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const med = await this.medicationModel.findById(id).populate('pharmacyId', 'name address phone');
    if (!med) throw new NotFoundException('Médicament non trouvé');
    return med;
  }

  async search(
    query: string,
    pharmacyId?: string,
    category?: string,
    page = 1,
    limit = 20,
    isHospitalOnly?: boolean,
    chronicDiseaseCategory?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = { isAvailable: true };
    if (query) filter.$text = { $search: query };
    if (pharmacyId) filter.pharmacyId = new Types.ObjectId(pharmacyId);
    if (category) filter.category = category;
    if (isHospitalOnly === true) filter.isHospitalOnly = true;
    if (chronicDiseaseCategory) filter.chronicDiseaseCategory = chronicDiseaseCategory;

    const [medications, total] = await Promise.all([
      this.medicationModel
        .find(filter)
        .populate('pharmacyId', 'name address isOpen isHospitalPharmacy hospitalName')
        .skip(skip)
        .limit(limit),
      this.medicationModel.countDocuments(filter),
    ]);
    return { medications, total, page, pages: Math.ceil(total / limit) };
  }

  async findHospitalMedications(chronicDiseaseCategory?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter: any = { isAvailable: true, isHospitalOnly: true };
    if (chronicDiseaseCategory) filter.chronicDiseaseCategory = chronicDiseaseCategory;

    const [medications, total] = await Promise.all([
      this.medicationModel
        .find(filter)
        .populate('pharmacyId', 'name address phone isOpen isHospitalPharmacy hospitalName location')
        .skip(skip)
        .limit(limit)
        .sort({ chronicDiseaseCategory: 1, name: 1 }),
      this.medicationModel.countDocuments(filter),
    ]);
    return { medications, total, page, pages: Math.ceil(total / limit) };
  }

  async findByChronicDisease(category: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter: any = { isAvailable: true, chronicDiseaseCategory: category };

    const [medications, total] = await Promise.all([
      this.medicationModel
        .find(filter)
        .populate('pharmacyId', 'name address phone isOpen isHospitalPharmacy hospitalName')
        .skip(skip)
        .limit(limit)
        .sort({ name: 1 }),
      this.medicationModel.countDocuments(filter),
    ]);
    return { medications, total, page, pages: Math.ceil(total / limit) };
  }

  async update(id: string, dto: UpdateMedicationDto, userId: string, userRole: string) {
    const med = await this.medicationModel.findById(id);
    if (!med) throw new NotFoundException('Médicament non trouvé');

    const pharmacy = await this.pharmaciesService.findById(med.pharmacyId.toString());
    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Accès refusé');
    }

    return this.medicationModel.findByIdAndUpdate(id, { $set: dto }, { new: true });
  }

  async updateStock(id: string, dto: UpdateStockDto, userId: string, userRole: string) {
    const med = await this.medicationModel.findById(id);
    if (!med) throw new NotFoundException('Médicament non trouvé');

    if (userRole !== 'admin' && userRole !== 'system') {
      const pharmacy = await this.pharmaciesService.findById(med.pharmacyId.toString());
      if (pharmacy.ownerId?.toString() !== userId) {
        throw new ForbiddenException('Accès refusé');
      }
    }

    let newStock: number;
    if (dto.operation === 'set') {
      newStock = dto.quantity;
    } else if (dto.operation === 'add') {
      newStock = med.stock + dto.quantity;
    } else {
      newStock = med.stock - dto.quantity;
      if (newStock < 0) throw new BadRequestException('Stock insuffisant');
    }

    const updated = await this.medicationModel.findByIdAndUpdate(
      id,
      { stock: newStock, isAvailable: newStock > 0 },
      { new: true },
    );
    return updated;
  }

  async compareByName(query: string, limit = 40) {
    if (!query?.trim()) return [];
    const raw = query.trim();
    const normalized = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const pattern = normalized !== raw ? `${raw}|${normalized}` : raw;
    const medications = await this.medicationModel
      .find({
        isAvailable: true,
        stock: { $gt: 0 },
        $or: [
          { name: { $regex: pattern, $options: 'i' } },
          { genericName: { $regex: pattern, $options: 'i' } },
        ],
      })
      .populate('pharmacyId', 'name address phone isOpen isActive location rating deliveryFee hasDelivery')
      .sort({ price: 1 })
      .limit(limit)
      .lean();
    return medications.filter(m => (m.pharmacyId as any)?.isActive);
  }

  async getLowStock(pharmacyId: string) {
    return this.medicationModel.find({
      pharmacyId: new Types.ObjectId(pharmacyId),
      $expr: { $lte: ['$stock', '$minStock'] },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const med = await this.medicationModel.findById(id);
    if (!med) throw new NotFoundException('Médicament non trouvé');

    const pharmacy = await this.pharmaciesService.findById(med.pharmacyId.toString());
    if (userRole !== 'admin' && pharmacy.ownerId?.toString() !== userId.toString()) {
      throw new ForbiddenException('Accès refusé');
    }

    await this.medicationModel.findByIdAndUpdate(id, { isAvailable: false });
    return { message: 'Médicament supprimé' };
  }
}
