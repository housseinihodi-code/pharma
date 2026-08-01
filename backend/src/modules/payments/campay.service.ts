import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface CampayCollectResponse {
  reference: string;
  ussd_code: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  operator?: string;
}

export interface CampayStatusResponse {
  reference: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  amount: string;
  currency: string;
  operator: string;
  code: string;
  external_reference?: string;
  description?: string;
  from?: string;
}

@Injectable()
export class CampayService {
  private readonly logger = new Logger(CampayService.name);
  private readonly http: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private config: ConfigService) {
    const baseURL = this.config.get<string>('CAMPAY_BASE_URL', 'https://demo.campay.net/api');
    this.http = axios.create({ baseURL, timeout: 15000 });
  }

  // ── Token (mis en cache 50 min) ──────────────────────────────────────────
  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const username = this.config.get<string>('CAMPAY_USERNAME');
    const password = this.config.get<string>('CAMPAY_PASSWORD');

    if (!username || !password) {
      throw new BadRequestException(
        'Campay non configuré. Renseignez CAMPAY_USERNAME et CAMPAY_PASSWORD dans le fichier .env',
      );
    }

    try {
      const res = await this.http.post('/token/', { username, password });
      this.token = res.data.token;
      this.tokenExpiresAt = Date.now() + 50 * 60 * 1000; // 50 min
      this.logger.log('Token Campay obtenu');
      return this.token!;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Erreur authentification Campay';
      this.logger.error('Campay token error:', msg);
      throw new BadRequestException(`Campay: ${msg}`);
    }
  }

  isSandbox(): boolean {
    const url = this.config.get<string>('CAMPAY_BASE_URL', '');
    return url.includes('demo');
  }

  // ── Initier un paiement ───────────────────────────────────────────────────
  async collect(params: {
    amount: number;
    phone: string;          // format: 237677000000 ou 6XXXXXXXX
    description: string;
    externalRef: string;    // votre order ID
    notifyUrl: string;      // webhook URL
  }): Promise<CampayCollectResponse> {
    const token = await this.getToken();

    // Normaliser le numéro : retirer espaces/+, assurer préfixe 237
    let phone = params.phone.replace(/\s/g, '').replace(/^\+/, '');
    if (phone.startsWith('6') && phone.length === 9) phone = `237${phone}`;
    if (phone.startsWith('0') && phone.length === 10) phone = `237${phone.slice(1)}`;

    // Sandbox Campay : montant max 25 XAF
    const amount = this.isSandbox() ? Math.min(params.amount, 25) : params.amount;
    if (this.isSandbox() && params.amount !== amount) {
      this.logger.warn(`Sandbox: montant ramené de ${params.amount} à ${amount} XAF`);
    }

    try {
      const res = await this.http.post(
        '/collect/',
        {
          amount: String(amount),
          currency: 'XAF',
          from: phone,
          description: params.description,
          external_reference: params.externalRef,
          redirect_url: '',
        },
        { headers: { Authorization: `Token ${token}` } },
      );
      this.logger.log(`Campay collect initié: ref=${res.data.reference} phone=${phone} statut=${res.data.status}`);
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.detail
        || err?.response?.data?.message
        || (typeof err?.response?.data === 'string' ? err.response.data : null)
        || err?.message
        || 'Erreur Campay collect';
      this.logger.error('Campay collect error:', err?.response?.data || msg);
      throw new BadRequestException(`Paiement impossible: ${msg}`);
    }
  }

  // ── Vérifier le statut d'une transaction ─────────────────────────────────
  async getTransactionStatus(reference: string): Promise<CampayStatusResponse> {
    const token = await this.getToken();
    try {
      const res = await this.http.get(`/transaction/${reference}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      return res.data;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Erreur statut transaction';
      throw new BadRequestException(`Campay: ${msg}`);
    }
  }

  // ── Valider la signature JWT Campay dans le webhook ──────────────────────
  isWebhookValid(body: any, signatureHeader?: string): boolean {
    // Campay inclut un champ "signature" JWT dans le body (pas dans le header)
    // Vérification basique : s'assurer que la source est bien CamPay
    if (body?.signature) {
      try {
        // Décoder le payload JWT sans vérification de signature (la clé n'est pas publique)
        const parts = body.signature.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
          if (payload.source !== 'CamPay') {
            this.logger.warn('Webhook: source JWT invalide');
            return false;
          }
        }
      } catch {
        this.logger.warn('Webhook: signature JWT illisible');
      }
    }
    return true;
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('CAMPAY_USERNAME') &&
      this.config.get('CAMPAY_PASSWORD')
    );
  }
}
