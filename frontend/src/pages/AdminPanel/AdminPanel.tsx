import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Hospital, UserCheck, Clock, Bike, Users, Check, X, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RootState } from '../../store';
import apiClient from '../../services/apiClient';
import LoadingSpinner from '../../components/LoadingSpinner';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface PharmacyRef {
  _id: string; name: string; address: string; phone: string; isActive: boolean;
}

interface PendingUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'pharmacist' | 'driver';
  createdAt: string;
  rejectionReason?: string;
  pharmacyId?: PharmacyRef | null;
}

interface PharmacyWithOwner {
  _id: string; name: string; address: string; phone: string; email?: string;
  isActive: boolean; isOpen: boolean; createdAt: string; licenseNumber?: string;
  ownerId?: { _id: string; firstName: string; lastName: string; email: string; isActive: boolean; isApproved: boolean } | null;
}

interface AdminUser {
  _id: string; firstName: string; lastName: string; email: string; phone?: string;
  role: 'pharmacist' | 'driver' | 'client';
  isActive: boolean; isApproved?: boolean; createdAt: string;
  pharmacyId?: { _id: string; name: string; isActive: boolean } | null;
}

interface AdminStats {
  totalPharmacies: number; activePharmacies: number; orphanPharmacies: number;
  totalPharmacists: number; pendingPharmacists: number; rejectedPharmacists: number;
  totalDrivers: number; pendingDrivers: number; totalClients: number;
}

const REJECT_PRESETS = [
  'Dossier incomplet',
  'Informations non vérifiables',
  'Licence pharmaceutique non valide',
  'Doublon avec un compte existant',
  'Antécédents judiciaires signalés',
];

type Tab = 'validation' | 'create' | 'pharmacies' | 'users';
type CreateRole = 'pharmacist' | 'driver' | 'pharmacy';

const EMPTY_PHARMACIST = {
  firstName: '', lastName: '', email: '', password: '', phone: '',
  pharmacyMode: 'new' as 'new' | 'existing',
  pharmacyId: '',
  pharmacyName: '', pharmacyAddress: '', pharmacyPhone: '', pharmacyEmail: '', licenseNumber: '',
};

const EMPTY_DRIVER = {
  firstName: '', lastName: '', email: '', password: '', phone: '', pharmacyId: '',
};

const EMPTY_PHARMACY = {
  name: '', address: '', phone: '', email: '', licenseNumber: '', description: '',
  longitude: '', latitude: '',
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function StatCard({ value, label, icon, warn }: { value: number; label: string; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 ${warn && value > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <div className={`flex-shrink-0 ${warn && value > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{icon}</div>
      <div>
        <p className={`text-xl font-bold leading-tight ${warn && value > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  );
}

function Avatar({ name, bg }: { name: string; bg: string }) {
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0 ${bg}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400';

/* ══════════════════════════════════════════════════════════════════════════
   Composant principal
══════════════════════════════════════════════════════════════════════════ */
export default function AdminPanel() {
  const { user } = useSelector((s: RootState) => s.auth);
  const [tab, setTab] = useState<Tab>('validation');

  const [stats, setStats] = useState<AdminStats | null>(null);

  // Validation
  const [pendingPharmacists, setPendingPharmacists] = useState<PendingUser[]>([]);
  const [rejectedPharmacists, setRejectedPharmacists] = useState<PendingUser[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<PendingUser[]>([]);
  const [rejectedDrivers, setRejectedDrivers] = useState<PendingUser[]>([]);
  const [loadingValidation, setLoadingValidation] = useState(true);
  const [showRejectedPharm, setShowRejectedPharm] = useState(false);
  const [showRejectedDriver, setShowRejectedDriver] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<PendingUser | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Create
  const [createRole, setCreateRole] = useState<CreateRole>('pharmacist');
  const [pharmForm, setPharmForm] = useState(EMPTY_PHARMACIST);
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER);
  const [pharmacyForm, setPharmacyForm] = useState(EMPTY_PHARMACY);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [unownedPharmacies, setUnownedPharmacies] = useState<PharmacyWithOwner[]>([]);
  const [allPharmacies, setAllPharmacies] = useState<PharmacyWithOwner[]>([]);

  // Pharmacies
  const [pharmacies, setPharmacies] = useState<PharmacyWithOwner[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [pharmacyFilter, setPharmacyFilter] = useState<'all' | 'active' | 'inactive' | 'orphan'>('all');
  const [assignModal, setAssignModal] = useState<PharmacyWithOwner | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [togglingPharmacyId, setTogglingPharmacyId] = useState<string | null>(null);

  // Users
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'pharmacist' | 'driver' | 'client'>('all');
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const setP = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setPharmForm(f => ({ ...f, [k]: e.target.value }));
  const setD = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDriverForm(f => ({ ...f, [k]: e.target.value }));
  const setPh = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setPharmacyForm(f => ({ ...f, [k]: e.target.value }));

  /* ── Loaders ── */
  const loadStats = useCallback(async () => {
    try { setStats(await apiClient.get('/users/admin/stats').then(r => r.data)); }
    catch { /* silent */ }
  }, []);

  const loadValidation = useCallback(async () => {
    setLoadingValidation(true);
    try {
      const [pp, rp, pd, rd] = await Promise.all([
        apiClient.get('/users/admin/pending-pharmacists').then(r => r.data),
        apiClient.get('/users/admin/rejected-pharmacists').then(r => r.data),
        apiClient.get('/users/admin/pending-drivers').then(r => r.data),
        apiClient.get('/users/admin/rejected-drivers').then(r => r.data),
      ]);
      setPendingPharmacists(pp);
      setRejectedPharmacists(rp);
      setPendingDrivers(pd);
      setRejectedDrivers(rd);
    } catch { toast.error('Erreur chargement des demandes'); }
    finally { setLoadingValidation(false); }
  }, []);

  const loadPharmacies = useCallback(async () => {
    setLoadingPharmacies(true);
    try { setPharmacies(await apiClient.get('/users/admin/pharmacies').then(r => r.data)); }
    catch { toast.error('Erreur chargement pharmacies'); }
    finally { setLoadingPharmacies(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try { setAllUsers(await apiClient.get('/users/admin/all-users').then(r => r.data)); }
    catch { toast.error('Erreur chargement utilisateurs'); }
    finally { setLoadingUsers(false); }
  }, []);

  const loadUnownedPharmacies = useCallback(async () => {
    try {
      const data = await apiClient.get('/pharmacies?unowned=true&limit=100').then(r => r.data);
      setUnownedPharmacies(data.pharmacies || []);
    } catch { /* silent */ }
  }, []);

  const loadAllPharmacies = useCallback(async () => {
    try { setAllPharmacies(await apiClient.get('/users/admin/pharmacies').then(r => r.data)); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { loadStats(); loadValidation(); }, [loadStats, loadValidation]);

  useEffect(() => {
    if (tab === 'pharmacies') loadPharmacies();
    if (tab === 'users') loadUsers();
    if (tab === 'create') { loadUnownedPharmacies(); loadAllPharmacies(); }
  }, [tab, loadPharmacies, loadUsers, loadUnownedPharmacies, loadAllPharmacies]);

  /* ── Actions validation ── */
  const handleApprove = async (u: PendingUser) => {
    setActionId(u._id);
    try {
      await apiClient.put(`/users/admin/${u._id}/approve`);
      toast.success(`${u.firstName} ${u.lastName} approuvé(e)`);
      if (u.role === 'pharmacist') setPendingPharmacists(p => p.filter(x => x._id !== u._id));
      else setPendingDrivers(p => p.filter(x => x._id !== u._id));
      loadStats();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setActionId(null); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) { toast.error('Indiquez un motif'); return; }
    setActionId(rejectModal._id);
    try {
      await apiClient.put(`/users/admin/${rejectModal._id}/reject`, { reason: rejectReason });
      toast.success('Demande rejetée');
      const rejected = { ...rejectModal, rejectionReason: rejectReason };
      if (rejectModal.role === 'pharmacist') {
        setPendingPharmacists(p => p.filter(x => x._id !== rejectModal._id));
        setRejectedPharmacists(p => [rejected, ...p]);
      } else {
        setPendingDrivers(p => p.filter(x => x._id !== rejectModal._id));
        setRejectedDrivers(p => [rejected, ...p]);
      }
      setRejectModal(null); setRejectReason('');
      loadStats();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setActionId(null); }
  };

  const handleReconsider = async (u: PendingUser) => {
    setActionId(u._id);
    try {
      await apiClient.put(`/users/admin/${u._id}/reconsider`);
      toast.success(`${u.firstName} ${u.lastName} remis en attente`);
      const pending = { ...u, rejectionReason: undefined };
      if (u.role === 'pharmacist') {
        setRejectedPharmacists(p => p.filter(x => x._id !== u._id));
        setPendingPharmacists(p => [pending, ...p]);
      } else {
        setRejectedDrivers(p => p.filter(x => x._id !== u._id));
        setPendingDrivers(p => [pending, ...p]);
      }
      loadStats();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setActionId(null); }
  };

  /* ── Actions pharmacies ── */
  const handleTogglePharmacy = async (ph: PharmacyWithOwner) => {
    setTogglingPharmacyId(ph._id);
    try {
      const updated = await apiClient.put(`/users/admin/pharmacy/${ph._id}/toggle-active`).then(r => r.data);
      setPharmacies(p => p.map(x => x._id === ph._id ? { ...x, isActive: updated.isActive } : x));
      toast.success(`Pharmacie ${updated.isActive ? 'activée' : 'désactivée'}`);
      loadStats();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setTogglingPharmacyId(null); }
  };

  const handleAssign = async (pharmacistId: string) => {
    if (!assignModal) return;
    setAssigningId(pharmacistId);
    try {
      await apiClient.put(`/users/admin/pharmacy/${assignModal._id}/assign`, { pharmacistId });
      toast.success('Pharmacien assigné');
      setAssignModal(null); loadPharmacies(); loadStats();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setAssigningId(null); }
  };

  /* ── Actions users ── */
  const handleToggleUser = async (u: AdminUser) => {
    setTogglingUserId(u._id);
    try {
      await apiClient.put(`/users/${u._id}/toggle-active`);
      setAllUsers(p => p.map(x => x._id === u._id ? { ...x, isActive: !x.isActive } : x));
      toast.success(`Compte ${u.isActive ? 'désactivé' : 'activé'}`);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setTogglingUserId(null); }
  };

  /* ── Actions create ── */
  const handleCreatePharmacist = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setCreatedResult(null);
    try {
      let data: any;
      if (pharmForm.pharmacyMode === 'existing') {
        if (!pharmForm.pharmacyId) { toast.error('Sélectionnez une pharmacie'); setCreating(false); return; }
        data = await apiClient.post('/users/admin/create-pharmacist', {
          firstName: pharmForm.firstName, lastName: pharmForm.lastName,
          email: pharmForm.email, password: pharmForm.password, phone: pharmForm.phone || undefined,
          existingPharmacyId: pharmForm.pharmacyId,
        }).then(r => r.data);
      } else {
        data = await apiClient.post('/users/admin/create-pharmacist', {
          firstName: pharmForm.firstName, lastName: pharmForm.lastName,
          email: pharmForm.email, password: pharmForm.password, phone: pharmForm.phone || undefined,
          pharmacyName: pharmForm.pharmacyName, pharmacyAddress: pharmForm.pharmacyAddress,
          pharmacyPhone: pharmForm.pharmacyPhone, pharmacyEmail: pharmForm.pharmacyEmail || undefined,
          licenseNumber: pharmForm.licenseNumber || undefined,
        }).then(r => r.data);
      }
      setCreatedResult({ ...data, role: 'pharmacist' });
      toast.success('Compte pharmacien créé');
      setPharmForm(EMPTY_PHARMACIST); loadStats(); loadUnownedPharmacies();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setCreating(false); }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setCreatedResult(null);
    try {
      const data = await apiClient.post('/users/admin/create-driver', {
        firstName: driverForm.firstName, lastName: driverForm.lastName,
        email: driverForm.email, password: driverForm.password,
        phone: driverForm.phone || undefined,
        pharmacyId: driverForm.pharmacyId || undefined,
      }).then(r => r.data);
      setCreatedResult({ ...data, role: 'driver' });
      toast.success('Compte livreur créé');
      setDriverForm(EMPTY_DRIVER); loadStats();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur'); }
    finally { setCreating(false); }
  };

  const handleCreatePharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setCreatedResult(null);
    try {
      const payload: any = {
        name: pharmacyForm.name,
        address: pharmacyForm.address,
        phone: pharmacyForm.phone,
        email: pharmacyForm.email || undefined,
        licenseNumber: pharmacyForm.licenseNumber || undefined,
        description: pharmacyForm.description || undefined,
      };
      if (pharmacyForm.longitude && pharmacyForm.latitude) {
        payload.longitude = parseFloat(pharmacyForm.longitude);
        payload.latitude = parseFloat(pharmacyForm.latitude);
      }
      const data = await apiClient.post('/users/admin/create-pharmacy', payload).then(r => r.data);
      setCreatedResult({ pharmacy: data, role: 'pharmacy' });
      toast.success(`Pharmacie "${data.name}" créée`);
      setPharmacyForm(EMPTY_PHARMACY);
      loadStats(); loadPharmacies(); loadUnownedPharmacies();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Erreur création pharmacie'); }
    finally { setCreating(false); }
  };

  /* ── Filtres ── */
  const filteredPharmacies = pharmacies.filter(p => {
    const q = pharmacySearch.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
    const matchFilter =
      pharmacyFilter === 'all' ? true :
      pharmacyFilter === 'active' ? p.isActive :
      pharmacyFilter === 'inactive' ? !p.isActive : !p.ownerId;
    return matchSearch && matchFilter;
  });

  const filteredUsers = allUsers.filter(u => {
    const q = userSearch.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  const assignCandidates = allUsers
    .filter(u => u.role === 'pharmacist' && u.isApproved && !u.pharmacyId)
    .filter(u => {
      const q = assignSearch.toLowerCase();
      return !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

  const totalPending = (stats?.pendingPharmacists ?? pendingPharmacists.length) + (stats?.pendingDrivers ?? pendingDrivers.length);

  const TABS = [
    { key: 'validation' as Tab, icon: <Clock className="w-4 h-4" />, label: 'Validations', badge: totalPending },
    { key: 'create' as Tab, icon: <UserCheck className="w-4 h-4" />, label: 'Créer compte', badge: 0 },
    { key: 'pharmacies' as Tab, icon: <Hospital className="w-4 h-4" />, label: 'Pharmacies', badge: stats?.orphanPharmacies ?? 0 },
    { key: 'users' as Tab, icon: <Users className="w-4 h-4" />, label: 'Utilisateurs', badge: 0 },
  ];

  const ROLE_COLOR: Record<string, string> = {
    pharmacist: 'bg-blue-100 text-blue-700',
    driver: 'bg-violet-100 text-violet-700',
    client: 'bg-gray-100 text-gray-600',
  };
  const ROLE_LABEL: Record<string, string> = { pharmacist: 'Pharmacien', driver: 'Livreur', client: 'Client' };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
              <p className="text-gray-400 text-sm">{user?.firstName} {user?.lastName} · PharmaConnect</p>
            </div>
          </div>
          <button onClick={() => { loadStats(); loadValidation(); }}
            className="self-start sm:self-auto text-sm px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition">
            ↻ Actualiser
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatCard value={stats.totalPharmacies} label="Pharmacies" icon={<Hospital className="w-5 h-5" />} />
            <StatCard value={stats.totalPharmacists} label="Pharmaciens" icon={<UserCheck className="w-5 h-5" />} />
            <StatCard value={stats.pendingPharmacists + stats.pendingDrivers} label="En attente" icon={<Clock className="w-5 h-5" />} warn />
            <StatCard value={stats.totalDrivers} label="Livreurs" icon={<Bike className="w-5 h-5" />} />
            <StatCard value={stats.totalClients} label="Clients" icon={<Users className="w-5 h-5" />} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                tab === t.key ? 'bg-green-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ TAB VALIDATIONS ═══════════════════════════════════════════════ */}
        {tab === 'validation' && (
          <div className="space-y-6">

            {/* Pharmaciens en attente */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">Pharmaciens en attente</h2>
                  {pendingPharmacists.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingPharmacists.length}</span>
                  )}
                </div>
                <button onClick={loadValidation} className="text-xs text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200">Actualiser</button>
              </div>
              {loadingValidation ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : pendingPharmacists.length === 0 ? (
                <EmptyState icon={<Check className="w-12 h-12 text-green-400" />} title="Aucun pharmacien en attente" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingPharmacists.map(p => (
                    <PendingRow key={p._id} u={p} actionId={actionId}
                      onApprove={() => handleApprove(p)}
                      onReject={() => { setRejectModal(p); setRejectReason(''); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Livreurs en attente */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">Livreurs en attente</h2>
                  {pendingDrivers.length > 0 && (
                    <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingDrivers.length}</span>
                  )}
                </div>
              </div>
              {loadingValidation ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : pendingDrivers.length === 0 ? (
                <EmptyState icon={<Bike className="w-12 h-12 text-gray-300" />} title="Aucun livreur en attente" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingDrivers.map(d => (
                    <PendingRow key={d._id} u={d} actionId={actionId}
                      onApprove={() => handleApprove(d)}
                      onReject={() => { setRejectModal(d); setRejectReason(''); }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Rejetés accordion */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition" onClick={() => setShowRejectedPharm(v => !v)}>
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">Pharmaciens rejetés</h2>
                  {rejectedPharmacists.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{rejectedPharmacists.length}</span>}
                </div>
                <span className="text-gray-400 text-xs">{showRejectedPharm ? '▲' : '▼'}</span>
              </button>
              {showRejectedPharm && (
                rejectedPharmacists.length === 0 ? (
                  <div className="text-center py-10 border-t"><p className="text-gray-400 text-sm">Aucune demande rejetée</p></div>
                ) : (
                  <div className="divide-y divide-gray-100 border-t">
                    {rejectedPharmacists.map(p => (
                      <RejectedRow key={p._id} u={p} actionId={actionId} onReconsider={() => handleReconsider(p)} />
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition" onClick={() => setShowRejectedDriver(v => !v)}>
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">Livreurs rejetés</h2>
                  {rejectedDrivers.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{rejectedDrivers.length}</span>}
                </div>
                <span className="text-gray-400 text-xs">{showRejectedDriver ? '▲' : '▼'}</span>
              </button>
              {showRejectedDriver && (
                rejectedDrivers.length === 0 ? (
                  <div className="text-center py-10 border-t"><p className="text-gray-400 text-sm">Aucun livreur rejeté</p></div>
                ) : (
                  <div className="divide-y divide-gray-100 border-t">
                    {rejectedDrivers.map(d => (
                      <RejectedRow key={d._id} u={d} actionId={actionId} onReconsider={() => handleReconsider(d)} />
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ══ TAB CRÉER COMPTE ══════════════════════════════════════════════ */}
        {tab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

              {/* Sélection rôle */}
              <div className="flex gap-2 mb-6">
                {([
                  { key: 'pharmacist' as CreateRole, icon: <UserCheck className="w-4 h-4" />, label: 'Pharmacien' },
                  { key: 'driver' as CreateRole, icon: <Bike className="w-4 h-4" />, label: 'Livreur' },
                  { key: 'pharmacy' as CreateRole, icon: <Hospital className="w-4 h-4" />, label: 'Pharmacie' },
                ]).map(r => (
                  <button key={r.key} onClick={() => { setCreateRole(r.key); setCreatedResult(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-semibold transition ${
                      createRole === r.key
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                    }`}>
                    <span>{r.icon}</span> {r.label}
                  </button>
                ))}
              </div>

              {createdResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                  <p className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-1.5"><Check className="w-4 h-4" /> {createdResult.role === 'pharmacy' ? 'Pharmacie créée !' : 'Compte créé avec succès !'}</p>
                  <div className="text-xs text-green-700 space-y-0.5">
                    {createdResult.role === 'pharmacy' ? (
                      <>
                        <p><strong>Pharmacie :</strong> {createdResult.pharmacy?.name}</p>
                        <p><strong>Adresse :</strong> {createdResult.pharmacy?.address}</p>
                        <p className="mt-2 font-medium text-green-600">Statut : inactive — activée automatiquement à l'assignation d'un gérant.</p>
                      </>
                    ) : (
                      <>
                        <p><strong>Nom :</strong> {createdResult.user?.firstName} {createdResult.user?.lastName}</p>
                        <p><strong>Email :</strong> {createdResult.user?.email}</p>
                        {createdResult.pharmacy?.name && <p><strong>Pharmacie :</strong> {createdResult.pharmacy?.name}</p>}
                        <p className="mt-2 font-medium text-green-600">Transmettez les identifiants à la personne.</p>
                      </>
                    )}
                  </div>
                  <button onClick={() => setCreatedResult(null)} className="mt-2 text-xs text-green-600 hover:underline">
                    Créer un autre
                  </button>
                </div>
              )}

              {/* Formulaire pharmacien */}
              {createRole === 'pharmacist' && (
                <form onSubmit={handleCreatePharmacist} className="space-y-5">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    Compte pharmacien
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Prénom *"><input type="text" required minLength={2} value={pharmForm.firstName} onChange={setP('firstName')} placeholder="Prénom" className={inputCls} /></Field>
                      <Field label="Nom *"><input type="text" required minLength={2} value={pharmForm.lastName} onChange={setP('lastName')} placeholder="Nom" className={inputCls} /></Field>
                    </div>
                    <Field label="Email *"><input type="email" required value={pharmForm.email} onChange={setP('email')} placeholder="pharmacien@email.com" className={inputCls} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Téléphone"><input type="tel" value={pharmForm.phone} onChange={setP('phone')} placeholder="+237 6 70 00 00 00" className={inputCls} /></Field>
                      <Field label="Mot de passe *">
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} required minLength={6} value={pharmForm.password} onChange={setP('password')} placeholder="Min. 6 caractères" className={`${inputCls} pr-16`} />
                          <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">{showPassword ? 'Masquer' : 'Voir'}</button>
                        </div>
                      </Field>
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      Pharmacie associée
                    </h3>
                    <div className="flex gap-2 mb-4">
                      {(['new', 'existing'] as const).map(mode => (
                        <button key={mode} type="button"
                          onClick={() => setPharmForm(f => ({ ...f, pharmacyMode: mode }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${pharmForm.pharmacyMode === mode ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'}`}>
                          {mode === 'new' ? '+ Nouvelle pharmacie' : <span className="flex items-center gap-1"><Hospital className="w-3.5 h-3.5" /> Pharmacie existante</span>}
                        </button>
                      ))}
                    </div>

                    {pharmForm.pharmacyMode === 'new' ? (
                      <div className="space-y-3">
                        <Field label="Nom de la pharmacie *"><input type="text" required value={pharmForm.pharmacyName} onChange={setP('pharmacyName')} placeholder="Ex: Pharmacie du Marché" className={inputCls} /></Field>
                        <Field label="Adresse *"><input type="text" required value={pharmForm.pharmacyAddress} onChange={setP('pharmacyAddress')} placeholder="Quartier, Rue, Ville" className={inputCls} /></Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Téléphone *"><input type="tel" required value={pharmForm.pharmacyPhone} onChange={setP('pharmacyPhone')} placeholder="+237 2 22 00 00 00" className={inputCls} /></Field>
                          <Field label="Email pharmacie"><input type="email" value={pharmForm.pharmacyEmail} onChange={setP('pharmacyEmail')} placeholder="contact@pharmacie.com" className={inputCls} /></Field>
                        </div>
                        <Field label="N° de licence"><input type="text" value={pharmForm.licenseNumber} onChange={setP('licenseNumber')} placeholder="Ex: PHAM-2024-0042" className={inputCls} /></Field>
                      </div>
                    ) : (
                      unownedPharmacies.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                          Aucune pharmacie sans gérant disponible.
                        </div>
                      ) : (
                        <Field label={`Pharmacie sans gérant (${unownedPharmacies.length})`}>
                          <select required={pharmForm.pharmacyMode === 'existing'} value={pharmForm.pharmacyId}
                            onChange={e => setPharmForm(f => ({ ...f, pharmacyId: e.target.value }))} className={inputCls}>
                            <option value="">— Choisir —</option>
                            {unownedPharmacies.map(p => <option key={p._id} value={p._id}>{p.name} · {p.address}</option>)}
                          </select>
                        </Field>
                      )
                    )}
                  </div>

                  <button type="submit" disabled={creating} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                    {creating ? 'Création...' : 'Créer le compte pharmacien'}
                  </button>
                </form>
              )}

              {/* Formulaire pharmacie seule */}
              {createRole === 'pharmacy' && (
                <form onSubmit={handleCreatePharmacy} className="space-y-4">
                  <Field label="Nom de la pharmacie *">
                    <input type="text" required minLength={2} value={pharmacyForm.name} onChange={setPh('name')} placeholder="Ex: Pharmacie Centrale Bastos" className={inputCls} />
                  </Field>
                  <Field label="Adresse *">
                    <input type="text" required value={pharmacyForm.address} onChange={setPh('address')} placeholder="Quartier, Rue, Ville — ex: Bastos, Yaoundé" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Téléphone *">
                      <input type="tel" required value={pharmacyForm.phone} onChange={setPh('phone')} placeholder="+237 2 22 00 00 00" className={inputCls} />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={pharmacyForm.email} onChange={setPh('email')} placeholder="contact@pharmacie.cm" className={inputCls} />
                    </Field>
                  </div>
                  <Field label="N° de licence pharmaceutique">
                    <input type="text" value={pharmacyForm.licenseNumber} onChange={setPh('licenseNumber')} placeholder="Ex: PHAM-2024-0042" className={inputCls} />
                  </Field>
                  <Field label="Description">
                    <textarea value={pharmacyForm.description} onChange={setPh('description')} placeholder="Spécialités, services proposés..." rows={2}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                  </Field>
                  <div className="border-t pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-3">Coordonnées GPS (optionnel — pour affichage sur la carte)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Longitude">
                        <input type="number" step="any" value={pharmacyForm.longitude} onChange={setPh('longitude')} placeholder="Ex: 11.5021" className={inputCls} />
                      </Field>
                      <Field label="Latitude">
                        <input type="number" step="any" value={pharmacyForm.latitude} onChange={setPh('latitude')} placeholder="Ex: 3.8480" className={inputCls} />
                      </Field>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Yaoundé centre : longitude 11.5021 / latitude 3.8480 — ou cherchez sur <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OpenStreetMap</a>
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    <strong>Note :</strong> La pharmacie sera créée en statut <em>inactive</em>. Elle sera activée automatiquement lors de l'assignation d'un gérant (pharmacien).
                  </div>
                  <button type="submit" disabled={creating} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                    {creating ? 'Création...' : 'Créer la pharmacie'}
                  </button>
                </form>
              )}

              {/* Formulaire livreur */}
              {createRole === 'driver' && (
                <form onSubmit={handleCreateDriver} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom *"><input type="text" required minLength={2} value={driverForm.firstName} onChange={setD('firstName')} placeholder="Prénom" className={inputCls} /></Field>
                    <Field label="Nom *"><input type="text" required minLength={2} value={driverForm.lastName} onChange={setD('lastName')} placeholder="Nom" className={inputCls} /></Field>
                  </div>
                  <Field label="Email *"><input type="email" required value={driverForm.email} onChange={setD('email')} placeholder="livreur@email.com" className={inputCls} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Téléphone"><input type="tel" value={driverForm.phone} onChange={setD('phone')} placeholder="+237 6 70 00 00 00" className={inputCls} /></Field>
                    <Field label="Mot de passe *">
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required minLength={6} value={driverForm.password} onChange={setD('password')} placeholder="Min. 6 caractères" className={`${inputCls} pr-16`} />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">{showPassword ? 'Masquer' : 'Voir'}</button>
                      </div>
                    </Field>
                  </div>
                  <Field label="Assigner à une pharmacie (optionnel)">
                    <select value={driverForm.pharmacyId} onChange={setD('pharmacyId')} className={inputCls}>
                      <option value="">— Sans pharmacie pour l'instant —</option>
                      {allPharmacies.filter(p => p.isActive).map(p => <option key={p._id} value={p._id}>{p.name} · {p.address}</option>)}
                    </select>
                  </Field>
                  <button type="submit" disabled={creating} className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 disabled:opacity-50 transition">
                    {creating ? 'Création...' : 'Créer le compte livreur'}
                  </button>
                </form>
              )}
            </div>

            {/* Info card */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2"><Info className="w-4 h-4" /> Comment ça fonctionne</h3>
                <ol className="space-y-2 text-sm text-blue-700">
                  {(createRole === 'pharmacist'
                    ? ['Remplissez les infos du pharmacien', 'Créez une pharmacie ou assignez-en une existante', 'Le compte est actif immédiatement', 'Transmettez les identifiants au pharmacien']
                    : createRole === 'driver'
                    ? ['Remplissez les infos du livreur', 'Assignez à une pharmacie ou laissez sans', 'Le compte est actif immédiatement', 'Le pharmacien peut aussi assigner le livreur']
                    : ['Remplissez les infos de la pharmacie', 'Les coordonnées GPS sont optionnelles', 'La pharmacie est créée inactive', 'Elle s\'active à l\'assignation d\'un gérant dans l\'onglet Pharmacies']
                  ).map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="font-semibold text-amber-800 mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Auto-inscriptions</h3>
                <p className="text-sm text-amber-700">
                  Les pharmaciens et livreurs inscrits via le formulaire public apparaissent dans <strong>"Validations"</strong> et nécessitent votre approbation.
                </p>
              </div>
              {stats && (
                <div className="bg-white border rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Aperçu</p>
                  {[
                    { label: 'Pharmacies sans gérant', value: stats.orphanPharmacies, warn: stats.orphanPharmacies > 0 },
                    { label: 'Pharmaciens en attente', value: stats.pendingPharmacists, warn: stats.pendingPharmacists > 0 },
                    { label: 'Livreurs en attente', value: stats.pendingDrivers, warn: stats.pendingDrivers > 0 },
                  ].map(({ label, value, warn }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className={`font-bold ${warn ? 'text-amber-600' : 'text-green-600'}`}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB PHARMACIES ════════════════════════════════════════════════ */}
        {tab === 'pharmacies' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex-1">
                Toutes les pharmacies <span className="text-sm text-gray-400 font-normal">({filteredPharmacies.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="Rechercher..." value={pharmacySearch} onChange={e => setPharmacySearch(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-40" />
                <select value={pharmacyFilter} onChange={e => setPharmacyFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="all">Toutes</option>
                  <option value="active">Actives</option>
                  <option value="inactive">Inactives</option>
                  <option value="orphan">Sans gérant</option>
                </select>
                <button onClick={loadPharmacies} className="text-xs text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200">Actualiser</button>
              </div>
            </div>
            {loadingPharmacies ? <div className="flex justify-center py-16"><LoadingSpinner /></div> :
              filteredPharmacies.length === 0 ? <EmptyState icon={<Hospital className="w-12 h-12 text-gray-300" />} title="Aucune pharmacie" /> :
              <div className="divide-y divide-gray-100">
                {filteredPharmacies.map(ph => (
                  <div key={ph._id} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar name={ph.name} bg={ph.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{ph.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ph.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {ph.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5 truncate">{ph.address}</p>
                          <p className="text-xs text-gray-400">{ph.phone}</p>
                        </div>
                      </div>
                      <div className="lg:w-56 flex-shrink-0">
                        {ph.ownerId ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Gérant</p>
                            <p className="font-medium text-sm text-gray-800">{ph.ownerId.firstName} {ph.ownerId.lastName}</p>
                            <p className="text-xs text-gray-500">{ph.ownerId.email}</p>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-xs text-amber-600 font-semibold mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Sans gérant</p>
                            <button onClick={() => { setAssignModal(ph); setAssignSearch(''); }}
                              className="w-full text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium">
                              Assigner un pharmacien
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex lg:flex-col gap-2 lg:w-32 flex-shrink-0">
                        <button onClick={() => handleTogglePharmacy(ph)} disabled={togglingPharmacyId === ph._id}
                          className={`flex-1 lg:flex-none px-3 py-2 rounded-xl text-xs font-medium border transition disabled:opacity-50 ${ph.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                          {togglingPharmacyId === ph._id ? '...' : ph.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                        {ph.ownerId && (
                          <button onClick={() => { setAssignModal(ph); setAssignSearch(''); }}
                            className="flex-1 lg:flex-none px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                            Changer gérant
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ══ TAB UTILISATEURS ══════════════════════════════════════════════ */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex-1">
                Tous les utilisateurs <span className="text-sm text-gray-400 font-normal">({filteredUsers.length})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="Nom, email..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-40" />
                <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="all">Tous</option>
                  <option value="pharmacist">Pharmaciens</option>
                  <option value="driver">Livreurs</option>
                  <option value="client">Clients</option>
                </select>
                <button onClick={loadUsers} className="text-xs text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-blue-200">Actualiser</button>
              </div>
            </div>
            {loadingUsers ? <div className="flex justify-center py-16"><LoadingSpinner /></div> :
              filteredUsers.length === 0 ? <EmptyState icon={<Users className="w-12 h-12 text-gray-300" />} title="Aucun utilisateur" /> :
              <div className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <div key={u._id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar name={u.firstName}
                        bg={u.role === 'pharmacist' ? 'bg-blue-100 text-blue-700' : u.role === 'driver' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 text-sm">{u.firstName} {u.lastName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[u.role]}`}>{ROLE_LABEL[u.role]}</span>
                          {(u.role === 'pharmacist' || u.role === 'driver') && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {u.isApproved ? 'Approuvé' : 'En attente'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{u.email}</p>
                        {u.pharmacyId && typeof u.pharmacyId === 'object' && (
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Hospital className="w-3 h-3" /> {(u.pharmacyId as any).name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <p className="text-xs text-gray-400 hidden sm:block">{format(new Date(u.createdAt), 'dd/MM/yy', { locale: fr })}</p>
                      <button onClick={() => handleToggleUser(u)} disabled={togglingUserId === u._id}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition disabled:opacity-50 ${u.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {togglingUserId === u._id ? '...' : u.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}
      </div>

      {/* Modal rejet */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Rejeter la demande</h3>
            <p className="text-sm text-gray-500 mb-4">
              {rejectModal.firstName} {rejectModal.lastName} — {rejectModal.role === 'pharmacist' ? 'Pharmacien' : 'Livreur'}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Motif *</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Expliquez le motif..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3" />
            <div className="flex flex-wrap gap-2 mb-4">
              {REJECT_PRESETS.map(p => (
                <button key={p} type="button" onClick={() => setRejectReason(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${rejectReason === p ? 'bg-red-100 text-red-700 border-red-300' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Annuler</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || actionId === rejectModal._id}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {actionId === rejectModal._id ? '...' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal assignation */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Assigner un pharmacien</h3>
            <p className="text-sm text-gray-500 mb-4">Pharmacie : <strong>{assignModal.name}</strong></p>
            <input type="text" placeholder="Rechercher..." value={assignSearch} onChange={e => setAssignSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-3" />
            {assignCandidates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Aucun pharmacien approuvé sans pharmacie. Créez-en un dans l'onglet "Créer compte".</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border rounded-xl">
                {assignCandidates.map(u => (
                  <div key={u._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.firstName} bg="bg-blue-100 text-blue-700" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleAssign(u._id)} disabled={assigningId === u._id}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium">
                      {assigningId === u._id ? '...' : 'Assigner'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setAssignModal(null)} className="w-full mt-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */
function PendingRow({ u, actionId, onApprove, onReject }: {
  u: PendingUser; actionId: string | null; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="p-5 hover:bg-gray-50 transition">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg ${u.role === 'pharmacist' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
            {u.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'pharmacist' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}`}>
                {u.role === 'pharmacist' ? 'Pharmacien' : 'Livreur'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{u.email}</p>
            {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
            <p className="text-xs text-gray-300 mt-1">
              Inscrit le {format(new Date(u.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {u.pharmacyId ? (
            <div className={`rounded-xl p-3 border ${u.pharmacyId.isActive ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-blue-500">
                {u.role === 'pharmacist' ? 'Pharmacie demandée' : 'Pharmacie assignée'}
              </p>
              <p className="font-semibold text-sm text-gray-800">{u.pharmacyId.name}</p>
              <p className="text-xs text-gray-500">{u.pharmacyId.address}</p>
            </div>
          ) : (
            <div className="bg-gray-50 border rounded-xl p-3">
              <p className="text-xs text-gray-400 italic">
                {u.role === 'driver' ? 'Sans pharmacie assignée' : 'Aucune pharmacie associée'}
              </p>
            </div>
          )}
        </div>
        <div className="flex lg:flex-col gap-2 lg:w-36 flex-shrink-0">
          <button onClick={onApprove} disabled={actionId === u._id}
            className="flex-1 lg:flex-none px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
            {actionId === u._id ? '...' : <span className="flex items-center gap-1 justify-center"><Check className="w-4 h-4" /> Approuver</span>}
          </button>
          <button onClick={onReject} disabled={actionId === u._id}
            className="flex-1 lg:flex-none px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition">
            <span className="flex items-center gap-1 justify-center"><X className="w-4 h-4" /> Rejeter</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectedRow({ u, actionId, onReconsider }: {
  u: PendingUser; actionId: string | null; onReconsider: () => void;
}) {
  return (
    <div className="p-5 hover:bg-gray-50 transition">
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-red-600">
            {u.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
            <p className="text-sm text-gray-500">{u.email}</p>
            <p className="text-xs text-gray-300 mt-1">{format(new Date(u.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Motif du rejet</p>
            <p className="text-sm text-red-700">{u.rejectionReason}</p>
          </div>
        </div>
        <div className="flex-shrink-0 lg:w-36">
          <button onClick={onReconsider} disabled={actionId === u._id}
            className="w-full px-4 py-2 bg-amber-50 border border-amber-300 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-100 disabled:opacity-50 transition">
            {actionId === u._id ? '...' : '↩ Reconsidérer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="text-center py-14">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="font-semibold text-gray-500">{title}</p>
    </div>
  );
}
