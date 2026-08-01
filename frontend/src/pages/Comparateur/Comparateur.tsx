import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bike, Pill, Search, MapPin, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { RootState } from '../../store';

/* ── Types ── */
interface MedResult {
  _id: string;
  name: string;
  genericName?: string;
  price: number;
  stock: number;
  dosageForm?: string;
  strength?: string;
  category: string;
  requiresPrescription: boolean;
  imageUrl?: string;
  pharmacyId: {
    _id: string;
    name: string;
    address: string;
    phone: string;
    isOpen: boolean;
    isActive: boolean;
    rating?: number;
    hasDelivery?: boolean;
    deliveryFee?: number;
    location?: { coordinates: [number, number] };
  };
}

type SortKey = 'price_asc' | 'price_desc' | 'stock' | 'distance';

/* ── Haversine ── */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POPULAR = ['Paracétamol', 'Amoxicilline', 'Ibuprofène', 'Metformine', 'Doliprane', 'Aspirine', 'Ventoline'];

export default function Comparateur() {
  const [params, setParams] = useSearchParams();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState<MedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('price_asc');
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get user location for distance sort
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { timeout: 4000 },
      );
    }
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await apiClient.get(`/medications/compare?q=${encodeURIComponent(q.trim())}`).then(r => r.data);
      setResults(data);
      setParams({ q: q.trim() }, { replace: true });
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [setParams]);

  // Debounce on input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.trim().length >= 2) search(query);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Run on mount if URL has q
  useEffect(() => {
    const q = params.get('q');
    if (q) search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sort + filter ── */
  const sorted = [...results]
    .filter(m => !filterOpen || m.pharmacyId.isOpen)
    .filter(m => !filterDelivery || m.pharmacyId.hasDelivery)
    .sort((a, b) => {
      if (sortKey === 'price_asc') return a.price - b.price;
      if (sortKey === 'price_desc') return b.price - a.price;
      if (sortKey === 'stock') return b.stock - a.stock;
      if (sortKey === 'distance' && userPos) {
        const da = a.pharmacyId.location
          ? distanceKm(userPos[0], userPos[1], a.pharmacyId.location.coordinates[1], a.pharmacyId.location.coordinates[0])
          : 9999;
        const db = b.pharmacyId.location
          ? distanceKm(userPos[0], userPos[1], b.pharmacyId.location.coordinates[1], b.pharmacyId.location.coordinates[0])
          : 9999;
        return da - db;
      }
      return 0;
    });

  const minPrice = sorted.length ? Math.min(...sorted.map(m => m.price)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Hero search bar ── */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 pt-10 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Comparateur de prix</h1>
          <p className="text-green-100 text-sm mb-8">
            Trouvez le médicament le moins cher parmi toutes les pharmacies
          </p>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search(query)}
              placeholder="Nom du médicament, générique..."
              autoFocus
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-lg shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300"
            />
            {loading && (
              <div className="absolute right-4 inset-y-0 flex items-center">
                <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Popular searches */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {POPULAR.map(p => (
              <button key={p} onClick={() => { setQuery(p); search(p); }}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-6 pb-10">

        {/* Results header + filters */}
        {hasSearched && (
          <div className="bg-white rounded-2xl border shadow-sm mb-4 px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              {loading ? (
                <p className="text-sm text-gray-400">Recherche en cours...</p>
              ) : (
                <p className="text-sm text-gray-600">
                  <strong>{sorted.length}</strong> résultat{sorted.length > 1 ? 's' : ''} pour
                  {' '}<strong className="text-green-700">"{query}"</strong>
                  {sorted.length > 0 && ` · Prix entre ${minPrice.toLocaleString()} et ${Math.max(...sorted.map(m => m.price)).toLocaleString()} FCFA`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Open filter */}
              <button onClick={() => setFilterOpen(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                  filterOpen ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                }`}>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Ouverte</span>
              </button>
              {/* Delivery filter */}
              <button onClick={() => setFilterDelivery(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                  filterDelivery ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}>
                <span className="inline-flex items-center gap-1"><Bike className="w-3 h-3" /> Livraison</span>
              </button>

              {/* Sort */}
              <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400">
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="stock">Stock disponible</option>
                {userPos && <option value="distance">Distance</option>}
              </select>
            </div>
          </div>
        )}

        {/* Results list */}
        {!hasSearched ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Pill className="w-8 h-8 text-green-400" /></div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Comparez les prix en un clic</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Entrez le nom d'un médicament pour voir les prix disponibles dans toutes les pharmacies de la plateforme.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border h-24 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-gray-400" /></div>
            <h2 className="text-lg font-semibold text-gray-700">Aucun résultat</h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
              Ce médicament n'est pas disponible actuellement ou le nom est différent.
            </p>
            <p className="text-sm text-green-600 mt-3">Essayez le nom générique ou une abréviation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((med, idx) => {
              const ph = med.pharmacyId;
              const dist = userPos && ph.location
                ? distanceKm(userPos[0], userPos[1], ph.location.coordinates[1], ph.location.coordinates[0])
                : null;
              const isCheapest = med.price === minPrice;

              return (
                <div key={med._id}
                  className={`bg-white rounded-2xl border transition hover:shadow-md ${
                    isCheapest && idx < 3 ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
                  }`}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Drug info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {med.imageUrl ? (
                        <img src={med.imageUrl} alt={med.name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-7 h-7 text-green-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm truncate">{med.name}</p>
                          {isCheapest && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                              Moins cher
                            </span>
                          )}
                          {med.requiresPrescription && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              Ordonnance
                            </span>
                          )}
                        </div>
                        {med.genericName && (
                          <p className="text-xs text-gray-400 mt-0.5">Générique : {med.genericName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {med.dosageForm && <span className="text-xs text-gray-400">{med.dosageForm}</span>}
                          {med.strength && <span className="text-xs text-gray-400">{med.strength}</span>}
                          <span className={`text-xs font-medium ${
                            med.stock > 10 ? 'text-green-600' :
                            med.stock > 0 ? 'text-orange-500' : 'text-red-500'
                          }`}>
                            {med.stock > 10
                              ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> En stock ({med.stock})</span>
                              : med.stock > 0
                                ? <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Faible stock ({med.stock})</span>
                                : <span className="inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Épuisé</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-2xl font-bold ${isCheapest ? 'text-green-600' : 'text-gray-900'}`}>
                        {med.price.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 -mt-0.5">FCFA</p>
                    </div>

                    {/* Pharmacy */}
                    <div className="sm:w-52 flex-shrink-0">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{ph.name}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{ph.address}</p>
                          </div>
                          <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${ph.isOpen ? 'bg-green-500' : 'bg-gray-300'}`} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ph.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                            {ph.isOpen ? 'Ouverte' : 'Fermée'}
                          </span>
                          {ph.hasDelivery && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                              <span className="inline-flex items-center gap-1"><Bike className="w-3 h-3" /> Livraison</span>
                            </span>
                          )}
                          {dist !== null && (
                            <span className="text-xs text-gray-400 inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0">
                      <Link to={`/pharmacies/${ph._id}`}
                        className="block px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition text-center whitespace-nowrap">
                        Commander →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upsell login */}
        {!isAuthenticated && hasSearched && sorted.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
            <p className="text-sm text-blue-800 font-medium">
              Connectez-vous pour commander directement et suivre vos livraisons.
            </p>
            <Link to="/login"
              className="mt-3 inline-block px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
