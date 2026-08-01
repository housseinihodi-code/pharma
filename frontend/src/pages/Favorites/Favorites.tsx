import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { clearFavorites } from '../../store/favoritesSlice';
import { pharmacyService } from '../../services/pharmacy.service';
import { medicationService } from '../../services/medication.service';
import FavoriteButton from '../../components/FavoriteButton';
import MedicationCard from '../../components/MedicationCard';

export default function Favorites() {
  const dispatch = useDispatch<AppDispatch>();
  const { pharmacies: favPharmacyIds, medications: favMedIds } = useSelector((s: RootState) => s.favorites);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [tab, setTab] = useState<'pharmacies' | 'medications'>('pharmacies');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (favPharmacyIds.length === 0) { setPharmacies([]); return; }
    setLoading(true);
    Promise.all(favPharmacyIds.map(id => pharmacyService.getById(id).catch(() => null)))
      .then(res => setPharmacies(res.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [favPharmacyIds.join(',')]);

  useEffect(() => {
    if (favMedIds.length === 0) { setMedications([]); return; }
    Promise.all(favMedIds.map(id => medicationService.getById(id).catch(() => null)))
      .then(res => setMedications(res.filter(Boolean)));
  }, [favMedIds.join(',')]);

  const total = favPharmacyIds.length + favMedIds.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} élément{total !== 1 ? 's' : ''} sauvegardé{total !== 1 ? 's' : ''}</p>
          </div>
          {total > 0 && (
            <button onClick={() => { if (confirm('Effacer tous les favoris ?')) dispatch(clearFavorites()); }}
              className="text-sm text-red-500 hover:text-red-700 hover:underline">
              Tout effacer
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'pharmacies', label: 'Pharmacies', count: favPharmacyIds.length },
            { key: 'medications', label: 'Médicaments', count: favMedIds.length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pharmacies */}
        {tab === 'pharmacies' && (
          favPharmacyIds.length === 0 ? (
            <Empty label="pharmacies" link="/pharmacies" />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favPharmacyIds.map(id => <div key={id} className="bg-white rounded-xl border h-32 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pharmacies.map(p => (
                <div key={p._id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow relative">
                  <div className="absolute top-3 right-3">
                    <FavoriteButton type="pharmacy" id={p._id} />
                  </div>
                  <Link to={`/pharmacies/${p._id}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-bold">{p.name[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate pr-6">{p.name}</p>
                        <p className="text-xs text-gray-500 truncate">{p.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {p.isOpen ? 'Ouvert' : 'Fermé'}
                      </span>
                      {p.hasDelivery && <span className="text-xs text-gray-500 inline-flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1h7l1-1z"/></svg> Livraison</span>}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {/* Médicaments */}
        {tab === 'medications' && (
          favMedIds.length === 0 ? (
            <Empty label="médicaments" link="/medications" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {medications.map(m => <MedicationCard key={m._id} medication={m} showPharmacy />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Empty({ label, link }: { label: string; link: string }) {
  return (
    <div className="text-center py-20 bg-white rounded-2xl border">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h3 className="font-semibold text-gray-900">Aucun favori</h3>
      <p className="text-gray-500 text-sm mt-1">Ajoutez des {label} à vos favoris depuis leur page</p>
      <Link to={link} className="mt-4 inline-block px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
        Parcourir les {label}
      </Link>
    </div>
  );
}
