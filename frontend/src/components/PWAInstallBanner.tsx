import { useState } from 'react';
import { Pill, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-banner-dismissed') === '1'
  );

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:w-[400px] animate-slide-up">
      <div className="bg-white border border-green-200 rounded-2xl shadow-2xl overflow-hidden">
        {/* Barre verte en haut */}
        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Pill className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">Installer PharmaConnect</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Accès rapide depuis votre écran d'accueil, fonctionne même hors ligne
              </p>
              {/* Avantages */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Hors ligne', 'Rapide', 'Gratuit'].map(tag => (
                  <span key={tag} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 font-medium inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-300 hover:text-gray-500 p-1 flex-shrink-0 -mt-1"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Plus tard
            </button>
            <button
              onClick={install}
              className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Installer l'app
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
