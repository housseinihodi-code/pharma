import { useSelector } from 'react-redux';
import { Hospital } from 'lucide-react';
import { RootState } from '../store';

interface Props {
  className?: string;
}

export default function PharmacyBadge({ className = '' }: Props) {
  const { user } = useSelector((s: RootState) => s.auth);

  const pharmacyObj = user?.pharmacyId && typeof user.pharmacyId === 'object'
    ? (user.pharmacyId as any)
    : null;

  if (!pharmacyObj?.name) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 ${className}`}>
      <Hospital className="w-3 h-3" />
      <span>{pharmacyObj.name}</span>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pharmacyObj.isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
    </span>
  );
}
