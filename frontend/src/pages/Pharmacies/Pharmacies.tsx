import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Hospital } from 'lucide-react';
import { pharmacyService } from '../../services/pharmacy.service';
import PharmacyCard from '../../components/PharmacyCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Pharmacy, CHRONIC_DISEASE_CATEGORIES } from '../../types';

const PharmacyMap = lazy(() => import('../../components/PharmacyMap'));

export default function Pharmacies() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'on-duty' | '24-7' | 'all-days' | 'hospital'>('all');
  const [hospitalSpecialty, setHospitalSpecialty] = useState(searchParams.get('specialty') || '');
  const LIMIT = 20;

  const loadPharmacies = async (q: string, p: number, activeFilter = filter, specialty = hospitalSpecialty) => {
    setLoading(true);
    try {
      let data;
      if (activeFilter === 'on-duty') {
        const list = await pharmacyService.getOnDuty();
        setPharmacies(list);
        setTotal(list.length);
        setPages(1);
        setLoading(false);
        return;
      }
      if (activeFilter === '24-7') {
        const list = await pharmacyService.getOpen24_7();
        setPharmacies(list);
        setTotal(list.length);
        setPages(1);
        setLoading(false);
        return;
      }
      if (activeFilter === 'all-days') {
        const list = await pharmacyService.getOpenAllDays();
        setPharmacies(list);
        setTotal(list.length);
        setPages(1);
        setLoading(false);
        return;
      }
      if (activeFilter === 'hospital') {
        const list = await pharmacyService.getHospitalPharmacies(specialty || undefined);
        setPharmacies(list);
        setTotal(list.length);
        setPages(1);
        setLoading(false);
        return;
      }
      if (q.trim()) {
        data = await pharmacyService.search(q, p, LIMIT);
      } else {
        data = await pharmacyService.getAll(p, LIMIT);
      }
      setPharmacies(data.pharmacies);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err: any) {
      console.error('[Pharmacies] erreur:', err?.response?.status, err?.message, err);
      toast.error(err?.response?.data?.message || err?.message || 'Impossible de charger les pharmacies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialiser en mode hôpital si paramètre URL présent
    if (searchParams.get('hospital') === 'true') {
      setFilter('hospital');
      loadPharmacies(query, 1, 'hospital', searchParams.get('specialty') || '');
    } else {
      loadPharmacies(query, page, filter);
    }
  }, [page, filter]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 6000 },
      );
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilter('all');
    setSearchParams(query ? { q: query } : {});
    loadPharmacies(query, 1, 'all');
  };

  const displayed = onlyOpen ? pharmacies.filter((p) => p.isOpen) : pharmacies;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pharmacies</h1>
              <p className="text-gray-500 mt-0.5 text-sm">
                {total > 0 ? `${total} pharmacies trouvées` : 'Chargement...'}
              </p>
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyOpen}
                  onChange={(e) => setOnlyOpen(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm text-gray-600 font-medium">Ouvertes uniquement</span>
              </label>
              <div className="flex rounded-lg border overflow-hidden">
                <button
                  onClick={() => setView('map')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    view === 'map' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Carte
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                    view === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Liste
                </button>
              </div>
            </div>
          </div>

          {/* Filtres de disponibilité */}
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              { key: 'all', label: 'Toutes', active: 'bg-green-600 text-white border-green-600' },
              { key: 'hospital', label: 'Hôpitaux', active: 'bg-red-700 text-white border-red-700' },
              { key: 'on-duty', label: 'De garde', active: 'bg-blue-600 text-white border-blue-600' },
              { key: '24-7', label: '24h/24 – 7j/7', active: 'bg-purple-600 text-white border-purple-600' },
              { key: 'all-days', label: 'Ouvertes 7j/7', active: 'bg-orange-500 text-white border-orange-500' },
            ] as const).map((f) => (
              <button key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === f.key ? f.active : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {f.key === 'on-duty' && <span className="inline-block w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse mr-1.5 align-middle" />}
                {f.key === 'hospital' && (
                  <svg className="inline w-3.5 h-3.5 mr-1 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
                {f.label}
              </button>
            ))}
          </div>

          {/* Filtre spécialité chronique (visible seulement en mode hôpital) */}
          {filter === 'hospital' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => { setHospitalSpecialty(''); loadPharmacies(query, 1, 'hospital', ''); }}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!hospitalSpecialty ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Toutes les spécialités
              </button>
              {CHRONIC_DISEASE_CATEGORIES.map((c) => (
                <button key={c.value}
                  onClick={() => { setHospitalSpecialty(c.value); loadPharmacies(query, 1, 'hospital', c.value); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${hospitalSpecialty === c.value ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-4 flex gap-3 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, adresse, quartier..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-sm"
            >
              Chercher
            </button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <LoadingSpinner text="Chargement des pharmacies..." />
        ) : view === 'map' ? (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 bg-white px-4 py-2 rounded-xl border w-fit">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Ouverte
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Fermée
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Votre position
              </span>
              <span>{displayed.length} pharmacie{displayed.length > 1 ? 's' : ''} affichée{displayed.length > 1 ? 's' : ''}</span>
            </div>

            <Suspense fallback={<LoadingSpinner text="Chargement de la carte..." />}>
              <PharmacyMap
                pharmacies={displayed}
                userLocation={userLocation}
                height="calc(100vh - 280px)"
              />
            </Suspense>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Hospital className="w-8 h-8 text-green-600" /></div>
            <h3 className="text-lg font-medium text-gray-900">Aucune pharmacie trouvée</h3>
            <p className="text-gray-500 mt-2">Essayez avec d'autres mots-clés</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayed.map((p) => <PharmacyCard key={p._id} pharmacy={p} />)}
            </div>
            {pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors text-sm"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-600">Page {page} / {pages}</span>
                <button
                  onClick={() => setPage(Math.min(pages, page + 1))}
                  disabled={page === pages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors text-sm"
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
