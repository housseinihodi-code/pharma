import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import * as PDFDocument from 'pdfkit';

const PAYMENT_LABELS: Record<string, string> = {
  mobile_money: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  card: 'Carte bancaire',
  cash: 'Espèces à la livraison',
};

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async generateInvoice(orderId: string, requesterId: string, requesterRole: string): Promise<Buffer> {
    const order = await this.orderModel
      .findById(orderId)
      .populate('userId', 'firstName lastName email phone')
      .populate('pharmacyId', 'name address phone')
      .lean();

    if (!order) throw new NotFoundException('Commande introuvable');

    const isOwner = order.userId && (order.userId as any)._id?.toString() === requesterId;
    const isPrivileged = ['admin', 'pharmacist'].includes(requesterRole);
    if (!isOwner && !isPrivileged) throw new ForbiddenException('Accès refusé');

    const user = order.userId as any;
    const pharmacy = order.pharmacyId as any;
    const invoiceNumber = `FAC-${String(orderId).slice(-8).toUpperCase()}`;
    const date = new Date((order as any).createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const paymentLabel = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod;
    const isPaid = order.paymentStatus === 'paid';

    return new Promise((resolve, reject) => {
      const doc = new (PDFDocument as any)({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const GREEN = '#059669';
      const DARK = '#111827';
      const GRAY = '#6B7280';
      const LIGHT = '#F3F4F6';

      // ── En-tête ────────────────────────────────────────────────
      doc.rect(0, 0, 595, 110).fill(GREEN);
      doc.fillColor('white').fontSize(28).font('Helvetica-Bold')
        .text('PharmaConnect', 50, 32);
      doc.fontSize(10).font('Helvetica')
        .text('Plateforme e-pharmacie — Yaoundé, Cameroun', 50, 66)
        .text('contact@pharmaconnect.cm  |  +237 6XX XXX XXX', 50, 82);

      // Statut badge en haut à droite
      const statusColor = isPaid ? '#D1FAE5' : '#FEF3C7';
      const statusText = isPaid ? '✓  PAYÉE' : '⏳  EN ATTENTE';
      const statusFg = isPaid ? '#065F46' : '#92400E';
      doc.rect(410, 22, 140, 30).fill(statusColor).stroke();
      doc.fillColor(statusFg).fontSize(11).font('Helvetica-Bold')
        .text(statusText, 415, 31, { width: 130, align: 'center' });

      // ── Titre facture ───────────────────────────────────────────
      doc.fillColor(DARK).fontSize(20).font('Helvetica-Bold')
        .text('FACTURE', 50, 130);
      doc.fontSize(10).font('Helvetica').fillColor(GRAY)
        .text(`N° ${invoiceNumber}`, 50, 156)
        .text(`Date : ${date}`, 50, 172);
      if (order.paymentReference) {
        doc.text(`Référence paiement : ${order.paymentReference}`, 50, 188);
      }

      // ── Bloc client + pharmacie ────────────────────────────────
      const boxTop = order.paymentReference ? 218 : 204;

      // Client
      doc.rect(50, boxTop, 230, 95).fill(LIGHT).stroke('#E5E7EB');
      doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
        .text('CLIENT', 62, boxTop + 10);
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
        .text(`${user.firstName || ''} ${user.lastName || ''}`.trim(), 62, boxTop + 25);
      doc.font('Helvetica').fillColor(GRAY).fontSize(9)
        .text(user.email || '', 62, boxTop + 41)
        .text(user.phone || '', 62, boxTop + 56);

      // Pharmacie
      doc.rect(315, boxTop, 230, 95).fill(LIGHT).stroke('#E5E7EB');
      doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold')
        .text('PHARMACIE', 327, boxTop + 10);
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
        .text(pharmacy.name || 'Pharmacie', 327, boxTop + 25);
      doc.font('Helvetica').fillColor(GRAY).fontSize(9)
        .text(pharmacy.address || '', 327, boxTop + 41, { width: 210 })
        .text(pharmacy.phone || '', 327, boxTop + 66);

      // ── Tableau des articles ───────────────────────────────────
      const tableTop = boxTop + 115;
      const colX = [50, 260, 360, 430, 500];

      // En-tête tableau
      doc.rect(50, tableTop, 495, 26).fill(GREEN);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      ['Médicament', 'P.U. (FCFA)', 'Qté', 'Total (FCFA)'].forEach((h, i) => {
        doc.text(h, colX[i] + 6, tableTop + 8, { width: colX[i + 1] - colX[i] - 6 });
      });

      // Lignes articles
      let y = tableTop + 26;
      order.items.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? 'white' : '#F9FAFB';
        doc.rect(50, y, 495, 24).fill(bg).stroke('#E5E7EB');
        doc.fillColor(DARK).font('Helvetica').fontSize(9);
        doc.text(item.name, colX[0] + 6, y + 7, { width: colX[1] - colX[0] - 8 });
        doc.text(item.price.toLocaleString('fr-FR'), colX[1] + 6, y + 7, { width: 90, align: 'right' });
        doc.text(String(item.quantity), colX[2] + 6, y + 7, { width: 60, align: 'center' });
        doc.text((item.price * item.quantity).toLocaleString('fr-FR'), colX[3] + 6, y + 7, { width: 60, align: 'right' });
        y += 24;
      });

      // ── Totaux ─────────────────────────────────────────────────
      y += 10;
      const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const deliveryFee = order.deliveryFee || 0;

      if (deliveryFee > 0) {
        doc.rect(350, y, 195, 22).fill('#FFF7ED').stroke('#E5E7EB');
        doc.fillColor(GRAY).font('Helvetica').fontSize(9)
          .text('Sous-total :', 358, y + 6)
          .text(`${subtotal.toLocaleString('fr-FR')} FCFA`, 358, y + 6, { width: 180, align: 'right' });
        y += 22;
        doc.rect(350, y, 195, 22).fill('#FFF7ED').stroke('#E5E7EB');
        doc.fillColor(GRAY).font('Helvetica').fontSize(9)
          .text('Frais de livraison :', 358, y + 6)
          .text(`${deliveryFee.toLocaleString('fr-FR')} FCFA`, 358, y + 6, { width: 180, align: 'right' });
        y += 22;
      }

      doc.rect(350, y, 195, 30).fill(GREEN);
      doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
        .text('TOTAL :', 358, y + 9)
        .text(`${order.totalAmount.toLocaleString('fr-FR')} FCFA`, 358, y + 9, { width: 180, align: 'right' });
      y += 30;

      // ── Informations de paiement ───────────────────────────────
      y += 20;
      doc.rect(50, y, 495, 48).fill(isPaid ? '#D1FAE5' : '#FEF3C7').stroke('#E5E7EB');
      doc.fillColor(isPaid ? GREEN : '#92400E').font('Helvetica-Bold').fontSize(10)
        .text(isPaid ? '✓  Paiement reçu' : '⏳  Paiement en attente', 62, y + 10);
      doc.font('Helvetica').fontSize(9).fillColor(DARK)
        .text(`Mode : ${paymentLabel}`, 62, y + 28)
        .text(order.paymentReference ? `Réf. : ${order.paymentReference}` : '', 250, y + 28);

      // ── Mode de livraison ──────────────────────────────────────
      if (order.deliveryAddress) {
        y += 68;
        doc.fillColor(GRAY).font('Helvetica').fontSize(9)
          .text(`Mode de livraison : ${order.deliveryType === 'delivery' ? 'Livraison à domicile' : 'Retrait en pharmacie'}`, 50, y)
          .text(`Adresse : ${order.deliveryAddress}`, 50, y + 14);
      }

      // ── Pied de page ───────────────────────────────────────────
      const footerY = 760;
      doc.rect(50, footerY, 495, 1).fill('#E5E7EB');
      doc.fillColor(GRAY).font('Helvetica').fontSize(8)
        .text('Ce document tient lieu de facture officielle.', 50, footerY + 10, { align: 'center', width: 495 })
        .text('PharmaConnect — Yaoundé, Cameroun | RCCM N° [X] | contact@pharmaconnect.cm', 50, footerY + 23, { align: 'center', width: 495 })
        .text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 50, footerY + 36, { align: 'center', width: 495 });

      doc.end();
    });
  }
}
