import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;
    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected() {
    return this.socket?.connected ?? false;
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('join_conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('leave_conversation', conversationId);
  }

  sendMessage(conversationId: string, content: string) {
    this.socket?.emit('send_message', { conversationId, content });
  }

  emitTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }

  onMessage(cb: (msg: any) => void) {
    this.socket?.on('new_message', cb);
  }

  offMessage(cb: (msg: any) => void) {
    this.socket?.off('new_message', cb);
  }

  onTyping(cb: (data: { userId: string; isTyping: boolean }) => void) {
    this.socket?.on('typing', cb);
  }

  offTyping(cb: (data: any) => void) {
    this.socket?.off('typing', cb);
  }

  onConnect(cb: () => void) {
    this.socket?.on('connect', cb);
  }

  onDisconnect(cb: () => void) {
    this.socket?.on('disconnect', cb);
  }
}

export const socketService = new SocketService();
