import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Hospital, ClipboardList, Clock, CheckCircle2, Truck, Pill, Check, X, Phone, Bike, MapPin } from 'lucide-react';
import { RootState } from '../../store';
import { pharmacyService } from '../../services/pharmacy.service';
import { orderService } from '../../services/order.service';
import { deliveryService } from '../../services/delivery.service';
import { Pharmacy, Order, OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_TABS: { value: string; label: string; color: string }[] = [
  { value: '', label: 'Toutes', color: 'gray' },
  { value: 'pending_prescription', label: 'Ordonnances', color: 'orange' },
  { value: 'pending', label: 'En attente', color: 'yellow' },
  { value: 'confirmed', label: 'Confirmées', color: 'blue' },
  { value: 'preparing', label: 'En préparation', color: 'orange' },
  { value: 'ready', label: 'Prêtes', color: 'purple' },
  { value: 'in_delivery', label: 'En livraison', color: 'indigo' },
  { value: 'delivered', label: 'Livrées', color: 'green' },
  { value: 'cancelled', label: 'Annulées', color: 'red' },
];

const NEXT_STATUS: Record<string, { status: string; label: string; color: string }> = {
  pending: { status: 'confirmed', label: 'Confirmer', color: 'bg-green-600 hover:bg-green-700' },
  confirmed: { status: 'preparing', label: 'Préparer', color: 'bg-orange-500 hover:bg-orange-600' },
  preparing: { status: 'ready', label: 'Marquer prêt', color: 'bg-purple-600 hover:bg-purple-700' },
  ready: { status: 'in_delivery', label: 'En livraison', color: 'bg-blue-600 hover:bg-blue-700' },
  in_delivery: { status: 'delivered', label: 'Livré', color: 'bg-green-600 hover:bg-green-700' },
};

interface RejectModal {
  orderId: string;
  clientName: string;
}

export default function PharmacistOrders() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<RejectModal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [prescriptionZoom, setPrescriptionZoom] = useState<string | null>(null);
  const knownOrderIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    pharmacyService.getMyPharmacies().then((list) => {
      setPharmacies(list);
      if (list.length > 0) setSelectedId(list[0]._id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const load = useCallback(async (silent = false) => {
    if (!selectedId) return;
    if (!silent) setLoading(true);
    try {
      const data = await orderService.getPharmacyOrders(selectedId, page, statusFilter || undefined);
      const fetched: Order[] = data.orders || [];

      // Détecte l'arrivée de nouvelles commandes lors d'un rafraîchissement
      // silencieux pour prévenir le pharmacien même sans rechargement manuel.
      if (silent && page === 1 && knownOrderIds.current) {
        const newOnes = fetched.filter(o => !knownOrderIds.current!.has(o._id));
        if (newOnes.length > 0) {
          toast.success(
            newOnes.length === 1
              ? 'Nouvelle commande reçue !'
              : `${newOnes.length} nouvelles commandes reçues !`,
          );
        }
      }
      if (page === 1) knownOrderIds.current = new Set(fetched.map(o => o._id));

      setOrders(fetched);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      if (!silent) toast.error('Impossible de charger les commandes');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedId, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Rafraîchissement automatique en arrière-plan pour que les nouvelles
  // commandes des clients apparaissent sans action du pharmacien.
  useEffect(() => {
    if (!selectedId) return;
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [selectedId, load]);

  const handleStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      if (status === 'in_delivery') {
        const order = orders.find(o => o._id === orderId);
        if (order?.deliveryType === 'delivery') {
          const pharmacy = pharmacies.find(p => p._id === selectedId);
          const pickupCoordinates: [number, number] = pharmacy?.location?.coordinates?.[0]
            ? pharmacy.location.coordinates
            : [0, 0];
          try {
            await deliveryService.createFromOrder(orderId, pharmacy?.address || '', pickupCoordinates);
          } catch {
            // La livraison existe peut-être déjà, on continue
          }
        }
      }
      await orderService.updateStatus(orderId, status);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: status as OrderStatus } : o));
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Annuler cette commande ?')) return;
    await handleStatus(orderId, 'cancelled');
  };

  const handleValidatePrescription = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await orderService.validatePrescription(orderId, 'approved');
      setOrders(prev => prev.map(o =>
        o._id === orderId ? { ...o, status: 'pending' as OrderStatus, prescriptionStatus: 'approved' } : o,
      ));
      toast.success('Ordonnance validée — commande transmise au traitement');
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error('Veuillez indiquer le motif du refus'); return; }
    setUpdatingId(rejectModal.orderId);
    try {
      await orderService.validatePrescription(rejectModal.orderId, 'rejected', rejectReason.trim());
      setOrders(prev => prev.map(o =>
        o._id === rejectModal.orderId
          ? { ...o, status: 'prescription_rejected' as OrderStatus, prescriptionStatus: 'rejected', prescriptionRejectionReason: rejectReason }
          : o,
      ));
      toast.success('Ordonnance rejetée — client notifié');
      setRejectModal(null);
      setRejectReason('');
    } catch {
      toast.error('Erreur lors du rejet');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const client = typeof o.userId === 'object'
      ? `${(o.userId as any).firstName} ${(o.userId as any).lastName}`.toLowerCase()
      : '';
    return client.includes(search.toLowerCase()) || o._id.includes(search);
  });

  // counts basés sur la page courante (utilisés uniquement pour les badges de tab)
  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Pour l'alerte ordonnances, on charge sans filtre de statut pour être précis
  const pendingPrescriptionCount = statusFilter === 'pending_prescription'
    ? total
    : counts['pending_prescription'] || 0;

  if (pharmacies.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border p-12 max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Hospital className="w-8 h-8 text-green-600" /></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune pharmacie</h2>
          <p className="text-gray-500 text-sm">Vous n'avez pas encore de pharmacie enregistrée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des commandes</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-gray-500">{total} commande{total !== 1 ? 's' : ''} au total</p>
              {pharmacies.length === 1 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <Hospital className="w-3 h-3" /> {pharmacies[0].name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pharmacies.length > 1 && (
              <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                {pharmacies.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}
            <button onClick={() => load()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>
        </div>

        {/* Alerte ordonnances en attente */}
        {pendingPrescriptionCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-orange-800">
                  {pendingPrescriptionCount} ordonnance{pendingPrescriptionCount > 1 ? 's' : ''} à valider
                </p>
                <p className="text-sm text-orange-600">
                  Des commandes sont en attente de votre validation d'ordonnance
                </p>
              </div>
            </div>
            <button
              onClick={() => { setStatusFilter('pending_prescription'); setPage(1); }}
              className="flex-shrink-0 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition-colors"
            >
              Voir les ordonnances →
            </button>
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Ordonnances', count: counts['pending_prescription'] || 0, icon: <ClipboardList className="w-5 h-5" />, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
            { label: 'En attente', count: counts['pending'] || 0, icon: <Clock className="w-5 h-5" />, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
            { label: 'En préparation', count: (counts['confirmed'] || 0) + (counts['preparing'] || 0), icon: <Pill className="w-5 h-5" />, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
            { label: 'Prêtes', count: counts['ready'] || 0, icon: <CheckCircle2 className="w-5 h-5" />, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
            { label: 'Livrées', count: counts['delivered'] || 0, icon: <Truck className="w-5 h-5" />, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
                <span className={s.text}>{s.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs statut */}
        <div className="bg-white rounded-xl border mb-4">
          <div className="flex overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === tab.value ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
                {tab.value && counts[tab.value] > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    tab.value === 'pending_prescription' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {counts[tab.value]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Recherche */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Chercher par nom de client..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white" />
        </div>

        {/* Liste des commandes */}
        {loading ? (
          <LoadingSpinner text="Chargement des commandes..." />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {statusFilter === 'pending_prescription' ? <ClipboardList className="w-8 h-8 text-gray-400" /> : <Pill className="w-8 h-8 text-gray-400" />}
          </div>
            <p className="text-gray-500 mt-4">
              {statusFilter === 'pending_prescription'
                ? 'Aucune ordonnance en attente de validation'
                : `Aucune commande${statusFilter ? ' pour ce statut' : ''}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const client = typeof order.userId === 'object' ? order.userId as any : null;
              const clientName = client ? `${client.firstName} ${client.lastName}` : 'Client';
              const clientPhone = client?.phone;
              const next = NEXT_STATUS[order.status];
              const isExpanded = expandedId === order._id;
              const isPendingPrescription = order.status === 'pending_prescription';
              const isPrescriptionRejected = order.status === 'prescription_rejected';
              const hasPrescription = !!order.prescriptionUrl;

              return (
                <div key={order._id} className={`bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow ${
                  isPendingPrescription ? 'border-orange-200 ring-1 ring-orange-100' : ''
                }`}>
                  {/* Bandeau ordonnance */}
                  {isPendingPrescription && (
                    <div className="bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-700">Ordonnance requise — en attente de votre validation</span>
                    </div>
                  )}
                  {isPrescriptionRejected && (
                    <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
                      <X className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-700">
                        Ordonnance rejetée{order.prescriptionRejectionReason ? ` — ${order.prescriptionRejectionReason}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Row principal */}
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-semibold text-sm">{clientName[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{clientName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400">
                              {format(new Date(order.createdAt), 'dd MMM yyyy • HH:mm', { locale: fr })}
                            </span>
                            {clientPhone && (
                              <a href={`tel:${clientPhone}`}
                                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                                onClick={e => e.stopPropagation()}>
                                <Phone className="w-3 h-3" /> {clientPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-green-700">{order.totalAmount.toLocaleString()} FCFA</p>
                          <p className="text-xs text-gray-400">
                            {order.deliveryType === 'delivery' ? <span className="inline-flex items-center gap-1"><Truck className="w-3 h-3" /> Livraison</span> : <span className="inline-flex items-center gap-1"><Hospital className="w-3 h-3" /> Retrait</span>}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Actions selon statut */}
                        {isPendingPrescription && (
                          <>
                            <button
                              onClick={() => handleValidatePrescription(order._id)}
                              disabled={updatingId === order._id}
                              className="px-3 py-1.5 text-white text-xs rounded-lg font-medium bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {updatingId === order._id ? '...' : <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Valider</span>}
                            </button>
                            <button
                              onClick={() => setRejectModal({ orderId: order._id, clientName })}
                              disabled={updatingId === order._id}
                              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <span className="flex items-center gap-1"><X className="w-3 h-3" /> Rejeter</span>
                            </button>
                          </>
                        )}
                        {!isPendingPrescription && next && order.status !== 'cancelled' && order.status !== 'prescription_rejected' && (
                          <button
                            onClick={() => handleStatus(order._id, next.status)}
                            disabled={updatingId === order._id}
                            className={`px-3 py-1.5 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50 ${next.color}`}
                          >
                            {updatingId === order._id ? '...' : next.label}
                          </button>
                        )}
                        {['pending', 'confirmed'].includes(order.status) && (
                          <button onClick={() => handleCancel(order._id)} disabled={updatingId === order._id}
                            className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                            Annuler
                          </button>
                        )}
                        <button onClick={() => setExpandedId(isExpanded ? null : order._id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Articles résumé */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {order.items.slice(0, 4).map((item, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {item.name} <span className="font-semibold">×{item.quantity}</span>
                        </span>
                      ))}
                      {order.items.length > 4 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">+{order.items.length - 4} autres</span>
                      )}
                      {hasPrescription && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Avec ordonnance</span>
                      )}
                    </div>
                  </div>

                  {/* Détails expandés */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Articles commandés</h4>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border">
                                <div className="flex items-center gap-2">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                      <Pill className="w-4 h-4 text-green-600" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-400">Qté: {item.quantity}</p>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-green-700">
                                  {(item.price * item.quantity).toLocaleString()} FCFA
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Prescription viewer */}
                          {hasPrescription && (
                            <div className="mt-4">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Ordonnance jointe
                                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                                  order.prescriptionStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                  order.prescriptionStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {order.prescriptionStatus === 'approved' ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Validée</span> :
                                   order.prescriptionStatus === 'rejected' ? <span className="flex items-center gap-1"><X className="w-3 h-3" /> Rejetée</span> : <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>}
                                </span>
                              </h4>
                              <PrescriptionViewer
                                url={order.prescriptionUrl!}
                                onZoom={() => setPrescriptionZoom(order.prescriptionUrl!)}
                              />
                              {isPendingPrescription && (
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleValidatePrescription(order._id)}
                                    disabled={updatingId === order._id}
                                    className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <Check className="w-4 h-4" /> Valider l'ordonnance
                                  </button>
                                  <button
                                    onClick={() => setRejectModal({ orderId: order._id, clientName })}
                                    disabled={updatingId === order._id}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <X className="w-4 h-4" /> Rejeter
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations</h4>
                            <div className="bg-white rounded-lg border p-3 space-y-2">
                              <InfoRow label="Client" value={clientName} />
                              {clientPhone && <InfoRow label="Téléphone" value={clientPhone} />}
                              <InfoRow label="Type" value={order.deliveryType === 'delivery' ? 'Livraison' : 'Retrait'} />
                              {order.deliveryAddress && <InfoRow label="Adresse" value={order.deliveryAddress} />}
                              <InfoRow label="Paiement" value={order.paymentMethod?.replace('_', ' ')} />
                              <InfoRow label="Statut paiement" value={order.paymentStatus} />
                            </div>
                          </div>

                          {order.notes && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Note du client</h4>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{order.notes}</p>
                              </div>
                            </div>
                          )}

                          {order.prescriptionRejectionReason && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Motif du rejet</h4>
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">{order.prescriptionRejectionReason}</p>
                              </div>
                            </div>
                          )}

                          <div className="bg-white rounded-lg border p-3">
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>Sous-total</span>
                              <span>{(order.totalAmount - order.deliveryFee).toLocaleString()} FCFA</span>
                            </div>
                            {order.deliveryFee > 0 && (
                              <div className="flex justify-between text-sm text-gray-500 mt-1">
                                <span>Livraison</span>
                                <span>{order.deliveryFee.toLocaleString()} FCFA</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-green-700 mt-2 pt-2 border-t">
                              <span>Total</span>
                              <span>{order.totalAmount.toLocaleString()} FCFA</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isPendingPrescription && !isPrescriptionRejected && (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Progression</h4>
                          <StatusTimeline currentStatus={order.status as OrderStatus} />
                        </div>
                      )}

                      {/* Delivery handoff indicators */}
                      {order.status === 'ready' && order.deliveryType === 'delivery' && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Bike className="w-4 h-4 text-blue-700" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-800">Commande prête pour la livraison</p>
                            <p className="text-xs text-blue-600 mt-0.5">
                              Confirmez le passage en livraison pour notifier un livreur disponible.
                            </p>
                          </div>
                          <button
                            onClick={() => handleStatus(order._id, 'in_delivery')}
                            disabled={updatingId === order._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
                          >
                            <Bike className="w-3.5 h-3.5" /> Confier au livreur
                          </button>
                        </div>
                      )}

                      {order.status === 'in_delivery' && order.deliveryType === 'delivery' && (
                        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-emerald-700" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-emerald-800">Commande en cours de livraison</p>
                            <p className="text-xs text-emerald-600 mt-0.5">
                              Un livreur achemine la commande vers {order.deliveryAddress || 'le client'}.
                            </p>
                          </div>
                          <Link
                            to={`/delivery/${order._id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Suivre sur la carte
                          </Link>
                        </div>
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
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-4 py-2 border rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">← Précédent</button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page} / {pages}</span>
            <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}
              className="px-4 py-2 border rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">Suivant →</button>
          </div>
        )}
      </div>

      {/* Modal rejet */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0"><X className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="font-bold text-gray-900">Rejeter l'ordonnance</h2>
                <p className="text-sm text-gray-500">Commande de {rejectModal.clientName}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Le client sera notifié immédiatement avec le motif du rejet. Cette action est irréversible.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif du rejet <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ex: Ordonnance illisible, date expirée, médicament non conforme à la prescription..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                autoFocus
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {['Ordonnance illisible', 'Date expirée', 'Signature manquante', 'Médicament non conforme'].map(r => (
                  <button key={r} onClick={() => setRejectReason(r)}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleRejectConfirm} disabled={!rejectReason.trim() || !!updatingId}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {updatingId ? 'En cours...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom prescription */}
      {prescriptionZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPrescriptionZoom(null)}>
          <div className="relative max-w-3xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPrescriptionZoom(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm font-medium">
              Fermer
            </button>
            {prescriptionZoom.toLowerCase().includes('.pdf') ? (
              <iframe src={prescriptionZoom} className="w-full h-[80vh] rounded-xl" title="Ordonnance PDF" />
            ) : (
              <img src={prescriptionZoom} alt="Ordonnance" className="w-full max-h-[80vh] object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PrescriptionViewer({ url, onZoom }: { url: string; onZoom: () => void }) {
  const isPdf = url.toLowerCase().includes('.pdf');
  return (
    <div className="border-2 border-orange-200 rounded-xl overflow-hidden bg-orange-50">
      <div className="px-3 py-2 bg-orange-100 border-b border-orange-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-orange-700 font-medium">
          <span>{isPdf ? 'PDF' : 'Image'}</span>
          <span>— Ordonnance du patient</span>
        </div>
        <button onClick={onZoom}
          className="text-xs text-orange-600 hover:text-orange-800 underline font-medium">
          Agrandir ↗
        </button>
      </div>
      {isPdf ? (
        <iframe src={url} className="w-full h-48" title="Ordonnance" />
      ) : (
        <img src={url} alt="Ordonnance" className="w-full h-48 object-contain cursor-zoom-in"
          onClick={onZoom} />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-700 text-right font-medium">{value}</span>
    </div>
  );
}

const STATUS_STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered'];
const STEP_LABELS: Record<string, string> = {
  pending: 'Reçue', confirmed: 'Confirmée', preparing: 'Préparation',
  ready: 'Prête', in_delivery: 'Livraison', delivered: 'Livrée',
};

function StatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
        <X className="w-4 h-4" /><span>Commande annulée</span>
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STATUS_STEPS.map((step, idx) => (
        <div key={step} className="flex items-center gap-1 flex-shrink-0">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              idx < currentIdx ? 'bg-green-600 text-white' :
              idx === currentIdx ? 'bg-green-600 text-white ring-4 ring-green-100' :
              'bg-gray-200 text-gray-400'
            }`}>
              {idx < currentIdx ? <Check className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            <span className={`text-xs mt-1 ${idx <= currentIdx ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
              {STEP_LABELS[step]}
            </span>
          </div>
          {idx < STATUS_STEPS.length - 1 && (
            <div className={`h-0.5 w-8 mb-4 flex-shrink-0 ${idx < currentIdx ? 'bg-green-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
