import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft, Truck, Phone, MessageCircle, Pill } from 'lucide-react';
import { pharmacyService } from '../../services/pharmacy.service';
import { medicationService } from '../../services/medication.service';
import MedicationCard from '../../components/MedicationCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Pharmacy, Medication, MEDICATION_CATEGORIES } from '../../types';
import PharmacyReviews from '../../components/PharmacyReviews';
import { RootState } from '../../store';

export default function PharmacyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [medLoading, setMedLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchMed, setSearchMed] = useState('');

  const handleContact = () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    navigate(`/messages?pharmacy=${id}`);
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const p = await pharmacyService.getById(id);
        setPharmacy(p);
      } catch {
        // not found
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const loadMedications = async () => {
    if (!id) return;
    setMedLoading(true);
    try {
      let data;
      if (searchMed.trim()) {
        data = await medicationService.search(searchMed, id, category || undefined, page);
      } else {
        data = await medicationService.getByPharmacy(id, page, 12, category || undefined);
      }
      setMedications(data.medications);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      //
    } finally {
      setMedLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();
  }, [id, category, page]);

  const handleSearchMed = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMedications();
  };

  if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner size="lg" /></div>;
  if (!pharmacy) return (
    <div className="text-center mt-20">
      <p className="text-gray-500">Pharmacie non trouvée.</p>
      <Link to="/pharmacies" className="text-green-600 mt-2 inline-block hover:underline">Retour aux pharmacies</Link>
    </div>
  );

  const days: Record<string, string> = {
    monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi',
    thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link to="/pharmacies" className="text-sm text-green-600 hover:underline flex items-center gap-1 mb-4">
            <ChevronLeft className="w-4 h-4" /> Retour aux pharmacies
          </Link>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center flex-shrink-0">
              {pharmacy.imageUrl ? (
                <img src={pharmacy.imageUrl} alt={pharmacy.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-green-600 font-bold text-4xl">{pharmacy.name[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{pharmacy.name}</h1>
                  <p className="text-gray-500 mt-1">{pharmacy.address}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      pharmacy.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {pharmacy.isOpen ? '● Ouvert' : '● Fermé'}
                    </span>
                    {pharmacy.hasDelivery && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        <span className="inline-flex items-center gap-1"><Truck className="w-4 h-4" /> Livraison disponible</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      ★ {pharmacy.rating?.toFixed(1)} ({pharmacy.reviewCount} avis)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${pharmacy.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium">
                    <Phone className="w-4 h-4" /> {pharmacy.phone}
                  </a>
                  <button onClick={handleContact}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium">
                    <MessageCircle className="w-4 h-4" /> Contacter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {pharmacy.description && (
            <p className="text-gray-600 mt-4 text-sm">{pharmacy.description}</p>
          )}

          {pharmacy.openingHours && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Horaires d'ouverture</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(pharmacy.openingHours).map(([day, hours]) => (
                  hours && (
                    <div key={day} className="text-xs bg-gray-50 rounded-lg p-2">
                      <span className="font-medium text-gray-700">{days[day]}</span>
                      <span className="text-gray-500 ml-2">{hours.open}-{hours.close}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medications */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearchMed} className="flex gap-2 flex-1">
            <input
              type="text"
              value={searchMed}
              onChange={(e) => setSearchMed(e.target.value)}
              placeholder="Chercher un médicament..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <button type="submit"
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm">
              Chercher
            </button>
          </form>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm"
          >
            <option value="">Toutes catégories</option>
            {MEDICATION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">{total} médicament{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}</h2>
        </div>

        {medLoading ? (
          <LoadingSpinner text="Chargement des médicaments..." />
        ) : medications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Pill className="w-6 h-6 text-green-400" /></div>
            <p className="text-gray-500">Aucun médicament trouvé</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {medications.map((m) => <MedicationCard key={m._id} medication={m} />)}
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
        {/* Section avis */}
        <div className="mt-4 border-t pt-4">
          <PharmacyReviews pharmacyId={id!} />
        </div>
      </div>
    </div>
  );
}
