import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Vérifier les mises à jour toutes les heures
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-900">Mise à jour disponible</p>
            <p className="text-xs text-gray-500">Une nouvelle version de PharmaConnect est prête</p>
          </div>
          <div className="flex gap-2 ml-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Plus tard
            </button>
            <button
              onClick={() => { updateServiceWorker(true); toast.dismiss(t.id); }}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700"
            >
              Mettre à jour
            </button>
          </div>
        </div>
      ),
      {
        id: 'pwa-update',
        duration: Infinity,
        style: { maxWidth: '420px', padding: '12px 16px' },
      }
    );
  }, [needRefresh]);

  return null;
}
