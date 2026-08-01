import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { toIdString } from '../../utils/to-id-string.util';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Get('pending')
  @Roles('admin', 'pharmacist')
  getPending(
    @CurrentUser('role') role: string,
    @CurrentUser('pharmacyId') pharmacyId: string,
  ) {
    return this.deliveriesService.getPendingDeliveries(
      role === 'pharmacist' ? toIdString(pharmacyId) : undefined,
    );
  }

  @Get('pharmacy/:pharmacyId/drivers')
  @Roles('admin', 'pharmacist')
  getAvailableDrivers(@Param('pharmacyId') pharmacyId: string) {
    return this.deliveriesService.getPharmacyAvailableDrivers(pharmacyId);
  }

  @Get('my-deliveries')
  @Roles('driver')
  getMyDeliveries(
    @CurrentUser('_id') driverId: string,
    @Query('status') status: string,
  ) {
    return this.deliveriesService.getDriverDeliveries(driverId, status);
  }

  @Get('order/:orderId')
  getByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('pharmacyId') pharmacyId: string,
  ) {
    return this.deliveriesService.findByOrder(orderId, userId, role, toIdString(pharmacyId));
  }

  @Post('from-order/:orderId')
  @Roles('pharmacist', 'admin')
  createFromOrder(
    @Param('orderId') orderId: string,
    @Body('pickupAddress') pickupAddress: string,
    @Body('pickupCoordinates') pickupCoordinates: [number, number],
  ) {
    return this.deliveriesService.createFromOrder(orderId, pickupAddress, pickupCoordinates);
  }

  @Put(':id/assign-driver')
  @Roles('admin', 'pharmacist')
  assignDriver(
    @Param('id') deliveryId: string,
    @Body('driverId') driverId: string,
    @CurrentUser('_id') adminId: string,
  ) {
    return this.deliveriesService.assignDriver(deliveryId, driverId, adminId);
  }

  @Put(':id/status')
  @Roles('driver')
  updateStatus(
    @Param('id') deliveryId: string,
    @Body('status') status: string,
    @CurrentUser('_id') driverId: string,
  ) {
    return this.deliveriesService.updateStatus(deliveryId, status, driverId);
  }

  @Put(':id/location')
  @Roles('driver')
  updateLocation(
    @Param('id') deliveryId: string,
    @Body('longitude') longitude: number,
    @Body('latitude') latitude: number,
    @CurrentUser('_id') driverId: string,
  ) {
    return this.deliveriesService.updateLocation(deliveryId, longitude, latitude, driverId);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') deliveryId: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('pharmacyId') pharmacyId: string,
  ) {
    return this.deliveriesService.getDeliveryMessages(deliveryId, userId, role, toIdString(pharmacyId));
  }

  @Get(':id')
  findOne(
    @Param('id') deliveryId: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('pharmacyId') pharmacyId: string,
  ) {
    return this.deliveriesService.findById(deliveryId, userId, role, toIdString(pharmacyId));
  }

  @Get('order/:orderId/tracking')
  getTracking(
    @Param('orderId') orderId: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('pharmacyId') pharmacyId: string,
  ) {
    return this.deliveriesService.findByOrderForTracking(orderId, userId, role, toIdString(pharmacyId));
  }
}
