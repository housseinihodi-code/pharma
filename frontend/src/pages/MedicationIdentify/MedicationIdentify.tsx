import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Package, Lightbulb, Type, ScanLine } from 'lucide-react';
import apiClient from '../../services/apiClient';
import MedicationCard from '../../components/MedicationCard';

type Step = 'upload' | 'analyzing' | 'result' | 'error';

interface IdentifyResult {
  identified: boolean;
  name?: string;
  genericName?: string;
  description?: string;
  dosage?: string;
  category?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  rawAnalysis: string;
  matches: any[];
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'Confiance élevée',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  medium: { label: 'Confiance moyenne',  color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  low:    { label: 'Confiance faible',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  none:   { label: 'Non identifié',      color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
};

export default function MedicationIdentify() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('upload');
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Seules les images sont acceptées');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop grande (5 Mo max)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setStep('analyzing');

    try {
      const base64 = await fileToBase64(file);
      const res = await apiClient.post('/medications/identify', {
        image: base64,
        mediaType: file.type,
      });
      setResult(res.data);
      setStep('result');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erreur lors de l\'analyse';
      setErrorMsg(msg);
      setStep('error');
    }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  const reset = () => {
    setStep('upload');
    setPreview(null);
    setResult(null);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const conf = result ? CONFIDENCE_CONFIG[result.confidence] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('medications.identify_title')}</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">{t('medications.identify_subtitle')}</p>
        </div>

        {/* ── STEP: upload ── */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {/* Zone drag & drop */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
              }`}
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-medium text-gray-700">{t('medications.upload_photo')}</p>
              <p className="text-sm text-gray-400 mt-1">ou glissez-déposez une image ici</p>
              <p className="text-xs text-gray-300 mt-3">JPEG, PNG, WebP — 5 Mo max</p>
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

            {/* Bouton camera mobile */}
            <button
              onClick={() => cameraRef.current?.click()}
              className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('medications.take_photo')}
            </button>

            {/* Tips */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 mb-2">Conseils pour une meilleure reconnaissance</p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li className="flex items-center gap-1.5"><Package className="w-3 h-3 flex-shrink-0" /> Photographiez la boîte entière ou le blister</li>
                <li className="flex items-center gap-1.5"><Lightbulb className="w-3 h-3 flex-shrink-0" /> Bonne luminosité, pas de reflet</li>
                <li className="flex items-center gap-1.5"><Type className="w-3 h-3 flex-shrink-0" /> Le nom du médicament doit être lisible</li>
                <li className="flex items-center gap-1.5"><ScanLine className="w-3 h-3 flex-shrink-0" /> Image nette, pas floue</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── STEP: analyzing ── */}
        {step === 'analyzing' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {preview && (
              <div className="mb-6 rounded-xl overflow-hidden max-h-60 flex items-center justify-center bg-gray-50">
                <img src={preview} alt="Médicament" className="max-h-60 object-contain rounded-xl" />
              </div>
            )}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
              <h2 className="font-bold text-gray-900 text-lg">{t('medications.analyzing')}</h2>
              <p className="text-gray-500 text-sm mt-2">L'IA analyse votre image...</p>
            </div>
          </div>
        )}

        {/* ── STEP: result ── */}
        {step === 'result' && result && (
          <div className="space-y-4">
            {/* Image + fiche identité */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex gap-4">
                {preview && (
                  <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 border">
                    <img src={preview} alt="Médicament" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      {result.identified ? (
                        <>
                          <h2 className="font-bold text-gray-900 text-lg leading-tight">{result.name || 'Médicament identifié'}</h2>
                          {result.genericName && (
                            <p className="text-sm text-gray-500 mt-0.5">{result.genericName}</p>
                          )}
                        </>
                      ) : (
                        <h2 className="font-bold text-gray-900 text-lg">{t('medications.no_result')}</h2>
                      )}
                    </div>
                    {conf && (
                      <span className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${conf.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                        {conf.label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {result.dosage && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                        {result.dosage}
                      </span>
                    )}
                    {result.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">
                        {result.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {result.description && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-700 leading-relaxed">{result.description}</p>
                </div>
              )}

              {!result.identified && result.rawAnalysis && (
                <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs font-semibold text-orange-700 mb-1">Analyse IA</p>
                  <p className="text-sm text-orange-600">{result.rawAnalysis}</p>
                </div>
              )}
            </div>

            {/* Médicaments disponibles correspondants */}
            {result.matches.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Disponible dans nos pharmacies ({result.matches.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.matches.map((med: any) => (
                    <MedicationCard key={med._id} medication={med} showPharmacy />
                  ))}
                </div>
              </div>
            )}

            {result.identified && result.matches.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <p className="text-sm text-yellow-700 font-medium">Ce médicament n'est pas disponible dans nos pharmacies actuellement</p>
                <Link to="/pharmacies" className="mt-2 inline-block text-xs text-yellow-600 underline">
                  Voir toutes les pharmacies
                </Link>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={reset}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('medications.try_again')}
              </button>
              {result.name && (
                <Link
                  to={`/medications?q=${encodeURIComponent(result.name)}`}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-center"
                >
                  {t('medications.search_in_db')}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: error ── */}
        {step === 'error' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            {preview && (
              <div className="mb-5 rounded-xl overflow-hidden max-h-48 flex items-center justify-center bg-gray-50">
                <img src={preview} alt="Médicament" className="max-h-48 object-contain" />
              </div>
            )}
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900">Erreur d'analyse</h2>
            <p className="text-sm text-red-500 mt-2">{errorMsg}</p>
            <button onClick={reset}
              className="mt-5 px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
              {t('medications.try_again')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
