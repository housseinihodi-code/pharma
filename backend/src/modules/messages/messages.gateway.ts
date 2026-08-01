import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // userId → socketId
  private userSockets = new Map<string, string>();
  // socketId → { userId, role }
  private socketUsers = new Map<string, { userId: string; role: string }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'super-secret-key',
      });

      const userId = payload.sub?.toString();
      const role = payload.role || 'client';

      this.userSockets.set(userId, client.id);
      this.socketUsers.set(client.id, { userId, role });

      client.emit('connected', { userId });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = this.socketUsers.get(client.id);
    if (data) {
      this.userSockets.delete(data.userId);
      this.socketUsers.delete(client.id);
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.join(`conv:${conversationId}`);
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() conversationId: string) {
    client.leave(`conv:${conversationId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user) return;
    client.to(`conv:${data.conversationId}`).emit('typing', {
      userId: user.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string },
  ) {
    const user = this.socketUsers.get(client.id);
    if (!user) return;

    try {
      const msg = await this.messagesService.sendMessage(
        data.conversationId,
        user.userId,
        user.role,
        { content: data.content },
      );
      // Diffuser à tous les membres de la conversation (y compris l'émetteur)
      this.server.to(`conv:${data.conversationId}`).emit('new_message', msg);
    } catch (e) {
      client.emit('error', { message: e.message });
    }
  }

  // Méthode appelée depuis MessagesService (envoi via API HTTP)
  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('new_message', message);
  }

  // Notifier un utilisateur spécifique
  notifyUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
