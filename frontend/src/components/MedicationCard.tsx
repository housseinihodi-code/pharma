import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Medication, CHRONIC_DISEASE_CATEGORIES } from '../types';
import { AppDispatch, RootState } from '../store';
import { addToCart } from '../store/cartSlice';

const CHRONIC_COLORS: Record<string, string> = {
  diabete: 'bg-blue-100 text-blue-700',
  vih: 'bg-red-100 text-red-700',
  tuberculose: 'bg-orange-100 text-orange-700',
  hypertension: 'bg-purple-100 text-purple-700',
  cancer: 'bg-pink-100 text-pink-700',
  epilepsie: 'bg-indigo-100 text-indigo-700',
  drepanocytose: 'bg-yellow-100 text-yellow-700',
  insuffisance_renale: 'bg-teal-100 text-teal-700',
  hepatite: 'bg-amber-100 text-amber-700',
  autre_chronique: 'bg-gray-100 text-gray-700',
};

interface Props {
  medication: Medication;
  showPharmacy?: boolean;
}

export default function MedicationCard({ medication, showPharmacy = false }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);
  const isPharmacist = user?.role === 'pharmacist' || user?.role === 'admin';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour ajouter au panier');
      return;
    }
    if (medication.isHospitalOnly) {
      toast.error('Ce médicament est disponible uniquement dans les pharmacies hospitalières. Consultez votre médecin pour une ordonnance.', { duration: 5000 });
      return;
    }
    try {
      await dispatch(addToCart({ medicationId: medication._id, quantity: 1 })).unwrap();
      toast.success(`${medication.name} ajouté au panier`);
    } catch (err: any) {
      const msg = err?.message || err?.response?.data?.message || 'Erreur lors de l\'ajout';
      toast.error(msg, { duration: 5000 });
    }
  };

  const pharmacyName = typeof medication.pharmacyId === 'object'
    ? (medication.pharmacyId as any)?.name
    : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="relative h-36 bg-gradient-to-br from-green-50 to-teal-100">
        {medication.imageUrl ? (
          <img
            src={medication.imageUrl}
            alt={medication.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.img-fallback') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div
          className="img-fallback flex items-center justify-center h-full"
          style={{ display: medication.imageUrl ? 'none' : 'flex' }}
        >
          <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9m0 0H9" />
          </svg>
        </div>
        {/* Badge hôpital uniquement */}
        {medication.isHospitalOnly && (
          <span className="absolute top-2 left-2 bg-red-700 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Hôpital uniquement
          </span>
        )}
        {!medication.isHospitalOnly && medication.requiresPrescription && (
          <span className="absolute top-2 left-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
            Ordonnance
          </span>
        )}
        {medication.stock === 0 && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium text-sm">Rupture de stock</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{medication.name}</h3>
        {medication.genericName && (
          <p className="text-xs text-gray-400 truncate">{medication.genericName}</p>
        )}
        {showPharmacy && pharmacyName && (
          <p className="text-xs text-green-600 mt-1 truncate">{pharmacyName}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {medication.chronicDiseaseCategory && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHRONIC_COLORS[medication.chronicDiseaseCategory] || 'bg-gray-100 text-gray-600'}`}>
              {CHRONIC_DISEASE_CATEGORIES.find(c => c.value === medication.chronicDiseaseCategory)?.label || medication.chronicDiseaseCategory}
            </span>
          )}
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {medication.category}
          </span>
          {medication.strength && (
            <span className="text-xs text-gray-400">{medication.strength}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-bold text-green-700 text-lg">{medication.price.toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1">FCFA</span>
          </div>
          <span className={`text-xs ${medication.stock > 5 ? 'text-green-600' : medication.stock > 0 ? 'text-orange-500' : 'text-red-500'}`}>
            {medication.stock > 5 ? `${medication.stock} en stock` : medication.stock > 0 ? `Seulement ${medication.stock}` : 'Épuisé'}
          </span>
        </div>
        {!isPharmacist && (
          medication.isHospitalOnly ? (
            <Link
              to={`/pharmacies?hospital=true${medication.chronicDiseaseCategory ? `&specialty=${medication.chronicDiseaseCategory}` : ''}`}
              className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Voir les hôpitaux
            </Link>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={medication.stock === 0}
              className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                medication.stock > 0
                  ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {medication.stock > 0 ? 'Ajouter au panier' : 'Indisponible'}
            </button>
          )
        )}
      </div>
    </div>
  );
}
