import apiClient from './apiClient';

export const deliveryService = {
  getById: (deliveryId: string) =>
    apiClient.get(`/deliveries/${deliveryId}`).then(r => r.data),

  getByOrder: (orderId: string) =>
    apiClient.get(`/deliveries/order/${orderId}`).then(r => r.data),

  getTracking: (orderId: string) =>
    apiClient.get(`/deliveries/order/${orderId}/tracking`).then(r => r.data),

  getMyDeliveries: (status?: string) =>
    apiClient.get(`/deliveries/my-deliveries${status ? `?status=${status}` : ''}`).then(r => r.data),

  getPending: () =>
    apiClient.get('/deliveries/pending').then(r => r.data),

  assignDriver: (deliveryId: string, driverId: string) =>
    apiClient.put(`/deliveries/${deliveryId}/assign-driver`, { driverId }).then(r => r.data),

  updateStatus: (deliveryId: string, status: string) =>
    apiClient.put(`/deliveries/${deliveryId}/status`, { status }).then(r => r.data),

  updateLocation: (deliveryId: string, lat: number, lng: number) =>
    apiClient.put(`/deliveries/${deliveryId}/location`, { latitude: lat, longitude: lng }).then(r => r.data),

  getMessages: (deliveryId: string) =>
    apiClient.get(`/deliveries/${deliveryId}/messages`).then(r => r.data),

  createFromOrder: (orderId: string, pickupAddress: string, pickupCoordinates: [number, number] = [0, 0]) =>
    apiClient.post(`/deliveries/from-order/${orderId}`, { pickupAddress, pickupCoordinates }).then(r => r.data),
};
