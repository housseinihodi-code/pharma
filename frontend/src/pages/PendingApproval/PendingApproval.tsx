import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { X, Clock, CheckCircle2, Search, Hospital, Info } from 'lucide-react';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/authSlice';
import { clearCartState } from '../../store/cartSlice';
import { authService } from '../../services/auth.service';

export default function PendingApproval() {
  const { user } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    dispatch(logout());
    dispatch(clearCartState());
    navigate('/login');
  };

  const isRejected = user?.rejectionReason;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-green-600 rounded-2xl items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">P</span>
          </div>
          <p className="text-gray-500 text-sm">PharmaConnect</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {isRejected ? (
            /* ── Compte rejeté ── */
            <>
              <div className="bg-red-500 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <X className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">Demande rejetée</h1>
                <p className="text-red-100 text-sm mt-1">Votre inscription n'a pas été approuvée</p>
              </div>
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-red-700 mb-1">Motif du rejet :</p>
                  <p className="text-red-600 text-sm">{user?.rejectionReason}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-5">
                  <p className="font-medium mb-2">Que faire maintenant ?</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-500">
                    <li>Vérifiez que vos informations sont correctes</li>
                    <li>Contactez le support si vous pensez qu'il s'agit d'une erreur</li>
                    <li>Créez un nouveau compte avec les informations corrigées</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Link to="/register"
                    className="flex-1 py-3 text-center bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition text-sm">
                    Nouvelle inscription
                  </Link>
                  <button onClick={handleLogout}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
                    Se déconnecter
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ── En attente ── */
            <>
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">Compte en attente de validation</h1>
                <p className="text-amber-100 text-sm mt-1">Votre demande est en cours d'examen</p>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">
                      Bonjour {user?.firstName}, votre dossier est bien reçu !
                    </p>
                    <p className="text-amber-700">
                      Un administrateur va examiner votre demande et valider votre accès à la plateforme.
                      Délai habituel : <strong>24 à 48h ouvrées</strong>.
                    </p>
                  </div>
                </div>

                {/* Étapes de validation */}
                <div className="space-y-3 mb-6">
                  {[
                    { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Compte créé', done: true },
                    { icon: <Search className="w-5 h-5" />, label: 'Vérification du dossier par l\'admin', done: false, current: true },
                    { icon: <Hospital className="w-5 h-5" />, label: 'Activation de votre espace pharmacien', done: false },
                  ].map((s, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                      s.done ? 'bg-green-50' : s.current ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                    }`}>
                      <span className="flex-shrink-0">{s.icon}</span>
                      <span className={`text-sm font-medium ${
                        s.done ? 'text-green-700' : s.current ? 'text-amber-700' : 'text-gray-400'
                      }`}>{s.label}</span>
                      {s.current && (
                        <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                          En cours
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-5">
                  <p className="font-medium mb-1">Informations du compte :</p>
                  <p className="text-gray-500">{user?.firstName} {user?.lastName}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>

                <div className="flex gap-3">
                  <Link to="/"
                    className="flex-1 py-3 text-center border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition text-sm">
                    Retour à l'accueil
                  </Link>
                  <button onClick={handleLogout}
                    className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 transition text-sm">
                    Se déconnecter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Un problème ? Contactez le support à{' '}
          <a href="mailto:support@pharmaconnect.com" className="underline hover:text-gray-600">
            support@pharmaconnect.com
          </a>
        </p>
      </div>
    </div>
  );
}
