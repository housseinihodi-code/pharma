import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, Min, IsDate, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

const CATEGORIES = ['antibiotiques', 'analgésiques', 'vitamines', 'cardiovasculaire', 'diabète', 'respiratoire', 'dermatologie', 'gastroentérologie', 'neurologie', 'autre'];
const CHRONIC_CATEGORIES = ['diabete', 'vih', 'tuberculose', 'hypertension', 'cancer', 'epilepsie', 'drepanocytose', 'insuffisance_renale', 'hepatite', 'autre_chronique'];

export class CreateMedicationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsMongoId()
  pharmacyId: string;

  @IsEnum(CATEGORIES)
  category: string;

  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsBoolean()
  isHospitalOnly?: boolean;

  @IsOptional()
  @IsEnum(CHRONIC_CATEGORIES)
  chronicDiseaseCategory?: string;
}

export class UpdateMedicationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(CATEGORIES)
  category?: string;

  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsBoolean()
  isHospitalOnly?: boolean;

  @IsOptional()
  @IsEnum(CHRONIC_CATEGORIES)
  chronicDiseaseCategory?: string;
}

export class UpdateStockDto {
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsEnum(['add', 'remove', 'set'])
  operation: string;
}
