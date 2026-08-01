import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Smartphone } from 'lucide-react';
import { AppDispatch, RootState } from '../../store';
import { loginSuccess } from '../../store/authSlice';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMMON_ALLERGIES = ['Pénicilline', 'Aspirine', 'Ibuprofène', 'Sulfamides', 'Latex', 'Arachides', 'Pollen'];
const COMMON_CONDITIONS = ['Diabète', 'Hypertension', 'Asthme', 'Épilepsie', 'VIH', 'Tuberculose', 'Drépanocytose', 'Hépatite B'];

export default function Profile() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', address: '' });
  const [medForm, setMedForm] = useState({
    bloodType: '', allergies: [] as string[], chronicConditions: [] as string[],
    doctorName: '', doctorPhone: '', emergencyContact: '', emergencyPhone: '',
  });
  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [medLoading, setMedLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'password'>('profile');
  const { canInstall, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    if (user) {
      setForm({ firstName: user.firstName || '', lastName: user.lastName || '', phone: (user as any).phone || '', address: (user as any).address || '' });
      setMedForm({
        bloodType: (user as any).bloodType || '',
        allergies: (user as any).allergies || [],
        chronicConditions: (user as any).chronicConditions || [],
        doctorName: (user as any).doctorName || '',
        doctorPhone: (user as any).doctorPhone || '',
        emergencyContact: (user as any).emergencyContact || '',
        emergencyPhone: (user as any).emergencyPhone || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiClient.put('/users/profile', form);
      dispatch(loginSuccess({ user: res.data, token: localStorage.getItem('authToken')! }));
      toast.success('Profil mis à jour');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleUpdateMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    setMedLoading(true);
    try {
      const res = await apiClient.put('/users/profile', medForm);
      dispatch(loginSuccess({ user: res.data, token: localStorage.getItem('authToken')! }));
      toast.success('Profil médical mis à jour');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setMedLoading(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 6) { toast.error('Minimum 6 caractères'); return; }
    setPwLoading(true);
    try {
      await apiClient.put('/users/password', pwForm);
      toast.success('Mot de passe mis à jour');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally { setPwLoading(false); }
  };

  const addAllergy = (val: string) => {
    const v = val.trim();
    if (!v || medForm.allergies.includes(v)) return;
    setMedForm(f => ({ ...f, allergies: [...f.allergies, v] }));
    setAllergyInput('');
  };

  const removeAllergy = (v: string) => setMedForm(f => ({ ...f, allergies: f.allergies.filter(a => a !== v) }));

  const addCondition = (val: string) => {
    const v = val.trim();
    if (!v || medForm.chronicConditions.includes(v)) return;
    setMedForm(f => ({ ...f, chronicConditions: [...f.chronicConditions, v] }));
    setConditionInput('');
  };

  const removeCondition = (v: string) => setMedForm(f => ({ ...f, chronicConditions: f.chronicConditions.filter(c => c !== v) }));

  if (!isAuthenticated || !user) return <LoadingSpinner />;

  const roleLabels: Record<string, string> = { client: 'Client', pharmacist: 'Pharmacien', driver: 'Livreur', admin: 'Administrateur' };
  const isClient = user.role === 'client';

  const TABS = [
    { key: 'profile', label: 'Informations' },
    ...(isClient ? [{ key: 'medical', label: 'Santé' }] : []),
    { key: 'password', label: 'Sécurité' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-200 rounded-full flex items-center justify-center flex-shrink-0">
              {(user as any).profilePicture ? (
                <img src={(user as any).profilePicture} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-3xl font-bold text-green-700">{user.firstName?.[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h1>
              <p className="text-gray-500">{user.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Carte PWA */}
        {!isInstalled && (
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-4 mb-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Installer l'application</p>
                <p className="text-xs text-green-100 mt-0.5">
                  {isInstalled
                    ? 'Application installée sur cet appareil'
                    : 'Accès rapide + mode hors ligne'}
                </p>
              </div>
              {canInstall && (
                <button
                  onClick={install}
                  className="flex-shrink-0 bg-white text-green-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-green-50 transition-colors"
                >
                  Installer
                </button>
              )}
              {!canInstall && !isInstalled && (
                <span className="text-xs text-green-200 text-right max-w-[100px]">
                  Ouvrez dans Chrome ou Safari
                </span>
              )}
            </div>
          </div>
        )}

        {isInstalled && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-800">Application installée</p>
              <p className="text-xs text-green-600">PharmaConnect est sur votre écran d'accueil</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Informations personnelles */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input type="text" value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input type="text" value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input type="text" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Votre adresse"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </form>
            )}

            {/* Profil médical */}
            {activeTab === 'medical' && (
              <form onSubmit={handleUpdateMedical} className="space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  Ces informations aident les pharmaciens à vous conseiller en toute sécurité. Elles restent confidentielles.
                </div>

                {/* Groupe sanguin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Groupe sanguin</label>
                  <div className="flex flex-wrap gap-2">
                    {BLOOD_TYPES.map(bt => (
                      <button key={bt} type="button"
                        onClick={() => setMedForm(f => ({ ...f, bloodType: f.bloodType === bt ? '' : bt }))}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                          medForm.bloodType === bt
                            ? 'bg-red-600 text-white border-red-600'
                            : 'border-gray-200 text-gray-600 hover:border-red-400'
                        }`}>
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allergies médicamenteuses</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {medForm.allergies.map(a => (
                      <span key={a} className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                        {a}
                        <button type="button" onClick={() => removeAllergy(a)} className="text-orange-500 hover:text-orange-700">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy(allergyInput); } }}
                      placeholder="Saisir une allergie..."
                      list="allergy-suggestions"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <datalist id="allergy-suggestions">
                      {COMMON_ALLERGIES.map(a => <option key={a} value={a} />)}
                    </datalist>
                    <button type="button" onClick={() => addAllergy(allergyInput)}
                      className="px-3 py-2 bg-orange-100 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-200">
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {COMMON_ALLERGIES.filter(a => !medForm.allergies.includes(a)).map(a => (
                      <button key={a} type="button" onClick={() => addAllergy(a)}
                        className="text-xs px-2 py-0.5 text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-orange-400 hover:text-orange-600">
                        + {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Maladies chroniques */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maladies chroniques</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {medForm.chronicConditions.map(c => (
                      <span key={c} className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        {c}
                        <button type="button" onClick={() => removeCondition(c)} className="text-purple-500 hover:text-purple-700">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={conditionInput} onChange={e => setConditionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCondition(conditionInput); } }}
                      placeholder="Saisir une maladie..."
                      list="condition-suggestions"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <datalist id="condition-suggestions">
                      {COMMON_CONDITIONS.map(c => <option key={c} value={c} />)}
                    </datalist>
                    <button type="button" onClick={() => addCondition(conditionInput)}
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-200">
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {COMMON_CONDITIONS.filter(c => !medForm.chronicConditions.includes(c)).map(c => (
                      <button key={c} type="button" onClick={() => addCondition(c)}
                        className="text-xs px-2 py-0.5 text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-purple-400 hover:text-purple-600">
                        + {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Médecin traitant */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Médecin traitant</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={medForm.doctorName} onChange={e => setMedForm(f => ({ ...f, doctorName: e.target.value }))}
                      placeholder="Nom du médecin"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <input value={medForm.doctorPhone} onChange={e => setMedForm(f => ({ ...f, doctorPhone: e.target.value }))}
                      placeholder="Téléphone"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>

                {/* Contact urgence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact d'urgence</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={medForm.emergencyContact} onChange={e => setMedForm(f => ({ ...f, emergencyContact: e.target.value }))}
                      placeholder="Nom du contact"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <input value={medForm.emergencyPhone} onChange={e => setMedForm(f => ({ ...f, emergencyPhone: e.target.value }))}
                      placeholder="Téléphone"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>

                <button type="submit" disabled={medLoading}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {medLoading ? 'Enregistrement...' : 'Enregistrer le profil médical'}
                </button>
              </form>
            )}

            {/* Sécurité */}
            {activeTab === 'password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      placeholder="••••••••" required
                      className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input type={showNewPw ? 'text' : 'password'} value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      placeholder="Minimum 6 caractères" required minLength={6}
                      className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPw ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                  {pwForm.newPassword && (
                    <div className="mt-1.5 flex gap-1">
                      {[
                        pwForm.newPassword.length >= 6,
                        /[A-Z]/.test(pwForm.newPassword),
                        /[0-9]/.test(pwForm.newPassword),
                      ].map((ok, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={pwLoading}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {pwLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
