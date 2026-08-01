import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pharmacy, PharmacyDocument } from '../pharmacies/schemas/pharmacy.schema';

export interface PharmacyWithDistance extends PharmacyDocument {
  distance?: number;
}

@Injectable()
export class GeolocationService {
  constructor(
    @InjectModel(Pharmacy.name) private pharmacyModel: Model<PharmacyDocument>,
  ) {}

  async findNearbyPharmacies(
    longitude: number,
    latitude: number,
    radius = 5000,
    isOpen?: boolean,
  ): Promise<PharmacyWithDistance[]> {
    const match: any = {
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radius,
        },
      },
    };

    if (isOpen !== undefined) match.isOpen = isOpen;

    const pharmacies = await this.pharmacyModel.find(match);

    return pharmacies.map((p) => {
      const coords = p.location?.coordinates;
      const distance = coords ? this.calculateDistance(latitude, longitude, coords[1], coords[0]) : 0;
      const doc = p.toObject() as PharmacyWithDistance;
      doc.distance = Math.round(distance);
      return doc;
    });
  }

  async getPharmacyWithinBounds(
    swLng: number, swLat: number,
    neLng: number, neLat: number,
  ) {
    return this.pharmacyModel.find({
      isActive: true,
      location: {
        $geoWithin: {
          $box: [[swLng, swLat], [neLng, neLat]],
        },
      },
    });
  }

  async reverseGeocode(longitude: number, latitude: number) {
    const nearest = await this.pharmacyModel.findOne({
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: 1000,
        },
      },
    });
    return { nearestPharmacy: nearest, coordinates: [longitude, latitude] };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number) {
    return deg * (Math.PI / 180);
  }
}
