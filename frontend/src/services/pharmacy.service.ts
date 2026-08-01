import apiClient from './apiClient';

export const pharmacyService = {
  async getAll(page = 1, limit = 20) {
    const res = await apiClient.get('/pharmacies', { params: { page, limit } });
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get(`/pharmacies/${id}`);
    return res.data;
  },

  async getNearby(longitude: number, latitude: number, radius = 5000) {
    const res = await apiClient.get('/pharmacies/nearby', {
      params: { longitude, latitude, radius },
    });
    return res.data;
  },

  async search(query: string, page = 1, limit = 20) {
    const res = await apiClient.get('/pharmacies/search', {
      params: { q: query, page, limit },
    });
    return res.data;
  },

  async getMyPharmacies() {
    const res = await apiClient.get('/pharmacies/my-pharmacies');
    return res.data;
  },

  async create(data: any) {
    const res = await apiClient.post('/pharmacies', data);
    return res.data;
  },

  async update(id: string, data: any) {
    const res = await apiClient.put(`/pharmacies/${id}`, data);
    return res.data;
  },

  async toggleOpen(id: string) {
    const res = await apiClient.put(`/pharmacies/${id}/toggle-open`);
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete(`/pharmacies/${id}`);
    return res.data;
  },

  async getHospitalPharmacies(specialty?: string) {
    const res = await apiClient.get('/pharmacies/hospital', { params: { specialty } });
    return res.data;
  },

  async getOnDuty() {
    const res = await apiClient.get('/pharmacies/on-duty');
    return res.data;
  },

  async getOpen24_7() {
    const res = await apiClient.get('/pharmacies/open-24-7');
    return res.data;
  },

  async getOpenAllDays() {
    const res = await apiClient.get('/pharmacies/open-all-days');
    return res.data;
  },

  async setDutyStatus(id: string, isOnDuty: boolean, dutyStart?: string, dutyEnd?: string) {
    const res = await apiClient.put(`/pharmacies/${id}/toggle-duty`, { isOnDuty, dutyStart, dutyEnd });
    return res.data;
  },
};
