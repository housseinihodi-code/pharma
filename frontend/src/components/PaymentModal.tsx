import { useState, useEffect, useRef } from 'react';
import { paymentService } from '../services/order.service';
import apiClient from '../services/apiClient';

interface Props {
  orderId: string;
  amount: number;
  method: 'mobile_money' | 'orange_money';
  onSuccess: () => void;
  onClose: () => void;
}

type Step = 'phone' | 'waiting' | 'success' | 'error';

const METHOD_CONFIG = {
  mobile_money: {
    label: 'MTN Mobile Money',
    color: 'yellow',
    bg: 'bg-yellow-400',
    bgLight: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    logo: (
      <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg">
        <span className="text-white font-black text-xl">MTN</span>
      </div>
    ),
    placeholder: '6XX XXX XXX',
    prefix: '+237',
    ussd: '*126#',
    hint: 'Composez le *126# pour vérifier votre solde',
  },
  orange_money: {
    label: 'Orange Money',
    color: 'orange',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-700',
    logo: (
      <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg">
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
          <circle cx="12" cy="12" r="10" />
          <text x="12" y="16" textAnchor="middle" fontSize="10" fill="orange" fontWeight="bold">OM</text>
        </svg>
      </div>
    ),
    placeholder: '6XX XXX XXX',
    prefix: '+237',
    ussd: '#150*50#',
    hint: 'Composez le #150*50# pour voir votre solde',
  },
};

const COUNTDOWN_SECONDS = 90;

export default function PaymentModal({ orderId, amount, method, onSuccess, onClose }: Props) {
  const cfg = METHOD_CONFIG[method];
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [payData, setPayData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [simulating, setSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSimulationMode, setIsSimulationMode] = useState(true);
  const [payConfig, setPayConfig] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get('/payments/config').then((res) => {
      setPayConfig(res.data);
      setIsSimulationMode(!res.data.campayConfigured);
    }).catch(() => setIsSimulationMode(true));
  }, []);

  useEffect(() => {
    if (step === 'phone') setTimeout(() => inputRef.current?.focus(), 100);
  }, [step]);

  useEffect(() => {
    if (step === 'waiting') {
      setCountdown(COUNTDOWN_SECONDS);
      intervalRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(intervalRef.current!);
            setStep('error');
            setErrorMsg('Délai expiré. Aucune confirmation reçue.');
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      // Polling statut toutes les 3s
      pollRef.current = setInterval(async () => {
        try {
          const status = await paymentService.getStatus(orderId);
          if (status.paymentStatus === 'paid') {
            clearInterval(intervalRef.current!);
            clearInterval(pollRef.current!);
            setStep('success');
          }
        } catch {/* silently ignore */}
      }, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, orderId]);

  const validatePhone = (val: string) => {
    const clean = val.replace(/\s/g, '');
    if (!clean) return 'Numéro requis';
    if (!/^6[5-9]\d{7}$/.test(clean) && !/^\+?237 ?6[5-9]\d{7}$/.test(clean)) {
      return 'Numéro Cameroun invalide (ex: 677 000 000)';
    }
    return '';
  };

  const handleSend = async () => {
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError('');
    setLoading(true);
    try {
      const data = await paymentService.initiatePayment(orderId, method, phone.replace(/\s/g, ''));
      setPayData(data);
      setStep('waiting');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Erreur lors de l\'initiation du paiement');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!payData?.reference) return;
    setSimulating(true);
    try {
      clearInterval(intervalRef.current!);
      clearInterval(pollRef.current!);
      await paymentService.simulateConfirm(orderId, payData.reference);
      setStep('success');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Erreur simulation');
      setStep('error');
    } finally {
      setSimulating(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 'waiting' ? undefined : onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* ── STEP: phone ───────────────────────────────────────────── */}
        {step === 'phone' && (
          <>
            <div className={`${cfg.bg} px-6 pt-6 pb-8`}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={onClose} className="text-white/70 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {cfg.logo}
                <div className="w-7" />
              </div>
              <h2 className="text-white font-bold text-xl text-center">{cfg.label}</h2>
              <div className="text-center mt-3">
                <span className="text-white/80 text-sm">Montant à payer</span>
                <div className="text-white font-black text-4xl mt-1">
                  {amount.toLocaleString('fr-FR')} <span className="text-2xl font-semibold">FCFA</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm text-gray-500 mb-4 text-center">
                Entrez le numéro de téléphone à débiter
              </p>
              <div className="flex gap-2">
                <div className="flex items-center px-3 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 flex-shrink-0">
                  🇨🇲 +237
                </div>
                <input
                  ref={inputRef}
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={cfg.placeholder}
                  className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-lg tracking-widest ${
                    phoneError ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-yellow-400'
                  }`}
                  maxLength={12}
                />
              </div>
              {phoneError && <p className="text-red-500 text-xs mt-1.5 ml-1">{phoneError}</p>}
              <p className="text-xs text-gray-400 mt-2 ml-1">{cfg.hint}</p>

              {/* Numéros de test Campay sandbox */}
              {payConfig?.sandbox && payConfig?.testNumbers && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Numéros de test Campay (sandbox)
                  </p>
                  <div className="space-y-1">
                    {method === 'mobile_money' ? (
                      <>
                        <button onClick={() => setPhone('677777777')}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-yellow-50 flex justify-between items-center">
                          <code className="font-mono text-yellow-700">677 777 777</code>
                          <span className="text-green-600 font-medium">→ Succès</span>
                        </button>
                        <button onClick={() => setPhone('677777770')}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 flex justify-between items-center">
                          <code className="font-mono text-red-600">677 777 770</code>
                          <span className="text-red-500 font-medium">→ Échec</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setPhone('699999999')}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-orange-50 flex justify-between items-center">
                          <code className="font-mono text-orange-600">699 999 999</code>
                          <span className="text-green-600 font-medium">→ Succès</span>
                        </button>
                        <button onClick={() => setPhone('699999990')}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 flex justify-between items-center">
                          <code className="font-mono text-red-600">699 999 990</code>
                          <span className="text-red-500 font-medium">→ Échec</span>
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Montant test : 25 XAF max — cliquez pour remplir
                  </p>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={loading || !phone}
                className={`mt-5 w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${cfg.bg} hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Envoyer la notification
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 mt-3">
                Une notification sera envoyée sur ce numéro pour saisir votre PIN
              </p>
            </div>
          </>
        )}

        {/* ── STEP: waiting ─────────────────────────────────────────── */}
        {step === 'waiting' && (
          <div className="px-6 py-8">
            {/* Barre de progression countdown */}
            <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
              <div
                className={`h-full ${cfg.bg} transition-all duration-1000`}
                style={{ width: `${100 - progress}%` }}
              />
            </div>

            <div className="text-center">
              {/* Icône pulsante */}
              <div className="relative inline-flex mb-6">
                <div className={`w-20 h-20 rounded-full ${cfg.bgLight} ${cfg.border} border-2 flex items-center justify-center`}>
                  <svg className={`w-9 h-9 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span className={`absolute -top-1 -right-1 w-5 h-5 ${cfg.bg} rounded-full animate-ping`} />
                <span className={`absolute -top-1 -right-1 w-5 h-5 ${cfg.bg} rounded-full`} />
              </div>

              <h3 className="text-gray-900 font-bold text-lg">Notification envoyée !</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                Une demande de paiement a été envoyée au
              </p>
              <p className="font-bold text-gray-900 text-lg mt-1">+237 {phone}</p>

              <div className={`mt-5 ${cfg.bgLight} ${cfg.border} border rounded-2xl p-4`}>
                <p className={`text-xs font-semibold ${cfg.text} uppercase tracking-wide mb-2`}>
                  Instructions
                </p>
                <ol className="text-sm text-gray-600 text-left space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className={`font-bold ${cfg.text} flex-shrink-0`}>1.</span>
                    Ouvrez la notification sur votre téléphone
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`font-bold ${cfg.text} flex-shrink-0`}>2.</span>
                    Ou composez le <code className="font-mono font-bold">{cfg.ussd}</code>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`font-bold ${cfg.text} flex-shrink-0`}>3.</span>
                    Entrez votre PIN secret pour confirmer
                  </li>
                </ol>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-gray-500">
                <svg className={`w-4 h-4 animate-spin ${cfg.text}`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-sm">En attente de confirmation…</span>
                <span className={`font-mono font-bold ${countdown <= 30 ? 'text-red-500' : cfg.text}`}>
                  {formatTime(countdown)}
                </span>
              </div>

              {isSimulationMode ? (
                <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                    Mode simulation — Campay non configuré
                  </p>
                  <button
                    onClick={handleSimulate}
                    disabled={simulating}
                    className="w-full py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Confirmation…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Simuler la confirmation PIN
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">
                    Ajoutez CAMPAY_USERNAME et CAMPAY_PASSWORD dans .env pour activer les vrais paiements
                  </p>
                </div>
              ) : (
                <div className="mt-5 p-3 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-xs font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Paiement réel via Campay — en attente de votre confirmation sur le téléphone
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: success ─────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="px-6 py-10 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-bold text-2xl">Paiement réussi !</h3>
            <p className="text-gray-500 text-sm mt-2">Votre paiement a été confirmé</p>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="text-green-800 font-black text-3xl">
                {amount.toLocaleString('fr-FR')} FCFA
              </div>
              <div className="text-green-600 text-sm mt-1">
                {cfg.label} • {phone}
              </div>
              {payData?.reference && (
                <div className="text-xs text-green-500 mt-2 font-mono">
                  Réf : {payData.reference}
                </div>
              )}
            </div>
            <button
              onClick={onSuccess}
              className="mt-6 w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-base hover:bg-green-700 transition-colors"
            >
              Voir ma commande
            </button>
          </div>
        )}

        {/* ── STEP: error ───────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="px-6 py-10 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-bold text-xl">Paiement échoué</h3>
            <p className="text-red-500 text-sm mt-2">{errorMsg}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-2xl text-gray-600 font-medium hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => setStep('phone')}
                className={`flex-1 py-3 ${cfg.bg} text-white rounded-2xl font-bold hover:opacity-90`}>
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
