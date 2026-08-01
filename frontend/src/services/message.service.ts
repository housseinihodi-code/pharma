import apiClient from './apiClient';

export const messageService = {
  async startConversation(pharmacyId: string) {
    const res = await apiClient.post(`/messages/conversations/pharmacy/${pharmacyId}`);
    return res.data;
  },

  async getConversations() {
    const res = await apiClient.get('/messages/conversations');
    return res.data as any[];
  },

  async getMessages(conversationId: string) {
    const res = await apiClient.get(`/messages/conversations/${conversationId}`);
    return res.data as { conversation: any; messages: any[] };
  },

  async sendMessage(conversationId: string, content: string) {
    const res = await apiClient.post(`/messages/conversations/${conversationId}`, { content });
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get('/messages/unread-count');
    return res.data;
  },
};
