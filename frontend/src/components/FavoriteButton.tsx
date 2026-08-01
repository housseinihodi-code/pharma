import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { toggleFavoritePharmacy, toggleFavoriteMedication } from '../store/favoritesSlice';

interface Props {
  type: 'pharmacy' | 'medication';
  id: string;
  className?: string;
}

export default function FavoriteButton({ type, id, className = '' }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const favorites = useSelector((s: RootState) => s.favorites);
  const isFav = type === 'pharmacy'
    ? favorites.pharmacies.includes(id)
    : favorites.medications.includes(id);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'pharmacy') dispatch(toggleFavoritePharmacy(id));
    else dispatch(toggleFavoriteMedication(id));
  };

  return (
    <button
      onClick={toggle}
      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`p-1.5 rounded-full transition-all ${
        isFav
          ? 'text-red-500 bg-red-50 hover:bg-red-100'
          : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
      } ${className}`}
    >
      <svg className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}
