/**
 * Seed — Grands hôpitaux de Yaoundé avec leurs pharmacies hospitalières
 * Usage: npx ts-node -r tsconfig-paths/register src/scripts/seed-hospitals.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/pharmacy_db';

// ─── Données réelles des hôpitaux de Yaoundé ────────────────────────────────
const HOSPITALS = [
  {
    name: 'Pharmacie de l\'Hôpital Central de Yaoundé',
    hospitalName: 'Hôpital Central de Yaoundé (HCY)',
    address: 'Avenue Henri Dunant, Centre-ville, Yaoundé',
    phone: '+237 222 23 40 13',
    email: 'pharmacie@hcy.cm',
    coordinates: [11.5174, 3.8677],
    chronicSpecialties: ['diabete', 'hypertension', 'cancer', 'insuffisance_renale', 'epilepsie'],
    description:
      'Pharmacie principale de l\'Hôpital Central de Yaoundé. Centre de Traitement Agréé (CTA) pour les maladies chroniques. Dispensation d\'insuline, antihypertenseurs, antiépileptiques et médicaments onco-hématologiques.',
    rating: 4.2,
    medications: [
      { name: 'Insuline Glargine (Lantus)', genericName: 'Insuline glargine', category: 'diabète', price: 15000, stock: 50, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '100 UI/mL', dosageForm: 'Solution injectable', manufacturer: 'Sanofi' },
      { name: 'Metformine 1000mg', genericName: 'Metformine chlorhydrate', category: 'diabète', price: 3500, stock: 200, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '1000mg', dosageForm: 'Comprimé', manufacturer: 'Merck' },
      { name: 'Amlodipine 10mg', genericName: 'Amlodipine bésylate', category: 'cardiovasculaire', price: 4200, stock: 300, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '10mg', dosageForm: 'Comprimé' },
      { name: 'Losartan 50mg', genericName: 'Losartan potassique', category: 'cardiovasculaire', price: 5800, stock: 180, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '50mg', dosageForm: 'Comprimé' },
      { name: 'Cyclophosphamide 500mg', genericName: 'Cyclophosphamide', category: 'autre', price: 28000, stock: 30, chronicDiseaseCategory: 'cancer', requiresPrescription: true, strength: '500mg', dosageForm: 'Poudre injectable', manufacturer: 'Baxter' },
      { name: 'Lévétiracétam 500mg', genericName: 'Lévétiracétam', category: 'neurologie', price: 9500, stock: 80, chronicDiseaseCategory: 'epilepsie', requiresPrescription: true, strength: '500mg', dosageForm: 'Comprimé', manufacturer: 'UCB Pharma' },
      { name: 'Furosémide 40mg', genericName: 'Furosémide', category: 'cardiovasculaire', price: 1200, stock: 400, chronicDiseaseCategory: 'insuffisance_renale', requiresPrescription: true, strength: '40mg', dosageForm: 'Comprimé' },
    ],
  },
  {
    name: 'Pharmacie de l\'Hôpital Général de Yaoundé',
    hospitalName: 'Hôpital Général de Yaoundé (HGY)',
    address: 'Ekoudou, Yaoundé',
    phone: '+237 222 23 93 93',
    email: 'pharmacie@hgy.cm',
    coordinates: [11.5025, 3.8514],
    chronicSpecialties: ['vih', 'tuberculose', 'hepatite', 'diabete', 'hypertension'],
    description:
      'Pharmacie de l\'Hôpital Général de Yaoundé. Centre de Traitement Agréé (CTA) de référence pour le VIH/SIDA. Dispensation gratuite des antirétroviraux sous protocole national et traitement de la tuberculose (CTB).',
    rating: 4.5,
    medications: [
      { name: 'Ténofovir/Lamivudine/Dolutégravir (TLD)', genericName: 'TDF/3TC/DTG 300/300/50mg', category: 'autre', price: 0, stock: 500, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '300/300/50mg', dosageForm: 'Comprimé', manufacturer: 'ViiV Healthcare', description: 'Traitement ARV de 1ère ligne — dispensé gratuitement sous protocole PEPFAR' },
      { name: 'Abacavir/Lamivudine (Kivexa)', genericName: 'ABC/3TC 600/300mg', category: 'autre', price: 0, stock: 300, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '600/300mg', dosageForm: 'Comprimé', manufacturer: 'ViiV Healthcare' },
      { name: 'Rifampicine/Isoniazide/Pyrazinamide/Éthambutol', genericName: 'RHZE', category: 'autre', price: 0, stock: 400, chronicDiseaseCategory: 'tuberculose', requiresPrescription: true, strength: '150/75/400/275mg', dosageForm: 'Comprimé', manufacturer: 'Sanofi', description: 'Traitement antituberculeux phase intensive — gratuit' },
      { name: 'Rifampicine/Isoniazide (RH)', genericName: 'RH phase de continuation', category: 'autre', price: 0, stock: 600, chronicDiseaseCategory: 'tuberculose', requiresPrescription: true, strength: '150/75mg', dosageForm: 'Comprimé' },
      { name: 'Ténofovir/Emtricitabine/Efavirenz (TEE)', genericName: 'TDF/FTC/EFV 300/200/600mg', category: 'autre', price: 0, stock: 250, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '300/200/600mg', dosageForm: 'Comprimé', manufacturer: 'Gilead Sciences' },
      { name: 'Interféron Pégylé Alfa-2a', genericName: 'Peg-IFN α2a', category: 'autre', price: 45000, stock: 20, chronicDiseaseCategory: 'hepatite', requiresPrescription: true, strength: '180 mcg', dosageForm: 'Solution injectable', manufacturer: 'Roche' },
      { name: 'Sofosbuvir/Velpatasvir (Epclusa)', genericName: 'SOF/VEL 400/100mg', category: 'autre', price: 120000, stock: 15, chronicDiseaseCategory: 'hepatite', requiresPrescription: true, strength: '400/100mg', dosageForm: 'Comprimé', manufacturer: 'Gilead Sciences', description: 'Traitement hépatite C — panvirotype' },
      { name: 'Cotrimoxazole 960mg (prophylaxie VIH)', genericName: 'Sulfaméthoxazole/Triméthoprime', category: 'antibiotiques', price: 800, stock: 1000, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '800/160mg', dosageForm: 'Comprimé' },
    ],
  },
  {
    name: 'Pharmacie du CHU de Yaoundé',
    hospitalName: 'Centre Hospitalier Universitaire de Yaoundé (CHUY)',
    address: 'Rue Joseph Essono Balla, Ngoa-Ekelle, Yaoundé',
    phone: '+237 222 31 82 15',
    email: 'pharmacie@chuy.cm',
    coordinates: [11.4982, 3.8656],
    chronicSpecialties: ['cancer', 'insuffisance_renale', 'epilepsie', 'hypertension', 'diabete'],
    description:
      'Pharmacie du Centre Hospitalier Universitaire de Yaoundé. Spécialisée en oncologie, neurologie et néphrologie. Dispensation de chimiothérapies et immunosuppresseurs sous protocole médical strict.',
    rating: 4.3,
    medications: [
      { name: 'Doxorubicine 50mg', genericName: 'Doxorubicine chlorhydrate', category: 'autre', price: 35000, stock: 25, chronicDiseaseCategory: 'cancer', requiresPrescription: true, strength: '50mg/25mL', dosageForm: 'Solution injectable', manufacturer: 'Pfizer' },
      { name: 'Paclitaxel 300mg', genericName: 'Paclitaxel', category: 'autre', price: 82000, stock: 15, chronicDiseaseCategory: 'cancer', requiresPrescription: true, strength: '300mg/50mL', dosageForm: 'Solution concentrée pour perfusion', manufacturer: 'Bristol-Myers Squibb' },
      { name: 'Carboplatine 450mg', genericName: 'Carboplatine', category: 'autre', price: 67000, stock: 20, chronicDiseaseCategory: 'cancer', requiresPrescription: true, strength: '450mg/45mL', dosageForm: 'Solution pour perfusion' },
      { name: 'Ciclosporine 100mg', genericName: 'Ciclosporine', category: 'autre', price: 42000, stock: 40, chronicDiseaseCategory: 'insuffisance_renale', requiresPrescription: true, strength: '100mg', dosageForm: 'Capsule molle', manufacturer: 'Novartis', description: 'Immunosuppresseur — transplantation rénale' },
      { name: 'Érythropoïétine (EPO) 4000 UI', genericName: 'Époïétine alpha', category: 'autre', price: 25000, stock: 35, chronicDiseaseCategory: 'insuffisance_renale', requiresPrescription: true, strength: '4000 UI/0,4mL', dosageForm: 'Solution injectable', manufacturer: 'Janssen' },
      { name: 'Phénytoïne 100mg', genericName: 'Phénytoïne sodique', category: 'neurologie', price: 3200, stock: 120, chronicDiseaseCategory: 'epilepsie', requiresPrescription: true, strength: '100mg', dosageForm: 'Comprimé', manufacturer: 'Pfizer' },
      { name: 'Valproate de sodium 500mg', genericName: 'Acide valproïque', category: 'neurologie', price: 5500, stock: 150, chronicDiseaseCategory: 'epilepsie', requiresPrescription: true, strength: '500mg', dosageForm: 'Comprimé à libération prolongée', manufacturer: 'Sanofi' },
      { name: 'Tamoxifène 20mg', genericName: 'Tamoxifène citrate', category: 'autre', price: 12000, stock: 60, chronicDiseaseCategory: 'cancer', requiresPrescription: true, strength: '20mg', dosageForm: 'Comprimé', manufacturer: 'AstraZeneca', description: 'Hormonothérapie — cancer du sein hormono-dépendant' },
    ],
  },
  {
    name: 'Pharmacie du Centre Hospitalier d\'Essos',
    hospitalName: 'Centre Hospitalier d\'Essos (CHE)',
    address: 'Quartier Essos, Yaoundé',
    phone: '+237 222 20 28 22',
    email: 'pharmacie@essos.cm',
    coordinates: [11.5359, 3.8736],
    chronicSpecialties: ['diabete', 'hypertension', 'drepanocytose', 'hepatite'],
    description:
      'Pharmacie du Centre Hospitalier d\'Essos. Centre de référence pour la drépanocytose et le suivi des maladies chroniques dans le quartier Essos. Dispensation d\'hydroxyurée et de chélateurs du fer.',
    rating: 4.0,
    medications: [
      { name: 'Hydroxyurée 500mg', genericName: 'Hydroxyurée', category: 'autre', price: 8500, stock: 100, chronicDiseaseCategory: 'drepanocytose', requiresPrescription: true, strength: '500mg', dosageForm: 'Capsule', manufacturer: 'Bristol-Myers Squibb', description: 'Traitement de fond de la drépanocytose — réduit les crises vaso-occlusives' },
      { name: 'Déférasirox 500mg (Exjade)', genericName: 'Déférasirox', category: 'autre', price: 32000, stock: 40, chronicDiseaseCategory: 'drepanocytose', requiresPrescription: true, strength: '500mg', dosageForm: 'Comprimé dispersible', manufacturer: 'Novartis', description: 'Chélateur du fer — surcharge martiale transfusionnelle' },
      { name: 'Acide folique 5mg', genericName: 'Acide folique', category: 'vitamines', price: 900, stock: 500, chronicDiseaseCategory: 'drepanocytose', requiresPrescription: false, strength: '5mg', dosageForm: 'Comprimé' },
      { name: 'Pénicilline V 250mg (prophylaxie)', genericName: 'Phénoxyméthylpénicilline', category: 'antibiotiques', price: 2100, stock: 300, chronicDiseaseCategory: 'drepanocytose', requiresPrescription: true, strength: '250mg', dosageForm: 'Comprimé', description: 'Prophylaxie anti-pneumococcique chez l\'enfant drépanocytaire' },
      { name: 'Insuline NPH 100 UI/mL', genericName: 'Insuline isophane', category: 'diabète', price: 9500, stock: 80, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '100 UI/mL', dosageForm: 'Suspension injectable', manufacturer: 'Novo Nordisk' },
      { name: 'Glibenclamide 5mg', genericName: 'Glibenclamide', category: 'diabète', price: 1800, stock: 250, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '5mg', dosageForm: 'Comprimé' },
      { name: 'Atorvastatine 40mg', genericName: 'Atorvastatine calcique', category: 'cardiovasculaire', price: 6200, stock: 180, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '40mg', dosageForm: 'Comprimé', manufacturer: 'Pfizer' },
    ],
  },
  {
    name: 'Pharmacie de l\'Hôpital Militaire de Yaoundé',
    hospitalName: 'Hôpital Militaire de Yaoundé (HMY)',
    address: 'Ngousso, Route de Nsimalen, Yaoundé',
    phone: '+237 222 22 09 30',
    email: 'pharmacie@hmy.cm',
    coordinates: [11.5128, 3.8822],
    chronicSpecialties: ['hypertension', 'diabete', 'insuffisance_renale', 'epilepsie'],
    description:
      'Pharmacie de l\'Hôpital Militaire de Yaoundé. Ouverte aux militaires et civils. Dispensation de médicaments chroniques sous convention militaire et prise en charge des pathologies cardiovasculaires.',
    rating: 4.1,
    medications: [
      { name: 'Ramipril 10mg', genericName: 'Ramipril', category: 'cardiovasculaire', price: 4800, stock: 200, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '10mg', dosageForm: 'Comprimé', manufacturer: 'Sanofi' },
      { name: 'Bisoprolol 10mg', genericName: 'Bisoprolol fumarate', category: 'cardiovasculaire', price: 5200, stock: 250, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '10mg', dosageForm: 'Comprimé', manufacturer: 'Merck' },
      { name: 'Hydrochlorothiazide 25mg', genericName: 'Hydrochlorothiazide', category: 'cardiovasculaire', price: 1500, stock: 400, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '25mg', dosageForm: 'Comprimé' },
      { name: 'Sitagliptine 100mg (Januvia)', genericName: 'Sitagliptine phosphate', category: 'diabète', price: 22000, stock: 60, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '100mg', dosageForm: 'Comprimé', manufacturer: 'MSD' },
      { name: 'Empagliflozine 10mg (Jardiance)', genericName: 'Empagliflozine', category: 'diabète', price: 28000, stock: 40, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '10mg', dosageForm: 'Comprimé', manufacturer: 'Boehringer Ingelheim' },
      { name: 'Carbamazépine 200mg', genericName: 'Carbamazépine', category: 'neurologie', price: 3800, stock: 150, chronicDiseaseCategory: 'epilepsie', requiresPrescription: true, strength: '200mg', dosageForm: 'Comprimé', manufacturer: 'Novartis' },
    ],
  },
  {
    name: 'Pharmacie de la CNPS Yaoundé',
    hospitalName: 'Hôpital de la CNPS de Yaoundé',
    address: 'Avenue Monseigneur Vogt, Centre administratif, Yaoundé',
    phone: '+237 222 22 60 09',
    email: 'pharmacie@cnps.cm',
    coordinates: [11.5213, 3.8694],
    chronicSpecialties: ['diabete', 'hypertension', 'insuffisance_renale', 'hepatite'],
    description:
      'Pharmacie hospitalière de la CNPS. Dispensation de médicaments chroniques pris en charge par la Caisse Nationale de Prévoyance Sociale. Tiers-payant pour les assurés CNPS.',
    rating: 3.9,
    medications: [
      { name: 'Metformine 500mg', genericName: 'Metformine chlorhydrate', category: 'diabète', price: 2200, stock: 350, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '500mg', dosageForm: 'Comprimé' },
      { name: 'Glipizide 5mg', genericName: 'Glipizide', category: 'diabète', price: 3100, stock: 200, chronicDiseaseCategory: 'diabete', requiresPrescription: true, strength: '5mg', dosageForm: 'Comprimé' },
      { name: 'Nifédipine LP 30mg', genericName: 'Nifédipine', category: 'cardiovasculaire', price: 4500, stock: 180, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '30mg', dosageForm: 'Comprimé à libération prolongée' },
      { name: 'Candesartan 16mg', genericName: 'Candesartan cilexétil', category: 'cardiovasculaire', price: 8200, stock: 120, chronicDiseaseCategory: 'hypertension', requiresPrescription: true, strength: '16mg', dosageForm: 'Comprimé', manufacturer: 'AstraZeneca' },
      { name: 'Bicarbonate de sodium 1,4%', genericName: 'Bicarbonate de sodium', category: 'autre', price: 3500, stock: 80, chronicDiseaseCategory: 'insuffisance_renale', requiresPrescription: true, strength: '1,4%', dosageForm: 'Solution pour perfusion', description: 'Correction de l\'acidose métabolique — insuffisance rénale chronique' },
      { name: 'Ténofovir disoproxil 300mg (hépatite B)', genericName: 'Ténofovir disoproxil fumarate', category: 'autre', price: 18000, stock: 60, chronicDiseaseCategory: 'hepatite', requiresPrescription: true, strength: '300mg', dosageForm: 'Comprimé', manufacturer: 'Gilead Sciences', description: 'Traitement hépatite B chronique' },
    ],
  },
  {
    name: 'Pharmacie du Centre Pasteur du Cameroun',
    hospitalName: 'Centre Pasteur du Cameroun (CPC)',
    address: 'Rue Henri Dunant, Bastos, Yaoundé',
    phone: '+237 222 23 12 45',
    email: 'pharmacie@pasteur.cm',
    coordinates: [11.5104, 3.8806],
    chronicSpecialties: ['vih', 'hepatite', 'tuberculose'],
    description:
      'Pharmacie du Centre Pasteur du Cameroun. Centre de référence pour le diagnostic et la prise en charge du VIH, de l\'hépatite virale et de la tuberculose. Dispensation de vaccins, ARVs et antiviraux dans le cadre des programmes nationaux.',
    rating: 4.6,
    medications: [
      { name: 'Dolutégravir 50mg', genericName: 'Dolutégravir sodique', category: 'autre', price: 0, stock: 400, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '50mg', dosageForm: 'Comprimé', manufacturer: 'ViiV Healthcare', description: 'ARV 2ème ligne — dispensé gratuitement' },
      { name: 'Ritonavir/Lopinavir (Kaletra)', genericName: 'LPV/r 200/50mg', category: 'autre', price: 0, stock: 200, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '200/50mg', dosageForm: 'Comprimé', manufacturer: 'AbbVie', description: 'ARV 2ème ligne — dispensé gratuitement' },
      { name: 'Entécavir 0,5mg', genericName: 'Entécavir', category: 'autre', price: 32000, stock: 50, chronicDiseaseCategory: 'hepatite', requiresPrescription: true, strength: '0,5mg', dosageForm: 'Comprimé', manufacturer: 'Bristol-Myers Squibb', description: 'Traitement hépatite B chronique — naïfs de traitement' },
      { name: 'Lédipasvir/Sofosbuvir (Harvoni)', genericName: 'LDV/SOF 90/400mg', category: 'autre', price: 185000, stock: 10, chronicDiseaseCategory: 'hepatite', requiresPrescription: true, strength: '90/400mg', dosageForm: 'Comprimé', manufacturer: 'Gilead Sciences', description: 'Traitement hépatite C génotype 1 — durée 12 semaines' },
      { name: 'Isoniazide 300mg (prophylaxie TB)', genericName: 'Isoniazide', category: 'autre', price: 0, stock: 600, chronicDiseaseCategory: 'tuberculose', requiresPrescription: true, strength: '300mg', dosageForm: 'Comprimé', description: 'Traitement préventif de la tuberculose chez les PVVIH — dispensé gratuitement' },
      { name: 'Dapsone 100mg', genericName: 'Dapsone', category: 'antibiotiques', price: 4200, stock: 80, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '100mg', dosageForm: 'Comprimé', description: 'Prophylaxie Pneumocystis jirovecii chez les immunodéprimés' },
    ],
  },
  {
    name: 'Pharmacie de l\'Hôpital de District de Yaoundé Centre',
    hospitalName: 'Hôpital de District de Yaoundé Centre (HDC)',
    address: 'Mfoundi, Rue du Lac Ossa, Yaoundé',
    phone: '+237 222 22 47 18',
    email: 'pharmacie@hd-yaounde.cm',
    coordinates: [11.5195, 3.8632],
    chronicSpecialties: ['tuberculose', 'vih', 'drepanocytose', 'diabete'],
    description:
      'Pharmacie de l\'Hôpital de District de Yaoundé Centre. Point focal pour le dépistage et le traitement de la tuberculose (DOTS) et le suivi de proximité du VIH. Prise en charge de premier niveau de la drépanocytose.',
    rating: 3.8,
    medications: [
      { name: 'Rifampicine 300mg', genericName: 'Rifampicine', category: 'autre', price: 0, stock: 300, chronicDiseaseCategory: 'tuberculose', requiresPrescription: true, strength: '300mg', dosageForm: 'Gélule', description: 'Antituberculeux — gratuit programme national PNLT' },
      { name: 'Pyrazinamide 500mg', genericName: 'Pyrazinamide', category: 'autre', price: 0, stock: 350, chronicDiseaseCategory: 'tuberculose', requiresPrescription: true, strength: '500mg', dosageForm: 'Comprimé', description: 'Antituberculeux phase intensive — gratuit' },
      { name: 'Éthambutol 400mg', genericName: 'Éthambutol chlorhydrate', category: 'autre', price: 0, stock: 300, chronicDiseaseCategory: 'tuberculose', requiresPrescription: true, strength: '400mg', dosageForm: 'Comprimé', description: 'Antituberculeux — gratuit programme PNLT' },
      { name: 'Zidovudine/Lamivudine (Combivir)', genericName: 'AZT/3TC 300/150mg', category: 'autre', price: 0, stock: 150, chronicDiseaseCategory: 'vih', requiresPrescription: true, strength: '300/150mg', dosageForm: 'Comprimé', manufacturer: 'ViiV Healthcare', description: 'ARV — dispensé gratuitement' },
      { name: 'Prédnisolone 20mg', genericName: 'Prédnisolone', category: 'autre', price: 2800, stock: 200, chronicDiseaseCategory: 'drepanocytose', requiresPrescription: true, strength: '20mg', dosageForm: 'Comprimé', description: 'Traitement des crises drépanocytaires et co-infections' },
      { name: 'Glucomètre Accu-Check Active', genericName: 'Dispositif de glycémie', category: 'diabète', price: 18500, stock: 30, chronicDiseaseCategory: 'diabete', requiresPrescription: false, dosageForm: 'Dispositif médical', manufacturer: 'Roche' },
    ],
  },
];

// ─── Script principal ────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connecté à MongoDB\n');

  const db = mongoose.connection.db!;
  const pharmacies = db.collection('pharmacies');
  const medications = db.collection('medications');

  const results: { hospital: string; pharmacyStatus: string; medsAdded: number }[] = [];

  for (const hospital of HOSPITALS) {
    // Vérifier si la pharmacie existe déjà (par nom exact)
    const existing = await pharmacies.findOne({ name: hospital.name });

    let pharmacyId: mongoose.Types.ObjectId;

    if (existing) {
      pharmacyId = existing._id as mongoose.Types.ObjectId;
      // Mettre à jour les champs hospitaliers
      await pharmacies.updateOne(
        { _id: pharmacyId },
        {
          $set: {
            isHospitalPharmacy: true,
            hospitalName: hospital.hospitalName,
            chronicSpecialties: hospital.chronicSpecialties,
            isActive: true,
            isOpen: true,
            description: hospital.description,
            rating: hospital.rating,
            updatedAt: new Date(),
          },
        },
      );
      results.push({ hospital: hospital.hospitalName, pharmacyStatus: '🔄 Mise à jour', medsAdded: 0 });
    } else {
      // Créer la pharmacie hospitalière
      const insertResult = await pharmacies.insertOne({
        name: hospital.name,
        hospitalName: hospital.hospitalName,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
        location: {
          type: 'Point',
          coordinates: hospital.coordinates,
        },
        isOpen: true,
        isActive: true,
        isHospitalPharmacy: true,
        chronicSpecialties: hospital.chronicSpecialties,
        description: hospital.description,
        rating: hospital.rating,
        reviewCount: 0,
        hasDelivery: false,
        deliveryRadius: 0,
        deliveryFee: 0,
        isOnDuty: false,
        is24_7: false,
        openAllDays: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      pharmacyId = insertResult.insertedId;
    }

    // Ajouter les médicaments (ignorer ceux déjà existants pour cette pharmacie)
    let medsAdded = 0;
    for (const med of hospital.medications) {
      const existingMed = await medications.findOne({ name: med.name, pharmacyId });
      if (!existingMed) {
        await medications.insertOne({
          ...med,
          pharmacyId,
          isAvailable: true,
          minStock: Math.max(5, Math.floor(med.stock * 0.1)),
          isHospitalOnly: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        medsAdded++;
      }
    }

    if (existing) {
      results[results.length - 1].medsAdded = medsAdded;
    } else {
      results.push({ hospital: hospital.hospitalName, pharmacyStatus: '✅ Créé', medsAdded });
    }
  }

  // ─── Tableau récapitulatif ─────────────────────────────────────────────────
  console.log('\n┌──────────────────────────────────────────────────────────────┬──────────────────┬────────────┐');
  console.log('│ Hôpital                                                      │ Pharmacie        │ Médicaments│');
  console.log('├──────────────────────────────────────────────────────────────┼──────────────────┼────────────┤');
  for (const r of results) {
    const h = r.hospital.padEnd(60);
    const s = r.pharmacyStatus.padEnd(16);
    const m = `+${r.medsAdded} méds`.padEnd(10);
    console.log(`│ ${h} │ ${s} │ ${m} │`);
  }
  console.log('└──────────────────────────────────────────────────────────────┴──────────────────┴────────────┘');
  console.log(`\n🏥 ${HOSPITALS.length} hôpitaux traités\n`);

  await mongoose.disconnect();
  console.log('✅ Déconnecté\n');
}

seed().catch((err) => {
  console.error('❌ Erreur seed:', err);
  process.exit(1);
});
