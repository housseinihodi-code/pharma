import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // Ouvrir ou créer une conversation avec une pharmacie (côté client)
  @Post('conversations/pharmacy/:pharmacyId')
  startConversation(
    @Param('pharmacyId') pharmacyId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.messagesService.getOrCreateConversation(userId.toString(), pharmacyId);
  }

  // Toutes mes conversations
  @Get('conversations')
  getConversations(
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messagesService.getConversations(userId.toString(), role);
  }

  // Nombre de messages non lus
  @Get('unread-count')
  getUnreadCount(
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messagesService.getUnreadCount(userId.toString(), role);
  }

  // Messages d'une conversation
  @Get('conversations/:conversationId')
  getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.messagesService.getMessages(conversationId, userId.toString(), role);
  }

  // Envoyer un message
  @Post('conversations/:conversationId')
  sendMessage(
    @Param('conversationId') conversationId: string,
    @CurrentUser('_id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(conversationId, userId.toString(), role, dto);
  }
}
