import { IsString, IsOptional, IsEmail, MinLength, IsArray } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsArray()
  allergies?: string[];

  @IsOptional()
  @IsArray()
  chronicConditions?: string[];

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  doctorPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;
}

export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' })
  newPassword: string;
}

export class UpdateLocationDto {
  @IsOptional()
  longitude?: number;

  @IsOptional()
  latitude?: number;
}

export class CreateDriverDto {
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AdminCreatePharmacistDto {
  // Compte pharmacien
  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // Pharmacie associée — soit existingPharmacyId, soit les champs de création
  @IsOptional()
  @IsString()
  existingPharmacyId?: string;

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

  @IsOptional()
  @IsEmail()
  pharmacyEmail?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
