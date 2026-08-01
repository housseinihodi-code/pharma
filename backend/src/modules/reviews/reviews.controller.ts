import { Controller, Get, Post, Delete, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('pharmacies/:pharmacyId/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get()
  @Public()
  getByPharmacy(@Param('pharmacyId') pharmacyId: string) {
    return this.reviewsService.getByPharmacy(pharmacyId);
  }

  @Get('mine')
  getMyReview(
    @Param('pharmacyId') pharmacyId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.reviewsService.getMyReview(pharmacyId, userId);
  }

  @Post()
  create(
    @Param('pharmacyId') pharmacyId: string,
    @Body() body: { rating: number; comment?: string },
    @CurrentUser('_id') userId: string,
  ) {
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Note entre 1 et 5 requise');
    }
    return this.reviewsService.create(pharmacyId, userId, body.rating, body.comment);
  }

  @Delete()
  delete(
    @Param('pharmacyId') pharmacyId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.reviewsService.delete(pharmacyId, userId);
  }
}
