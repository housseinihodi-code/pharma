import apiClient from './apiClient';

export const reviewService = {
  async getByPharmacy(pharmacyId: string) {
    const res = await apiClient.get(`/pharmacies/${pharmacyId}/reviews`);
    return res.data as { reviews: any[]; count: number; average: number; distribution: Record<number, number> };
  },

  async getMyReview(pharmacyId: string) {
    const res = await apiClient.get(`/pharmacies/${pharmacyId}/reviews/mine`);
    return res.data as { rating: number; comment: string } | null;
  },

  async create(pharmacyId: string, rating: number, comment?: string) {
    const res = await apiClient.post(`/pharmacies/${pharmacyId}/reviews`, { rating, comment });
    return res.data;
  },

  async delete(pharmacyId: string) {
    const res = await apiClient.delete(`/pharmacies/${pharmacyId}/reviews`);
    return res.data;
  },
};
