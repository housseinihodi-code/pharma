import { Controller, Get, Post, Body, Param, UseGuards, Headers, Logger, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CampayService } from './campay.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
    private campayService: CampayService,
  ) {}

  @Post('initiate/:orderId')
  initiatePayment(
    @Param('orderId') orderId: string,
    @CurrentUser('_id') userId: string,
    @Body('method') method: string,
    @Body('phone') phone: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, userId, method, phone);
  }

  // Webhook Campay — public (pas de JWT, appelé par les serveurs Campay)
  @Public()
  @Post('campay/webhook')
  async campayWebhook(
    @Body() payload: any,
    @Headers('x-campay-signature') signature: string,
  ) {
    this.logger.log(`Webhook Campay: ${JSON.stringify(payload)}`);
    if (!this.campayService.isWebhookValid(payload, signature)) {
      this.logger.warn('Webhook Campay: signature invalide');
      return { received: false };
    }
    return this.paymentsService.handleCampayWebhook(payload);
  }

  // Simulation PIN (dev/test uniquement)
  @Post('simulate-confirm/:orderId')
  simulateConfirm(
    @Param('orderId') orderId: string,
    @Body('reference') reference: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Cette route n\'est pas disponible en production');
    }
    return this.paymentsService.simulateWebhook(orderId, reference);
  }

  @Post('confirm/:orderId')
  confirmPayment(
    @Param('orderId') orderId: string,
    @Body('reference') reference: string,
  ) {
    return this.paymentsService.confirmPayment(orderId, reference);
  }

  @Get('status/:orderId')
  getStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  // Indique au frontend si Campay est configuré et le mode (sandbox/prod)
  @Public()
  @Get('config')
  getConfig() {
    const configured = this.campayService.isConfigured();
    const sandbox = this.campayService.isSandbox();
    return {
      campayConfigured: configured,
      sandbox,
      // Numéros de test Campay sandbox
      testNumbers: sandbox ? {
        mtnSuccess: '237677777777',
        mtnFail:    '237677777770',
        orangeSuccess: '237699999999',
        orangeFail:    '237699999990',
        maxAmount: 25,
      } : null,
    };
  }
}
