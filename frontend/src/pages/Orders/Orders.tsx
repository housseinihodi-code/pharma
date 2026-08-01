import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Package, Hospital, Truck, ChevronRight, Clock, CheckCircle2,
  Bike, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { orderService } from '../../services/order.service';
import LoadingSpinner from '../../components/LoadingSpinner';
import OrderDetailModal from '../../components/OrderDetailModal';
import { Order, OrderStatus } from '../../types';
import { RootState } from '../../store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; Icon: React.FC<{ className?: string }> }> = {
  pending_prescription: { label: 'Ordonnance requise', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', Icon: ClipboardList },
  pending:             { label: 'En attente',          color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200',  Icon: Clock },
  confirmed:           { label: 'Confirmée',           color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      Icon: CheckCircle2 },
  preparing:           { label: 'En préparation',      color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    Icon: Package },
  ready:               { label: 'Prête',               color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200',  Icon: CheckCircle2 },
  in_delivery:         { label: 'En livraison',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', Icon: Bike },
  delivered:           { label: 'Livrée',              color: 'text-green-700',   bg: 'bg-green-50 border-green-200',    Icon: CheckCircle2 },
  cancelled:           { label: 'Annulée',             color: 'text-red-600',     bg: 'bg-red-50 border-red-200',        Icon: AlertTriangle },
  prescription_rejected: { label: 'Ordonnance rejetée', color: 'text-red-600',   bg: 'bg-red-50 border-red-200',        Icon: AlertTriangle },
};

const STEP_KEYS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];

function MiniProgress({ status }: { status: OrderStatus }) {
  const idx = STEP_KEYS.indexOf(status);
  if (idx === -1) return null;
  return (
    <div className="flex items-center gap-0.5 mt-2.5">
      {STEP_KEYS.map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < idx ? 'bg-green-500' : i === idx ? 'bg-green-400' : 'bg-gray-100'
          }`}
        />
      ))}
    </div>
  );
}

export default function Orders() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await orderService.getMyOrders(page);
        setOrders(data.orders);
        setPages(data.pages);
        setTotal(data.total);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, page]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white rounded-2xl border border-gray-100 p-10 max-w-sm shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connectez-vous</h2>
          <p className="text-gray-500 text-sm mb-6">Consultez le suivi de vos commandes</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const active = orders.filter(o => !['delivered', 'cancelled', 'prescription_rejected'].includes(o.status));
  const past   = orders.filter(o =>  ['delivered', 'cancelled', 'prescription_rejected'].includes(o.status));

  return (
    <div className="min-h-screen bg-slate-50">
      {selectedOrderId && (
        <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 pt-10 pb-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Mes commandes</h1>
          <p className="text-green-100 text-sm">
            {total > 0 ? `${total} commande${total > 1 ? 's' : ''} au total` : 'Aucune commande pour l\'instant'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 pb-10">
        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Aucune commande</h2>
            <p className="text-gray-500 text-sm mt-2">Vous n'avez pas encore passé de commande</p>
            <Link to="/pharmacies" className="mt-6 inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium">
              Explorer les pharmacies
            </Link>
          </div>
        ) : (
          <>
            {/* Commandes actives */}
            {active.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                  En cours · {active.length}
                </h2>
                <div className="space-y-3">
                  {active.map(order => <OrderCard key={order._id} order={order} onClick={() => {
                    if (order.status === 'in_delivery' && order.deliveryType === 'delivery') {
                      navigate(`/delivery/${order._id}`);
                    } else {
                      setSelectedOrderId(order._id);
                    }
                  }} />)}
                </div>
              </div>
            )}

            {/* Commandes passées */}
            {past.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
                  Historique · {past.length}
                </h2>
                <div className="space-y-3">
                  {past.map(order => <OrderCard key={order._id} order={order} onClick={() => setSelectedOrderId(order._id)} />)}
                </div>
              </div>
            )}

            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Précédent
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  {page} / {pages}
                </span>
                <button
                  onClick={() => setPage(Math.min(pages, page + 1))}
                  disabled={page === pages}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const pharmacyName = typeof order.pharmacyId === 'object' ? (order.pharmacyId as any).name : 'Pharmacie';
  const pharmacyImg  = typeof order.pharmacyId === 'object' ? (order.pharmacyId as any).imageUrl : null;
  const meta = STATUS_META[order.status as OrderStatus] ?? STATUS_META.pending;
  const StatusIcon = meta.Icon;
  const isActive = !['delivered', 'cancelled', 'prescription_rejected'].includes(order.status);
  const showProgress = !['cancelled', 'prescription_rejected', 'pending_prescription'].includes(order.status);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left block bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group cursor-pointer ${
        isActive ? 'border-gray-100 hover:border-green-200' : 'border-gray-100 opacity-85 hover:opacity-100'
      }`}
    >
      <div className="p-4">
        {/* Top row: pharmacy + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-green-100">
              {pharmacyImg
                ? <img src={pharmacyImg} alt="" className="w-full h-full object-cover rounded-xl" />
                : <Hospital className="w-5 h-5 text-green-600" />
              }
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate text-sm">{pharmacyName}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(order.createdAt), 'dd MMM yyyy · HH:mm', { locale: fr })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
              <StatusIcon className="w-3 h-3" />
              {meta.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
          </div>
        </div>

        {/* Mini progress bar */}
        {showProgress && <MiniProgress status={order.status as OrderStatus} />}

        {/* Bottom row: items + amount + delivery type */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1">
              {order.items.slice(0, 3).map((item, i) => (
                <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {item.name} <span className="font-medium">×{item.quantity}</span>
                </span>
              ))}
              {order.items.length > 3 && (
                <span className="text-xs bg-gray-50 border border-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                  +{order.items.length - 3}
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-bold text-green-700 text-base">{order.totalAmount.toLocaleString()} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
            <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
              {order.deliveryType === 'delivery'
                ? <><Truck className="w-3 h-3" /> Livraison</>
                : <><Hospital className="w-3 h-3" /> Retrait</>
              }
            </p>
          </div>
        </div>

        {/* In-delivery CTA */}
        {order.status === 'in_delivery' && order.deliveryType === 'delivery' && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-emerald-700 font-medium">
            <Bike className="w-3.5 h-3.5" />
            <span>Livreur en route — cliquez pour suivre en temps réel</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse ml-auto" />
          </div>
        )}
      </div>
    </button>
  );
}
