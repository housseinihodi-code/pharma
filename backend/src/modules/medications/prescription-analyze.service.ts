import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Medication, MedicationDocument } from './schemas/medication.schema';

interface PrescribedMed {
  name: string;
  dosage?: string;
  duration?: string;
}

interface MedResult {
  prescribed: string;
  dosage?: string;
  duration?: string;
  exactMatches: MedicationDocument[];
  genericEquivalents: MedicationDocument[];
  categoryAlternatives: MedicationDocument[];
}

export interface PrescriptionAnalysis {
  success: boolean;
  rawText: string;
  medications: MedResult[];
  pharmacistNote?: string;
}

@Injectable()
export class PrescriptionAnalyzeService {
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  }

  async analyzeFromUrl(prescriptionUrl: string): Promise<PrescriptionAnalysis> {
    if (!process.env.GEMINI_API_KEY) {
      throw new BadRequestException('Clé API Gemini non configurée.');
    }

    const relativePath = prescriptionUrl.replace(/^\//, '');
    const filePath = path.join(process.cwd(), relativePath);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Fichier d\'ordonnance introuvable.');
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      throw new BadRequestException(
        'Les PDFs ne peuvent pas être analysés visuellement. Merci de fournir une image JPEG ou PNG.',
      );
    }

    const validExts: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    const mimeType = validExts[ext];
    if (!mimeType) throw new BadRequestException('Format non supporté.');

    const base64 = fs.readFileSync(filePath).toString('base64');

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Tu es un assistant pharmaceutique expert. Analyse cette ordonnance médicale et extrait la liste des médicaments prescrits.

Réponds UNIQUEMENT en JSON strictement valide, sans texte avant ni après :

{
  "success": true,
  "rawText": "texte brut extrait de l'ordonnance",
  "medications": [
    {
      "name": "nom du médicament tel qu'écrit",
      "dosage": "posologie si lisible (ex: 500mg, 2 comprimés/j)",
      "duration": "durée si mentionnée (ex: 7 jours)"
    }
  ],
  "pharmacistNote": "remarque si l'ordonnance est illisible, incomplète ou suspecte"
}

Si aucun médicament n'est identifiable, retourne { "success": false, "rawText": "...", "medications": [], "pharmacistNote": "raison" }.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ]);

    const text = result.response.text();
    let parsed: any = { success: false, rawText: text, medications: [] };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed = { success: false, rawText: text, medications: [] };
    }

    const prescribedMeds: PrescribedMed[] = parsed.medications ?? [];

    const results: MedResult[] = await Promise.all(
      prescribedMeds.map(med => this.findEquivalents(med)),
    );

    return {
      success: parsed.success ?? false,
      rawText: parsed.rawText ?? '',
      medications: results,
      pharmacistNote: parsed.pharmacistNote,
    };
  }

  private async findEquivalents(med: PrescribedMed): Promise<MedResult> {
    const nameRoots = this.extractRoots(med.name);

    const exactMatches = await this.medicationModel
      .find({
        $or: nameRoots.map(r => ({ name: new RegExp(r, 'i') })),
        stock: { $gt: 0 },
        isAvailable: true,
      })
      .populate('pharmacyId', 'name address phone isOpen location')
      .limit(4)
      .lean() as any;

    let genericEquivalents: any[] = [];
    if (nameRoots.length > 0) {
      genericEquivalents = await this.medicationModel
        .find({
          $or: nameRoots.map(r => ({ genericName: new RegExp(r, 'i') })),
          stock: { $gt: 0 },
          isAvailable: true,
          _id: { $nin: exactMatches.map((m: any) => m._id) },
        })
        .populate('pharmacyId', 'name address phone isOpen location')
        .limit(4)
        .lean() as any;
    }

    let categoryAlternatives: any[] = [];
    if (exactMatches.length === 0 && genericEquivalents.length === 0) {
      const categoryResult = await this.medicationModel
        .findOne({
          $or: nameRoots.map(r => ({
            $or: [{ name: new RegExp(r, 'i') }, { genericName: new RegExp(r, 'i') }],
          })),
        })
        .lean() as any;

      if (categoryResult?.category) {
        categoryAlternatives = await this.medicationModel
          .find({
            category: categoryResult.category,
            stock: { $gt: 0 },
            isAvailable: true,
          })
          .populate('pharmacyId', 'name address phone isOpen location')
          .limit(3)
          .lean() as any;
      }
    }

    return {
      prescribed: med.name,
      dosage: med.dosage,
      duration: med.duration,
      exactMatches,
      genericEquivalents,
      categoryAlternatives,
    };
  }

  private extractRoots(name: string): string[] {
    const cleaned = name
      .replace(/\d+\s*(mg|ml|g|mcg|µg|ui|cp|cpr|comp|gél|gel|amp|inj)\b/gi, '')
      .replace(/\b(comprimé|gélule|sirop|injection|solution|suspension|pommade|crème|gouttes?)\b/gi, '')
      .trim();

    const words = cleaned.split(/\s+/).filter(w => w.length >= 4);
    return words.length > 0 ? words.slice(0, 2) : [cleaned.slice(0, 6)];
  }
}
