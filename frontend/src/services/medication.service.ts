import apiClient from './apiClient';

export const medicationService = {
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.imageUrl;
  },

  async uploadPrescription(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await apiClient.post('/upload/prescription', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.imageUrl;
  },

  async getByPharmacy(pharmacyId: string, page = 1, limit = 20, category?: string) {
    const res = await apiClient.get(`/medications/pharmacy/${pharmacyId}`, {
      params: { page, limit, category },
    });
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get(`/medications/${id}`);
    return res.data;
  },

  async search(query: string, pharmacyId?: string, category?: string, page = 1, limit = 20, hospitalOnly?: boolean, chronic?: string) {
    const res = await apiClient.get('/medications/search', {
      params: { q: query, pharmacyId, category, page, limit, hospitalOnly: hospitalOnly ? 'true' : undefined, chronic },
    });
    return res.data;
  },

  async getHospitalMedications(chronic?: string, page = 1, limit = 20) {
    const res = await apiClient.get('/medications/hospital', {
      params: { chronic, page, limit },
    });
    return res.data;
  },

  async getByChronicDisease(category: string, page = 1, limit = 20) {
    const res = await apiClient.get(`/medications/chronic/${category}`, {
      params: { page, limit },
    });
    return res.data;
  },

  async create(data: any) {
    const res = await apiClient.post('/medications', data);
    return res.data;
  },

  async update(id: string, data: any) {
    const res = await apiClient.put(`/medications/${id}`, data);
    return res.data;
  },

  async updateStock(id: string, quantity: number, operation: 'add' | 'remove' | 'set') {
    const res = await apiClient.put(`/medications/${id}/stock`, { quantity, operation });
    return res.data;
  },

  async getLowStock(pharmacyId: string) {
    const res = await apiClient.get(`/medications/low-stock/${pharmacyId}`);
    return res.data;
  },

  async delete(id: string) {
    const res = await apiClient.delete(`/medications/${id}`);
    return res.data;
  },
};
