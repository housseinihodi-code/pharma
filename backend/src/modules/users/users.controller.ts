import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdatePasswordDto, UpdateLocationDto, CreateDriverDto, AdminCreatePharmacistDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser('_id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('profile')
  updateProfile(@CurrentUser('_id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('password')
  updatePassword(@CurrentUser('_id') userId: string, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword(userId, dto);
  }

  @Put('location')
  updateLocation(
    @CurrentUser('_id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.usersService.updateLocation(userId, dto.longitude, dto.latitude);
  }

  @Get()
  @Roles('admin')
  findAll(@CurrentUser('_id') adminId: string) {
    return this.usersService.findAllUsers(adminId);
  }

  @Get('drivers')
  @Roles('admin', 'pharmacist')
  findDrivers() {
    return this.usersService.findDrivers();
  }

  @Get('admin/stats')
  @Roles('admin')
  getAdminStats() {
    return this.usersService.getAdminStats();
  }

  @Get('admin/pending-pharmacists')
  @Roles('admin')
  getPendingPharmacists() {
    return this.usersService.getPendingPharmacists();
  }

  @Get('admin/rejected-pharmacists')
  @Roles('admin')
  getRejectedPharmacists() {
    return this.usersService.getRejectedPharmacists();
  }

  @Get('admin/pending-drivers')
  @Roles('admin')
  getPendingDrivers() {
    return this.usersService.getPendingDrivers();
  }

  @Get('admin/rejected-drivers')
  @Roles('admin')
  getRejectedDrivers() {
    return this.usersService.getRejectedDrivers();
  }

  @Get('admin/all-users')
  @Roles('admin')
  getAllUsersForAdmin() {
    return this.usersService.getAllUsersForAdmin();
  }

  @Get('admin/pharmacies')
  @Roles('admin')
  adminGetAllPharmacies() {
    return this.usersService.adminGetAllPharmacies();
  }

  @Post('admin/create-pharmacist')
  @Roles('admin')
  adminCreatePharmacist(@Body() dto: AdminCreatePharmacistDto) {
    return this.usersService.adminCreatePharmacist(dto);
  }

  @Post('admin/create-driver')
  @Roles('admin')
  adminCreateDriver(@Body() dto: { firstName: string; lastName: string; email: string; password: string; phone?: string; pharmacyId?: string }) {
    return this.usersService.adminCreateDriver(dto);
  }

  @Post('admin/create-pharmacy')
  @Roles('admin')
  adminCreatePharmacy(@Body() dto: { name: string; address: string; phone: string; email?: string; licenseNumber?: string; description?: string; longitude?: number; latitude?: number }) {
    return this.usersService.adminCreatePharmacy(dto);
  }

  @Put('admin/pharmacy/:pharmacyId/toggle-active')
  @Roles('admin')
  adminTogglePharmacyActive(@Param('pharmacyId') pharmacyId: string) {
    return this.usersService.adminTogglePharmacyActive(pharmacyId);
  }

  @Put('admin/pharmacy/:pharmacyId/assign')
  @Roles('admin')
  adminAssignPharmacist(
    @Param('pharmacyId') pharmacyId: string,
    @Body('pharmacistId') pharmacistId: string,
  ) {
    return this.usersService.adminAssignPharmacist(pharmacyId, pharmacistId);
  }

  @Put('admin/:id/approve')
  @Roles('admin')
  approveUser(@Param('id') id: string) {
    return this.usersService.approveUser(id);
  }

  @Put('admin/:id/reject')
  @Roles('admin')
  rejectUser(@Param('id') id: string, @Body('reason') reason: string) {
    return this.usersService.rejectUser(id, reason);
  }

  @Put('admin/:id/reconsider')
  @Roles('admin')
  reconsiderUser(@Param('id') id: string) {
    return this.usersService.reconsiderUser(id);
  }

  @Get(':id')
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id/toggle-active')
  @Roles('admin')
  toggleActive(@CurrentUser('_id') adminId: string, @Param('id') userId: string) {
    return this.usersService.toggleUserActive(adminId, userId);
  }

  /* ── Gestion équipe livreurs par pharmacie ── */

  @Get('pharmacy/:pharmacyId/drivers')
  @Roles('pharmacist', 'admin')
  getPharmacyDrivers(
    @Param('pharmacyId') pharmacyId: string,
    @CurrentUser('_id') requesterId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.getPharmacyDrivers(pharmacyId, requesterId, role);
  }

  @Post('pharmacy/:pharmacyId/drivers')
  @Roles('pharmacist', 'admin')
  createDriver(
    @Param('pharmacyId') pharmacyId: string,
    @Body() dto: CreateDriverDto,
    @CurrentUser('_id') pharmacistId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.createDriverForPharmacy(pharmacyId, dto, pharmacistId, role);
  }

  @Post('pharmacy/:pharmacyId/drivers/add-existing')
  @Roles('pharmacist', 'admin')
  addExistingDriver(
    @Param('pharmacyId') pharmacyId: string,
    @Body('email') email: string,
    @CurrentUser('_id') pharmacistId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.addExistingDriverToPharmacy(email, pharmacyId, pharmacistId, role);
  }

  @Delete('pharmacy/:pharmacyId/drivers/:driverId')
  @Roles('pharmacist', 'admin')
  removeDriver(
    @Param('pharmacyId') pharmacyId: string,
    @Param('driverId') driverId: string,
    @CurrentUser('_id') pharmacistId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.removeDriverFromPharmacy(driverId, pharmacyId, pharmacistId, role);
  }

  @Put('pharmacy/:pharmacyId/drivers/:driverId/toggle')
  @Roles('pharmacist', 'admin')
  toggleDriverActive(
    @Param('pharmacyId') pharmacyId: string,
    @Param('driverId') driverId: string,
    @CurrentUser('_id') pharmacistId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.usersService.toggleDriverActive(driverId, pharmacyId, pharmacistId, role);
  }
}
