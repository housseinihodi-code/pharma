import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Res, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { InvoiceService } from '../invoices/invoice.service';
import { CreateOrderDto, UpdateOrderStatusDto, ValidatePrescriptionDto } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { toIdString } from '../../utils/to-id-string.util';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private invoiceService: InvoiceService,
  ) {}

  @Post()
  create(@CurrentUser('_id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('my-orders')
  getMyOrders(
    @CurrentUser('_id') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.ordersService.findUserOrders(userId, page, limit);
  }

  @Get('pharmacy/:pharmacyId')
  @Roles('pharmacist', 'admin')
  getPharmacyOrders(
    @Param('pharmacyId') pharmacyId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status: string,
    @CurrentUser('role') role: string,
    @CurrentUser('pharmacyId') userPharmacyId: string,
  ) {
    if (role === 'pharmacist' && toIdString(userPharmacyId) !== pharmacyId) {
      throw new ForbiddenException('Accès réservé à votre pharmacie');
    }
    return this.ordersService.findPharmacyOrders(pharmacyId, page, limit, status);
  }

  @Get('stats')
  @Roles('admin')
  getStats(@Query('pharmacyId') pharmacyId: string) {
    return this.ordersService.getStats(pharmacyId);
  }

  @Get('all')
  @Roles('admin')
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.ordersService.findAll(page, limit);
  }

  @Get(':id/invoice')
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
    @Res() res: Response,
  ) {
    const buffer = await this.invoiceService.generateInvoice(id, userId, role);
    const filename = `facture-${id.slice(-8).toUpperCase()}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/reorder')
  reorder(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.ordersService.reorder(id, userId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.findById(id, userId, role);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.updateStatus(id, dto, userId, role);
  }

  @Put(':id/validate-prescription')
  @Roles('pharmacist', 'admin')
  validatePrescription(
    @Param('id') orderId: string,
    @Body() dto: ValidatePrescriptionDto,
    @CurrentUser('_id') pharmacistId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.validatePrescription(orderId, dto, pharmacistId, role);
  }

  @Get('pending-prescriptions/:pharmacyId')
  @Roles('pharmacist', 'admin')
  getPendingPrescriptions(@Param('pharmacyId') pharmacyId: string) {
    return this.ordersService.getPendingPrescriptions(pharmacyId);
  }
}
