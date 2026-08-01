import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { User, Hospital, Bike, Clock } from 'lucide-react';
import { loginSuccess } from '../../store/authSlice';
import { AppDispatch } from '../../store';

interface PharmacyOption { _id: string; name: string; address: string; phone: string; }

const ROLE_INFO = {
  client: {
    icon: <User className="w-6 h-6" />, label: 'Client',
    desc: 'Achetez vos médicaments en ligne',
    ring: 'ring-green-400 bg-green-50',
    idle: 'border-gray-200 hover:border-green-300',
  },
  pharmacist: {
    icon: <Hospital className="w-6 h-6" />, label: 'Pharmacien',
    desc: 'Gérez votre pharmacie et vos commandes',
    ring: 'ring-blue-400 bg-blue-50',
    idle: 'border-gray-200 hover:border-blue-300',
  },
  driver: {
    icon: <Bike className="w-6 h-6" />, label: 'Livreur',
    desc: 'Effectuez les livraisons d\'une pharmacie',
    ring: 'ring-purple-400 bg-purple-50',
    idle: 'border-gray-200 hover:border-purple-300',
  },
};

type Step = 'identity' | 'pharmacy-pharmacist' | 'pharmacy-driver' | 'success';

export default function Register() {
  const [step, setStep] = useState<Step>('identity');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'client' });
  const [showPassword, setShowPassword] = useState(false);

  // Pharmacies list — pharmacist sees only unowned, driver sees all
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);

  // Pharmacist state
  const [pharmacistMode, setPharmacistMode] = useState<'select' | 'create'>('select');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('');
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [newPharmacy, setNewPharmacy] = useState({ pharmacyName: '', pharmacyAddress: '', pharmacyPhone: '' });

  // Driver state
  const [driverPharmacyId, setDriverPharmacyId] = useState('');
  const [driverSearch, setDriverSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdUser, setCreatedUser] = useState<any>(null);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const needsPharmacyStep = form.role === 'pharmacist' || form.role === 'driver';

  useEffect(() => {
    if (!needsPharmacyStep) return;
    setLoadingPharmacies(true);
    // Pharmacist sees only unowned pharmacies (unclaimed), driver sees all active ones
    const qs = form.role === 'pharmacist' ? '?limit=200&unowned=true' : '?limit=200';
    fetch(`/api/pharmacies${qs}`)
      .then(r => r.json())
      .then(d => setPharmacies(d.pharmacies || []))
      .catch(() => {})
      .finally(() => setLoadingPharmacies(false));
  }, [needsPharmacyStep]);

  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const filteredForPharmacist = pharmacies.filter(p =>
    p.name.toLowerCase().includes(pharmacySearch.toLowerCase()) ||
    p.address.toLowerCase().includes(pharmacySearch.toLowerCase())
  );
  const filteredForDriver = pharmacies.filter(p =>
    p.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    p.address.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const handleIdentityNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (form.role === 'pharmacist') { setStep('pharmacy-pharmacist'); return; }
    if (form.role === 'driver') { setStep('pharmacy-driver'); return; }
    submit();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMsg('');

    if (form.role === 'pharmacist') {
      if (pharmacistMode === 'select' && !selectedPharmacyId) {
        setErrorMsg('Veuillez sélectionner une pharmacie ou choisir d\'en créer une nouvelle.');
        return;
      }
      if (pharmacistMode === 'create' && (!newPharmacy.pharmacyName || !newPharmacy.pharmacyAddress || !newPharmacy.pharmacyPhone)) {
        setErrorMsg('Veuillez renseigner toutes les informations de votre pharmacie.');
        return;
      }
    }
    if (form.role === 'driver' && !driverPharmacyId) {
      setErrorMsg('Veuillez sélectionner votre pharmacie.');
      return;
    }

    setLoading(true);
    try {
      const body: any = { ...form, email: form.email.trim().toLowerCase() };

      if (form.role === 'pharmacist') {
        if (pharmacistMode === 'select') {
          body.pharmacyId = selectedPharmacyId;
        } else {
          Object.assign(body, newPharmacy);
        }
      }
      if (form.role === 'driver') {
        body.pharmacyId = driverPharmacyId;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || `Erreur ${res.status}`);
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      localStorage.setItem('authToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      dispatch(loginSuccess({ user: data.user, token: data.accessToken }));

      if (form.role === 'pharmacist') {
        // Pharmacist goes to pending approval page
        setCreatedUser(data.user);
        setStep('success');
      } else if (form.role === 'driver') {
        toast.success('Compte créé avec succès !');
        navigate('/livreur');
      } else {
        toast.success('Compte créé avec succès !');
        navigate('/');
      }
    } catch {
      const msg = 'Impossible de joindre le serveur.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Page de confirmation pour pharmacien ────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl p-10">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Inscription soumise !</h1>
            <p className="text-gray-600 mb-4">
              Votre demande d'inscription en tant que pharmacien est en cours d'examen.
              Un administrateur va vérifier votre dossier sous <strong>24 à 48h</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left mb-6">
              <p className="font-semibold mb-1">Ce qui va se passer :</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-700">
                <li>L'admin examine votre dossier et votre pharmacie</li>
                <li>Vous recevez une notification de validation (ou de rejet avec motif)</li>
                <li>Une fois validé, vous accédez à votre tableau de bord</li>
              </ol>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Compte créé pour : <strong>{createdUser?.email}</strong>
            </p>
            <button onClick={() => navigate('/pending-approval')}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition">
              Voir le statut de mon compte
            </button>
            <Link to="/" className="block mt-3 text-sm text-gray-400 hover:text-gray-600">
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Étape 1 : identité ───────────────────────────────────────────────────
  if (step === 'identity') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 bg-green-600 rounded-2xl items-center justify-center mb-4">
              <span className="text-white font-bold text-3xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
            <p className="text-gray-500 mt-1">Rejoignez PharmaConnect</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleIdentityNext} className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{errorMsg}</div>
              )}

              {/* Role cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de compte</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(ROLE_INFO) as [string, typeof ROLE_INFO.client][]).map(([role, info]) => (
                    <button key={role} type="button"
                      onClick={() => setForm(f => ({ ...f, role }))}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 text-center transition cursor-pointer ${
                        form.role === role
                          ? `ring-2 ${info.ring} border-transparent`
                          : `bg-white ${info.idle}`
                      }`}
                    >
                      <span className="mb-1">{info.icon}</span>
                      <span className="font-semibold text-xs text-gray-800">{info.label}</span>
                      <span className="text-xs text-gray-400 mt-0.5 leading-tight hidden sm:block">{info.desc}</span>
                    </button>
                  ))}
                </div>

                {form.role === 'pharmacist' && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                    <strong>Note :</strong> L'accès à votre espace sera activé après validation par un administrateur (24-48h).
                  </div>
                )}
                {form.role === 'driver' && (
                  <p className="mt-2 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                    À l'étape suivante, vous choisirez la pharmacie pour laquelle vous travaillez.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" value={form.firstName} onChange={setF('firstName')} placeholder="Prénom" required minLength={2}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={form.lastName} onChange={setF('lastName')} placeholder="Nom" required minLength={2}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={setF('email')} placeholder="votre@email.com" required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={form.phone} onChange={setF('phone')} placeholder="+221 77 000 0000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={setF('password')}
                    placeholder="••••••••" required minLength={6}
                    className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>

              <button type="submit"
                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition mt-2">
                {form.role === 'client' ? 'Créer mon compte' : 'Continuer →'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-green-600 font-medium hover:underline">Se connecter</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Étape 2 Pharmacien : choisir ou créer sa pharmacie ──────────────────
  if (step === 'pharmacy-pharmacist') {
    const selectedPharmacy = pharmacies.find(p => p._id === selectedPharmacyId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          {/* Breadcrumb */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">✓</span>
              Identité
            </div>
            <div className="w-10 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              Ma pharmacie
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Hospital className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Votre pharmacie</h2>
                <p className="text-sm text-gray-500">Sélectionnez ou créez votre établissement</p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">{errorMsg}</div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => { setPharmacistMode('select'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition ${
                  pharmacistMode === 'select'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                Sélectionner une pharmacie existante
              </button>
              <button
                type="button"
                onClick={() => { setPharmacistMode('create'); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition ${
                  pharmacistMode === 'create'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                Créer une nouvelle pharmacie
              </button>
            </div>

            {/* SELECT existing */}
            {pharmacistMode === 'select' && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 mb-4">
                  Sélectionnez la pharmacie que vous gérez. Un administrateur vérifiera votre demande avant de valider votre accès.
                </div>

                <input
                  type="text"
                  placeholder="Rechercher par nom ou adresse..."
                  value={pharmacySearch}
                  onChange={e => setPharmacySearch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />

                {loadingPharmacies ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Chargement des pharmacies...</div>
                ) : filteredForPharmacist.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">Aucune pharmacie trouvée.</p>
                    <button type="button" onClick={() => setPharmacistMode('create')}
                      className="mt-2 text-blue-600 text-sm hover:underline">
                      Créer ma pharmacie →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {filteredForPharmacist.map(ph => (
                      <button key={ph._id} type="button"
                        onClick={() => setSelectedPharmacyId(ph._id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition ${
                          selectedPharmacyId === ph._id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                            selectedPharmacyId === ph._id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {ph.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-800">{ph.name}</p>
                            <p className="text-xs text-gray-400 truncate">{ph.address}</p>
                            <p className="text-xs text-gray-400">{ph.phone}</p>
                          </div>
                          {selectedPharmacyId === ph._id && (
                            <span className="ml-auto text-blue-600 font-bold flex-shrink-0">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPharmacy && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                    <strong>Sélectionnée :</strong> {selectedPharmacy.name}
                  </div>
                )}
              </div>
            )}

            {/* CREATE new */}
            {pharmacistMode === 'create' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  La fiche de votre pharmacie sera créée et activée après validation par l'administrateur.
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la pharmacie *</label>
                  <input type="text" required minLength={2}
                    value={newPharmacy.pharmacyName}
                    onChange={e => setNewPharmacy(p => ({ ...p, pharmacyName: e.target.value }))}
                    placeholder="Ex: Pharmacie du Centre"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input type="text" required
                    value={newPharmacy.pharmacyAddress}
                    onChange={e => setNewPharmacy(p => ({ ...p, pharmacyAddress: e.target.value }))}
                    placeholder="Ex: 12 Avenue Cheikh Anta Diop, Dakar"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input type="tel" required
                    value={newPharmacy.pharmacyPhone}
                    onChange={e => setNewPharmacy(p => ({ ...p, pharmacyPhone: e.target.value }))}
                    placeholder="+221 33 000 0000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setStep('identity'); setErrorMsg(''); }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                ← Retour
              </button>
              <button type="button" onClick={submit} disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                {loading ? 'Envoi en cours...' : 'Soumettre ma demande'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Étape 2 Livreur : choisir sa pharmacie ───────────────────────────────
  if (step === 'pharmacy-driver') {
    const selectedDriverPharmacy = pharmacies.find(p => p._id === driverPharmacyId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Breadcrumb */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">✓</span>
              Identité
            </div>
            <div className="w-10 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
              <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
              Ma pharmacie
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bike className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Votre pharmacie employeur</h2>
                <p className="text-sm text-gray-500">Choisissez l'établissement qui vous emploie</p>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">{errorMsg}</div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 mb-4">
              Vous serez lié exclusivement à cette pharmacie. Le responsable peut modifier ce lien ultérieurement.
            </div>

            <input
              type="text"
              placeholder="Rechercher une pharmacie..."
              value={driverSearch}
              onChange={e => setDriverSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            {loadingPharmacies ? (
              <div className="text-center py-6 text-gray-400 text-sm">Chargement des pharmacies...</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredForDriver.map(ph => (
                  <button key={ph._id} type="button"
                    onClick={() => setDriverPharmacyId(ph._id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition ${
                      driverPharmacyId === ph._id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        driverPharmacyId === ph._id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {ph.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{ph.name}</p>
                        <p className="text-xs text-gray-400 truncate">{ph.address}</p>
                      </div>
                      {driverPharmacyId === ph._id && (
                        <span className="ml-auto text-purple-600 font-bold flex-shrink-0">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedDriverPharmacy && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-800">
                <strong>Sélectionnée :</strong> {selectedDriverPharmacy.name} — {selectedDriverPharmacy.address}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setStep('identity'); setErrorMsg(''); }}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition">
                ← Retour
              </button>
              <button type="button" onClick={submit} disabled={loading || !driverPharmacyId}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition">
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
