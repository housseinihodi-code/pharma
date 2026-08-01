import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bike, Package, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react';
import { RootState } from '../../store';
import { deliveryService } from '../../services/delivery.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  assigned: 'Assigné',
  picked_up: 'Récupéré',
  in_transit: 'En route',
  delivered: 'Livré',
  failed: 'Échec',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-orange-100 text-orange-700',
  in_transit: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function LivreurDashboard() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const statusParam = filter === 'active' ? undefined : filter;
    deliveryService.getMyDeliveries(statusParam)
      .then(data => setDeliveries(Array.isArray(data) ? data : []))
      .catch(() => setDeliveries([]))
      .finally(() => setLoading(false));
  }, [filter]);

  const active = deliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status));
  const displayedDeliveries = filter === 'active' ? active : deliveries;
  const today = deliveries.filter(d => {
    const date = new Date(d.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">Bonjour {user?.firstName}</h1>
          <p className="text-gray-500 text-sm mt-1">Tableau de bord livreur</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          {[
            { label: 'Livraisons actives', value: active.length, icon: <Bike className="w-5 h-5" />, color: 'text-emerald-600' },
            { label: "Livraisons aujourd'hui", value: today.length, icon: <Package className="w-5 h-5" />, color: 'text-blue-600' },
            { label: 'Livrées (total)', value: deliveries.filter(d => d.status === 'delivered').length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600' },
            { label: 'Échecs', value: deliveries.filter(d => d.status === 'failed').length, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-red-500' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{kpi.label}</p>
              <div className="flex items-end justify-between mt-1">
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Active delivery banner */}
        {active.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-5 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Livraison en cours</p>
                <p className="text-emerald-100 text-sm mt-0.5">
                  {STATUS_LABELS[active[0].status]} · {(active[0].orderId as any)?.deliveryAddress || 'Adresse non précisée'}
                </p>
              </div>
              <Link
                to={`/livreur/delivery/${active[0]._id}`}
                className="bg-white text-emerald-700 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-50 transition-colors flex-shrink-0 ml-4"
              >
                Reprendre →
              </Link>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {[
            { value: 'active', label: 'En cours' },
            { value: 'assigned', label: 'Assignées' },
            { value: 'delivered', label: 'Livrées' },
            { value: 'failed', label: 'Échouées' },
          ].map(tab => (
            <button key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.value ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Delivery list */}
        {loading ? <LoadingSpinner /> : displayedDeliveries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package className="w-8 h-8 text-gray-400" /></div>
            <p className="text-gray-500 mt-4">Aucune livraison</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedDeliveries.map(d => {
              const order = d.orderId as any;
              const isActive = ['assigned', 'picked_up', 'in_transit'].includes(d.status);
              return (
                <div key={d._id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                        {order?.totalAmount && (
                          <span className="text-xs text-gray-400">{order.totalAmount.toLocaleString()} FCFA</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-2">
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {order?.deliveryAddress || 'Adresse non précisée'}</span>
                      </p>
                      {d.estimatedDeliveryTime && (
                        <p className="text-xs text-gray-400 mt-1">
                          Estimée : {format(new Date(d.estimatedDeliveryTime), 'HH:mm', { locale: fr })}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(d.createdAt), 'dd MMM · HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Link
                      to={`/livreur/delivery/${d._id}`}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isActive ? 'Gérer →' : 'Voir'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
