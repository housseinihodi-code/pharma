import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ScanLine, Upload, Camera, X, CheckCircle2,
  Pill, Hospital, MapPin, ShoppingCart, AlertTriangle, Info,
  ChevronDown, ChevronUp, ExternalLink, RefreshCw,
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { addToCart } from '../../store/cartSlice';
import type { AppDispatch } from '../../store';

/* ── Types ── */
interface Pharmacy {
  _id: string;
  name: string;
  address: string;
  phone?: string;
  isOpen: boolean;
  location?: { type: string; coordinates: [number, number] };
}

interface MedMatch {
  _id: string;
  name: string;
  genericName?: string;
  price: number;
  stock: number;
  dosageForm?: string;
  strength?: string;
  imageUrl?: string;
  pharmacyId: Pharmacy | null;
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

type Step = 'select' | 'preview' | 'processing' | 'results';

/* ── Helpers ── */
function mapsUrl(ph: Pharmacy): string {
  if (ph.location?.coordinates) {
    const [lng, lat] = ph.location.coordinates;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16&layers=M`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(ph.address)}`;
}

function totalResultsCount(meds: MedResult[]) {
  return meds.reduce((a, m) => a + m.exactMatches.length + m.genericEquivalents.length + m.categoryAlternatives.length, 0);
}

function uniquePharmacies(meds: MedResult[]): Pharmacy[] {
  const map = new Map<string, Pharmacy>();
  for (const m of meds) {
    for (const item of [...m.exactMatches, ...m.genericEquivalents, ...m.categoryAlternatives]) {
      if (item.pharmacyId) map.set(item.pharmacyId._id, item.pharmacyId);
    }
  }
  return Array.from(map.values());
}

/* ── MedCard ── */
function MedCard({ med, label, labelColor, onAdd, adding }: {
  med: MedMatch;
  label: string;
  labelColor: string;
  onAdd: (med: MedMatch) => void;
  adding: boolean;
}) {
  const ph = med.pharmacyId;
  return (
    <div className="flex gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
        {med.imageUrl
          ? <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover rounded-lg" />
          : <Pill className="w-5 h-5 text-emerald-500" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm truncate">{med.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${labelColor}`}>{label}</span>
        </div>
        {med.genericName && <p className="text-xs text-gray-400">DCI : {med.genericName}</p>}
        {(med.strength || med.dosageForm) && (
          <p className="text-xs text-gray-400">{[med.strength, med.dosageForm].filter(Boolean).join(' · ')}</p>
        )}

        {ph && (
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Hospital className="w-3 h-3 text-gray-400" />
                <span className="font-medium">{ph.name}</span>
                <span className={`ml-1 font-medium ${ph.isOpen ? 'text-green-600' : 'text-red-400'}`}>
                  {ph.isOpen ? '· Ouvert' : '· Fermé'}
                </span>
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {ph.address}
              </p>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="font-bold text-green-700">{med.price.toLocaleString()} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Stock : {med.stock}</span>
            {ph && (
              <a
                href={mapsUrl(ph)}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Voir sur la carte"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => onAdd(med)}
              disabled={med.stock === 0 || adding}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {adding
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <ShoppingCart className="w-3 h-3" />
              }
              {med.stock === 0 ? 'Rupture' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function PrescriptionScannerPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processingMsg, setProcessingMsg] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [addingId, setAddingId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.type.match(/^image\/(jpg|jpeg|png|webp|gif)$/)) {
      toast.error('Format non supporté — utilisez JPG, PNG ou WEBP');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 Mo)');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('preview');
    setError(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('processing');
    setError(null);

    try {
      /* Step 1 – Upload */
      setProcessingMsg("Envoi de l'ordonnance…");
      const form = new FormData();
      form.append('image', file);
      const { data: uploadData } = await apiClient.post('/upload/prescription', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const prescriptionUrl: string = uploadData.imageUrl;

      /* Step 2 – AI Analysis */
      setProcessingMsg("L'IA analyse votre ordonnance…");
      const { data } = await apiClient.post('/prescriptions/analyze', { prescriptionUrl });
      setAnalysis(data);
      setExpanded(new Set([0]));
      setStep('results');
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de l'analyse";
      setError(msg);
      setStep('preview');
      toast.error(msg);
    }
  };

  const handleAdd = async (med: MedMatch) => {
    if (!med.pharmacyId) { toast.error('Pharmacie introuvable'); return; }
    setAddingId(med._id);
    try {
      await dispatch(addToCart({ medicationId: med._id, quantity: 1 })).unwrap();
      toast.success(`${med.name} ajouté au panier`);
    } catch {
      toast.error("Erreur lors de l'ajout au panier");
    } finally {
      setAddingId(null);
    }
  };

  const handleAddAll = async () => {
    if (!analysis) return;
    const allMeds = analysis.medications.flatMap(m => m.exactMatches);
    if (allMeds.length === 0) { toast.error('Aucun médicament exact trouvé'); return; }
    let added = 0;
    for (const med of allMeds) {
      if (med.stock > 0 && med.pharmacyId) {
        try {
          await dispatch(addToCart({ medicationId: med._id, quantity: 1 })).unwrap();
          added++;
        } catch { /* skip */ }
      }
    }
    if (added > 0) {
      toast.success(`${added} médicament(s) ajouté(s) au panier`);
      navigate('/cart');
    } else {
      toast.error('Aucun médicament disponible à ajouter');
    }
  };

  const reset = () => {
    setStep('select');
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setExpanded(new Set([0]));
    if (preview) URL.revokeObjectURL(preview);
  };

  const toggleExpand = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const pharmacies = analysis ? uniquePharmacies(analysis.medications) : [];
  const total = analysis ? totalResultsCount(analysis.medications) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 pt-10 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            to="/ordonnances"
            className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white text-sm mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Retour
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Scanner une ordonnance</h1>
              <p className="text-emerald-100 text-sm mt-0.5">
                L'IA identifie les médicaments et trouve les pharmacies disponibles
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 pb-12">

        {/* ── STEP: SELECT ── */}
        {step === 'select' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {/* Drop zone */}
            <div
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-4 ${
                dragging ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-gray-800">Déposez votre ordonnance ici</p>
              <p className="text-sm text-gray-400 mt-1">ou cliquez pour parcourir vos fichiers</p>
              <p className="text-xs text-gray-300 mt-3">JPG, PNG, WEBP · Max 10 Mo</p>
            </div>

            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 border-2 border-gray-200 text-gray-700 rounded-2xl font-medium hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all"
            >
              <Camera className="w-5 h-5" />
              Prendre une photo avec la caméra
            </button>

            {/* How it works */}
            <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Comment ça fonctionne
              </p>
              <ol className="text-xs text-blue-600 space-y-1.5">
                <li className="flex items-start gap-2"><span className="font-bold">1.</span> Photographiez votre ordonnance (bonne luminosité, texte lisible)</li>
                <li className="flex items-start gap-2"><span className="font-bold">2.</span> L'IA extrait automatiquement les médicaments prescrits</li>
                <li className="flex items-start gap-2"><span className="font-bold">3.</span> On vous montre toutes les pharmacies, prix et équivalences disponibles</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── STEP: PREVIEW ── */}
        {step === 'preview' && preview && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Image preview */}
            <div className="relative bg-gray-900">
              <img
                src={preview}
                alt="Ordonnance"
                className="w-full max-h-80 object-contain"
              />
              <button
                onClick={reset}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {file?.name} — {((file?.size ?? 0) / 1024).toFixed(0)} Ko
              </p>

              <button
                onClick={handleAnalyze}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-bold text-base hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-green-200 flex items-center justify-center gap-2.5"
              >
                <ScanLine className="w-5 h-5" />
                Analyser avec l'IA
              </button>
              <button
                onClick={reset}
                className="w-full mt-2 py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Choisir une autre image
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PROCESSING ── */}
        {step === 'processing' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <p className="font-bold text-gray-900 text-lg">{processingMsg}</p>
            <p className="text-sm text-gray-400 mt-2">Veuillez patienter quelques secondes…</p>
            <div className="flex justify-center gap-1.5 mt-5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: RESULTS ── */}
        {step === 'results' && analysis && (
          <div className="space-y-4">
            {/* Summary banner */}
            <div className={`rounded-2xl p-5 border ${
              analysis.success
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                {analysis.success
                  ? <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className="font-bold text-gray-900">
                    {analysis.success
                      ? `${analysis.medications.length} médicament(s) identifié(s)`
                      : 'Ordonnance difficile à lire'}
                  </p>
                  {analysis.success && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-green-700">{total}</span> résultat(s) disponible(s)
                      </span>
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-blue-700">{pharmacies.length}</span> pharmacie(s)
                      </span>
                    </div>
                  )}
                  {analysis.pharmacistNote && (
                    <p className="text-xs text-gray-500 mt-1.5">{analysis.pharmacistNote}</p>
                  )}
                </div>
              </div>

              {/* Pharmacies chips */}
              {pharmacies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pharmacies.map(ph => (
                    <a
                      key={ph._id}
                      href={mapsUrl(ph)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors font-medium"
                    >
                      <MapPin className="w-3 h-3" />
                      {ph.name}
                      <span className={`w-1.5 h-1.5 rounded-full ${ph.isOpen ? 'bg-green-500' : 'bg-red-400'}`} />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Avertissement */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Ces suggestions sont indicatives. Consultez votre pharmacien avant de substituer un médicament.
            </div>

            {/* Add all button */}
            {analysis.medications.some(m => m.exactMatches.length > 0) && (
              <button
                onClick={handleAddAll}
                className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2.5 hover:bg-green-700 transition-colors shadow-md shadow-green-200"
              >
                <ShoppingCart className="w-5 h-5" />
                Tout ajouter au panier
              </button>
            )}

            {/* Medications list */}
            {analysis.medications.map((med, i) => {
              const hasResults = med.exactMatches.length + med.genericEquivalents.length + med.categoryAlternatives.length > 0;
              const isOpen = expanded.has(i);
              const resultCount = med.exactMatches.length + med.genericEquivalents.length + med.categoryAlternatives.length;

              return (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Med header */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(i)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{med.prescribed}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[med.dosage, med.duration].filter(Boolean).join(' · ') || 'Posologie non précisée'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasResults ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">
                          {resultCount} résultat{resultCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold">
                          Non trouvé
                        </span>
                      )}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded results */}
                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                      {!hasResults && (
                        <div className="text-center py-6 text-gray-400">
                          <Pill className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm">Aucun médicament disponible pour « {med.prescribed} »</p>
                        </div>
                      )}

                      {med.exactMatches.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Correspondances exactes
                          </p>
                          <div className="space-y-2">
                            {med.exactMatches.map(m => (
                              <MedCard key={m._id} med={m} label="Exact" labelColor="bg-green-100 text-green-700" onAdd={handleAdd} adding={addingId === m._id} />
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
                              <MedCard key={m._id} med={m} label="Générique" labelColor="bg-blue-100 text-blue-700" onAdd={handleAdd} adding={addingId === m._id} />
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
                              <MedCard key={m._id} med={m} label="Alternative" labelColor="bg-amber-100 text-amber-700" onAdd={handleAdd} adding={addingId === m._id} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer actions */}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3.5 border border-gray-200 text-gray-600 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors bg-white"
              >
                <RefreshCw className="w-4 h-4" /> Nouvelle analyse
              </button>
              <Link
                to="/cart"
                className="flex-1 py-3.5 bg-green-600 text-white rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors text-center"
              >
                <ShoppingCart className="w-4 h-4" /> Voir le panier
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
