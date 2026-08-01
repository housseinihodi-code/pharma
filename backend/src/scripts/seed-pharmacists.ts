/**
 * Seed script — crée un compte pharmacien pour chaque pharmacie sans propriétaire
 * Usage: npx ts-node src/scripts/seed-pharmacists.ts
 */

import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const MONGODB_URI = 'mongodb://localhost:27017/pharmacy_db';
const PASSWORD = 'Test@1234';

const ACCOUNTS = [
  {
    pharmacyId: '6a26ad077a3629e6c69df8a3',
    pharmacyName: 'Pharmacie du Centre',
    firstName: 'Ahmed', lastName: 'Moussa',
    email: 'pharmacien.centre@test.com',
    phone: '+237 6 90 01 01 01',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8a4',
    pharmacyName: 'Pharmacie Bastos',
    firstName: 'Marie', lastName: 'Nkono',
    email: 'pharmacien.bastos@test.com',
    phone: '+237 6 90 02 02 02',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8a5',
    pharmacyName: 'Pharmacie Nlongkak',
    firstName: 'Paul', lastName: 'Essomba',
    email: 'pharmacien.nlongkak@test.com',
    phone: '+237 6 90 03 03 03',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8a6',
    pharmacyName: 'Pharmacie Mvog-Ada',
    firstName: 'Sylvie', lastName: 'Belinga',
    email: 'pharmacien.mvogada@test.com',
    phone: '+237 6 90 04 04 04',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8a7',
    pharmacyName: 'Pharmacie Biyem-Assi',
    firstName: 'Jean', lastName: 'Mbarga',
    email: 'pharmacien.biyemassi@test.com',
    phone: '+237 6 90 05 05 05',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8a8',
    pharmacyName: 'Pharmacie Melen',
    firstName: 'Christine', lastName: 'Onana',
    email: 'pharmacien.melen@test.com',
    phone: '+237 6 90 06 06 06',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8a9',
    pharmacyName: 'Pharmacie Essos',
    firstName: 'Robert', lastName: 'Atanga',
    email: 'pharmacien.essos@test.com',
    phone: '+237 6 90 07 07 07',
  },
  {
    pharmacyId: '6a26ad077a3629e6c69df8aa',
    pharmacyName: 'Pharmacie Mendong',
    firstName: 'Fatima', lastName: 'Hamidou',
    email: 'pharmacien.mendong@test.com',
    phone: '+237 6 90 08 08 08',
  },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db!;
  const users = db.collection('users');
  const pharmacies = db.collection('pharmacies');

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);
  const results: { email: string; pharmacyName: string; status: string }[] = [];

  for (const account of ACCOUNTS) {
    const pharmacyOid = new mongoose.Types.ObjectId(account.pharmacyId);

    // Vérifier si un propriétaire existe déjà pour cette pharmacie
    const pharmacy = await pharmacies.findOne({ _id: pharmacyOid });
    if (!pharmacy) {
      results.push({ email: account.email, pharmacyName: account.pharmacyName, status: '⚠  Pharmacie introuvable' });
      continue;
    }
    if (pharmacy.ownerId) {
      results.push({ email: account.email, pharmacyName: account.pharmacyName, status: '⏭  Déjà un propriétaire — ignoré' });
      continue;
    }

    // Vérifier si l'email est déjà utilisé
    const existing = await users.findOne({ email: account.email });
    if (existing) {
      results.push({ email: account.email, pharmacyName: account.pharmacyName, status: '⏭  Email déjà utilisé — ignoré' });
      continue;
    }

    // Créer l'utilisateur pharmacien
    const insertResult = await users.insertOne({
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      password: hashedPassword,
      phone: account.phone,
      role: 'pharmacist',
      isActive: true,
      isApproved: true,
      pharmacyId: pharmacyOid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Lier la pharmacie à cet utilisateur
    await pharmacies.updateOne(
      { _id: pharmacyOid },
      { $set: { ownerId: insertResult.insertedId, isActive: true } },
    );

    results.push({ email: account.email, pharmacyName: account.pharmacyName, status: '✅ Créé' });
  }

  // Affichage du tableau récapitulatif
  console.log('┌─────────────────────────────────────────┬───────────────────────────────┬──────────────────────────────────┐');
  console.log('│ Email                                   │ Pharmacie                     │ Statut                           │');
  console.log('├─────────────────────────────────────────┼───────────────────────────────┼──────────────────────────────────┤');
  for (const r of results) {
    const email = r.email.padEnd(39);
    const name = r.pharmacyName.padEnd(29);
    const status = r.status.padEnd(32);
    console.log(`│ ${email} │ ${name} │ ${status} │`);
  }
  console.log('└─────────────────────────────────────────┴───────────────────────────────┴──────────────────────────────────┘');
  console.log(`\n🔑 Mot de passe commun pour tous les comptes test : ${PASSWORD}\n`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Erreur seed:', err);
  process.exit(1);
});
