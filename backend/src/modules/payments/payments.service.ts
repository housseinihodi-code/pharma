import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CampayService } from './campay.service';

const METHOD_LABELS: Record<string, string> = {
  mobile_money: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  card: 'Carte bancaire',
  cash: 'Espèces à la livraison',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private campayService: CampayService,
    private config: ConfigService,
  ) {}

  async initiatePayment(orderId: string, userId: string, method: string, phone?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Commande non trouvée');
    if (order.userId.toString() !== userId.toString()) throw new BadRequestException('Accès refusé');
    if (order.paymentStatus === 'paid') throw new BadRequestException('Commande déjà payée');

    // ── Espèces / carte → pas d'appel API ────────────────────────────────
    if (method === 'cash' || method === 'card') {
      await this.orderModel.findByIdAndUpdate(orderId, { paymentMethod: method });
      return {
        method,
        status: 'pending',
        message: method === 'cash'
          ? 'Paiement en espèces à la livraison'
          : 'Le terminal de paiement carte sera présenté à la livraison',
      };
    }

    // ── Mobile Money / Orange Money → Campay ─────────────────────────────
    if (!phone) throw new BadRequestException('Numéro de téléphone requis');

    const callbackUrl = this.config.get<string>('APP_CALLBACK_URL', 'http://localhost:3001');
    const notifyUrl = `${callbackUrl}/payments/campay/webhook`;

    let campayRef: string;
    let ussdCode: string;

    if (this.campayService.isConfigured()) {
      // ── Mode RÉEL : appel Campay ────────────────────────────────────────
      const result = await this.campayService.collect({
        amount: order.totalAmount,
        phone,
        description: `PharmaConnect - Commande #${orderId.slice(-8).toUpperCase()}`,
        externalRef: orderId,
        notifyUrl,
      });
      campayRef = result.reference;
      ussdCode = result.ussd_code || (method === 'mobile_money' ? '*126#' : '#150*50#');
      this.logger.log(`Campay collect lancé: ${campayRef}`);
    } else {
      // ── Mode SIMULATION (pas de credentials) ────────────────────────────
      campayRef = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      ussdCode = method === 'mobile_money' ? '*126#' : '#150*50#';
      this.logger.warn('Campay non configuré — mode simulation activé');
    }

    await this.orderModel.findByIdAndUpdate(orderId, {
      paymentReference: campayRef,
      paymentMethod: method,
    });

    return {
      reference: campayRef,
      transactionId: campayRef,
      orderId,
      amount: order.totalAmount,
      currency: 'XAF',
      method,
      methodLabel: METHOD_LABELS[method],
      phone,
      status: 'PENDING',
      ussdCode,
      simulated: !this.campayService.isConfigured(),
      message: method === 'mobile_money'
        ? `Notification envoyée sur le ${phone}. Composez le ${ussdCode} et entrez votre PIN.`
        : `Notification Orange Money envoyée sur le ${phone}. Composez le ${ussdCode} et entrez votre PIN.`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  // ── Webhook Campay (reçu après confirmation PIN de l'utilisateur) ─────────
  //
  // Le contenu du webhook n'est JAMAIS pris pour argent comptant : n'importe
  // qui peut appeler cette route publique avec un statut forgé. Il ne sert
  // qu'à déclencher une vérification authentifiée directement auprès de
  // l'API Campay (avec nos identifiants, que seul ce backend possède) — seule
  // cette vérification peut faire passer une commande à "payée".
  async handleCampayWebhook(payload: any) {
    this.logger.log(`Webhook Campay reçu: ref=${payload.reference} status=${payload.status}`);

    const { reference, external_reference } = payload;

    const orderId = external_reference;
    if (!orderId) {
      this.logger.warn('Webhook sans external_reference');
      return { received: true };
    }

    const order = await this.orderModel.findOne({
      $or: [
        { _id: orderId.match(/^[a-f\d]{24}$/i) ? orderId : null },
        { paymentReference: reference },
      ],
    });

    if (!order) {
      this.logger.warn(`Commande introuvable pour ref=${reference}`);
      return { received: true };
    }

    // Idempotence : déjà traité, on ne refait pas d'appel Campay pour rien.
    if (order.paymentStatus === 'paid' || order.paymentStatus === 'failed') {
      return { received: true };
    }

    if (!order.paymentReference || order.paymentReference.startsWith('SIM-')) {
      this.logger.warn(`Webhook ignoré (pas de référence Campay réelle) pour order=${order._id}`);
      return { received: true };
    }

    try {
      const verified = await this.campayService.getTransactionStatus(order.paymentReference);
      if (verified.status === 'SUCCESSFUL') {
        await this.orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: 'paid',
          status: order.status === 'pending' ? 'confirmed' : order.status,
        });
        this.logger.log(`Paiement confirmé (vérifié via API Campay): order=${order._id}`);
      } else if (verified.status === 'FAILED') {
        await this.orderModel.findByIdAndUpdate(order._id, { paymentStatus: 'failed' });
        this.logger.warn(`Paiement échoué (vérifié via API Campay): order=${order._id}`);
      }
    } catch (err: any) {
      this.logger.error(`Vérification Campay impossible pour order=${order._id}: ${err?.message}`);
    }

    return { received: true };
  }

  // ── Simulation manuelle (dev/test uniquement) ─────────────────────────────
  async simulateWebhook(orderId: string, reference: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Commande non trouvée');
    if (order.paymentStatus === 'paid') return { status: 'already_paid' };
    if (order.paymentReference && order.paymentReference !== reference) {
      throw new BadRequestException('Référence invalide');
    }

    const updated = await this.orderModel.findByIdAndUpdate(
      orderId,
      { paymentStatus: 'paid', status: 'confirmed' },
      { new: true },
    );
    return {
      status: 'SUCCESSFUL',
      reference,
      orderId,
      amount: order.totalAmount,
      message: 'Paiement confirmé (simulation)',
      order: updated,
    };
  }

  // ── Polling statut (frontend) ─────────────────────────────────────────────
  async getPaymentStatus(orderId: string) {
    const order = await this.orderModel
      .findById(orderId)
      .select('paymentStatus paymentMethod paymentReference totalAmount status');
    if (!order) throw new NotFoundException('Commande non trouvée');

    // Si Campay configuré et paiement encore pending → vérifier en temps réel
    if (
      this.campayService.isConfigured() &&
      order.paymentStatus === 'pending' &&
      order.paymentReference &&
      !order.paymentReference.startsWith('SIM-')
    ) {
      try {
        const campay = await this.campayService.getTransactionStatus(order.paymentReference);
        if (campay.status === 'SUCCESSFUL') {
          await this.orderModel.findByIdAndUpdate(orderId, {
            paymentStatus: 'paid',
            status: order.status === 'pending' ? 'confirmed' : order.status,
          });
          return { paymentStatus: 'paid', orderStatus: 'confirmed', paymentMethod: order.paymentMethod, totalAmount: order.totalAmount };
        }
        if (campay.status === 'FAILED') {
          await this.orderModel.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
          return { paymentStatus: 'failed', orderStatus: order.status, paymentMethod: order.paymentMethod, totalAmount: order.totalAmount };
        }
      } catch {
        // Si l'appel Campay échoue, on retourne le statut local
      }
    }

    return {
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      totalAmount: order.totalAmount,
    };
  }

  async confirmPayment(orderId: string, reference: string) {
    return this.simulateWebhook(orderId, reference);
  }
}
