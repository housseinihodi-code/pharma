import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Hospital, Pill } from 'lucide-react';
import { pharmacyService } from '../../services/pharmacy.service';
import { medicationService } from '../../services/medication.service';
import { Pharmacy, Medication, CHRONIC_DISEASE_CATEGORIES } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';

const CATEGORIES = [
  { value: 'antibiotiques', label: 'Antibiotiques' },
  { value: 'analgésiques', label: 'Analgésiques' },
  { value: 'vitamines', label: 'Vitamines' },
  { value: 'cardiovasculaire', label: 'Cardiovasculaire' },
  { value: 'diabète', label: 'Diabète' },
  { value: 'respiratoire', label: 'Respiratoire' },
  { value: 'dermatologie', label: 'Dermatologie' },
  { value: 'gastroentérologie', label: 'Gastroentérologie' },
  { value: 'neurologie', label: 'Neurologie' },
  { value: 'autre', label: 'Autre' },
];

const EMPTY_FORM = {
  name: '', genericName: '', description: '', price: '', stock: '',
  category: 'autre', dosageForm: '', strength: '', manufacturer: '',
  minStock: '5', requiresPrescription: false, isHospitalOnly: false,
  chronicDiseaseCategory: '', imageUrl: '',
};

type FormState = typeof EMPTY_FORM;

export default function PharmacistMedications() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await pharmacyService.getMyPharmacies();
        setPharmacies(list);
        if (list.length > 0) setSelectedPharmacy(list[0]);
      } catch {
        toast.error('Impossible de charger vos pharmacies');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedPharmacy) return;
    loadMedications();
  }, [selectedPharmacy]);

  const loadMedications = async () => {
    if (!selectedPharmacy) return;
    try {
      const data = await medicationService.getByPharmacy(selectedPharmacy._id, 1, 100);
      setMedications(data.medications || []);
    } catch {
      toast.error('Impossible de charger les médicaments');
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (med: Medication) => {
    setEditingId(med._id);
    setForm({
      name: med.name,
      genericName: med.genericName || '',
      description: med.description,
      price: String(med.price),
      stock: String(med.stock),
      category: med.category,
      dosageForm: med.dosageForm || '',
      strength: med.strength || '',
      manufacturer: med.manufacturer || '',
      minStock: String(med.minStock ?? 5),
      requiresPrescription: med.requiresPrescription || false,
      isHospitalOnly: med.isHospitalOnly || false,
      chronicDiseaseCategory: med.chronicDiseaseCategory || '',
      imageUrl: med.imageUrl || '',
    });
    setImageFile(null);
    setImagePreview(med.imageUrl || '');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setImageFile(null);
    setImagePreview('');
    setForm(EMPTY_FORM);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde — 5 Mo maximum');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
      setForm(prev => ({ ...prev, [key]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPharmacy) return;
    setSubmitting(true);

    try {
      let imageUrl = form.imageUrl;

      if (imageFile) {
        try {
          imageUrl = await medicationService.uploadImage(imageFile);
        } catch {
          toast.error("Erreur lors de l'upload de l'image");
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        name: form.name.trim(),
        genericName: form.genericName.trim() || undefined,
        description: form.description.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        category: form.category,
        pharmacyId: selectedPharmacy._id,
        dosageForm: form.dosageForm.trim() || undefined,
        strength: form.strength.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        minStock: Number(form.minStock) || 5,
        requiresPrescription: form.requiresPrescription,
        isHospitalOnly: form.isHospitalOnly,
        chronicDiseaseCategory: form.chronicDiseaseCategory || undefined,
        imageUrl: imageUrl || undefined,
      };

      if (editingId) {
        await medicationService.update(editingId, payload);
        toast.success('Médicament mis à jour');
      } else {
        await medicationService.create(payload);
        toast.success('Médicament ajouté avec succès');
      }

      await loadMedications();
      closeForm();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Erreur lors de la sauvegarde'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    try {
      await medicationService.delete(id);
      setMedications(prev => prev.filter(m => m._id !== id));
      toast.success('Médicament supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filtered = medications.filter(m => {
    const matchCat = !filterCategory || m.category === filterCategory;
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.genericName || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) return <div className="flex justify-center mt-20"><LoadingSpinner /></div>;

  if (pharmacies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl border p-12 max-w-sm">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Hospital className="w-8 h-8 text-green-600" /></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Aucune pharmacie</h2>
          <p className="text-gray-500 text-sm">Vous n'avez pas encore de pharmacie enregistrée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes médicaments</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-sm text-gray-500">{filtered.length} médicament{filtered.length !== 1 ? 's' : ''}</p>
              {selectedPharmacy && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <Hospital className="w-3 h-3" /> {selectedPharmacy.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pharmacies.length > 1 && (
              <select
                value={selectedPharmacy?._id || ''}
                onChange={e => setSelectedPharmacy(pharmacies.find(p => p._id === e.target.value) || null)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {pharmacies.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors text-sm"
            >
              <span className="text-lg leading-none">+</span>
              Ajouter un médicament
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Medications grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Pill className="w-8 h-8 text-green-400" /></div>
            <h3 className="text-lg font-medium text-gray-900">Aucun médicament</h3>
            <p className="text-gray-500 mt-2 text-sm">
              {medications.length === 0
                ? 'Ajoutez votre premier médicament pour le proposer aux clients'
                : 'Aucun médicament ne correspond à vos filtres'}
            </p>
            {medications.length === 0 && (
              <button onClick={openAdd}
                className="mt-6 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium">
                Ajouter un médicament
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(med => (
              <MedCard
                key={med._id}
                med={med}
                onEdit={() => openEdit(med)}
                onDelete={() => handleDelete(med._id, med.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <MedicationForm
          form={form}
          editingId={editingId}
          imagePreview={imagePreview}
          submitting={submitting}
          fileRef={fileRef}
          set={set}
          onImageChange={handleImageChange}
          onSubmit={handleSubmit}
          onClose={closeForm}
          isHospitalPharmacy={selectedPharmacy?.isHospitalPharmacy ?? false}
        />
      )}
    </div>
  );
}

/* ── Medication card (pharmacist view) ── */
function MedCard({ med, onEdit, onDelete }: {
  med: Medication;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-green-50 to-emerald-100">
        {med.imageUrl ? (
          <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Pill className="w-12 h-12 text-green-300" />
          </div>
        )}
        {med.stock === 0 && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">Rupture de stock</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={onEdit}
            className="p-1.5 bg-white/90 rounded-lg hover:bg-white shadow-sm"
            title="Modifier"
          >
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-white/90 rounded-lg hover:bg-white shadow-sm"
            title="Supprimer"
          >
            <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{med.name}</h3>
        {med.genericName && <p className="text-xs text-gray-400 truncate mt-0.5">{med.genericName}</p>}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
            {med.category}
          </span>
          {med.requiresPrescription && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Ordo</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-green-700">{med.price.toLocaleString()} <span className="text-xs font-normal text-gray-400">FCFA</span></span>
          <span className={`text-xs font-medium ${
            med.stock === 0 ? 'text-red-500' :
            med.stock <= (med.minStock ?? 5) ? 'text-orange-500' : 'text-green-600'
          }`}>
            {med.stock === 0 ? 'Épuisé' : `${med.stock} en stock`}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Modal form ── */
function MedicationForm({
  form, editingId, imagePreview, submitting, fileRef,
  set, onImageChange, onSubmit, onClose, isHospitalPharmacy,
}: {
  form: FormState;
  editingId: string | null;
  imagePreview: string;
  submitting: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  set: (k: keyof FormState) => (e: any) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isHospitalPharmacy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {editingId ? 'Modifier le médicament' : 'Ajouter un médicament'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo du médicament</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-400 transition-colors"
              style={{ height: imagePreview ? '200px' : '120px' }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Cliquez pour ajouter une photo</span>
                  <span className="text-xs">JPG, PNG, WebP — max 5 Mo</span>
                </div>
              )}
              {imagePreview && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 bg-black/50 px-3 py-1 rounded-lg">
                    Changer la photo
                  </span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={onImageChange}
              className="hidden"
            />
          </div>

          {/* Nom + Nom générique */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input type="text" value={form.name} onChange={set('name')} required
                placeholder="ex: Paracétamol 500mg"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom générique</label>
              <input type="text" value={form.genericName} onChange={set('genericName')}
                placeholder="ex: Paracétamol"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={set('description')} required rows={3}
              placeholder="Indications, posologie, mode d'emploi..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none" />
          </div>

          {/* Prix + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
              <input type="number" value={form.price} onChange={set('price')} required min="0"
                placeholder="ex: 1500"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock initial *</label>
              <input type="number" value={form.stock} onChange={set('stock')} required min="0"
                placeholder="ex: 50"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
          </div>

          {/* Catégorie + Stock min */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select value={form.category} onChange={set('category')} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock minimum</label>
              <input type="number" value={form.minStock} onChange={set('minStock')} min="0"
                placeholder="ex: 5"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
          </div>

          {/* Forme + Dosage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forme</label>
              <input type="text" value={form.dosageForm} onChange={set('dosageForm')}
                placeholder="ex: Comprimé, Sirop..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input type="text" value={form.strength} onChange={set('strength')}
                placeholder="ex: 500mg, 250ml..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
            </div>
          </div>

          {/* Fabricant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fabricant</label>
            <input type="text" value={form.manufacturer} onChange={set('manufacturer')}
              placeholder="ex: Sanofi, Pfizer..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
          </div>

          {/* Maladie chronique */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maladie chronique associée</label>
            <select value={form.chronicDiseaseCategory} onChange={set('chronicDiseaseCategory')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white">
              <option value="">Aucune (médicament courant)</option>
              {CHRONIC_DISEASE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {form.chronicDiseaseCategory && (
              <p className="text-xs text-orange-600 mt-1">
                Une maladie chronique implique une ordonnance obligatoire.
              </p>
            )}
          </div>

          {/* Ordonnance */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" checked={form.requiresPrescription || !!form.chronicDiseaseCategory}
                onChange={set('requiresPrescription')} className="sr-only"
                disabled={!!form.chronicDiseaseCategory} />
              <div className={`w-10 h-5 rounded-full transition-colors ${(form.requiresPrescription || form.chronicDiseaseCategory) ? 'bg-orange-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form.requiresPrescription || form.chronicDiseaseCategory) ? 'translate-x-5' : ''}`} />
              </div>
            </div>
            <span className="text-sm text-gray-700">Ordonnance requise</span>
          </label>

          {/* Hôpital uniquement — visible seulement pour les pharmacies hospitalières */}
          {isHospitalPharmacy && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" checked={form.isHospitalOnly}
                  onChange={set('isHospitalOnly')} className="sr-only" />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.isHospitalOnly ? 'bg-red-600' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isHospitalOnly ? 'translate-x-5' : ''}`} />
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-700">Réservé aux pharmacies hospitalières</span>
                <p className="text-xs text-gray-400">Ce médicament ne sera pas disponible en pharmacie normale</p>
              </div>
            </label>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors text-sm">
              {submitting
                ? (editingId ? 'Mise à jour...' : 'Ajout en cours...')
                : (editingId ? 'Enregistrer les modifications' : 'Ajouter le médicament')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
