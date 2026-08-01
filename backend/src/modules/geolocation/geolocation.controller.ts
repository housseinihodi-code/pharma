import { Controller, Get, Query } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('geolocation')
export class GeolocationController {
  constructor(private geolocationService: GeolocationService) {}

  @Public()
  @Get('nearby')
  findNearby(
    @Query('longitude') longitude: number,
    @Query('latitude') latitude: number,
    @Query('radius') radius: number,
    @Query('isOpen') isOpen: string,
  ) {
    const openFilter = isOpen === 'true' ? true : isOpen === 'false' ? false : undefined;
    return this.geolocationService.findNearbyPharmacies(
      +longitude, +latitude, radius ? +radius : 5000, openFilter,
    );
  }

  @Public()
  @Get('bounds')
  findInBounds(
    @Query('swLng') swLng: number,
    @Query('swLat') swLat: number,
    @Query('neLng') neLng: number,
    @Query('neLat') neLat: number,
  ) {
    return this.geolocationService.getPharmacyWithinBounds(+swLng, +swLat, +neLng, +neLat);
  }
}
