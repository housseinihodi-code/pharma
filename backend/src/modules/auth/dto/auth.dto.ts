import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(['client', 'pharmacist', 'driver'], { message: 'Rôle invalide' })
  role?: string;

  // Pharmacist: infos de la nouvelle pharmacie à créer
  @IsOptional()
  @IsString()
  @MinLength(2)
  pharmacyName?: string;

  @IsOptional()
  @IsString()
  pharmacyAddress?: string;

  @IsOptional()
  @IsString()
  pharmacyPhone?: string;

  // Driver: ID de la pharmacie existante à rejoindre
  @IsOptional()
  @IsMongoId({ message: 'Identifiant de pharmacie invalide' })
  pharmacyId?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email invalide' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
