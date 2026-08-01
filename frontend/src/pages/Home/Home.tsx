import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, Sparkles } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { AppDispatch, RootState } from '../../store';
import { fetchNearbyPharmacies, fetchPharmacies } from '../../store/pharmacySlice';
import PharmacyCard from '../../components/PharmacyCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { pharmacyService } from '../../services/pharmacy.service';

const PharmacyMap = lazy(() => import('../../components/PharmacyMap'));

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const { nearbyPharmacies, pharmacies, loading } = useSelector((s: RootState) => s.pharmacy);
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const isPharmacist = user?.role === 'pharmacist' || user?.role === 'admin';
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [myPharmacyId, setMyPharmacyId] = useState<string | null>(null);
  const [onDutyPharmacies, setOnDutyPharmacies] = useState<any[]>([]);
  const [open24_7Pharmacies, setOpen24_7Pharmacies] = useState<any[]>([]);

  useEffect(() => {
    if (isPharmacist) {
      pharmacyService.getMyPharmacies().then(list => {
        if (list.length > 0) setMyPharmacyId(list[0]._id);
      }).catch(() => {});
    }
  }, [isPharmacist]);

  useEffect(() => {
    pharmacyService.getOnDuty().then(setOnDutyPharmacies).catch(() => {});
    pharmacyService.getOpen24_7().then(setOpen24_7Pharmacies).catch(() => {});
  }, []);

  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        dispatch(fetchNearbyPharmacies({ longitude: loc.lng, latitude: loc.lat, radius: 5000 }));
        setLocationLoading(false);
      },
      () => {
        toast.error('Impossible d\'obtenir votre position');
        setLocationLoading(false);
        dispatch(fetchPharmacies({ page: 1, limit: 8 }));
      },
    );
  }, [dispatch]);

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const displayedPharmacies = userLocation ? nearbyPharmacies : pharmacies;
  const [view, setView] = useState<'list' | 'map'>('list');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero — fond photo pharmacie avec overlay */}
      <div
        className="relative text-white overflow-hidden"
        style={{
          backgroundImage: `url('/images/cover.jpg'), linear-gradient(135deg, #14532d 0%, #065f46 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 38%',
        }}
      >
        {/* Overlay sombre pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-950/80 via-green-900/55 to-emerald-900/30" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          {isAuthenticated && isPharmacist ? (
            /* ── Hero Pharmacien ── */
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-1.5 rounded-full mb-6 border border-white/20">
                <img src="/images/pha.jpg" alt="" className="w-5 h-5 object-contain" />
                Espace pharmacien
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight drop-shadow-lg">
                Gérez votre pharmacie <br />
                <span className="text-green-300">depuis un seul endroit</span>
              </h1>
              <p className="mt-4 text-xl text-green-100 drop-shadow">
                Médicaments, commandes, messagerie client — tout est centralisé.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Tableau de bord
                </Link>
                <Link to="/dashboard/orders"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600/80 backdrop-blur-sm text-white font-semibold rounded-xl border border-green-400/50 hover:bg-green-600 transition-colors shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Gérer les commandes
                </Link>
              </div>
            </div>
          ) : (
            /* ── Hero Client / Visiteur ── */
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-green-200 text-sm px-4 py-1.5 rounded-full mb-6 border border-white/20">
                <img src="/images/pha.jpg" alt="" className="w-4 h-4" />
                Votre pharmacie en ligne à Yaoundé
              </span>
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight drop-shadow-lg">
                Trouvez votre pharmacie <br />
                <span className="text-green-300">proche de chez vous</span>
              </h1>
              <p className="mt-4 text-xl text-green-100 drop-shadow">
                Localisez les pharmacies, vérifiez les stocks de médicaments et commandez en ligne.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4">
                <Link to="/pharmacies"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors shadow-lg">
                  <img src="/images/pha.jpg" alt="" className="w-5 h-5 object-contain" />
                  Explorer les pharmacies
                </Link>
                <Link to="/medications"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600/80 backdrop-blur-sm text-white font-semibold rounded-xl border border-green-400/50 hover:bg-green-600 transition-colors shadow-lg">
                  <img src="/images/medocs.jpeg" alt="" className="w-5 h-5 object-contain" />
                  Chercher un médicament
                </Link>
              </div>
              <div className="mt-4">
                <Link to="/scanner-ordonnance"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:from-teal-400 hover:to-cyan-400 transition-all shadow-xl shadow-teal-900/40 border border-teal-300/30 group">
                  <ScanLine className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Scanner votre ordonnance
                  <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-xs font-semibold px-2.5 py-1 rounded-full border border-white/30">
                    <Sparkles className="w-3 h-3" />
                    IA
                  </span>
                </Link>
                <p className="mt-2 text-green-200 text-sm">
                  L'IA analyse votre ordonnance et trouve les médicaments disponibles près de chez vous.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: '50+', label: 'Pharmacies', icon: '/images/pha.jpg', alt: 'Pharmacies' },
              { value: '5000+', label: 'Médicaments', icon: '/images/medocs.jpeg', alt: 'Médicaments' },
              { value: '24/7', label: 'Disponible', icon: '/images/horloge.jpg', alt: 'Disponible' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center overflow-hidden p-1">
                  <img src={stat.icon} alt={stat.alt} className="w-full h-full object-contain" />
                </div>
                <div className="text-2xl font-bold text-green-700">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bandeau rapide pharmacien */}
      {isAuthenticated && isPharmacist && (
        <div className="bg-emerald-50 border-b border-emerald-100">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-emerald-700">Accès rapide :</span>
            <Link to="/dashboard/medications"
              className="text-sm px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
              + Ajouter médicament
            </Link>
            <Link to="/dashboard/orders"
              className="text-sm px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
              Voir les commandes
            </Link>
            {myPharmacyId && (
              <Link to={`/pharmacies/${myPharmacyId}`}
                className="text-sm px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors">
                Ma page pharmacie
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Pharmacies de garde & 24h/24 */}
      {(onDutyPharmacies.length > 0 || open24_7Pharmacies.length > 0) && (
        <div className="bg-blue-950 text-white py-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              <h2 className="text-xl font-bold">Pharmacies disponibles maintenant</h2>
            </div>

            {onDutyPharmacies.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                    De garde
                  </span>
                  <span className="text-blue-200 text-sm">{onDutyPharmacies.length} pharmacie{onDutyPharmacies.length > 1 ? 's' : ''} en service</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onDutyPharmacies.map((p: any) => (
                    <Link key={p._id} to={`/pharmacies/${p._id}`}
                      className="bg-blue-900/60 border border-blue-700/50 rounded-xl p-4 hover:bg-blue-800/60 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{p.name}</h3>
                          <p className="text-blue-200 text-sm mt-0.5 flex items-start gap-1">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{p.address}</span>
                          </p>
                          {p.phone && (
                            <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-blue-300 hover:text-white text-xs mt-2 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {p.phone}
                            </a>
                          )}
                          {p.dutyEnd && (
                            <p className="text-blue-300 text-xs mt-1">
                              Garde jusqu'au {new Date(p.dutyEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 px-2 py-1 bg-blue-500/40 border border-blue-400/40 text-blue-200 text-xs rounded-lg">
                          De garde
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {open24_7Pharmacies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded-full">
                    24h/24 — 7j/7
                  </span>
                  <span className="text-blue-200 text-sm">{open24_7Pharmacies.length} pharmacie{open24_7Pharmacies.length > 1 ? 's' : ''} ouvertes en permanence</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {open24_7Pharmacies.map((p: any) => (
                    <Link key={p._id} to={`/pharmacies/${p._id}`}
                      className="bg-purple-900/50 border border-purple-700/50 rounded-xl p-4 hover:bg-purple-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{p.name}</h3>
                          <p className="text-purple-200 text-sm mt-0.5 flex items-start gap-1">
                            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{p.address}</span>
                          </p>
                          {p.phone && (
                            <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-purple-300 hover:text-white text-xs mt-2 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {p.phone}
                            </a>
                          )}
                        </div>
                        <span className="flex-shrink-0 px-2 py-1 bg-purple-500/40 border border-purple-400/40 text-purple-200 text-xs rounded-lg">
                          24h/24
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="relative max-w-xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une pharmacie ou un médicament..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
          />
          <svg className="absolute left-4 top-4 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border p-4 z-10">
              <Link to={`/pharmacies?q=${searchQuery}`} className="block text-sm text-green-600 hover:underline mb-2">
                Rechercher "{searchQuery}" dans les pharmacies
              </Link>
              <Link to={`/medications?q=${searchQuery}`} className="block text-sm text-green-600 hover:underline">
                Rechercher "{searchQuery}" dans les médicaments
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Nearby Pharmacies */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {userLocation ? 'Pharmacies à proximité' : 'Toutes les pharmacies'}
            </h2>
            {userLocation && (
              <p className="text-sm text-gray-500 mt-1">Dans un rayon de 5 km</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationLoading ? 'Localisation...' : 'Ma position'}
            </button>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setView('map')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'map' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Carte
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Liste
              </button>
            </div>
            <Link to="/pharmacies" className="text-sm text-green-600 hover:underline font-medium">
              Voir tout →
            </Link>
          </div>
        </div>

        {loading || locationLoading ? (
          <LoadingSpinner text="Recherche des pharmacies..." />
        ) : view === 'map' ? (
          <div className="space-y-4">
            <Suspense fallback={<LoadingSpinner text="Chargement de la carte..." />}>
              <PharmacyMap
                pharmacies={displayedPharmacies}
                userLocation={userLocation}
                height="480px"
              />
            </Suspense>
            {displayedPharmacies.length === 0 && (
              <p className="text-center text-sm text-gray-400">
                Aucune pharmacie trouvée dans cette zone. Activez la géolocalisation ou élargissez la zone.
              </p>
            )}
          </div>
        ) : displayedPharmacies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <img src="/images/pha.jpg" alt="Pharmacie" className="w-16 h-16 mx-auto mb-4 object-contain opacity-40" />
            <h3 className="text-lg font-medium text-gray-900">Aucune pharmacie trouvée</h3>
            <p className="text-gray-500 mt-2">Essayez d'élargir votre zone de recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedPharmacies.slice(0, 8).map((p) => (
              <PharmacyCard key={p._id} pharmacy={p} />
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="bg-white border-t py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Comment ça fonctionne ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1', title: 'Localisez', desc: 'Trouvez les pharmacies ouvertes près de vous sur la carte',
                icon: (
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                step: '2', title: 'Commandez', desc: 'Parcourez le catalogue et ajoutez vos médicaments au panier',
                icon: <img src="/images/medocs.jpeg" alt="Médicaments" className="w-8 h-8 object-contain" />,
              },
              {
                step: '3', title: 'Recevez', desc: 'Faites-vous livrer ou venez récupérer votre commande',
                icon: (
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                ),
              },
            ].map((f) => (
              <div key={f.step} className="text-center">
                <div className="inline-flex w-16 h-16 bg-green-100 rounded-2xl items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg">{f.title}</h3>
                <p className="text-gray-500 mt-2 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
