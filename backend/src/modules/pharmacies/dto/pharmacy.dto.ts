import { IsString, IsOptional, IsBoolean, IsNumber, IsEmail, Min, Max, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;
}

export class CreatePharmacyDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  hasDelivery?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRadius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsObject()
  openingHours?: any;
}

export class UpdatePharmacyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  hasDelivery?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryRadius?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsObject()
  openingHours?: any;
}

export class NearbyPharmaciesDto {
  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  radius?: number;
}
