import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, AlarmClock } from 'lucide-react';

interface Reminder {
  id: string;
  medicationName: string;
  dose: string;
  times: string[];
  days: string[];
  active: boolean;
  notes?: string;
}

const DAYS = [
  { key: 'mon', label: 'L' }, { key: 'tue', label: 'M' },
  { key: 'wed', label: 'M' }, { key: 'thu', label: 'J' },
  { key: 'fri', label: 'V' }, { key: 'sat', label: 'S' },
  { key: 'sun', label: 'D' },
];
const DAY_FULL: Record<string, string> = {
  mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi',
  fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche',
};

const STORAGE_KEY = 'pharma_reminders';

function loadReminders(): Reminder[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveReminders(r: Reminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');

  const [form, setForm] = useState({
    medicationName: '', dose: '', times: ['08:00'], days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    notes: '',
  });

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  const requestNotifPerm = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === 'granted') toast.success('Notifications activées !');
      else toast.error('Notifications refusées');
    }
  };

  const checkReminders = useCallback(() => {
    if (notifPerm !== 'granted') return;
    const now = new Date();
    const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    reminders.filter(r => r.active && r.days.includes(day) && r.times.includes(timeStr)).forEach(r => {
      new Notification(`${r.medicationName}`, {
        body: `${r.dose}${r.notes ? ` — ${r.notes}` : ''}`,
        icon: '/images/pharma.jpeg',
      });
    });
  }, [reminders, notifPerm]);

  useEffect(() => {
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const openNew = () => {
    setEditing(null);
    setForm({ medicationName: '', dose: '', times: ['08:00'], days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], notes: '' });
    setShowForm(true);
  };

  const openEdit = (r: Reminder) => {
    setEditing(r);
    setForm({ medicationName: r.medicationName, dose: r.dose, times: r.times, days: r.days, notes: r.notes || '' });
    setShowForm(true);
  };

  const save = () => {
    if (!form.medicationName.trim()) { toast.error('Nom du médicament requis'); return; }
    if (!form.dose.trim()) { toast.error('Dosage requis'); return; }
    if (form.times.length === 0) { toast.error('Au moins un horaire requis'); return; }
    if (form.days.length === 0) { toast.error('Au moins un jour requis'); return; }

    let updated: Reminder[];
    if (editing) {
      updated = reminders.map(r => r.id === editing.id
        ? { ...r, ...form }
        : r);
      toast.success('Rappel mis à jour');
    } else {
      const newR: Reminder = { id: Date.now().toString(), ...form, active: true };
      updated = [...reminders, newR];
      toast.success('Rappel créé !');
    }
    setReminders(updated);
    saveReminders(updated);
    setShowForm(false);
  };

  const toggleActive = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setReminders(updated);
    saveReminders(updated);
  };

  const deleteReminder = (id: string) => {
    if (!confirm('Supprimer ce rappel ?')) return;
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    saveReminders(updated);
    toast.success('Rappel supprimé');
  };

  const addTime = () => {
    setForm(f => ({ ...f, times: [...f.times, '12:00'].sort() }));
  };

  const updateTime = (idx: number, val: string) => {
    const times = [...form.times];
    times[idx] = val;
    setForm(f => ({ ...f, times: times.sort() }));
  };

  const removeTime = (idx: number) => {
    if (form.times.length <= 1) return;
    setForm(f => ({ ...f, times: f.times.filter((_, i) => i !== idx) }));
  };

  const toggleDay = (d: string) => {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rappels médicaments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ne ratez plus jamais une prise</p>
          </div>
          <button onClick={openNew} className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700">
            + Nouveau rappel
          </button>
        </div>

        {/* Notification permission banner */}
        {notifPerm !== 'granted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <Bell className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">Activez les notifications</p>
              <p className="text-xs text-amber-700 mt-0.5">Pour recevoir des alertes de prise même quand l'onglet est en arrière-plan</p>
            </div>
            <button onClick={requestNotifPerm}
              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 flex-shrink-0">
              Activer
            </button>
          </div>
        )}

        {/* Liste */}
        {reminders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlarmClock className="w-8 h-8 text-gray-400" /></div>
            <h3 className="font-semibold text-gray-900">Aucun rappel configuré</h3>
            <p className="text-gray-500 text-sm mt-1">Créez des rappels pour ne jamais oublier vos médicaments</p>
            <button onClick={openNew} className="mt-4 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
              Créer un rappel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map(r => (
              <div key={r.id} className={`bg-white rounded-2xl border p-4 transition-opacity ${r.active ? '' : 'opacity-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{r.medicationName}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{r.dose}</span>
                      {!r.active && <span className="text-xs text-gray-400">Désactivé</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.times.map(t => (
                        <span key={t} className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded-lg text-gray-700">{t}</span>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-2">
                      {DAYS.map(d => (
                        <span key={d.key} className={`w-6 h-6 flex items-center justify-center text-xs rounded-full font-medium ${
                          r.days.includes(d.key) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'
                        }`}>{d.label}</span>
                      ))}
                    </div>
                    {r.notes && <p className="text-xs text-gray-500 mt-1.5">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onClick={() => toggleActive(r.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${r.active ? 'bg-green-600' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${r.active ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteReminder(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{editing ? 'Modifier le rappel' : 'Nouveau rappel'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Médicament *</label>
                <input value={form.medicationName} onChange={e => setForm(f => ({ ...f, medicationName: e.target.value }))}
                  placeholder="ex: Paracétamol"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dosage *</label>
                <input value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))}
                  placeholder="ex: 500mg, 1 comprimé"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {/* Horaires */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Horaires *</label>
                  <button type="button" onClick={addTime} className="text-xs text-green-600 hover:underline">+ Ajouter</button>
                </div>
                <div className="space-y-2">
                  {form.times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" value={t} onChange={e => updateTime(i, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      {form.times.length > 1 && (
                        <button onClick={() => removeTime(i)} className="p-1.5 text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Jours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jours *</label>
                <div className="flex gap-2">
                  {DAYS.map(d => (
                    <button key={d.key} type="button" onClick={() => toggleDay(d.key)}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors ${
                        form.days.includes(d.key) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={DAY_FULL[d.key]}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ex: à prendre avec de la nourriture"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={save}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                {editing ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
