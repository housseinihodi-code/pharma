import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Hospital, ClipboardList, Pill, MessageCircle, TrendingUp, Bike, Package, DollarSign, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { RootState } from '../../store';
import apiClient from '../../services/apiClient';
import { pharmacyService } from '../../services/pharmacy.service';
import { medicationService } from '../../services/medication.service';
import { orderService } from '../../services/order.service';
import { Pharmacy, Medication, Order, OrderStatus, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import PharmacyBadge from '../../components/PharmacyBadge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [myPharmacies, setMyPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<Medication[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const pharmacies = await pharmacyService.getMyPharmacies();
        setMyPharmacies(pharmacies);
        if (pharmacies.length > 0) setSelectedPharmacyId(pharmacies[0]._id);
      } catch {
        //
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!selectedPharmacyId) return;
    const load = async () => {
      try {
        const [ordersData, lowStockData, statsData] = await Promise.all([
          orderService.getPharmacyOrders(selectedPharmacyId, 1, undefined),
          medicationService.getLowStock(selectedPharmacyId),
          apiClient.get(`/analytics/pharmacy/${selectedPharmacyId}`).then(r => r.data).catch(() => null),
        ]);
        setOrders(ordersData.orders || []);
        setLowStock(lowStockData || []);
        setStats(statsData);
      } catch {
        //
      }
    };
    load();
  }, [selectedPharmacyId]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await orderService.updateStatus(orderId, status);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: status as OrderStatus } : o));
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  // Pharmacien non encore validé par l'admin
  if (user?.role === 'pharmacist' && user?.isApproved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;

  if (myPharmacies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border p-12 max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Hospital className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune pharmacie enregistrée</h2>
          <p className="text-gray-500 text-sm">Contactez l'administrateur pour enregistrer votre pharmacie.</p>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
  const todayOrders = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.totalAmount, 0);

  const NEXT_ACTION: Record<string, { label: string; next: string; color: string }> = {
    pending: { label: 'Confirmer', next: 'confirmed', color: 'bg-green-600 hover:bg-green-700' },
    confirmed: { label: 'Préparer', next: 'preparing', color: 'bg-orange-500 hover:bg-orange-600' },
    preparing: { label: 'Marquer prêt', next: 'ready', color: 'bg-purple-600 hover:bg-purple-700' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {user?.firstName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-gray-500 text-sm">
                {myPharmacies.find(p => p._id === selectedPharmacyId)?.name || 'Votre pharmacie'}
              </p>
              <PharmacyBadge />
            </div>
          </div>
          {myPharmacies.length > 1 && (
            <select
              value={selectedPharmacyId}
              onChange={e => setSelectedPharmacyId(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
            >
              {myPharmacies.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Accès rapide */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { to: '/dashboard/orders', icon: <ClipboardList className="w-6 h-6" />, label: 'Commandes', desc: `${pendingOrders.length} en attente`, color: 'from-green-500 to-emerald-600' },
            { to: '/dashboard/medications', icon: <Pill className="w-6 h-6" />, label: 'Médicaments', desc: `${lowStock.length} en stock faible`, color: 'from-teal-500 to-cyan-600' },
            { to: '/messages', icon: <MessageCircle className="w-6 h-6" />, label: 'Messages', desc: 'Vos clients', color: 'from-purple-500 to-violet-600' },
            { to: '/dashboard/analytics', icon: <TrendingUp className="w-6 h-6" />, label: 'Analytiques', desc: 'Graphiques & stats', color: 'from-blue-500 to-indigo-600' },
            { to: '/dashboard/drivers', icon: <Bike className="w-6 h-6" />, label: 'Livreurs', desc: 'Gérer l\'équipe', color: 'from-violet-500 to-purple-600' },
            { to: `/pharmacies/${selectedPharmacyId}`, icon: <Hospital className="w-6 h-6" />, label: 'Ma pharmacie', desc: 'Vue client', color: 'from-orange-400 to-amber-500' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className={`bg-gradient-to-br ${item.color} rounded-xl p-4 text-white hover:shadow-lg hover:scale-[1.02] transition-all`}>
              <div className="mb-2">{item.icon}</div>
              <p className="font-semibold text-sm">{item.label}</p>
              <p className="text-xs opacity-80 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Commandes aujourd'hui",
              value: todayOrders.length,
              icon: <Package className="w-6 h-6 text-green-500" />,
              sub: `${todayOrders.filter(o => o.status !== 'cancelled').length} valide(s)`,
              color: 'text-green-600',
            },
            {
              label: "Revenus aujourd'hui",
              value: `${todayRevenue.toLocaleString()} FCFA`,
              icon: <DollarSign className="w-6 h-6 text-green-500" />,
              sub: 'Commandes non annulées',
              color: 'text-green-600',
            },
            {
              label: 'Total commandes',
              value: stats?.totalOrders ?? orders.length,
              icon: <BarChart3 className="w-6 h-6 text-gray-400" />,
              sub: stats?.totalRevenue ? `${stats.totalRevenue.toLocaleString()} FCFA total` : '',
              color: 'text-gray-900',
            },
            {
              label: 'Alertes stock',
              value: lowStock.length,
              icon: <AlertTriangle className={`w-6 h-6 ${lowStock.length > 0 ? 'text-orange-500' : 'text-gray-300'}`} />,
              sub: lowStock.filter(m => m.stock === 0).length + ' épuisé(s)',
              color: lowStock.length > 0 ? 'text-orange-600' : 'text-green-600',
            },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                  {kpi.sub && <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>}
                </div>
                {kpi.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Commandes en cours */}
          <div className="lg:col-span-2 bg-white rounded-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Commandes en cours</h2>
              <Link to="/dashboard/orders"
                className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors font-medium">
                Voir tout →
              </Link>
            </div>
            {pendingOrders.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mt-3">Aucune commande en attente</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingOrders.slice(0, 6).map(order => {
                  const client = typeof order.userId === 'object' ? order.userId as any : null;
                  const clientName = client ? `${client.firstName} ${client.lastName}` : 'Client';
                  const action = NEXT_ACTION[order.status];

                  return (
                    <div key={order._id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-semibold text-sm">{clientName[0]?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{clientName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {order.items.length} art. · {order.totalAmount.toLocaleString()} FCFA ·{' '}
                            {format(new Date(order.createdAt), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status as OrderStatus]}`}>
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </span>
                        {action && (
                          <button
                            onClick={() => handleStatusUpdate(order._id, action.next)}
                            disabled={updatingId === order._id}
                            className={`text-xs px-2.5 py-1 text-white rounded-lg disabled:opacity-50 transition-colors ${action.color}`}
                          >
                            {updatingId === order._id ? '...' : action.label}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div className="space-y-4">
            {/* Stock faible */}
            <div className="bg-white rounded-xl border">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h2 className="font-semibold text-gray-900">Stock faible</h2>
                {lowStock.length > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                    {lowStock.length} alerte{lowStock.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {lowStock.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm mt-2">Tous les stocks sont OK</p>
                </div>
              ) : (
                <div className="divide-y max-h-64 overflow-y-auto">
                  {lowStock.slice(0, 8).map(med => (
                    <div key={med._id} className="px-4 py-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{med.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{med.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className={`text-sm font-bold ${med.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                          {med.stock === 0 ? 'Épuisé' : `${med.stock} restant${med.stock > 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs text-gray-400">min: {med.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 pb-3">
                <Link to="/dashboard/medications"
                  className="block text-center text-xs text-green-600 hover:underline py-2">
                  Gérer les médicaments →
                </Link>
              </div>
            </div>

            {/* Pharmacie info */}
            {myPharmacies.find(p => p._id === selectedPharmacyId) && (() => {
              const ph = myPharmacies.find(p => p._id === selectedPharmacyId)!;
              return (
                <div className="bg-white rounded-xl border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {ph.imageUrl
                        ? <img src={ph.imageUrl} alt={ph.name} className="w-full h-full object-cover rounded-xl" />
                        : <span className="text-green-700 font-bold">{ph.name[0]}</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{ph.name}</p>
                      <span className={`text-xs font-medium ${ph.isOpen ? 'text-green-600' : 'text-red-500'}`}>
                        {ph.isOpen ? '● Ouverte' : '● Fermée'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{ph.address}</p>
                  <Link to={`/pharmacies/${ph._id}`}
                    className="block text-center text-xs px-3 py-2 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 transition-colors">
                    Voir la page client
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
