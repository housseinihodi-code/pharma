import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { SendMessageDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Conversation.name) private convModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private msgModel: Model<MessageDocument>,
  ) {}

  // Crée ou retourne la conversation existante entre un client et une pharmacie
  async getOrCreateConversation(clientId: string, pharmacyId: string) {
    let conv = await this.convModel
      .findOne({ clientId: new Types.ObjectId(clientId), pharmacyId: new Types.ObjectId(pharmacyId) })
      .populate('clientId', 'firstName lastName profilePicture')
      .populate('pharmacyId', 'name imageUrl');

    if (!conv) {
      conv = await this.convModel.create({
        clientId: new Types.ObjectId(clientId),
        pharmacyId: new Types.ObjectId(pharmacyId),
      });
      conv = await this.convModel
        .findById(conv._id)
        .populate('clientId', 'firstName lastName profilePicture')
        .populate('pharmacyId', 'name imageUrl');
    }
    return conv;
  }

  // Liste des conversations selon le rôle
  async getConversations(userId: string, role: string) {
    const filter = role === 'pharmacist'
      ? { pharmacyId: { $in: await this.getUserPharmacies(userId) } }
      : { clientId: new Types.ObjectId(userId) };

    return this.convModel
      .find(filter)
      .populate('clientId', 'firstName lastName profilePicture')
      .populate('pharmacyId', 'name imageUrl address')
      .sort({ lastMessageAt: -1 });
  }

  // Récupérer les messages d'une conversation (avec marquage comme lu)
  async getMessages(conversationId: string, userId: string, role: string) {
    const conv = await this.convModel.findById(conversationId)
      .populate('clientId', 'firstName lastName')
      .populate('pharmacyId', 'name imageUrl');
    if (!conv) throw new NotFoundException('Conversation introuvable');

    await this.checkAccess(conv, userId, role);

    // Marquer les messages non lus comme lus
    const otherRole = role === 'client' ? 'pharmacist' : 'client';
    await this.msgModel.updateMany(
      { conversationId: new Types.ObjectId(conversationId), senderRole: otherRole, isRead: false },
      { isRead: true },
    );

    // Remettre à zéro le compteur non lu
    if (role === 'client') {
      await this.convModel.findByIdAndUpdate(conversationId, { clientUnread: 0 });
    } else {
      await this.convModel.findByIdAndUpdate(conversationId, { pharmacyUnread: 0 });
    }

    const messages = await this.msgModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .populate('senderId', 'firstName lastName profilePicture')
      .sort({ createdAt: 1 });

    return { conversation: conv, messages };
  }

  // Envoyer un message
  async sendMessage(conversationId: string, userId: string, role: string, dto: SendMessageDto) {
    const conv = await this.convModel.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation introuvable');
    await this.checkAccess(conv, userId, role);

    const msg = await this.msgModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
      senderRole: role,
      content: dto.content.trim(),
    });

    // Incrémenter le compteur non lu du destinataire
    const unreadField = role === 'client' ? 'pharmacyUnread' : 'clientUnread';
    await this.convModel.findByIdAndUpdate(conversationId, {
      lastMessage: dto.content.trim().substring(0, 100),
      lastMessageAt: new Date(),
      $inc: { [unreadField]: 1 },
    });

    return this.msgModel
      .findById(msg._id)
      .populate('senderId', 'firstName lastName profilePicture');
  }

  // Nombre total de messages non lus
  async getUnreadCount(userId: string, role: string): Promise<number> {
    const filter = role === 'pharmacist'
      ? { pharmacyId: { $in: await this.getUserPharmacies(userId) }, pharmacyUnread: { $gt: 0 } }
      : { clientId: new Types.ObjectId(userId), clientUnread: { $gt: 0 } };

    const convs = await this.convModel.find(filter).select('clientUnread pharmacyUnread');
    return convs.reduce((sum, c) => sum + (role === 'client' ? c.clientUnread : c.pharmacyUnread), 0);
  }

  private async checkAccess(conv: ConversationDocument, userId: string, role: string) {
    const isClient = conv.clientId.toString() === userId.toString();
    if (isClient) return;

    if (role === 'pharmacist') {
      const pharmacies = await this.getUserPharmacies(userId);
      const convPharmacyId = conv.pharmacyId?.toString();
      const owns = pharmacies.some(p => p.toString() === convPharmacyId);
      if (!owns) throw new ForbiddenException('Accès refusé');
      return;
    }

    throw new ForbiddenException('Accès refusé');
  }

  // Récupère les IDs des pharmacies gérées par ce pharmacien
  private async getUserPharmacies(userId: string): Promise<Types.ObjectId[]> {
    // Injection circulaire évitée en requêtant MongoDB directement via le modèle pharmacie
    // On utilise le convModel pour requêter l'aggregation
    const PharmacyModel = (this.convModel.db as any).model('Pharmacy');
    if (!PharmacyModel) return [];
    const pharmacies = await PharmacyModel.find({ ownerId: new Types.ObjectId(userId) }).select('_id');
    return pharmacies.map((p: any) => p._id);
  }
}
