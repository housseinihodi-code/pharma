import { Link } from 'react-router-dom';
import { Pharmacy, CHRONIC_DISEASE_CATEGORIES } from '../types';
import FavoriteButton from './FavoriteButton';

interface Props {
  pharmacy: Pharmacy;
}

export default function PharmacyCard({ pharmacy }: Props) {
  return (
    <Link to={`/pharmacies/${pharmacy._id}`}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block">
      <div className="relative h-40 bg-gradient-to-br from-green-50 to-emerald-100">
        {pharmacy.imageUrl ? (
          <img src={pharmacy.imageUrl} alt={pharmacy.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">{pharmacy.name[0]}</span>
            </div>
          </div>
        )}
        {pharmacy.isHospitalPharmacy && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-700 text-white text-xs px-2 py-1 rounded-full font-semibold">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {pharmacy.hospitalName ? pharmacy.hospitalName : 'Pharmacie hospitalière'}
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            pharmacy.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {pharmacy.isOpen ? 'Ouvert' : 'Fermé'}
          </span>
          {pharmacy.isOnDuty && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
              De garde
            </span>
          )}
          {pharmacy.is24_7 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-white">
              24h/24
            </span>
          )}
          {pharmacy.openAllDays && !pharmacy.is24_7 && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
              7j/7
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 truncate flex-1">{pharmacy.name}</h3>
          <FavoriteButton type="pharmacy" id={pharmacy._id} className="ml-1 flex-shrink-0" />
        </div>
        <p className="text-sm text-gray-500 mt-1 truncate">{pharmacy.address}</p>
        {(pharmacy.isOnDuty || pharmacy.is24_7 || pharmacy.openAllDays) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {pharmacy.isOnDuty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block" />
                Pharmacie de garde
              </span>
            )}
            {pharmacy.is24_7 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-200">
                Ouverte 24h/24 — 7j/7
              </span>
            )}
            {pharmacy.openAllDays && !pharmacy.is24_7 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full border border-orange-200">
                Ouverte 7j/7
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-yellow-500 text-sm">
            <span>★</span>
            <span className="text-gray-700">{pharmacy.rating?.toFixed(1) || '0.0'}</span>
            <span className="text-gray-400">({pharmacy.reviewCount || 0})</span>
          </div>
          {pharmacy.distance !== undefined && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {pharmacy.distance < 1000
                ? `${pharmacy.distance}m`
                : `${(pharmacy.distance / 1000).toFixed(1)}km`}
            </span>
          )}
        </div>
        {pharmacy.isHospitalPharmacy && pharmacy.chronicSpecialties?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {pharmacy.chronicSpecialties.slice(0, 3).map((s) => {
              const cat = CHRONIC_DISEASE_CATEGORIES.find(c => c.value === s);
              return (
                <span key={s} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-100">
                  {cat?.label || s}
                </span>
              );
            })}
            {pharmacy.chronicSpecialties.length > 3 && (
              <span className="text-xs text-gray-400">+{pharmacy.chronicSpecialties.length - 3}</span>
            )}
          </div>
        )}
        {pharmacy.hasDelivery && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7h2.05A2.5 2.5 0 0118.5 10v1H14v2h5V5a1 1 0 00-1-1h-4v3z" />
            </svg>
            Livraison disponible {pharmacy.deliveryFee > 0 ? `(${pharmacy.deliveryFee} FCFA)` : '(gratuite)'}
          </div>
        )}
      </div>
    </Link>
  );
}
