import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

class DeliverySocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;
    this.socket = io(`${SOCKET_URL}/delivery`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
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

  joinDelivery(deliveryId: string) {
    this.socket?.emit('join_delivery', deliveryId);
  }

  leaveDelivery(deliveryId: string) {
    this.socket?.emit('leave_delivery', deliveryId);
  }

  updatePosition(deliveryId: string, lat: number, lng: number) {
    this.socket?.emit('update_position', { deliveryId, lat, lng });
  }

  sendMessage(deliveryId: string, content: string) {
    this.socket?.emit('delivery_message', { deliveryId, content });
  }

  updateStatus(deliveryId: string, status: string) {
    this.socket?.emit('update_delivery_status', { deliveryId, status });
  }

  onPositionUpdated(cb: (data: { lat: number; lng: number; updatedAt: string }) => void) {
    this.socket?.on('position_updated', cb);
  }
  offPositionUpdated(cb: (data: any) => void) {
    this.socket?.off('position_updated', cb);
  }

  onMessage(cb: (msg: any) => void) {
    this.socket?.on('delivery_message', cb);
  }
  offMessage(cb: (msg: any) => void) {
    this.socket?.off('delivery_message', cb);
  }

  onStatusUpdated(cb: (data: { status: string }) => void) {
    this.socket?.on('status_updated', cb);
  }
  offStatusUpdated(cb: (data: any) => void) {
    this.socket?.off('status_updated', cb);
  }

  onConnect(cb: () => void) {
    this.socket?.on('connect', cb);
  }
  onDisconnect(cb: () => void) {
    this.socket?.on('disconnect', cb);
  }
}

export const deliverySocketService = new DeliverySocketService();
