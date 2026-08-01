import apiClient from './apiClient';

export const orderService = {
  async downloadInvoice(orderId: string): Promise<void> {
    const res = await apiClient.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${orderId.slice(-8).toUpperCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  async create(data: {
    pharmacyId: string;
    items: Array<{ medicationId: string; quantity: number }>;
    deliveryType: string;
    deliveryAddress?: string;
    deliveryLocation?: { longitude: number; latitude: number };
    notes?: string;
    prescriptionUrl?: string;
    paymentMethod: string;
  }) {
    const res = await apiClient.post('/orders', data);
    return res.data;
  },

  async getMyOrders(page = 1, limit = 10) {
    const res = await apiClient.get('/orders/my-orders', { params: { page, limit } });
    return res.data;
  },

  async getById(id: string) {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data;
  },

  async updateStatus(id: string, status: string) {
    const res = await apiClient.put(`/orders/${id}/status`, { status });
    return res.data;
  },

  async getPharmacyOrders(pharmacyId: string, page = 1, status?: string) {
    const res = await apiClient.get(`/orders/pharmacy/${pharmacyId}`, {
      params: { page, status },
    });
    return res.data;
  },

  async validatePrescription(orderId: string, decision: 'approved' | 'rejected', reason?: string) {
    const res = await apiClient.put(`/orders/${orderId}/validate-prescription`, { decision, reason });
    return res.data;
  },

  async getPendingPrescriptions(pharmacyId: string) {
    const res = await apiClient.get(`/orders/pending-prescriptions/${pharmacyId}`);
    return res.data;
  },
};

export const cartService = {
  async getCart() {
    const res = await apiClient.get('/cart');
    return res.data;
  },

  async addItem(medicationId: string, quantity = 1) {
    const res = await apiClient.post('/cart/add', { medicationId, quantity });
    return res.data;
  },

  async updateItem(medicationId: string, quantity: number) {
    const res = await apiClient.put(`/cart/item/${medicationId}`, { quantity });
    return res.data;
  },

  async removeItem(medicationId: string) {
    const res = await apiClient.delete(`/cart/item/${medicationId}`);
    return res.data;
  },

  async clearCart() {
    const res = await apiClient.delete('/cart');
    return res.data;
  },
};

export const paymentService = {
  async initiatePayment(orderId: string, method: string, phone?: string) {
    const res = await apiClient.post(`/payments/initiate/${orderId}`, { method, phone });
    return res.data;
  },

  async simulateConfirm(orderId: string, reference: string) {
    const res = await apiClient.post(`/payments/simulate-confirm/${orderId}`, { reference });
    return res.data;
  },

  async confirmPayment(orderId: string, reference: string) {
    const res = await apiClient.post(`/payments/confirm/${orderId}`, { reference });
    return res.data;
  },

  async getStatus(orderId: string) {
    const res = await apiClient.get(`/payments/status/${orderId}`);
    return res.data;
  },
};

export const notificationService = {
  async getAll(page = 1) {
    const res = await apiClient.get('/notifications', { params: { page } });
    return res.data;
  },

  async getUnreadCount() {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id: string) {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllRead() {
    const res = await apiClient.put('/notifications/read-all');
    return res.data;
  },
};
