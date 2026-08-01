import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { CreateMedicationDto, UpdateMedicationDto, UpdateStockDto } from './dto/medication.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('medications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicationsController {
  constructor(private medicationsService: MedicationsService) {}

  @Public()
  @Get('compare')
  compareByName(@Query('q') query: string, @Query('limit') limit: number) {
    return this.medicationsService.compareByName(query, limit ? +limit : 40);
  }

  @Public()
  @Get('hospital')
  findHospitalMedications(
    @Query('chronic') chronic: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.medicationsService.findHospitalMedications(chronic, page, limit);
  }

  @Public()
  @Get('chronic/:category')
  findByChronicDisease(
    @Param('category') category: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.medicationsService.findByChronicDisease(category, page, limit);
  }

  @Public()
  @Get('search')
  search(
    @Query('q') query: string,
    @Query('pharmacyId') pharmacyId: string,
    @Query('category') category: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('hospitalOnly') hospitalOnly: string,
    @Query('chronic') chronic: string,
  ) {
    return this.medicationsService.search(
      query, pharmacyId, category, page, limit,
      hospitalOnly === 'true' ? true : undefined,
      chronic || undefined,
    );
  }

  @Public()
  @Get('pharmacy/:pharmacyId')
  findByPharmacy(
    @Param('pharmacyId') pharmacyId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('category') category: string,
  ) {
    return this.medicationsService.findByPharmacy(pharmacyId, page, limit, category);
  }

  @Get('low-stock/:pharmacyId')
  @Roles('pharmacist', 'admin')
  getLowStock(@Param('pharmacyId') pharmacyId: string) {
    return this.medicationsService.getLowStock(pharmacyId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicationsService.findById(id);
  }

  @Post()
  @Roles('pharmacist', 'admin')
  create(
    @Body() dto: CreateMedicationDto,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.medicationsService.create(dto, userId, role);
  }

  @Put(':id')
  @Roles('pharmacist', 'admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.medicationsService.update(id, dto, userId, role);
  }

  @Put(':id/stock')
  @Roles('pharmacist', 'admin')
  updateStock(
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.medicationsService.updateStock(id, dto, userId, role);
  }

  @Delete(':id')
  @Roles('pharmacist', 'admin')
  delete(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.medicationsService.delete(id, userId, role);
  }
}
