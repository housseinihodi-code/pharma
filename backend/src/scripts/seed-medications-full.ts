/**
 * Seed complet — médicaments courants dans toutes les pharmacies + images réelles
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/seed-medications-full.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/pharmacy_db';

// ─── Images Unsplash par type de médicament ──────────────────────────────────
const IMAGES = {
  // Comprimés blancs (analgésiques, anti-inflammatoires)
  tablet_white: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&h=300&q=80',
  // Comprimés colorés / blister packs
  tablet_blister: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&h=300&q=80',
  // Gélules / capsules
  capsule: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&h=300&q=80',
  // Flacons de médicaments
  bottle: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&h=300&q=80',
  // Sirop / solution buvable
  syrup: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=400&h=300&q=80',
  // Spray inhalateur
  inhaler: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&h=300&q=80',
  // Seringue / injectable
  syringe: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=400&h=300&q=80',
  // Perfusion IV
  iv_drip: 'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=400&h=300&q=80',
  // Vitamines / compléments
  vitamins: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=400&h=300&q=80',
  // Crème / pommade
  cream: 'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=400&h=300&q=80',
  // Diabète / glycémie
  diabetes: 'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?auto=format&fit=crop&w=400&h=300&q=80',
  // Cardiologie / tension
  cardio: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&h=300&q=80',
  // Comprimés oranges / paludisme
  malaria: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&h=300&q=80',
  // ARV / VIH
  arv: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&h=300&q=80',
  // Antituberculeux
  tb: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&h=300&q=80',
  // Cancer / chimiothérapie
  chemo: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&h=300&q=80',
  // Hépatite / antiviraux
  hepatite: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&h=300&q=80',
  // Drépanocytose
  drepano: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&h=300&q=80',
  // Insuffisance rénale
  renal: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=400&h=300&q=80',
  // Épilepsie / neurologie
  epilepsy: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=400&h=300&q=80',
  // Dispositif médical
  device: 'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?auto=format&fit=crop&w=400&h=300&q=80',
};

// ─── Mapping image par médicament spécifique ─────────────────────────────────
const MEDICATION_IMAGES: Record<string, string> = {
  // Analgésiques
  'Paracétamol 500mg': IMAGES.tablet_white,
  'paracétamol': IMAGES.tablet_white,
  'Ibuprofène 400mg': IMAGES.tablet_blister,
  'Ibuprofène 600mg': IMAGES.tablet_blister,
  'Aspirine 500mg': IMAGES.tablet_white,
  'Aspirine Cardio 100mg': IMAGES.tablet_blister,
  'Diclofénac 50mg': IMAGES.tablet_blister,
  'Kétoprofène 100mg': IMAGES.capsule,
  'Paracétamol + Codéine 500/30mg': IMAGES.tablet_white,
  // Antibiotiques
  'Amoxicilline 500mg': IMAGES.capsule,
  'Amoxicilline 1g': IMAGES.tablet_white,
  'Augmentin 875/125mg': IMAGES.tablet_blister,
  'Ciprofloxacine 500mg': IMAGES.tablet_blister,
  'Azithromycine 500mg': IMAGES.tablet_blister,
  'Métronidazole 500mg': IMAGES.tablet_white,
  'Doxycycline 100mg': IMAGES.capsule,
  'Cotrimoxazole 960mg': IMAGES.tablet_white,
  'Érythromycine 500mg': IMAGES.capsule,
  'Cotrimoxazole 960mg (prophylaxie VIH)': IMAGES.tablet_white,
  'Dapsone 100mg': IMAGES.tablet_white,
  'Pénicilline V 250mg (prophylaxie)': IMAGES.tablet_white,
  // Antipaludéens (très importants au Cameroun)
  'Artémether/Luméfantrine 20/120mg (Coartem)': IMAGES.malaria,
  'Artésunate 200mg': IMAGES.tablet_blister,
  'Quinine 500mg': IMAGES.tablet_white,
  'Chloroquine 250mg': IMAGES.tablet_white,
  'Méfloquine 250mg': IMAGES.tablet_white,
  // Vitamines / suppléments
  'Vitamine C 1000mg': IMAGES.vitamins,
  'Vitamine D3 1000 UI': IMAGES.vitamins,
  'Vitamine B12 1000 mcg': IMAGES.vitamins,
  'Zinc 20mg': IMAGES.vitamins,
  'Fer + Acide folique': IMAGES.vitamins,
  'Acide folique 5mg': IMAGES.vitamins,
  'Multivitamines': IMAGES.vitamins,
  'Calcium + Vitamine D3': IMAGES.vitamins,
  'Omega-3 1000mg': IMAGES.vitamins,
  // Cardiovasculaire / hypertension
  'Amlodipine 5mg': IMAGES.cardio,
  'Amlodipine 10mg': IMAGES.cardio,
  'Losartan 50mg': IMAGES.cardio,
  'Captopril 25mg': IMAGES.cardio,
  'Atenolol 50mg': IMAGES.cardio,
  'Ramipril 10mg': IMAGES.cardio,
  'Bisoprolol 10mg': IMAGES.cardio,
  'Hydrochlorothiazide 25mg': IMAGES.cardio,
  'Furosémide 40mg': IMAGES.cardio,
  'Atorvastatine 40mg': IMAGES.cardio,
  'Nifédipine LP 30mg': IMAGES.cardio,
  'Candesartan 16mg': IMAGES.cardio,
  // Diabète
  'Insuline Glargine (Lantus)': IMAGES.syringe,
  'Insuline NPH 100 UI/mL': IMAGES.syringe,
  'Metformine 1000mg': IMAGES.diabetes,
  'Metformine 500mg': IMAGES.diabetes,
  'Métformine 500mg': IMAGES.diabetes,
  'Glibenclamide 5mg': IMAGES.diabetes,
  'Glipizide 5mg': IMAGES.diabetes,
  'Sitagliptine 100mg (Januvia)': IMAGES.diabetes,
  'Empagliflozine 10mg (Jardiance)': IMAGES.diabetes,
  'Glucomètre Accu-Check Active': IMAGES.device,
  // Respiratoire / allergie
  'Salbutamol Spray': IMAGES.inhaler,
  'Loratadine 10mg': IMAGES.tablet_blister,
  'Cétirizine 10mg': IMAGES.tablet_blister,
  'Bromhexine 8mg sirop': IMAGES.syrup,
  'Prednisolone 5mg': IMAGES.tablet_white,
  'Prédnisolone 20mg': IMAGES.tablet_white,
  'Beclométasone 100mcg inhalateur': IMAGES.inhaler,
  // Gastro-entérologie
  'Oméprazole 20mg': IMAGES.capsule,
  'Métoclopramide 10mg': IMAGES.tablet_white,
  'Smecta (Diosmectite) 3g': IMAGES.syrup,
  'Spasfon 80mg': IMAGES.tablet_white,
  'Domperidone 10mg': IMAGES.tablet_blister,
  'Ranitidine 150mg': IMAGES.tablet_white,
  'Probiotiques Lactobacillus': IMAGES.capsule,
  // Paludisme / antiparasitaire
  'Albendazole 400mg': IMAGES.tablet_white,
  'Mébendazole 500mg': IMAGES.tablet_white,
  // Dermatologie
  'Bétaméthasone crème 0,1%': IMAGES.cream,
  'Kétoconazole crème 2%': IMAGES.cream,
  'Chlorhexidine solution 4%': IMAGES.bottle,
  'Vaseline officinale': IMAGES.cream,
  // Soins / premiers secours
  'Sérum physiologique 0,9%': IMAGES.iv_drip,
  'Eau oxygénée 10 volumes': IMAGES.bottle,
  'Bandages élastiques': IMAGES.device,
  'Alcool 70°': IMAGES.bottle,
  // Médicaments chroniques
  'Ciclosporine 100mg': IMAGES.capsule,
  'Érythropoïétine (EPO) 4000 UI': IMAGES.syringe,
  'Phénytoïne 100mg': IMAGES.epilepsy,
  'Lévétiracétam 500mg': IMAGES.epilepsy,
  'Valproate de sodium 500mg': IMAGES.epilepsy,
  'Carbamazépine 200mg': IMAGES.epilepsy,
  'Hydroxyurée 500mg': IMAGES.drepano,
  'Déférasirox 500mg (Exjade)': IMAGES.drepano,
  'Bicarbonate de sodium 1,4%': IMAGES.iv_drip,
  // ARV / VIH
  'Ténofovir/Lamivudine/Dolutégravir (TLD)': IMAGES.arv,
  'Abacavir/Lamivudine (Kivexa)': IMAGES.arv,
  'Ténofovir/Emtricitabine/Efavirenz (TEE)': IMAGES.arv,
  'Dolutégravir 50mg': IMAGES.arv,
  'Ritonavir/Lopinavir (Kaletra)': IMAGES.arv,
  'Zidovudine/Lamivudine (Combivir)': IMAGES.arv,
  // Tuberculose
  'Rifampicine/Isoniazide/Pyrazinamide/Éthambutol': IMAGES.tb,
  'Rifampicine/Isoniazide (RH)': IMAGES.tb,
  'Rifampicine 300mg': IMAGES.tb,
  'Pyrazinamide 500mg': IMAGES.tb,
  'Éthambutol 400mg': IMAGES.tb,
  'Isoniazide 300mg (prophylaxie TB)': IMAGES.tb,
  // Hépatite
  'Sofosbuvir/Velpatasvir (Epclusa)': IMAGES.hepatite,
  'Ténofovir disoproxil 300mg (hépatite B)': IMAGES.hepatite,
  'Entécavir 0,5mg': IMAGES.hepatite,
  'Lédipasvir/Sofosbuvir (Harvoni)': IMAGES.hepatite,
  'Interféron Pégylé Alfa-2a': IMAGES.syringe,
  // Oncologie
  'Doxorubicine 50mg': IMAGES.chemo,
  'Paclitaxel 300mg': IMAGES.iv_drip,
  'Carboplatine 450mg': IMAGES.iv_drip,
  'Cyclophosphamide 500mg': IMAGES.chemo,
  'Tamoxifène 20mg': IMAGES.chemo,
};

// Résolution d'image par caractéristiques du médicament
function resolveImage(med: any): string {
  // 1. Correspondance par nom exact
  if (MEDICATION_IMAGES[med.name]) return MEDICATION_IMAGES[med.name];

  // 2. Par catégorie de maladie chronique
  const chronicMap: Record<string, string> = {
    vih: IMAGES.arv,
    tuberculose: IMAGES.tb,
    hepatite: IMAGES.hepatite,
    cancer: IMAGES.chemo,
    diabete: IMAGES.diabetes,
    hypertension: IMAGES.cardio,
    epilepsie: IMAGES.epilepsy,
    drepanocytose: IMAGES.drepano,
    insuffisance_renale: IMAGES.renal,
    autre_chronique: IMAGES.tablet_blister,
  };
  if (med.chronicDiseaseCategory && chronicMap[med.chronicDiseaseCategory]) {
    return chronicMap[med.chronicDiseaseCategory];
  }

  // 3. Par forme galénique
  const form = (med.dosageForm || '').toLowerCase();
  if (form.includes('inject') || form.includes('seringue')) return IMAGES.syringe;
  if (form.includes('perfusion') || form.includes('iv') || form.includes('intravein')) return IMAGES.iv_drip;
  if (form.includes('spray') || form.includes('inhal')) return IMAGES.inhaler;
  if (form.includes('sirop') || form.includes('buvable') || form.includes('solution orale')) return IMAGES.syrup;
  if (form.includes('crème') || form.includes('pommade') || form.includes('gel')) return IMAGES.cream;
  if (form.includes('gélule') || form.includes('capsule')) return IMAGES.capsule;
  if (form.includes('dispositif') || form.includes('médical')) return IMAGES.device;

  // 4. Par catégorie
  const catMap: Record<string, string> = {
    antibiotiques: IMAGES.capsule,
    'analgésiques': IMAGES.tablet_white,
    vitamines: IMAGES.vitamins,
    cardiovasculaire: IMAGES.cardio,
    'diabète': IMAGES.diabetes,
    respiratoire: IMAGES.inhaler,
    dermatologie: IMAGES.cream,
    'gastroentérologie': IMAGES.tablet_white,
    neurologie: IMAGES.epilepsy,
  };
  if (med.category && catMap[med.category]) return catMap[med.category];

  // 5. Fallback général
  return IMAGES.tablet_blister;
}

// ─── Catalogue de médicaments courants pour les pharmacies normales ───────────
interface CommonMed {
  name: string;
  genericName?: string;
  description: string;
  category: string;
  dosageForm: string;
  strength?: string;
  manufacturer?: string;
  requiresPrescription: boolean;
  basePrice: number;        // prix de base en FCFA
  minStock: number;
  chronicDiseaseCategory?: string;
  image: string;
}

const COMMON_MEDICATIONS: CommonMed[] = [
  // ── Analgésiques / AINS ─────────────────────────────────────────────────────
  {
    name: 'Paracétamol 500mg',
    genericName: 'Paracétamol',
    description: 'Antalgique et antipyrétique pour traiter la douleur légère à modérée et la fièvre.',
    category: 'analgésiques', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: false, basePrice: 500, minStock: 100,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Paracétamol Enfant 250mg sirop',
    genericName: 'Paracétamol pédiatrique',
    description: 'Sirop antalgique et antipyrétique pour nourrissons et enfants.',
    category: 'analgésiques', dosageForm: 'Sirop', strength: '250mg/5mL',
    requiresPrescription: false, basePrice: 1800, minStock: 30,
    image: IMAGES.syrup,
  },
  {
    name: 'Ibuprofène 400mg',
    genericName: 'Ibuprofène',
    description: 'Anti-inflammatoire non stéroïdien pour douleurs, fièvre et inflammation.',
    category: 'analgésiques', dosageForm: 'Comprimé', strength: '400mg',
    requiresPrescription: false, basePrice: 1200, minStock: 80,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Diclofénac 50mg',
    genericName: 'Diclofénac sodium',
    description: 'AINS puissant pour les douleurs musculo-squelettiques et arthrose.',
    category: 'analgésiques', dosageForm: 'Comprimé', strength: '50mg',
    manufacturer: 'Novartis', requiresPrescription: true, basePrice: 2000, minStock: 50,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Aspirine 500mg',
    genericName: 'Acide acétylsalicylique',
    description: 'Antalgique, antipyrétique et anti-inflammatoire classique.',
    category: 'analgésiques', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: false, basePrice: 400, minStock: 120,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Aspirine Cardio 100mg',
    genericName: 'Acide acétylsalicylique',
    description: 'Faible dose pour la prévention des thromboses cardio-vasculaires.',
    category: 'cardiovasculaire', dosageForm: 'Comprimé gastro-résistant', strength: '100mg',
    requiresPrescription: true, basePrice: 1500, minStock: 60,
    chronicDiseaseCategory: 'hypertension',
    image: IMAGES.cardio,
  },

  // ── Antibiotiques ────────────────────────────────────────────────────────────
  {
    name: 'Amoxicilline 500mg',
    genericName: 'Amoxicilline trihydrate',
    description: 'Antibiotique pénicilline à large spectre pour infections respiratoires et ORL.',
    category: 'antibiotiques', dosageForm: 'Gélule', strength: '500mg',
    requiresPrescription: true, basePrice: 3500, minStock: 60,
    image: IMAGES.capsule,
  },
  {
    name: 'Amoxicilline 1g',
    genericName: 'Amoxicilline trihydrate',
    description: 'Antibiotique à haute dose pour infections sévères.',
    category: 'antibiotiques', dosageForm: 'Comprimé dispersible', strength: '1g',
    requiresPrescription: true, basePrice: 6000, minStock: 40,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Augmentin 875/125mg',
    genericName: 'Amoxicilline/Acide clavulanique',
    description: 'Antibiotique association pour infections résistantes à l\'amoxicilline seule.',
    category: 'antibiotiques', dosageForm: 'Comprimé', strength: '875/125mg',
    manufacturer: 'GSK', requiresPrescription: true, basePrice: 9500, minStock: 30,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Azithromycine 500mg',
    genericName: 'Azithromycine',
    description: 'Macrolide à spectre large, traitement court 3 jours.',
    category: 'antibiotiques', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: true, basePrice: 7000, minStock: 40,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Ciprofloxacine 500mg',
    genericName: 'Ciprofloxacine chlorhydrate',
    description: 'Fluoroquinolone pour infections urinaires, intestinales et respiratoires.',
    category: 'antibiotiques', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: true, basePrice: 5500, minStock: 40,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Métronidazole 500mg',
    genericName: 'Métronidazole',
    description: 'Antibiotique et antiparasitaire pour infections anaérobies et parasitoses.',
    category: 'antibiotiques', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: true, basePrice: 2500, minStock: 50,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Doxycycline 100mg',
    genericName: 'Doxycycline hyclate',
    description: 'Tétracycline utilisée pour infections et prophylaxie du paludisme.',
    category: 'antibiotiques', dosageForm: 'Gélule', strength: '100mg',
    requiresPrescription: true, basePrice: 4000, minStock: 40,
    image: IMAGES.capsule,
  },
  {
    name: 'Érythromycine 500mg',
    genericName: 'Érythromycine',
    description: 'Macrolide de substitution chez les patients allergiques à la pénicilline.',
    category: 'antibiotiques', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: true, basePrice: 5000, minStock: 30,
    image: IMAGES.tablet_blister,
  },

  // ── Antipaludéens (essentiels en Afrique centrale) ───────────────────────────
  {
    name: 'Artémether/Luméfantrine 20/120mg (Coartem)',
    genericName: 'Artémether/Luméfantrine',
    description: 'Combinaison antipaludéenne de 1ère ligne recommandée par l\'OMS pour Plasmodium falciparum.',
    category: 'autre', dosageForm: 'Comprimé', strength: '20/120mg',
    manufacturer: 'Novartis', requiresPrescription: true, basePrice: 8500, minStock: 80,
    image: IMAGES.malaria,
  },
  {
    name: 'Artésunate 200mg',
    genericName: 'Artésunate',
    description: 'Dérivé de l\'artémisinine pour le paludisme grave.',
    category: 'autre', dosageForm: 'Comprimé', strength: '200mg',
    requiresPrescription: true, basePrice: 4500, minStock: 60,
    image: IMAGES.malaria,
  },
  {
    name: 'Quinine 500mg',
    genericName: 'Quinine bisulfate',
    description: 'Antipaludéen de référence pour les formes sévères — traitement complet 7 jours.',
    category: 'autre', dosageForm: 'Comprimé', strength: '500mg',
    requiresPrescription: true, basePrice: 3000, minStock: 50,
    image: IMAGES.malaria,
  },
  {
    name: 'Chloroquine 250mg',
    genericName: 'Chloroquine phosphate',
    description: 'Antipaludéen classique, utilisé aussi en prophylaxie.',
    category: 'autre', dosageForm: 'Comprimé', strength: '250mg',
    requiresPrescription: false, basePrice: 1500, minStock: 60,
    image: IMAGES.tablet_white,
  },

  // ── Vitamines / Suppléments ──────────────────────────────────────────────────
  {
    name: 'Vitamine C 1000mg',
    genericName: 'Acide ascorbique',
    description: 'Complément nutritionnel pour immunité et antioxydant. Comprimé effervescent.',
    category: 'vitamines', dosageForm: 'Comprimé effervescent', strength: '1000mg',
    requiresPrescription: false, basePrice: 2500, minStock: 100,
    image: IMAGES.vitamins,
  },
  {
    name: 'Vitamine D3 1000 UI',
    genericName: 'Cholécalciférol',
    description: 'Supplémentation en vitamine D pour os et immunité.',
    category: 'vitamines', dosageForm: 'Comprimé', strength: '1000 UI',
    requiresPrescription: false, basePrice: 3500, minStock: 80,
    image: IMAGES.vitamins,
  },
  {
    name: 'Vitamine B12 1000 mcg',
    genericName: 'Cyanocobalamine',
    description: 'Supplément B12 pour anemies, fatigue et système nerveux.',
    category: 'vitamines', dosageForm: 'Comprimé', strength: '1000 mcg',
    requiresPrescription: false, basePrice: 3000, minStock: 60,
    image: IMAGES.vitamins,
  },
  {
    name: 'Zinc 20mg',
    genericName: 'Zinc gluconate',
    description: 'Oligoélément essentiel pour immunité, cicatrisation et croissance.',
    category: 'vitamines', dosageForm: 'Comprimé', strength: '20mg',
    requiresPrescription: false, basePrice: 2000, minStock: 80,
    image: IMAGES.vitamins,
  },
  {
    name: 'Fer + Acide folique',
    genericName: 'Sulfate ferreux + Acide folique',
    description: 'Supplément martial et folate pour grossesse et anemie ferriprive.',
    category: 'vitamines', dosageForm: 'Comprimé', strength: '200mg Fe / 0.4mg FA',
    requiresPrescription: false, basePrice: 1800, minStock: 100,
    image: IMAGES.vitamins,
  },
  {
    name: 'Calcium + Vitamine D3',
    genericName: 'Carbonate de calcium + Cholécalciférol',
    description: 'Supplément calcique pour os et prévention de l\'ostéoporose.',
    category: 'vitamines', dosageForm: 'Comprimé à croquer', strength: '500mg Ca / 400 UI D3',
    requiresPrescription: false, basePrice: 4500, minStock: 60,
    image: IMAGES.vitamins,
  },

  // ── Respiratoire / Allergie ──────────────────────────────────────────────────
  {
    name: 'Salbutamol Spray 100mcg',
    genericName: 'Salbutamol sulfate',
    description: 'Bronchodilatateur en spray pour crises d\'asthme et bronchospasme.',
    category: 'respiratoire', dosageForm: 'Spray inhalateur', strength: '100mcg/dose',
    manufacturer: 'GSK', requiresPrescription: true, basePrice: 7500, minStock: 30,
    image: IMAGES.inhaler,
  },
  {
    name: 'Beclométasone 100mcg inhalateur',
    genericName: 'Beclométasone dipropionate',
    description: 'Corticoïde inhalé pour traitement de fond de l\'asthme.',
    category: 'respiratoire', dosageForm: 'Spray inhalateur', strength: '100mcg/dose',
    requiresPrescription: true, basePrice: 12000, minStock: 20,
    image: IMAGES.inhaler,
  },
  {
    name: 'Cétirizine 10mg',
    genericName: 'Cétirizine chlorhydrate',
    description: 'Antihistaminique de 2ème génération pour rhinite allergique et urticaire.',
    category: 'respiratoire', dosageForm: 'Comprimé', strength: '10mg',
    requiresPrescription: false, basePrice: 1500, minStock: 80,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Loratadine 10mg',
    genericName: 'Loratadine',
    description: 'Antihistaminique non sédatif pour allergies.',
    category: 'respiratoire', dosageForm: 'Comprimé', strength: '10mg',
    requiresPrescription: false, basePrice: 1500, minStock: 80,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Bromhexine 8mg sirop',
    genericName: 'Bromhexine chlorhydrate',
    description: 'Mucolytique pour fluidifier et faciliter l\'expulsion des sécrétions bronchiques.',
    category: 'respiratoire', dosageForm: 'Sirop', strength: '8mg/5mL',
    requiresPrescription: false, basePrice: 2500, minStock: 40,
    image: IMAGES.syrup,
  },

  // ── Gastro-entérologie ───────────────────────────────────────────────────────
  {
    name: 'Oméprazole 20mg',
    genericName: 'Oméprazole',
    description: 'Inhibiteur de la pompe à protons pour ulcères, reflux gastrique et brûlures.',
    category: 'gastroentérologie', dosageForm: 'Gélule', strength: '20mg',
    requiresPrescription: false, basePrice: 3000, minStock: 60,
    image: IMAGES.capsule,
  },
  {
    name: 'Métoclopramide 10mg',
    genericName: 'Métoclopramide chlorhydrate',
    description: 'Antiémétique et prokinétique pour nausées, vomissements et gastroparésie.',
    category: 'gastroentérologie', dosageForm: 'Comprimé', strength: '10mg',
    requiresPrescription: true, basePrice: 1500, minStock: 50,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Smecta (Diosmectite) 3g',
    genericName: 'Diosmectite',
    description: 'Pansement intestinal pour diarrhées aiguës et colites — à dissoudre dans l\'eau.',
    category: 'gastroentérologie', dosageForm: 'Poudre pour suspension', strength: '3g/sachet',
    manufacturer: 'Ipsen', requiresPrescription: false, basePrice: 2800, minStock: 60,
    image: IMAGES.syrup,
  },
  {
    name: 'Spasfon 80mg',
    genericName: 'Phloroglucinol',
    description: 'Antispasmodique pour crampes abdominales, coliques et douleurs pelviennes.',
    category: 'gastroentérologie', dosageForm: 'Comprimé', strength: '80mg',
    requiresPrescription: false, basePrice: 3500, minStock: 50,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Domperidone 10mg',
    genericName: 'Dompéridone maléate',
    description: 'Antiémétique et accélérateur de la vidange gastrique.',
    category: 'gastroentérologie', dosageForm: 'Comprimé', strength: '10mg',
    requiresPrescription: false, basePrice: 2000, minStock: 50,
    image: IMAGES.tablet_blister,
  },
  {
    name: 'Probiotiques Lactobacillus',
    genericName: 'Lactobacillus acidophilus',
    description: 'Flore intestinale bénéfique pour restaurer le microbiote après antibiothérapie.',
    category: 'gastroentérologie', dosageForm: 'Gélule', strength: '10⁹ UFC',
    requiresPrescription: false, basePrice: 5500, minStock: 30,
    image: IMAGES.capsule,
  },

  // ── Cardiologie / Hypertension ───────────────────────────────────────────────
  {
    name: 'Amlodipine 5mg',
    genericName: 'Amlodipine bésylate',
    description: 'Inhibiteur calcique pour hypertension et angor — prise unique journalière.',
    category: 'cardiovasculaire', dosageForm: 'Comprimé', strength: '5mg',
    requiresPrescription: true, basePrice: 3200, minStock: 60,
    chronicDiseaseCategory: 'hypertension', image: IMAGES.cardio,
  },
  {
    name: 'Captopril 25mg',
    genericName: 'Captopril',
    description: 'IEC pour hypertension et insuffisance cardiaque.',
    category: 'cardiovasculaire', dosageForm: 'Comprimé', strength: '25mg',
    requiresPrescription: true, basePrice: 2800, minStock: 60,
    chronicDiseaseCategory: 'hypertension', image: IMAGES.cardio,
  },

  // ── Dermatologie ─────────────────────────────────────────────────────────────
  {
    name: 'Bétaméthasone crème 0,1%',
    genericName: 'Bétaméthasone dipropionate',
    description: 'Corticoïde dermique fort pour eczéma, psoriasis et dermatites.',
    category: 'dermatologie', dosageForm: 'Crème', strength: '0,1%',
    requiresPrescription: true, basePrice: 4500, minStock: 30,
    image: IMAGES.cream,
  },
  {
    name: 'Kétoconazole crème 2%',
    genericName: 'Kétoconazole',
    description: 'Antifongique topique pour mycoses cutanées, teigne et pityriasis.',
    category: 'dermatologie', dosageForm: 'Crème', strength: '2%',
    requiresPrescription: false, basePrice: 5000, minStock: 30,
    image: IMAGES.cream,
  },

  // ── Soins courants ───────────────────────────────────────────────────────────
  {
    name: 'Sérum physiologique 0,9% — 500mL',
    genericName: 'Chlorure de sodium',
    description: 'Solution isotonique pour lavages nasaux, oculaires et soins de plaies.',
    category: 'autre', dosageForm: 'Solution pour irrigation', strength: '0,9%',
    requiresPrescription: false, basePrice: 2000, minStock: 50,
    image: IMAGES.iv_drip,
  },
  {
    name: 'Chlorhexidine solution 4%',
    genericName: 'Chlorhexidine gluconate',
    description: 'Antiseptique de référence pour désinfection cutanée et soins de plaies.',
    category: 'autre', dosageForm: 'Solution', strength: '4%',
    requiresPrescription: false, basePrice: 3000, minStock: 40,
    image: IMAGES.bottle,
  },
  {
    name: 'Albendazole 400mg',
    genericName: 'Albendazole',
    description: 'Anthelminthique pour oxyurose, ascaridiose et autres parasitoses intestinales.',
    category: 'autre', dosageForm: 'Comprimé à croquer', strength: '400mg',
    requiresPrescription: false, basePrice: 1200, minStock: 80,
    image: IMAGES.tablet_white,
  },
  {
    name: 'Prednisolone 5mg',
    genericName: 'Prednisolone',
    description: 'Corticoïde oral pour inflammations, allergies sévères et maladies auto-immunes.',
    category: 'autre', dosageForm: 'Comprimé', strength: '5mg',
    requiresPrescription: true, basePrice: 2500, minStock: 40,
    image: IMAGES.tablet_white,
  },
];

// Pharmacies normales (non hospitalières) à remplir
const REGULAR_PHARMACY_IDS = [
  { id: '6a26ad077a3629e6c69df8a3', name: 'Pharmacie du Centre' },
  { id: '6a26ad077a3629e6c69df8a4', name: 'Pharmacie Bastos' },
  { id: '6a26ad077a3629e6c69df8a5', name: 'Pharmacie Nlongkak' },
  { id: '6a26ad077a3629e6c69df8a6', name: 'Pharmacie Mvog-Ada' },
  { id: '6a26ad077a3629e6c69df8a7', name: 'Pharmacie Biyem-Assi' },
  { id: '6a26ad077a3629e6c69df8a8', name: 'Pharmacie Melen' },
  { id: '6a26ad077a3629e6c69df8a9', name: 'Pharmacie Essos' },
  { id: '6a26ad077a3629e6c69df8aa', name: 'Pharmacie Mendong' },
];

// Variation de prix par pharmacie (±5%)
function variedPrice(base: number, seed: number): number {
  const variation = 0.95 + (((seed * 7 + base) % 10) / 100);
  return Math.round(base * variation / 100) * 100 || base;
}

// Stock aléatoire réaliste
function randomStock(min: number, seed: number): number {
  return min + ((seed * 3 + min) % 150);
}

// ─── Script principal ────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connecté à MongoDB\n');

  const db = mongoose.connection.db!;
  const meds = db.collection('medications');
  const pharmacies = db.collection('pharmacies');

  // ── Étape 1 : mettre à jour les images de TOUS les médicaments existants ──
  console.log('📸 Mise à jour des images sur les médicaments existants...\n');
  const existingMeds = await meds.find({}).toArray();
  let imagesUpdated = 0;

  for (const med of existingMeds) {
    const imageUrl = resolveImage(med);
    await meds.updateOne(
      { _id: med._id },
      { $set: { imageUrl, updatedAt: new Date() } },
    );
    imagesUpdated++;
  }
  console.log(`✅ ${imagesUpdated} médicaments mis à jour avec des images\n`);

  // ── Étape 2 : remplir les pharmacies normales ──────────────────────────────
  console.log('💊 Ajout des médicaments courants dans les pharmacies normales...\n');
  const results: { pharmacy: string; added: number; skipped: number }[] = [];

  for (let pi = 0; pi < REGULAR_PHARMACY_IDS.length; pi++) {
    const pharm = REGULAR_PHARMACY_IDS[pi];
    const pharmacyOid = new mongoose.Types.ObjectId(pharm.id);

    // Vérifier que la pharmacie existe
    const pharmacyDoc = await pharmacies.findOne({ _id: pharmacyOid });
    if (!pharmacyDoc) {
      console.log(`⚠️  Pharmacie introuvable: ${pharm.id} (${pharm.name})`);
      results.push({ pharmacy: pharm.name, added: 0, skipped: -1 });
      continue;
    }

    let added = 0;
    let skipped = 0;

    for (let mi = 0; mi < COMMON_MEDICATIONS.length; mi++) {
      const template = COMMON_MEDICATIONS[mi];

      // Vérifier si ce médicament existe déjà dans cette pharmacie
      const existing = await meds.findOne({ name: template.name, pharmacyId: pharmacyOid });
      if (existing) {
        // Mettre à jour l'image si elle manque
        if (!existing.imageUrl) {
          await meds.updateOne({ _id: existing._id }, { $set: { imageUrl: template.image, updatedAt: new Date() } });
        }
        skipped++;
        continue;
      }

      const stockBase = template.minStock;
      const price = variedPrice(template.basePrice, pi + mi);
      const stock = randomStock(stockBase, pi * 7 + mi);

      await meds.insertOne({
        name: template.name,
        genericName: template.genericName,
        description: template.description,
        price,
        stock,
        pharmacyId: pharmacyOid,
        category: template.category,
        dosageForm: template.dosageForm,
        strength: template.strength,
        manufacturer: template.manufacturer,
        requiresPrescription: template.requiresPrescription,
        isHospitalOnly: false,
        chronicDiseaseCategory: template.chronicDiseaseCategory,
        isAvailable: true,
        imageUrl: template.image,
        minStock: template.minStock,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      added++;
    }

    results.push({ pharmacy: pharm.name, added, skipped });
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────
  console.log('\n┌────────────────────────────────────────┬──────────┬──────────┐');
  console.log('│ Pharmacie                              │  Ajoutés │  Existants│');
  console.log('├────────────────────────────────────────┼──────────┼──────────┤');
  for (const r of results) {
    const n = r.pharmacy.padEnd(38);
    const a = String(r.added === -1 ? '⚠ Introuvable' : `+${r.added}`).padEnd(8);
    const s = String(r.skipped >= 0 ? r.skipped : '').padEnd(8);
    console.log(`│ ${n} │ ${a} │ ${s} │`);
  }
  console.log('└────────────────────────────────────────┴──────────┴──────────┘');

  const totalAdded = results.reduce((s, r) => s + Math.max(r.added, 0), 0);
  const totalPharmacies = results.filter(r => r.skipped >= 0).length;
  console.log(`\n✅ ${totalAdded} médicaments ajoutés dans ${totalPharmacies} pharmacies`);
  console.log(`📸 ${imagesUpdated} images assignées au total\n`);

  await mongoose.disconnect();
  console.log('✅ Déconnecté\n');
}

seed().catch((err) => {
  console.error('❌ Erreur seed:', err);
  process.exit(1);
});
