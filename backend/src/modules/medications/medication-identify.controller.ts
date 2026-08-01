import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { MedicationIdentifyService } from './medication-identify.service';

@Controller('medications/identify')
export class MedicationIdentifyController {
  constructor(private identifyService: MedicationIdentifyService) {}

  @Post()
  @Public()
  identify(@Body() body: { image: string; mediaType: string }): Promise<any> {
    if (!body.image) throw new BadRequestException('Image requise (base64)');
    if (!body.mediaType) throw new BadRequestException('mediaType requis');
    return this.identifyService.identifyFromBase64(body.image, body.mediaType);
  }
}
