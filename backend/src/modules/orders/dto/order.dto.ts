import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested, IsMongoId, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsMongoId()
  medicationId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsMongoId()
  pharmacyId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La commande doit contenir au moins un article' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(['delivery', 'pickup'])
  deliveryType: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  deliveryLocation?: { longitude: number; latitude: number };

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  prescriptionUrl?: string;

  @IsEnum(['mobile_money', 'orange_money', 'card', 'cash'])
  paymentMethod: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(['confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ValidatePrescriptionDto {
  @IsEnum(['approved', 'rejected'])
  decision: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
