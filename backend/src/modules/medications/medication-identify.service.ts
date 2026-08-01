import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Anthropic from '@anthropic-ai/sdk';
import { Medication, MedicationDocument } from './schemas/medication.schema';

interface IdentifyResult {
  identified: boolean;
  name?: string;
  genericName?: string;
  description?: string;
  dosage?: string;
  category?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  rawAnalysis: string;
  matches: MedicationDocument[];
}

@Injectable()
export class MedicationIdentifyService {
  private client: Anthropic;

  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<MedicationDocument>,
  ) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async identifyFromBase64(base64Image: string, mediaType: string): Promise<IdentifyResult> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new BadRequestException('Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans le fichier .env');
    }

    const validMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMediaTypes.includes(mediaType)) {
      throw new BadRequestException('Format d\'image non supporté. Utilisez JPEG, PNG, GIF ou WebP');
    }

    const prompt = `Tu es un expert pharmaceutique. Analyse cette image d'un médicament et fournis les informations suivantes en JSON strictement valide :

{
  "identified": true/false,
  "name": "nom commercial du médicament",
  "genericName": "nom générique (DCI)",
  "description": "description courte en 1-2 phrases",
  "dosage": "dosage si visible (ex: 500mg, 10mg/5ml)",
  "category": "catégorie (antibiotique, analgésique, antihypertenseur, etc.)",
  "confidence": "high/medium/low/none",
  "rawAnalysis": "description de ce que tu vois dans l'image"
}

Si tu ne peux pas identifier le médicament, met identified: false et confidence: "none".
Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as any,
                data: base64Image,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    let parsed: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = { identified: false, confidence: 'none', rawAnalysis: text };
    }

    // Chercher des correspondances dans la base de données
    let matches: MedicationDocument[] = [];
    if (parsed.identified && (parsed.name || parsed.genericName)) {
      const searchTerms = [parsed.name, parsed.genericName].filter(Boolean);
      const regexes = searchTerms.map(t => new RegExp(t.split(' ')[0], 'i'));

      matches = await this.medicationModel
        .find({
          $or: [
            { name: { $in: regexes } },
            { genericName: { $in: regexes } },
          ],
          stock: { $gt: 0 },
        })
        .populate('pharmacyId', 'name address phone isOpen')
        .limit(6)
        .lean() as any;
    }

    return {
      identified: parsed.identified ?? false,
      name: parsed.name,
      genericName: parsed.genericName,
      description: parsed.description,
      dosage: parsed.dosage,
      category: parsed.category,
      confidence: parsed.confidence ?? 'none',
      rawAnalysis: parsed.rawAnalysis ?? text,
      matches,
    };
  }
}
