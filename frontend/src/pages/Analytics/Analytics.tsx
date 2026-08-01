import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DollarSign, Package, ShoppingCart, Pill } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { pharmacyService } from '../../services/pharmacy.service';
import { RootState } from '../../store';
import { Pharmacy } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

const MONTHS_FR = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const PIE_COLORS = ['#16a34a', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export default function Analytics() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [topMeds, setTopMeds] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<6 | 12>(12);

  useEffect(() => {
    pharmacyService.getMyPharmacies().then(list => {
      setPharmacies(list);
      if (list.length > 0) setSelectedId(list[0]._id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      apiClient.get(`/analytics/revenue?pharmacyId=${selectedId}`).then(r => r.data),
      apiClient.get(`/analytics/top-medications?pharmacyId=${selectedId}`).then(r => r.data),
      apiClient.get(`/analytics/orders-by-status`).then(r => r.data),
      apiClient.get(`/analytics/pharmacy/${selectedId}`).then(r => r.data),
    ]).then(([rev, top, status, st]) => {
      // Revenue: trier chronologiquement et formater
      const sorted = [...rev]
        .sort((a: any, b: any) => a._id.year !== b._id.year ? a._id.year - b._id.year : a._id.month - b._id.month)
        .slice(-period)
        .map((r: any) => ({
          month: `${MONTHS_FR[r._id.month]} ${r._id.year}`,
          revenus: r.revenue,
          commandes: r.orders,
        }));
      setRevenueData(sorted);

      // Top médicaments
      setTopMeds((top || []).slice(0, 8).map((m: any) => ({
        name: m.name?.length > 15 ? m.name.substring(0, 15) + '…' : m.name,
        ventes: m.totalSold,
        revenus: m.revenue,
      })));

      // Statuts
      const statusLabels: Record<string, string> = {
        pending: 'En attente', confirmed: 'Confirmée', preparing: 'Préparation',
        ready: 'Prête', in_delivery: 'Livraison', delivered: 'Livrée', cancelled: 'Annulée',
      };
      setOrdersByStatus((status || []).map((s: any) => ({
        name: statusLabels[s._id] || s._id,
        value: s.count,
      })));

      setStats(st);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedId, period]);

  if (loading && !stats) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;

  const totalRevenue = revenueData.reduce((s, d) => s + d.revenus, 0);
  const totalOrders = revenueData.reduce((s, d) => s + d.commandes, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytiques</h1>
            <p className="text-sm text-gray-500 mt-1">Performance de votre pharmacie</p>
          </div>
          <div className="flex items-center gap-3">
            {pharmacies.length > 1 && (
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                {pharmacies.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}
            <div className="flex rounded-xl border overflow-hidden">
              {([6, 12] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    period === p ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {p} mois
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Revenus totaux', value: `${totalRevenue.toLocaleString()} FCFA`, icon: <DollarSign className="w-5 h-5" />, trend: '+12%', up: true },
            { label: 'Commandes', value: totalOrders, icon: <Package className="w-5 h-5" />, trend: '+8%', up: true },
            { label: 'Panier moyen', value: `${avgOrderValue.toLocaleString()} FCFA`, icon: <ShoppingCart className="w-5 h-5" />, trend: '+3%', up: true },
            { label: 'Total médicaments', value: stats?.totalMedications ?? '—', icon: <Pill className="w-5 h-5" />, trend: '', up: true },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  {kpi.trend && (
                    <span className={`text-xs font-medium mt-1 ${kpi.up ? 'text-green-600' : 'text-red-500'}`}>
                      {kpi.up ? '↑' : '↓'} {kpi.trend} ce mois
                    </span>
                  )}
                </div>
                <span className="text-gray-400">{kpi.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Graphiques ligne 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Courbe revenus */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Évolution des revenus</h2>
            <p className="text-xs text-gray-400 mb-4">Sur les {period} derniers mois</p>
            {revenueData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Pas encore de données</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toLocaleString()} FCFA`, 'Revenus']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenus" stroke="#16a34a" strokeWidth={2} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Barres commandes */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Volume de commandes</h2>
            <p className="text-xs text-gray-400 mb-4">Nombre de commandes par mois</p>
            {revenueData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Pas encore de données</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Commandes']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="commandes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graphiques ligne 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top médicaments */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Top médicaments</h2>
            <p className="text-xs text-gray-400 mb-4">Les plus vendus en quantité</p>
            {topMeds.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Pas encore de ventes</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topMeds} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    formatter={(v) => [v, 'Unités vendues']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="ventes" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Répartition statuts */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Répartition des commandes</h2>
            <p className="text-xs text-gray-400 mb-4">Par statut</p>
            {ordersByStatus.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Pas encore de commandes</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={ordersByStatus} cx="50%" cy="50%" outerRadius={80}
                    dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {ordersByStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    formatter={(v, name) => [v, name]}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
