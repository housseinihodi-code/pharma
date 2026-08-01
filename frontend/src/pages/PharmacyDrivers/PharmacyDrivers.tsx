import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Hospital, Bike, Phone, X, AlertTriangle } from 'lucide-react';
import { RootState } from '../../store';
import { pharmacyService } from '../../services/pharmacy.service';
import { driverService } from '../../services/driver.service';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  profilePicture?: string;
  createdAt?: string;
}

interface CreateForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

const EMPTY_FORM: CreateForm = {
  firstName: '', lastName: '', email: '', password: '', phone: '',
};

export default function PharmacyDrivers() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [pharmacyId, setPharmacyId] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [existingEmail, setExistingEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Driver | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    pharmacyService.getMyPharmacies().then((list: any[]) => {
      if (list.length > 0) {
        setPharmacyId(list[0]._id);
        setPharmacyName(list[0].name);
      }
    });
  }, [user]);

  const loadDrivers = useCallback(async () => {
    if (!pharmacyId) return;
    setLoading(true);
    try {
      const data = await driverService.getPharmacyDrivers(pharmacyId);
      setDrivers(data);
    } catch {
      toast.error('Erreur lors du chargement des livreurs');
    } finally {
      setLoading(false);
    }
  }, [pharmacyId]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId) return;
    setSubmitting(true);
    try {
      await driverService.createDriver(pharmacyId, {
        ...form,
        phone: form.phone || undefined,
      });
      toast.success('Livreur créé avec succès');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      loadDrivers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId) return;
    setSubmitting(true);
    try {
      await driverService.addExistingDriver(pharmacyId, existingEmail);
      toast.success('Livreur ajouté à votre équipe');
      setShowAddExisting(false);
      setExistingEmail('');
      loadDrivers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (driver: Driver) => {
    setTogglingId(driver._id);
    try {
      await driverService.toggleActive(pharmacyId, driver._id);
      toast.success(driver.isActive ? 'Livreur désactivé' : 'Livreur activé');
      loadDrivers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur');
    } finally {
      setTogglingId(null);
    }
  };

  const handleRemove = async (driver: Driver) => {
    setRemovingId(driver._id);
    try {
      await driverService.removeDriver(pharmacyId, driver._id);
      toast.success(`${driver.firstName} retiré de l'équipe`);
      setConfirmRemove(null);
      loadDrivers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setRemovingId(null);
    }
  };

  const activeCount = drivers.filter(d => d.isActive).length;
  const inactiveCount = drivers.length - activeCount;

  if (!pharmacyId && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Hospital className="w-8 h-8 text-green-600" /></div>
          <p className="mt-4 text-gray-600">Aucune pharmacie associée à votre compte.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Équipe de livreurs</h1>
            {pharmacyName && (
              <p className="text-sm text-gray-500 mt-1">
                <span className="inline-flex items-center gap-1"><Hospital className="w-3.5 h-3.5" /> {pharmacyName}</span> · {drivers.length} livreur{drivers.length !== 1 ? 's' : ''}
                {inactiveCount > 0 && (
                  <span className="text-red-500 ml-2">({inactiveCount} inactif{inactiveCount !== 1 ? 's' : ''})</span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddExisting(true); setShowCreate(false); }}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition"
            >
              + Lier un compte existant
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowAddExisting(false); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
            >
              + Créer un livreur
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-gray-800">{drivers.length}</div>
            <div className="text-xs text-gray-500 mt-1">Total</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-600">{activeCount}</div>
            <div className="text-xs text-gray-500 mt-1">Actifs</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <div className="text-3xl font-bold text-red-500">{inactiveCount}</div>
            <div className="text-xs text-gray-500 mt-1">Inactifs</div>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Nouveau livreur</h2>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                <input
                  type="text" required minLength={2}
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mohamed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text" required minLength={2}
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Diallo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="livreur@pharmacie.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+221 77 000 0000"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={6}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimum 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add existing form */}
        {showAddExisting && (
          <div className="bg-white rounded-xl border border-purple-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Lier un livreur existant</h2>
              <button onClick={() => { setShowAddExisting(false); setExistingEmail(''); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Entrez l'email d'un utilisateur ayant déjà un compte livreur. Il sera lié exclusivement à votre pharmacie.
            </p>
            <form onSubmit={handleAddExisting} className="flex gap-3">
              <input
                type="email" required
                value={existingEmail}
                onChange={e => setExistingEmail(e.target.value)}
                placeholder="email@livreur.com"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="submit" disabled={submitting}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
              >
                {submitting ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>
          </div>
        )}

        {/* Drivers list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : drivers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Bike className="w-8 h-8 text-blue-400" /></div>
            <h3 className="text-lg font-semibold text-gray-700">Aucun livreur dans votre équipe</h3>
            <p className="text-gray-500 text-sm mt-2">
              Créez des comptes livreurs ou liez des livreurs existants à votre pharmacie.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              + Créer le premier livreur
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(driver => (
              <div
                key={driver._id}
                className={`bg-white rounded-xl border p-5 shadow-sm transition ${
                  driver.isActive ? 'border-gray-200' : 'border-red-200 opacity-75'
                }`}
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                    driver.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {driver.profilePicture ? (
                      <img src={driver.profilePicture} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      driver.firstName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 truncate">
                        {driver.firstName} {driver.lastName}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        driver.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {driver.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{driver.email}</p>
                  </div>
                </div>

                {/* Details */}
                {driver.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <Phone className="w-4 h-4" />
                    <span>{driver.phone}</span>
                  </div>
                )}

                {/* Badge exclusive */}
                <div className="flex items-center gap-1 mb-4">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Exclusif à cette pharmacie
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleToggle(driver)}
                    disabled={togglingId === driver._id}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                      driver.isActive
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    } disabled:opacity-50`}
                  >
                    {togglingId === driver._id
                      ? '...'
                      : driver.isActive ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => setConfirmRemove(driver)}
                    className="py-1.5 px-3 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-orange-500" /></div>
              <h3 className="font-bold text-gray-800 text-lg">Retirer le livreur ?</h3>
              <p className="text-gray-600 text-sm mt-2">
                <strong>{confirmRemove.firstName} {confirmRemove.lastName}</strong> sera retiré de votre équipe.
                Son compte reste actif mais sans pharmacie assignée.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2 border border-gray-300 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removingId === confirmRemove._id}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {removingId === confirmRemove._id ? 'Suppression...' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
