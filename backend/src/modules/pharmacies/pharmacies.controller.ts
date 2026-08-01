import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { PharmaciesService } from './pharmacies.service';
import { CreatePharmacyDto, UpdatePharmacyDto } from './dto/pharmacy.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('pharmacies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PharmaciesController {
  constructor(private pharmaciesService: PharmaciesService) {}

  @Public()
  @Get()
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('unowned') unowned: string,
  ) {
    return this.pharmaciesService.findAll(page, limit, unowned === 'true');
  }

  @Public()
  @Get('nearby')
  findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('radius') radius: number,
  ) {
    return this.pharmaciesService.findNearby(+longitude, +latitude, radius ? +radius : 5000);
  }

  @Public()
  @Get('search')
  search(@Query('q') query: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.pharmaciesService.search(query, page, limit);
  }

  @Public()
  @Get('hospital')
  findHospitalPharmacies(@Query('specialty') specialty: string) {
    return this.pharmaciesService.findHospitalPharmacies(specialty || undefined);
  }

  @Public()
  @Get('on-duty')
  findOnDuty() {
    return this.pharmaciesService.findOnDuty();
  }

  @Public()
  @Get('open-24-7')
  findOpen24_7() {
    return this.pharmaciesService.findOpen24_7();
  }

  @Public()
  @Get('open-all-days')
  findOpenAllDays() {
    return this.pharmaciesService.findOpenAllDays();
  }

  @Put(':id/toggle-duty')
  @Roles('pharmacist', 'admin')
  setDutyStatus(
    @Param('id') id: string,
    @Body() body: { isOnDuty: boolean; dutyStart?: string; dutyEnd?: string },
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.pharmaciesService.setDutyStatus(id, userId, role, body.isOnDuty, body.dutyStart, body.dutyEnd);
  }

  @Get('my-pharmacies')
  @Roles('pharmacist', 'admin')
  getMyPharmacies(@CurrentUser('_id') userId: string) {
    return this.pharmaciesService.getMyPharmacies(userId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pharmaciesService.findById(id);
  }

  @Post()
  @Roles('pharmacist', 'admin')
  create(@Body() dto: CreatePharmacyDto, @CurrentUser('_id') userId: string) {
    return this.pharmaciesService.create(dto, userId);
  }

  @Put(':id')
  @Roles('pharmacist', 'admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePharmacyDto,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.pharmaciesService.update(id, dto, userId, role);
  }

  @Put(':id/toggle-open')
  @Roles('pharmacist', 'admin')
  toggleOpen(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.pharmaciesService.toggleOpen(id, userId, role);
  }

  @Delete(':id')
  @Roles('pharmacist', 'admin')
  delete(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.pharmaciesService.delete(id, userId, role);
  }
}
