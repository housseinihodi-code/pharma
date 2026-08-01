import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Hospital, ClipboardList, CheckCircle2, Check, Pill, Truck,
  Phone, Bike, Clock, Package, MapPin, Users, FileDown, AlertTriangle,
} from 'lucide-react';
import { orderService } from '../services/order.service';
import OrderStatusBadge from './OrderStatusBadge';
import { Order, OrderStatus } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface Props {
  orderId: string;
  onClose: () => void;
}

interface StepDef {
  key: OrderStatus;
  label: string;
  Icon: React.FC<{ className?: string }>;
  activeMsg: string;
  doneMsg: string;
}

const JOURNEY: StepDef[] = [
  { key: 'pending',     label: 'Reçue',          Icon: Clock,         activeMsg: 'Votre commande attend la confirmation',    doneMsg: 'Commande bien reçue' },
  { key: 'confirmed',   label: 'Confirmée',       Icon: CheckCircle2,  activeMsg: 'La pharmacie a pris en charge votre commande', doneMsg: 'Validée par le pharmacien' },
  { key: 'preparing',   label: 'En préparation',  Icon: Package,       activeMsg: 'Vos médicaments sont en cours de préparation', doneMsg: 'Préparation terminée' },
  { key: 'ready',       label: 'Prête',           Icon: CheckCircle2,  activeMsg: 'Commande prête — en attente du livreur',  doneMsg: 'Prête pour livraison' },
  { key: 'in_delivery', label: 'En livraison',    Icon: Bike,          activeMsg: 'Un livreur est en route vers vous',       doneMsg: 'Prise en charge' },
  { key: 'delivered',   label: 'Livrée',          Icon: CheckCircle2,  activeMsg: 'Livrée avec succès',                     doneMsg: 'Livrée avec succès' },
];

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];

export default function OrderDetailModal({ orderId, onClose }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    orderService.getById(orderId)
      .then(setOrder)
      .catch(() => toast.error('Impossible de charger la commande'))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      await orderService.downloadInvoice(order._id);
      toast.success('Facture téléchargée');
    } catch {
      toast.error('Impossible de générer la facture');
    } finally {
      setDownloading(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm('Annuler cette commande ?')) return;
    setCancelling(true);
    try {
      await orderService.updateStatus(order._id, 'cancelled');
      setOrder({ ...order, status: 'cancelled' });
      toast.success('Commande annulée');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Impossible d'annuler");
    } finally {
      setCancelling(false);
    }
  };

  const pharmacy = order && typeof order.pharmacyId === 'object' ? order.pharmacyId as any : null;
  const pharmacyName    = pharmacy?.name    ?? 'Pharmacie';
  const pharmacyPhone   = pharmacy?.phone   ?? '';
  const pharmacyAddress = pharmacy?.address ?? '';
  const currentStep  = order ? STATUS_STEPS.indexOf(order.status as OrderStatus) : -1;
  const isCancelled          = order?.status === 'cancelled';
  const isPendingPrescription= order?.status === 'pending_prescription';
  const isPrescriptionRejected=order?.status === 'prescription_rejected';
  const isInDelivery = order?.status === 'in_delivery';
  const isDelivered  = order?.status === 'delivered';
  const isDelivery   = order?.deliveryType === 'delivery';
  const subtotal     = order ? order.totalAmount - (order.deliveryFee || 0) : 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Dimmed overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Détail de la commande</h2>
            {order && (
              <p className="text-xs text-gray-400 mt-0.5">#{order._id.slice(-8).toUpperCase()}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Chargement…</p>
            </div>
          ) : !order ? (
            <div className="text-center py-16 text-gray-500 text-sm">Commande introuvable</div>
          ) : (
            <div className="px-5 py-4 space-y-4">

              {/* Pharmacy + status */}
              <div className="flex items-start justify-between gap-3 bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Hospital className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{pharmacyName}</p>
                    {pharmacyAddress && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{pharmacyAddress}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(order.createdAt), 'dd MMM yyyy · HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
                <OrderStatusBadge status={order.status as OrderStatus} />
              </div>

              {/* Prescription alerts */}
              {isPendingPrescription && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2.5">
                  <ClipboardList className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Ordonnance en vérification</p>
                    <p className="text-xs text-orange-600 mt-0.5">La pharmacie examine votre ordonnance — vous serez notifié.</p>
                  </div>
                </div>
              )}
              {isPrescriptionRejected && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Ordonnance rejetée</p>
                    {order.prescriptionRejectionReason && (
                      <p className="text-xs text-red-600 mt-0.5">Motif : {order.prescriptionRejectionReason}</p>
                    )}
                  </div>
                </div>
              )}
              {order.prescriptionStatus === 'approved' && order.prescriptionUrl && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Ordonnance validée</p>
                </div>
              )}

              {/* Tracking CTA */}
              {isInDelivery && isDelivery && (
                <Link
                  to={`/delivery/${order._id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 w-full px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl hover:from-emerald-600 hover:to-green-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                      <Bike className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Livreur en route</p>
                      <p className="text-xs text-green-100">Voir la carte en temps réel</p>
                    </div>
                  </div>
                  <MapPin className="w-4 h-4 text-green-200" />
                </Link>
              )}

              {/* Journey timeline */}
              {!isCancelled && !isPrescriptionRejected && !isPendingPrescription && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-600" /> Suivi de commande
                  </h3>
                  <div>
                    {JOURNEY.map((step, idx) => {
                      const done   = idx < currentStep;
                      const active = idx === currentStep;
                      const StepIcon = step.Icon;
                      return (
                        <div key={step.key} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                              done   ? 'bg-green-600 border-green-600'
                                     : active ? 'bg-white border-green-600 ring-4 ring-green-50'
                                     : 'bg-white border-gray-200'
                            }`}>
                              {done
                                ? <Check className="w-3.5 h-3.5 text-white" />
                                : <StepIcon className={`w-3.5 h-3.5 ${active ? 'text-green-600' : 'text-gray-300'}`} />
                              }
                            </div>
                            {idx < JOURNEY.length - 1 && (
                              <div className={`w-0.5 h-8 mt-0.5 ${done ? 'bg-green-500' : 'bg-gray-100'}`} />
                            )}
                          </div>
                          <div className={`pb-7 flex-1 ${idx === JOURNEY.length - 1 ? 'pb-0' : ''}`}>
                            <p className={`text-sm font-semibold ${done ? 'text-green-700' : active ? 'text-gray-900' : 'text-gray-300'}`}>
                              {step.label}
                            </p>
                            <p className={`text-xs mt-0.5 ${active ? 'text-gray-500' : done ? 'text-green-600' : 'text-gray-300'}`}>
                              {active ? step.activeMsg : done ? step.doneMsg : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interlocuteurs */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-green-600" /> Vos interlocuteurs
                </h3>

                {/* Pharmacy */}
                <div className="flex items-center justify-between gap-3 p-3 bg-green-50 rounded-xl border border-green-100 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Hospital className="w-4 h-4 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{pharmacyName}</p>
                      <p className="text-xs text-gray-500">Votre pharmacien</p>
                    </div>
                  </div>
                  {pharmacyPhone && (
                    <a href={`tel:${pharmacyPhone}`}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex-shrink-0">
                      <Phone className="w-3 h-3" /> Appeler
                    </a>
                  )}
                </div>

                {/* Livreur */}
                {isDelivery && (
                  <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                    isInDelivery ? 'bg-blue-50 border-blue-100' : isDelivered ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isInDelivery ? 'bg-blue-100' : isDelivered ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Bike className={`w-4 h-4 ${isInDelivery ? 'text-blue-700' : isDelivered ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {isDelivered ? 'Livraison effectuée' : isInDelivery ? 'Livreur en route' : "En attente d'un livreur"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isDelivered ? 'Commande livrée avec succès'
                            : isInDelivery ? 'En route vers votre adresse'
                            : 'Affecté après la préparation'}
                        </p>
                      </div>
                    </div>
                    {isInDelivery && (
                      <Link to={`/delivery/${order._id}`} onClick={onClose}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0">
                        <MapPin className="w-3 h-3" /> Suivre
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Articles */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Articles commandés</h3>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Pill className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.price.toLocaleString()} FCFA × {item.quantity}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">
                        {(item.price * item.quantity).toLocaleString()} FCFA
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial */}
                <div className="mt-3 pt-3 border-t space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Sous-total</span>
                    <span>{subtotal.toLocaleString()} FCFA</span>
                  </div>
                  {(order.deliveryFee || 0) > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Livraison</span>
                      <span>{order.deliveryFee.toLocaleString()} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-dashed">
                    <span>Total</span>
                    <span className="text-green-700">{order.totalAmount.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Infos pratiques */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mode</span>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      {isDelivery ? <><Truck className="w-3.5 h-3.5 text-gray-400" /> Livraison à domicile</> : <><Hospital className="w-3.5 h-3.5 text-gray-400" /> Retrait en pharmacie</>}
                    </span>
                  </div>
                  {order.deliveryAddress && (
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500 flex-shrink-0">Adresse</span>
                      <span className="font-medium text-gray-900 text-right">{order.deliveryAddress}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paiement</span>
                    <span className="font-medium text-gray-900 capitalize">{order.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Statut paiement</span>
                    <span className={`font-medium flex items-center gap-1 ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                      {order.paymentStatus === 'paid'
                        ? <><Check className="w-3.5 h-3.5" /> Payé</>
                        : <><Clock className="w-3.5 h-3.5" /> En attente</>
                      }
                    </span>
                  </div>
                  {order.notes && (
                    <div className="mt-1 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Note</p>
                      <p className="text-sm text-amber-800">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pb-2">
                {(order.paymentStatus === 'paid' || order.status === 'delivered') && (
                  <button
                    onClick={handleDownloadInvoice}
                    disabled={downloading}
                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-gray-50 transition-colors text-sm"
                  >
                    {downloading
                      ? <><span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> Génération…</>
                      : <><FileDown className="w-4 h-4 text-gray-500" /> Télécharger la facture PDF</>
                    }
                  </button>
                )}
                {['pending_prescription', 'pending', 'confirmed'].includes(order.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="w-full py-3 border border-red-200 text-red-600 rounded-2xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
                  >
                    {cancelling ? 'Annulation...' : 'Annuler la commande'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
