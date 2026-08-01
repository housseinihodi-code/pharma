import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ClipboardList, Pill, FileText, Truck, MapPin,
  RotateCcw, ChevronRight, Clock, CheckCircle2, Bike, Package,
  Hospital, AlertTriangle, ScanLine,
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import PrescriptionAnalysisModal from '../../components/PrescriptionAnalysisModal';
import OrderDetailModal from '../../components/OrderDetailModal';
import { RootState } from '../../store';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface HistoryOrder {
  _id: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  prescriptionStatus: string;
  prescriptionUrl?: string;
  deliveryType: string;
  deliveryAddress?: string;
  paymentMethod: string;
  items: OrderItem[];
  pharmacyId: {
    _id: string;
    name: string;
    address: string;
    imageUrl?: string;
  } | null;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; Icon: React.FC<{ className?: string }> }> = {
  pending_prescription: { label: 'Ordonnance requise',  color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',  Icon: ClipboardList },
  pending:              { label: 'En attente',           color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200',  Icon: Clock },
  confirmed:            { label: 'Confirmée',            color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      Icon: CheckCircle2 },
  preparing:            { label: 'En préparation',       color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    Icon: Package },
  ready:                { label: 'Prête',                color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200',  Icon: CheckCircle2 },
  in_delivery:          { label: 'En livraison',         color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', Icon: Bike },
  delivered:            { label: 'Livrée',               color: 'text-green-700',   bg: 'bg-green-50 border-green-200',    Icon: CheckCircle2 },
  cancelled:            { label: 'Annulée',              color: 'text-red-600',     bg: 'bg-red-50 border-red-200',        Icon: AlertTriangle },
  prescription_rejected:{ label: 'Ordonnance rejetée',  color: 'text-red-600',     bg: 'bg-red-50 border-red-200',        Icon: AlertTriangle },
};

export default function Ordonnances() {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'prescription'>('all');
  const [analyzingUrl, setAnalyzingUrl] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    apiClient.get(`/orders/my-orders?page=${page}&limit=10`)
      .then(r => {
        setOrders(r.data.orders);
        setPages(r.data.pages);
        setTotal(r.data.total);
      })
      .catch(() => toast.error('Erreur chargement'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, page]);

  const handleReorder = async (e: React.MouseEvent, order: HistoryOrder) => {
    e.preventDefault();
    e.stopPropagation();
    setReorderingId(order._id);
    try {
      const result = await apiClient.post(`/orders/${order._id}/reorder`).then(r => r.data);
      if (result.unavailable?.length) {
        toast.success(
          `Panier mis à jour ! (${result.unavailable.length} article(s) non disponible(s) : ${result.unavailable.join(', ')})`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${result.added} article(s) ajouté(s) au panier !`);
      }
      navigate('/cart');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Impossible de renouveler la commande');
    } finally {
      setReorderingId(null);
    }
  };

  const handleAnalyze = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAnalyzingUrl(url);
  };

  const filtered = filterMode === 'prescription'
    ? orders.filter(o => o.prescriptionUrl || o.prescriptionStatus !== 'not_required')
    : orders;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white rounded-2xl border p-10 max-w-sm shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connectez-vous</h2>
          <p className="text-gray-500 text-sm mb-6">Consultez et renouvelez vos ordonnances</p>
          <Link to="/login" className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {analyzingUrl && (
        <PrescriptionAnalysisModal
          prescriptionUrl={analyzingUrl}
          onClose={() => setAnalyzingUrl(null)}
        />
      )}
      {selectedOrderId && (
        <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 pt-10 pb-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Mes ordonnances & commandes</h1>
          <p className="text-emerald-100 text-sm mb-5">
            Renouveler une commande ajoute automatiquement les articles à votre panier
          </p>
          <Link
            to="/scanner-ordonnance"
            className="inline-flex items-center gap-3 px-6 py-3.5 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-xl hover:bg-white/25 transition-all group shadow-lg"
          >
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition">
              <ScanLine className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold leading-tight">Scanner une ordonnance</div>
              <div className="text-xs text-emerald-100 mt-0.5">L'IA trouve les médicaments disponibles</div>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 pb-10">

        {/* Filter + actions bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1">
            {(['all', 'prescription'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filterMode === mode ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode === 'all'
                  ? `Toutes (${total})`
                  : <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Avec ordonnance</span>
                }
              </button>
            ))}
          </div>
          <Link
            to="/comparateur"
            className="text-sm px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition font-medium flex items-center gap-1.5"
          >
            <Pill className="w-3.5 h-3.5" /> Comparer les prix
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <LoadingSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="font-semibold text-gray-700">Aucune commande</h2>
            <p className="text-gray-400 text-sm mt-2">
              {filterMode === 'prescription'
                ? 'Aucune commande avec ordonnance.'
                : "Vous n'avez pas encore passé de commande."}
            </p>
            <Link
              to="/pharmacies"
              className="mt-5 inline-block px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium"
            >
              Parcourir les pharmacies
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const ph = order.pharmacyId;
              const meta = STATUS_META[order.status] ?? STATUS_META.pending;
              const StatusIcon = meta.Icon;
              const canReorder = ['delivered', 'cancelled', 'prescription_rejected'].includes(order.status);

              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all group"
                >
                  <button
                    onClick={() => setSelectedOrderId(order._id)}
                    className="w-full text-left p-4 block"
                  >
                    {/* Top: pharmacy + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0 font-bold text-emerald-700 text-base overflow-hidden">
                          {ph?.imageUrl
                            ? <img src={ph.imageUrl} alt={ph.name} className="w-full h-full object-cover" />
                            : (ph?.name?.charAt(0) ?? 'P')
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{ph?.name ?? 'Pharmacie'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(new Date(order.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                            {' · '}{order.items.length} article{order.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {meta.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" />
                      </div>
                    </div>

                    {/* Items preview + price */}
                    <div className="mt-3 flex items-end justify-between gap-3">
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

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.prescriptionUrl && (
                            <span className="inline-flex items-center gap-1 text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                              <FileText className="w-3 h-3" /> Ordonnance jointe
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {order.deliveryType === 'delivery'
                              ? <><Truck className="w-3 h-3" /> Livraison</>
                              : <><Hospital className="w-3 h-3" /> Retrait</>
                            }
                          </span>
                          {order.deliveryAddress && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full">
                              <MapPin className="w-3 h-3" /> {order.deliveryAddress.slice(0, 30)}{order.deliveryAddress.length > 30 ? '…' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-green-700 text-base">
                          {order.totalAmount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">FCFA</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {order.paymentMethod.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    {/* In-delivery live indicator */}
                    {order.status === 'in_delivery' && order.deliveryType === 'delivery' && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                        <Bike className="w-3.5 h-3.5" />
                        Livreur en route — cliquez pour suivre
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse ml-auto" />
                      </div>
                    )}
                  </button>

                  {/* Actions row — outside the clickable button */}
                  {(canReorder || order.prescriptionUrl) && (
                    <div className="px-4 pb-3 pt-0 flex flex-wrap gap-2 border-t border-gray-100">
                      {canReorder && (
                        <button
                          onClick={(e) => handleReorder(e, order)}
                          disabled={reorderingId === order._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition mt-2"
                        >
                          {reorderingId === order._id
                            ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <RotateCcw className="w-3 h-3" />
                          }
                          {reorderingId === order._id ? 'En cours…' : 'Renouveler'}
                        </button>
                      )}
                      {order.prescriptionUrl && (
                        <>
                          <a
                            href={order.prescriptionUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-600 rounded-xl text-xs font-medium hover:bg-purple-50 transition mt-2"
                          >
                            <FileText className="w-3 h-3" /> Voir l'ordonnance
                          </a>
                          <button
                            onClick={(e) => handleAnalyze(e, order.prescriptionUrl!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-medium hover:bg-emerald-50 transition mt-2"
                          >
                            <ScanLine className="w-3 h-3" /> Analyser & équivalences
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Précédent
            </button>
            <span className="text-sm text-gray-500">{page} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white disabled:opacity-40 hover:bg-gray-50 transition"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
