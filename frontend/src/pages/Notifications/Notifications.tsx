import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package, Truck, CreditCard, AlertTriangle, Info, Bell } from 'lucide-react';
import { notificationService } from '../../services/order.service';
import LoadingSpinner from '../../components/LoadingSpinner';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  order: <Package className="w-5 h-5" />,
  delivery: <Truck className="w-5 h-5" />,
  payment: <CreditCard className="w-5 h-5" />,
  stock: <AlertTriangle className="w-5 h-5" />,
  system: <Info className="w-5 h-5" />,
};
const TYPE_COLORS: Record<string, string> = {
  order: 'bg-green-100 text-green-700',
  delivery: 'bg-blue-100 text-blue-700',
  payment: 'bg-purple-100 text-purple-700',
  stock: 'bg-orange-100 text-orange-700',
  system: 'bg-gray-100 text-gray-700',
};

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unread, setUnread] = useState(0);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await notificationService.getAll(p);
      setNotifs(data.notifications || []);
      setPages(data.pages || 1);
      setUnread(data.unread || 0);
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { load(page); }, [page]);

  const markRead = async (id: string) => {
    await notificationService.markAsRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unread > 0 && (
              <p className="text-sm text-gray-500 mt-1">{unread} non lue{unread > 1 ? 's' : ''}</p>
            )}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="text-sm px-4 py-2 text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition-colors">
              Tout marquer comme lu
            </button>
          )}
        </div>

        {loading ? <LoadingSpinner text="Chargement..." /> : notifs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Bell className="w-8 h-8 text-gray-400" /></div>
            <p className="text-gray-500 mt-4">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(notif => (
              <div key={notif._id}
                onClick={() => !notif.isRead && markRead(notif._id)}
                className={`bg-white rounded-xl border p-4 flex gap-4 cursor-pointer hover:shadow-sm transition-all ${
                  !notif.isRead ? 'border-green-200 bg-green-50/30' : ''
                }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${
                  TYPE_COLORS[notif.type] || 'bg-gray-100'
                }`}>
                  {TYPE_ICONS[notif.type] || <Info className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold text-gray-900 ${!notif.isRead ? 'font-bold' : ''}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(notif.createdAt), 'dd MMM · HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                  {notif.data?.orderId && (
                    <Link to={`/orders/${notif.data.orderId}`}
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-green-600 hover:underline mt-1 inline-block">
                      Voir la commande →
                    </Link>
                  )}
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 border rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">Précédent</button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-4 py-2 border rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
}
