import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Pharmacy, PharmacyDocument } from '../pharmacies/schemas/pharmacy.schema';
import { RegisterDto, LoginDto } from './dto/auth.dto';

const PHARMACY_FIELDS = 'name address phone isOpen isActive';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Pharmacy.name) private pharmacyModel: Model<PharmacyDocument>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const role = dto.role || 'client';

    if (role === 'pharmacist') {
      const hasExisting = !!dto.pharmacyId;
      const hasNew = !!(dto.pharmacyName && dto.pharmacyAddress && dto.pharmacyPhone);
      if (!hasExisting && !hasNew) {
        throw new BadRequestException(
          'Un pharmacien doit sélectionner une pharmacie existante ou renseigner les informations de sa nouvelle pharmacie',
        );
      }
    }

    // Les livreurs sans pharmacie sont mis en attente d'approbation admin

    if (dto.pharmacyId) {
      const pharmacy = await this.pharmacyModel.findById(dto.pharmacyId);
      if (!pharmacy || !pharmacy.isActive) {
        throw new NotFoundException('Pharmacie non trouvée ou inactive');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const userData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      role,
      isApproved: role === 'pharmacist' || role === 'driver' ? false : true,
    };

    if (dto.pharmacyId) {
      userData.pharmacyId = new Types.ObjectId(dto.pharmacyId);
    }

    const user = await this.userModel.create(userData);

    if (role === 'pharmacist' && !dto.pharmacyId && dto.pharmacyName) {
      const pharmacy = await this.pharmacyModel.create({
        name: dto.pharmacyName,
        address: dto.pharmacyAddress,
        phone: dto.pharmacyPhone,
        isActive: false,
      });
      await this.userModel.findByIdAndUpdate(user._id, { pharmacyId: pharmacy._id });
    }

    // Re-fetch avec pharmacie populée
    const populated = await this.userModel
      .findById(user._id)
      .populate('pharmacyId', PHARMACY_FIELDS);

    if (role === 'pharmacist' || role === 'driver') {
      return {
        user: this.sanitizeUser(populated!),
        pending: true,
        message: 'Votre compte est en attente de validation par un administrateur.',
      };
    }

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user._id as string, tokens.refreshToken);

    return {
      user: this.sanitizeUser(populated!),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .populate('pharmacyId', PHARMACY_FIELDS);

    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé. Contactez le support.');
    if ((user.role === 'pharmacist' || user.role === 'driver') && !user.isApproved) {
      throw new UnauthorizedException('Votre compte est en attente de validation par un administrateur.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Email ou mot de passe incorrect');

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user._id as string, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
    if (!payload?.sub) throw new UnauthorizedException('Token invalide');

    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.refreshToken) throw new UnauthorizedException('Session expirée');

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new UnauthorizedException('Token de rafraîchissement invalide');

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user._id as string, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: null });
    return { message: 'Déconnexion réussie' };
  }

  async validateUser(payload: any) {
    const user = await this.userModel
      .findById(payload.sub)
      .select('-password -refreshToken')
      .populate('pharmacyId', PHARMACY_FIELDS);
    if (!user || !user.isActive) return null;
    if ((user.role === 'pharmacist' || user.role === 'driver') && !user.isApproved) return null;
    return user;
  }

  private generateTokens(user: UserDocument) {
    const payload = { sub: user._id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: hashed });
  }

  private sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete obj.password;
    delete obj.refreshToken;
    return obj;
  }
}
