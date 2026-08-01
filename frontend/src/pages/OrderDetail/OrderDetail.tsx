import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ClipboardList, CheckCircle2, Check, Pill, Truck, Hospital,
  Phone, Bike, Clock, ChevronLeft, Package, MapPin, Users, FileDown,
  AlertTriangle,
} from 'lucide-react';
import { orderService } from '../../services/order.service';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Order, OrderStatus } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface StepDef {
  key: OrderStatus;
  label: string;
  Icon: React.FC<{ className?: string }>;
  activeMsg: string;
  doneMsg: string;
}

const JOURNEY: StepDef[] = [
  {
    key: 'pending',
    label: 'Reçue',
    Icon: Clock,
    activeMsg: 'Votre commande attend la confirmation de la pharmacie',
    doneMsg: 'Commande bien reçue par la pharmacie',
  },
  {
    key: 'confirmed',
    label: 'Confirmée',
    Icon: CheckCircle2,
    activeMsg: 'La pharmacie a pris en charge votre commande',
    doneMsg: 'Validée par le pharmacien',
  },
  {
    key: 'preparing',
    label: 'En préparation',
    Icon: Package,
    activeMsg: 'Vos médicaments sont en cours de préparation',
    doneMsg: 'Préparation terminée',
  },
  {
    key: 'ready',
    label: 'Prête',
    Icon: CheckCircle2,
    activeMsg: 'Commande prête — en attente de prise en charge',
    doneMsg: 'Prête pour la livraison ou le retrait',
  },
  {
    key: 'in_delivery',
    label: 'En livraison',
    Icon: Bike,
    activeMsg: 'Un livreur est en route vers vous',
    doneMsg: 'Prise en charge par le livreur',
  },
  {
    key: 'delivered',
    label: 'Livrée',
    Icon: CheckCircle2,
    activeMsg: 'Votre commande a été livrée avec succès',
    doneMsg: 'Livrée avec succès',
  },
];

const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await orderService.getById(id);
        setOrder(data);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

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

  if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;
  if (!order) return (
    <div className="text-center mt-20">
      <p className="text-gray-500">Commande non trouvée</p>
      <Link to="/orders" className="text-green-600 hover:underline mt-2 block">Mes commandes</Link>
    </div>
  );

  const pharmacy = typeof order.pharmacyId === 'object' ? order.pharmacyId as any : null;
  const pharmacyName = pharmacy?.name ?? 'Pharmacie';
  const pharmacyPhone = pharmacy?.phone ?? '';
  const pharmacyAddress = pharmacy?.address ?? '';

  const currentStep = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';
  const isPendingPrescription = order.status === 'pending_prescription';
  const isPrescriptionRejected = order.status === 'prescription_rejected';
  const isInDelivery = order.status === 'in_delivery';
  const isDelivered = order.status === 'delivered';
  const isDelivery = order.deliveryType === 'delivery';
  const subtotal = order.totalAmount - (order.deliveryFee || 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Back */}
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-600 mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Retour aux commandes
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Hospital className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">{pharmacyName}</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Commande #{order._id.slice(-8).toUpperCase()}
                </p>
                <p className="text-xs text-gray-400">
                  {format(new Date(order.createdAt), 'dd MMM yyyy · HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
            <OrderStatusBadge status={order.status as OrderStatus} />
          </div>

          {isPendingPrescription && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 text-sm">Ordonnance en cours de vérification</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  La pharmacie examine votre ordonnance. Vous serez notifié dès validation ou rejet.
                </p>
              </div>
            </div>
          )}

          {isPrescriptionRejected && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Ordonnance rejetée</p>
                {order.prescriptionRejectionReason && (
                  <p className="text-xs text-red-600 mt-0.5">
                    Motif : {order.prescriptionRejectionReason}
                  </p>
                )}
                <p className="text-xs text-red-500 mt-1">
                  Contactez la pharmacie ou passez une nouvelle commande avec une ordonnance valide.
                </p>
              </div>
            </div>
          )}

          {order.prescriptionStatus === 'approved' && order.prescriptionUrl && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-green-700">Ordonnance validée par la pharmacie</p>
            </div>
          )}
        </div>

        {/* Delivery tracking CTA — prominent banner */}
        {isInDelivery && isDelivery && (
          <Link
            to={`/delivery/${order._id}`}
            className="flex items-center justify-between gap-3 w-full px-5 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl shadow-md shadow-green-200 hover:shadow-lg hover:from-emerald-600 hover:to-green-700 transition-all mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">Livreur en route</p>
                <p className="text-xs text-green-100">Suivre en temps réel sur la carte</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="w-4 h-4 text-green-200" />
              Voir la carte
              <ChevronLeft className="w-4 h-4 text-green-200 rotate-180" />
            </div>
          </Link>
        )}

        {/* Order journey — vertical timeline */}
        {!isCancelled && !isPrescriptionRejected && !isPendingPrescription && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              Suivi de votre commande
            </h2>
            <div>
              {JOURNEY.map((step, idx) => {
                const done = idx < currentStep;
                const active = idx === currentStep;
                const StepIcon = step.Icon;
                return (
                  <div key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                        done
                          ? 'bg-green-600 border-green-600'
                          : active
                          ? 'bg-white border-green-600 ring-4 ring-green-50'
                          : 'bg-white border-gray-200'
                      }`}>
                        {done
                          ? <Check className="w-4 h-4 text-white" />
                          : <StepIcon className={`w-4 h-4 ${active ? 'text-green-600' : 'text-gray-300'}`} />
                        }
                      </div>
                      {idx < JOURNEY.length - 1 && (
                        <div className={`w-0.5 h-10 mt-0.5 transition-colors ${done ? 'bg-green-500' : 'bg-gray-100'}`} />
                      )}
                    </div>
                    <div className={`pb-8 flex-1 ${idx === JOURNEY.length - 1 ? 'pb-0' : ''}`}>
                      <p className={`text-sm font-semibold leading-tight ${
                        done ? 'text-green-700' : active ? 'text-gray-900' : 'text-gray-300'
                      }`}>
                        {step.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${
                        active ? 'text-gray-500' : done ? 'text-green-600' : 'text-gray-300'
                      }`}>
                        {active ? step.activeMsg : done ? step.doneMsg : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vos interlocuteurs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-600" />
            Vos interlocuteurs
          </h2>

          {/* Pharmacy card */}
          <div className="flex items-center justify-between gap-3 p-3 bg-green-50 rounded-xl border border-green-100 mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Hospital className="w-5 h-5 text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{pharmacyName}</p>
                <p className="text-xs text-gray-500">Votre pharmacien</p>
                {pharmacyAddress && (
                  <p className="text-xs text-gray-400 truncate">{pharmacyAddress}</p>
                )}
              </div>
            </div>
            {pharmacyPhone && (
              <a
                href={`tel:${pharmacyPhone}`}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex-shrink-0"
              >
                <Phone className="w-3.5 h-3.5" /> Appeler
              </a>
            )}
          </div>

          {/* Livreur card */}
          {isDelivery && (
            <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
              isInDelivery
                ? 'bg-blue-50 border-blue-100'
                : isDelivered
                ? 'bg-green-50 border-green-100'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isInDelivery ? 'bg-blue-100' : isDelivered ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Bike className={`w-5 h-5 ${
                    isInDelivery ? 'text-blue-700' : isDelivered ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {isDelivered
                      ? 'Livraison effectuée'
                      : isInDelivery
                      ? 'Livreur en route'
                      : 'En attente d\'un livreur'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isDelivered
                      ? 'Votre commande a été livrée avec succès'
                      : isInDelivery
                      ? 'Le livreur est en route vers votre adresse'
                      : 'Un livreur sera affecté après la préparation'}
                  </p>
                </div>
              </div>
              {isInDelivery && (
                <Link
                  to={`/delivery/${order._id}`}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5" /> Suivre
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Articles commandés */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Articles commandés</h2>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pill className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.price.toLocaleString()} FCFA × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">
                  {(item.price * item.quantity).toLocaleString()} FCFA
                </span>
              </div>
            ))}
          </div>

          {/* Financial breakdown */}
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span>{subtotal.toLocaleString()} FCFA</span>
            </div>
            {(order.deliveryFee || 0) > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" /> Frais de livraison
                </span>
                <span>{order.deliveryFee.toLocaleString()} FCFA</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-dashed">
              <span>Total</span>
              <span className="text-green-700">{order.totalAmount.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>

        {/* Informations pratiques */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Informations pratiques</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-2">
                {isDelivery
                  ? <><Truck className="w-4 h-4 text-gray-400" /> Mode</>
                  : <><Hospital className="w-4 h-4 text-gray-400" /> Mode</>
                }
              </span>
              <span className="font-medium text-gray-900">
                {isDelivery ? 'Livraison à domicile' : 'Retrait en pharmacie'}
              </span>
            </div>

            {order.deliveryAddress && (
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-500 flex items-center gap-2 flex-shrink-0">
                  <MapPin className="w-4 h-4 text-gray-400" /> Adresse
                </span>
                <span className="font-medium text-gray-900 text-right">{order.deliveryAddress}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Paiement</span>
              <span className="font-medium text-gray-900 capitalize">
                {order.paymentMethod.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Statut paiement</span>
              <span className={`font-medium flex items-center gap-1 ${
                order.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-500'
              }`}>
                {order.paymentStatus === 'paid'
                  ? <><Check className="w-3.5 h-3.5" /> Payé</>
                  : <><Clock className="w-3.5 h-3.5" /> En attente</>
                }
              </span>
            </div>

            {order.notes && (
              <div className="mt-1 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Note de livraison</p>
                <p className="text-sm text-amber-800">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice */}
        {(order.paymentStatus === 'paid' || order.status === 'delivered') && (
          <button
            onClick={handleDownloadInvoice}
            disabled={downloading}
            className="w-full py-3.5 mb-3 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-gray-500" />
                Télécharger la facture PDF
              </>
            )}
          </button>
        )}

        {/* Cancel */}
        {['pending_prescription', 'pending', 'confirmed'].includes(order.status) && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3.5 border border-red-200 text-red-600 rounded-2xl hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
          >
            {cancelling ? 'Annulation...' : 'Annuler la commande'}
          </button>
        )}
      </div>
    </div>
  );
}
