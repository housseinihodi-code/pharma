import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('admin')
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('orders-by-status')
  @Roles('admin', 'pharmacist')
  getOrdersByStatus() {
    return this.analyticsService.getOrdersByStatus();
  }

  @Get('revenue')
  @Roles('admin', 'pharmacist')
  getRevenue(@Query('pharmacyId') pharmacyId: string) {
    return this.analyticsService.getRevenueByMonth(pharmacyId);
  }

  @Get('top-medications')
  @Roles('admin', 'pharmacist')
  getTopMedications(@Query('pharmacyId') pharmacyId: string) {
    return this.analyticsService.getTopMedications(pharmacyId);
  }

  @Get('pharmacy/:pharmacyId')
  @Roles('admin', 'pharmacist')
  getPharmacyStats(@Param('pharmacyId') pharmacyId: string) {
    return this.analyticsService.getPharmacyStats(pharmacyId);
  }

  @Get('user-growth')
  @Roles('admin')
  getUserGrowth() {
    return this.analyticsService.getUserGrowth();
  }
}
