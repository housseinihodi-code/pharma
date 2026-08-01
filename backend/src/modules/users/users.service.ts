import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto, UpdatePasswordDto, CreateDriverDto, AdminCreatePharmacistDto } from './dto/user.dto';
import { Pharmacy, PharmacyDocument } from '../pharmacies/schemas/pharmacy.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Pharmacy.name) private pharmacyModel: Model<PharmacyDocument>,
  ) {}

  async findById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name address phone isOpen isActive');
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async getProfile(userId: string) {
    return this.findById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: dto }, { new: true })
      .select('-password -refreshToken');
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Mot de passe actuel incorrect');

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await this.userModel.findByIdAndUpdate(userId, { password: hashed });
    return { message: 'Mot de passe mis à jour avec succès' };
  }

  async updateLocation(userId: string, longitude: number, latitude: number) {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { location: { type: 'Point', coordinates: [longitude, latitude] } },
        { new: true },
      )
      .select('-password -refreshToken');
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async findAllUsers(adminId: string) {
    const admin = await this.userModel.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }
    return this.userModel.find().select('-password -refreshToken');
  }

  async toggleUserActive(adminId: string, targetUserId: string) {
    const admin = await this.userModel.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }
    const user = await this.userModel.findById(targetUserId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    user.isActive = !user.isActive;
    await user.save();
    return { message: `Compte ${user.isActive ? 'activé' : 'désactivé'}` };
  }

  async findDrivers() {
    return this.userModel
      .find({ role: 'driver', isActive: true })
      .select('-password -refreshToken');
  }

  async getAdminStats() {
    const pendingPharmacistFilter = {
      role: 'pharmacist', isApproved: false,
      $or: [{ rejectionReason: { $exists: false } }, { rejectionReason: null }],
    };
    const rejectedPharmacistFilter = {
      role: 'pharmacist', isApproved: false,
      rejectionReason: { $exists: true, $ne: null },
    };
    const pendingDriverFilter = {
      role: 'driver', isApproved: false,
      $or: [{ rejectionReason: { $exists: false } }, { rejectionReason: null }],
    };
    const [
      totalPharmacies, activePharmacies, orphanPharmacies,
      totalPharmacists, pendingPharmacists, rejectedPharmacists,
      totalDrivers, pendingDrivers, totalClients,
    ] = await Promise.all([
      this.pharmacyModel.countDocuments(),
      this.pharmacyModel.countDocuments({ isActive: true }),
      this.pharmacyModel.countDocuments({ $or: [{ ownerId: { $exists: false } }, { ownerId: null }] }),
      this.userModel.countDocuments({ role: 'pharmacist', isApproved: true }),
      this.userModel.countDocuments(pendingPharmacistFilter),
      this.userModel.countDocuments(rejectedPharmacistFilter),
      this.userModel.countDocuments({ role: 'driver' }),
      this.userModel.countDocuments(pendingDriverFilter),
      this.userModel.countDocuments({ role: 'client' }),
    ]);
    return {
      totalPharmacies, activePharmacies, orphanPharmacies,
      totalPharmacists, pendingPharmacists, rejectedPharmacists,
      totalDrivers, pendingDrivers, totalClients,
    };
  }

  async getPendingPharmacists() {
    return this.userModel
      .find({
        role: 'pharmacist', isApproved: false,
        $or: [{ rejectionReason: { $exists: false } }, { rejectionReason: null }],
      })
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name address phone isActive')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getRejectedPharmacists() {
    return this.userModel
      .find({
        role: 'pharmacist', isApproved: false,
        rejectionReason: { $exists: true, $ne: null },
      })
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name address phone isActive')
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getPendingDrivers() {
    return this.userModel
      .find({
        role: 'driver', isApproved: false,
        $or: [{ rejectionReason: { $exists: false } }, { rejectionReason: null }],
      })
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name address phone isActive')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getRejectedDrivers() {
    return this.userModel
      .find({
        role: 'driver', isApproved: false,
        rejectionReason: { $exists: true, $ne: null },
      })
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name address phone isActive')
      .sort({ updatedAt: -1 })
      .lean();
  }

  async reconsiderUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    user.rejectionReason = undefined;
    await user.save();
    const { password, refreshToken, ...safe } = user.toObject() as any;
    return safe;
  }

  async getAllUsersForAdmin() {
    return this.userModel
      .find({ role: { $in: ['pharmacist', 'driver', 'client'] } })
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name isActive')
      .sort({ role: 1, createdAt: -1 })
      .lean();
  }

  async adminTogglePharmacyActive(pharmacyId: string) {
    const pharmacy = await this.pharmacyModel.findById(pharmacyId);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
    pharmacy.isActive = !pharmacy.isActive;
    await pharmacy.save();
    return pharmacy;
  }

  async adminAssignPharmacist(pharmacyId: string, pharmacistId: string) {
    const [pharmacy, pharmacist] = await Promise.all([
      this.pharmacyModel.findById(pharmacyId),
      this.userModel.findById(pharmacistId),
    ]);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
    if (!pharmacist || pharmacist.role !== 'pharmacist') throw new NotFoundException('Pharmacien non trouvé');

    await this.pharmacyModel.findByIdAndUpdate(pharmacyId, { ownerId: pharmacist._id, isActive: true });
    await this.userModel.findByIdAndUpdate(pharmacistId, { pharmacyId: pharmacy._id, isApproved: true });

    return { message: 'Pharmacien assigné avec succès' };
  }

  async approveUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!['pharmacist', 'driver'].includes(user.role)) {
      throw new BadRequestException('Seuls les pharmaciens et livreurs nécessitent une approbation');
    }

    user.isApproved = true;
    user.rejectionReason = undefined;
    await user.save();

    if (user.role === 'pharmacist' && user.pharmacyId) {
      await this.pharmacyModel.findByIdAndUpdate(user.pharmacyId, {
        ownerId: user._id,
        isActive: true,
      });
    }

    const { password, refreshToken, ...safe } = user.toObject() as any;
    return safe;
  }

  async adminCreatePharmacist(dto: AdminCreatePharmacistDto) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('Un compte avec cet email existe déjà');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      password: hashed,
      phone: dto.phone,
      role: 'pharmacist',
      isApproved: true,
      isActive: true,
    });

    let pharmacy;
    if (dto.existingPharmacyId) {
      pharmacy = await this.pharmacyModel.findById(dto.existingPharmacyId);
      if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
      await this.pharmacyModel.findByIdAndUpdate(dto.existingPharmacyId, { ownerId: user._id, isActive: true });
      await this.userModel.findByIdAndUpdate(user._id, { pharmacyId: pharmacy._id });
    } else {
      if (!dto.pharmacyName || !dto.pharmacyAddress || !dto.pharmacyPhone) {
        throw new BadRequestException('pharmacyName, pharmacyAddress et pharmacyPhone sont requis pour créer une pharmacie');
      }
      pharmacy = await this.pharmacyModel.create({
        name: dto.pharmacyName,
        address: dto.pharmacyAddress,
        phone: dto.pharmacyPhone,
        email: dto.pharmacyEmail,
        licenseNumber: dto.licenseNumber,
        ownerId: user._id,
        isActive: true,
      });
      await this.userModel.findByIdAndUpdate(user._id, { pharmacyId: pharmacy._id });
    }

    const updatedUser = await this.userModel
      .findById(user._id)
      .select('-password -refreshToken')
      .populate('pharmacyId', 'name address phone isActive');
    return { user: updatedUser, pharmacy };
  }

  async adminCreateDriver(dto: { firstName: string; lastName: string; email: string; password: string; phone?: string; pharmacyId?: string }) {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('Un compte avec cet email existe déjà');

    const hashed = await bcrypt.hash(dto.password, 12);
    const userData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      password: hashed,
      phone: dto.phone,
      role: 'driver',
      isApproved: true,
      isActive: true,
    };

    if (dto.pharmacyId) {
      const pharmacy = await this.pharmacyModel.findById(dto.pharmacyId);
      if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
      userData.pharmacyId = new Types.ObjectId(dto.pharmacyId);
    }

    const user = await this.userModel.create(userData);
    const { password, refreshToken, ...safe } = user.toObject() as any;
    return { user: safe };
  }

  async adminCreatePharmacy(dto: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    licenseNumber?: string;
    description?: string;
    longitude?: number;
    latitude?: number;
  }) {
    const pharmacyData: any = {
      name: dto.name,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      licenseNumber: dto.licenseNumber,
      description: dto.description,
      isActive: false,
    };

    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      pharmacyData.location = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      };
    }

    return this.pharmacyModel.create(pharmacyData);
  }

  async adminGetAllPharmacies() {
    return this.pharmacyModel
      .find()
      .populate('ownerId', 'firstName lastName email phone isActive isApproved')
      .sort({ createdAt: -1 })
      .lean();
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (!['pharmacist', 'driver'].includes(user.role)) {
      throw new BadRequestException('Seuls les pharmaciens et livreurs peuvent être rejetés');
    }

    user.isApproved = false;
    user.rejectionReason = reason || 'Dossier non conforme';
    await user.save();

    const { password, refreshToken, ...safe } = user.toObject() as any;
    return safe;
  }

  private async verifyPharmacyOwnership(pharmacyId: string, pharmacistId: string, role: string) {
    if (role === 'admin') return;
    const pharmacy = await this.pharmacyModel.findById(pharmacyId);
    if (!pharmacy) throw new NotFoundException('Pharmacie non trouvée');
    if (pharmacy.ownerId?.toString() !== pharmacistId) {
      throw new ForbiddenException('Vous n\'êtes pas propriétaire de cette pharmacie');
    }
  }

  async getPharmacyDrivers(pharmacyId: string, requesterId: string, requesterRole: string) {
    await this.verifyPharmacyOwnership(pharmacyId, requesterId, requesterRole);
    return this.userModel
      .find({ role: 'driver', pharmacyId: new Types.ObjectId(pharmacyId) })
      .select('-password -refreshToken')
      .lean();
  }

  async createDriverForPharmacy(pharmacyId: string, dto: CreateDriverDto, pharmacistId: string, role: string) {
    await this.verifyPharmacyOwnership(pharmacyId, pharmacistId, role);

    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('Un compte avec cet email existe déjà');

    const hashed = await bcrypt.hash(dto.password, 12);
    const driver = await this.userModel.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashed,
      role: 'driver',
      pharmacyId: new Types.ObjectId(pharmacyId),
      isApproved: false,
      isActive: false,
    });

    const { password, refreshToken, ...safe } = driver.toObject() as any;
    return safe;
  }

  async addExistingDriverToPharmacy(driverEmail: string, pharmacyId: string, pharmacistId: string, role: string) {
    await this.verifyPharmacyOwnership(pharmacyId, pharmacistId, role);

    const driver = await this.userModel.findOne({ email: driverEmail.toLowerCase() });
    if (!driver) throw new NotFoundException('Aucun utilisateur trouvé avec cet email');
    if (driver.role !== 'driver') throw new BadRequestException('Cet utilisateur n\'est pas un livreur');
    if (driver.pharmacyId) {
      throw new BadRequestException('Ce livreur est déjà rattaché à une pharmacie');
    }

    driver.role = 'driver';
    driver.pharmacyId = new Types.ObjectId(pharmacyId);
    await driver.save();

    const { password, refreshToken, ...safe } = driver.toObject() as any;
    return safe;
  }

  async removeDriverFromPharmacy(driverId: string, pharmacyId: string, pharmacistId: string, role: string) {
    await this.verifyPharmacyOwnership(pharmacyId, pharmacistId, role);

    const driver = await this.userModel.findById(driverId);
    if (!driver) throw new NotFoundException('Livreur non trouvé');
    if (driver.pharmacyId?.toString() !== pharmacyId) {
      throw new ForbiddenException('Ce livreur n\'appartient pas à votre pharmacie');
    }

    driver.pharmacyId = undefined;
    await driver.save();
    return { message: 'Livreur retiré de la pharmacie' };
  }

  async toggleDriverActive(driverId: string, pharmacyId: string, pharmacistId: string, role: string) {
    await this.verifyPharmacyOwnership(pharmacyId, pharmacistId, role);

    const driver = await this.userModel.findById(driverId);
    if (!driver || driver.pharmacyId?.toString() !== pharmacyId) {
      throw new ForbiddenException('Ce livreur n\'appartient pas à votre pharmacie');
    }

    driver.isActive = !driver.isActive;
    await driver.save();
    return { message: `Livreur ${driver.isActive ? 'activé' : 'désactivé'}`, isActive: driver.isActive };
  }
}
