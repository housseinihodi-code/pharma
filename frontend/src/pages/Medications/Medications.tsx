import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pill } from 'lucide-react';
import { medicationService } from '../../services/medication.service';
import MedicationCard from '../../components/MedicationCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Medication, MEDICATION_CATEGORIES, CHRONIC_DISEASE_CATEGORIES } from '../../types';

type ViewMode = 'all' | 'hospital' | 'chronic';

export default function Medications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [chronicCategory, setChronicCategory] = useState('');

  const loadMedications = async (q: string, cat: string, p: number, mode = viewMode, chronic = chronicCategory) => {
    setLoading(true);
    try {
      let data;
      if (mode === 'hospital') {
        data = await medicationService.getHospitalMedications(chronic || undefined, p, 16);
      } else if (mode === 'chronic' && chronic) {
        data = await medicationService.getByChronicDisease(chronic, p, 16);
      } else {
        data = await medicationService.search(q, undefined, cat || undefined, p, 16);
      }
      setMedications(data.medications);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications(query, category, page, viewMode, chronicCategory);
  }, [category, page, viewMode, chronicCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setViewMode('all');
    setChronicCategory('');
    setSearchParams(query ? { q: query } : {});
    loadMedications(query, category, 1, 'all', '');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Médicaments</h1>
          <p className="text-gray-500 mt-1">
            {total > 0 ? `${total} médicament${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}` : 'Recherchez un médicament'}
          </p>

          {/* Onglets */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => { setViewMode('all'); setChronicCategory(''); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${viewMode === 'all' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              Tous les médicaments
            </button>
            <button
              onClick={() => { setViewMode('hospital'); setChronicCategory(''); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${viewMode === 'hospital' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-gray-600 border-gray-200 hover:border-red-200'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Médicaments hospitaliers
            </button>
          </div>

          {/* Sous-filtres maladies chroniques */}
          {(viewMode === 'hospital' || viewMode === 'all') && (
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400 font-medium">Maladie chronique :</span>
              {chronicCategory && (
                <button
                  onClick={() => { setChronicCategory(''); setPage(1); }}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 border border-gray-300"
                >
                  ✕ Effacer
                </button>
              )}
              {CHRONIC_DISEASE_CATEGORIES.map((c) => (
                <button key={c.value}
                  onClick={() => { setChronicCategory(c.value); setViewMode('hospital'); setPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    chronicCategory === c.value
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Barre de recherche (visible seulement en mode "tous") */}
          {viewMode === 'all' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3 max-w-2xl">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nom, indication, molécule..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button type="submit"
                  className="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium">
                  Chercher
                </button>
              </form>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
              >
                <option value="">Toutes catégories</option>
                {MEDICATION_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bandeau informatif — médicaments hospitaliers */}
      {viewMode === 'hospital' && (
        <div className="bg-red-50 border-b border-red-100">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-800">
              <span className="font-semibold">Médicaments dispensés uniquement en pharmacie hospitalière.</span>
              {' '}Ces traitements (antirétroviraux, insuline, chimiothérapie…) nécessitent une ordonnance médicale et sont délivrés exclusivement dans les pharmacies des hôpitaux agréés.
              <Link to="/pharmacies?hospital=true" className="ml-2 underline font-medium hover:text-red-900">
                Trouver un hôpital →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <LoadingSpinner text="Chargement des médicaments..." />
        ) : medications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Pill className="w-8 h-8 text-green-400" /></div>
            <h3 className="text-lg font-medium text-gray-900">
              {viewMode === 'hospital' ? 'Aucun médicament hospitalier trouvé' : 'Aucun médicament trouvé'}
            </h3>
            <p className="text-gray-500 mt-2">
              {viewMode === 'hospital'
                ? 'Aucune pharmacie hospitalière n\'a encore enregistré de médicaments pour cette pathologie.'
                : 'Essayez avec d\'autres mots-clés'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {medications.map((m) => (
                <MedicationCard key={m._id} medication={m} showPharmacy />
              ))}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Précédent</button>
                <span className="px-4 py-2 text-sm text-gray-600">Page {page} / {pages}</span>
                <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Suivant</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
