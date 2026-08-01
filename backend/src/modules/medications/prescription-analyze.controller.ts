import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrescriptionAnalyzeService } from './prescription-analyze.service';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionAnalyzeController {
  constructor(private analyzeService: PrescriptionAnalyzeService) {}

  @Post('analyze')
  analyze(@Body('prescriptionUrl') prescriptionUrl: string) {
    if (!prescriptionUrl) throw new BadRequestException('prescriptionUrl requis');
    if (!prescriptionUrl.startsWith('/uploads/prescriptions/')) {
      throw new BadRequestException('URL d\'ordonnance invalide');
    }
    return this.analyzeService.analyzeFromUrl(prescriptionUrl);
  }
}
