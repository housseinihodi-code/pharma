import apiClient from './apiClient';

export const driverService = {
  getPharmacyDrivers: (pharmacyId: string) =>
    apiClient.get(`/users/pharmacy/${pharmacyId}/drivers`).then(r => r.data),

  createDriver: (pharmacyId: string, data: {
    firstName: string; lastName: string; email: string; password: string; phone?: string;
  }) =>
    apiClient.post(`/users/pharmacy/${pharmacyId}/drivers`, data).then(r => r.data),

  addExistingDriver: (pharmacyId: string, email: string) =>
    apiClient.post(`/users/pharmacy/${pharmacyId}/drivers/add-existing`, { email }).then(r => r.data),

  removeDriver: (pharmacyId: string, driverId: string) =>
    apiClient.delete(`/users/pharmacy/${pharmacyId}/drivers/${driverId}`).then(r => r.data),

  toggleActive: (pharmacyId: string, driverId: string) =>
    apiClient.put(`/users/pharmacy/${pharmacyId}/drivers/${driverId}/toggle`).then(r => r.data),

  getAvailableForDelivery: (pharmacyId: string) =>
    apiClient.get(`/deliveries/pharmacy/${pharmacyId}/drivers`).then(r => r.data),

  assignToDelivery: (deliveryId: string, driverId: string) =>
    apiClient.put(`/deliveries/${deliveryId}/assign-driver`, { driverId }).then(r => r.data),
};
