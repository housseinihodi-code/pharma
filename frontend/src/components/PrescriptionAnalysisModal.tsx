import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Pill, Hospital, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import apiClient from '../services/apiClient';
import { addToCart } from '../store/cartSlice';
import type { AppDispatch } from '../store';

/* ── Types ── */
interface MedMatch {
  _id: string;
  name: string;
  genericName?: string;
  price: number;
  stock: number;
  dosageForm?: string;
  strength?: string;
  imageUrl?: string;
  pharmacyId: { _id: string; name: string; address: string; isOpen: boolean } | null;
}

interface MedResult {
  prescribed: string;
  dosage?: string;
  duration?: string;
  exactMatches: MedMatch[];
  genericEquivalents: MedMatch[];
  categoryAlternatives: MedMatch[];
}

interface Analysis {
  success: boolean;
  rawText: string;
  medications: MedResult[];
  pharmacistNote?: string;
}

interface Props {
  prescriptionUrl: string;
  onClose: () => void;
}

function MedCard({ med, label, labelColor, onAdd }: {
  med: MedMatch;
  label: string;
  labelColor: string;
  onAdd: (med: MedMatch) => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition">
      {med.imageUrl ? (
        <img src={med.imageUrl} alt={med.name} className="w-12 h-12 rounded-lg object-cover border flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><Pill className="w-6 h-6 text-emerald-400" /></div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm">{med.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${labelColor}`}>{label}</span>
        </div>
        {med.genericName && (
          <p className="text-xs text-gray-400 mt-0.5">DCI : {med.genericName}</p>
        )}
        {(med.strength || med.dosageForm) && (
          <p className="text-xs text-gray-400">{[med.strength, med.dosageForm].filter(Boolean).join(' · ')}</p>
        )}
        {med.pharmacyId && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="inline-flex items-center gap-1"><Hospital className="w-3 h-3" /> {med.pharmacyId.name}</span>
            <span className={`ml-1 ${med.pharmacyId.isOpen ? 'text-green-500' : 'text-red-400'}`}>
              {med.pharmacyId.isOpen ? '· Ouvert' : '· Fermé'}
            </span>
          </p>
        )}
        <div className="flex items-center justify-between mt-1.5 flex-wrap gap-2">
          <p className="font-bold text-emerald-700 text-sm">{med.price.toLocaleString()} FCFA</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Stock : {med.stock}</span>
            <button
              onClick={() => onAdd(med)}
              disabled={med.stock === 0}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {med.stock === 0 ? 'Rupture' : '+ Panier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrescriptionAnalysisModal({ prescriptionUrl, onClose }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    apiClient
      .post('/prescriptions/analyze', { prescriptionUrl })
      .then(r => setAnalysis(r.data))
      .catch(err => setError(err?.response?.data?.message || 'Erreur lors de l\'analyse'))
      .finally(() => setLoading(false));
  }, [prescriptionUrl]);

  const handleAdd = async (med: MedMatch) => {
    if (!med.pharmacyId) { toast.error('Pharmacie introuvable'); return; }
    try {
      await dispatch(addToCart({ medicationId: med._id, quantity: 1 })).unwrap();
      toast.success(`${med.name} ajouté au panier`, {
        action: { label: 'Voir', onClick: () => navigate('/cart') },
      } as any);
    } catch {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  const toggleExpand = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const totalFound = analysis?.medications.reduce(
    (acc, m) => acc + m.exactMatches.length + m.genericEquivalents.length + m.categoryAlternatives.length,
    0,
  ) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-bold text-gray-900">Analyse de l'ordonnance</h2>
            <p className="text-xs text-gray-400 mt-0.5">Analyse IA · Proposition d'équivalences</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Chargement */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mb-4" />
              <p className="font-medium text-gray-700">Analyse en cours...</p>
              <p className="text-sm text-gray-400 mt-1">L'IA lit votre ordonnance et cherche les médicaments disponibles</p>
            </div>
          )}

          {/* Erreur */}
          {!loading && error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="font-medium text-red-700">{error}</p>
              <button onClick={onClose} className="mt-3 text-sm text-red-500 underline">Fermer</button>
            </div>
          )}

          {/* Résultats */}
          {!loading && analysis && (
            <>
              {/* Résumé */}
              <div className={`rounded-xl p-4 border ${analysis.success ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-3">
                  {analysis.success ? <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" /> : <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />}
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {analysis.success
                        ? `${analysis.medications.length} médicament(s) identifié(s) — ${totalFound} résultat(s) disponible(s) en pharmacie`
                        : 'Ordonnance difficile à lire'}
                    </p>
                    {analysis.pharmacistNote && (
                      <p className="text-xs text-gray-500 mt-1">{analysis.pharmacistNote}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Avertissement */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 text-xs text-blue-700">
                <span className="inline-flex items-start gap-1"><Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> Ces suggestions sont fournies à titre indicatif. Consultez toujours votre pharmacien avant de substituer un médicament.</span>
              </div>

              {/* Médicaments */}
              {analysis.medications.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Pill className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p>Aucun médicament détecté dans cette ordonnance.</p>
                </div>
              )}

              {analysis.medications.map((med, i) => {
                const hasResults =
                  med.exactMatches.length + med.genericEquivalents.length + med.categoryAlternatives.length > 0;
                const isOpen = expanded.has(i);

                return (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* En-tête médicament prescrit */}
                    <button
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                      onClick={() => toggleExpand(i)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><Pill className="w-5 h-5 text-emerald-600" /></div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{med.prescribed}</p>
                          <p className="text-xs text-gray-400">
                            {[med.dosage, med.duration].filter(Boolean).join(' · ') || 'Posologie non précisée'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasResults ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            {med.exactMatches.length + med.genericEquivalents.length + med.categoryAlternatives.length} résultat(s)
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Non trouvé</span>
                        )}
                        <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Résultats dépliés */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-gray-50">

                        {!hasResults && (
                          <p className="text-sm text-gray-400 text-center py-3">
                            Aucun médicament disponible pour « {med.prescribed} » dans la base.
                          </p>
                        )}

                        {med.exactMatches.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Correspondances exactes
                            </p>
                            <div className="space-y-2">
                              {med.exactMatches.map(m => (
                                <MedCard key={m._id} med={m} label="Exact" labelColor="bg-green-100 text-green-700" onAdd={handleAdd} />
                              ))}
                            </div>
                          </div>
                        )}

                        {med.genericEquivalents.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Équivalents génériques (même DCI)
                            </p>
                            <div className="space-y-2">
                              {med.genericEquivalents.map(m => (
                                <MedCard key={m._id} med={m} label="Générique" labelColor="bg-blue-100 text-blue-700" onAdd={handleAdd} />
                              ))}
                            </div>
                          </div>
                        )}

                        {med.categoryAlternatives.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Alternatives de même classe thérapeutique
                            </p>
                            <div className="space-y-2">
                              {med.categoryAlternatives.map(m => (
                                <MedCard key={m._id} med={m} label="Alternative" labelColor="bg-amber-100 text-amber-700" onAdd={handleAdd} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && analysis && (
          <div className="px-5 py-3 border-t border-gray-200 bg-white rounded-b-2xl flex justify-between items-center">
            <p className="text-xs text-gray-400">
              {totalFound > 0 ? `${totalFound} produit(s) trouvé(s) · Cliquez "+ Panier" pour commander` : 'Aucun résultat disponible'}
            </p>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
