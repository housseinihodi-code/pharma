import apiClient from './apiClient';

export const authService = {
  async register(data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role?: string }) {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },

  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  async logout() {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  },

  async refreshToken(refreshToken: string) {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    return res.data;
  },
};
