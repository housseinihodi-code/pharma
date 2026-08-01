import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RootState } from '../store';
import { reviewService } from '../services/review.service';
import StarRating from './StarRating';

interface Props {
  pharmacyId: string;
}

export default function PharmacyReviews({ pharmacyId }: Props) {
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);
  const [data, setData] = useState<{ reviews: any[]; count: number; average: number; distribution: Record<number, number> } | null>(null);
  const [myReview, setMyReview] = useState<{ rating: number; comment: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const isClient = user?.role === 'client';

  const load = async () => {
    try {
      const res = await reviewService.getByPharmacy(pharmacyId);
      setData(res);
    } catch {}
  };

  const loadMine = async () => {
    if (!isAuthenticated || !isClient) return;
    try {
      const mine = await reviewService.getMyReview(pharmacyId);
      if (mine) {
        setMyReview(mine);
        setRating(mine.rating);
        setComment(mine.comment || '');
      }
    } catch {}
  };

  useEffect(() => {
    Promise.all([load(), loadMine()]).finally(() => setLoading(false));
  }, [pharmacyId, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { toast.error('Choisissez une note'); return; }
    setSubmitting(true);
    try {
      await reviewService.create(pharmacyId, rating, comment);
      toast.success(myReview ? 'Avis mis à jour' : 'Avis publié !');
      setMyReview({ rating, comment });
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer votre avis ?')) return;
    try {
      await reviewService.delete(pharmacyId);
      setMyReview(null);
      setRating(0);
      setComment('');
      toast.success('Avis supprimé');
      await load();
    } catch {}
  };

  if (loading) return <div className="h-16 flex items-center justify-center"><div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          Avis clients {data?.count ? <span className="text-gray-400 text-sm font-normal">({data.count})</span> : null}
        </h2>
        {isAuthenticated && isClient && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            {myReview ? 'Modifier mon avis' : '+ Laisser un avis'}
          </button>
        )}
      </div>

      {/* Score global */}
      {data && data.count > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-black text-gray-900">{data.average}</div>
            <StarRating value={Math.round(data.average)} readonly size="sm" />
            <div className="text-xs text-gray-400 mt-1">{data.count} avis</div>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(n => {
              const cnt = data.distribution[n] || 0;
              const pct = data.count > 0 ? (cnt / data.count) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right text-gray-500">{n}</span>
                  <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-5 text-gray-400">{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-gray-900 mb-3">{myReview ? 'Modifier mon avis' : 'Laisser un avis'}</h3>
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-2">Votre note</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Partagez votre expérience (optionnel)..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={submitting || !rating}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-green-700">
              {submitting ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      )}

      {/* Mon avis existant */}
      {myReview && !showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-700">Mon avis</span>
              <StarRating value={myReview.rating} readonly size="sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(true)} className="text-xs text-blue-600 hover:underline">Modifier</button>
              <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">Supprimer</button>
            </div>
          </div>
          {myReview.comment && <p className="text-sm text-gray-700">{myReview.comment}</p>}
        </div>
      )}

      {/* Liste des avis */}
      {data?.reviews && data.reviews.length > 0 ? (
        <div className="space-y-3">
          {data.reviews
            .filter(r => !myReview || (r.userId as any)?._id?.toString() !== user?._id)
            .map((review, i) => {
              const u = review.userId as any;
              const name = u ? `${u.firstName} ${u.lastName[0]}.` : 'Anonyme';
              return (
                <div key={review._id || i} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-semibold text-sm">{name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(review.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      <StarRating value={review.rating} readonly size="sm" />
                      {review.comment && <p className="text-sm text-gray-600 mt-1">{review.comment}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        !myReview && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Aucun avis pour l'instant. Soyez le premier à donner votre avis !
          </div>
        )
      )}
    </div>
  );
}
