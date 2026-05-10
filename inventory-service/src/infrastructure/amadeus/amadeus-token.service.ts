import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

@Injectable()
export class AmadeusTokenService {
  private readonly logger = new Logger(AmadeusTokenService.name);
  private cache: TokenCache | null = null;
  private pendingRefresh: Promise<string> | null = null;

  constructor(private readonly config: ConfigService) {}

  async getToken(): Promise<string> {
    const nowMs = Date.now();
    if (this.cache && this.cache.expiresAt - 60_000 > nowMs) {
      return this.cache.accessToken;
    }

    // Pending-promise lock — prevents concurrent refresh stampede
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    this.pendingRefresh = this._refresh().finally(() => {
      this.pendingRefresh = null;
    });

    return this.pendingRefresh;
  }

  private async _refresh(): Promise<string> {
    const baseUrl = this.config.get<string>('AMADEUS_BASE_URL') ?? 'https://test.api.amadeus.com';
    const clientId = this.config.get<string>('AMADEUS_CLIENT_ID') ?? '';
    const clientSecret = this.config.get<string>('AMADEUS_CLIENT_SECRET') ?? '';

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post<{ access_token: string; expires_in: number }>(
      `${baseUrl}/v1/security/oauth2/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const { access_token, expires_in } = response.data;
    this.cache = {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    this.logger.debug('Amadeus token refreshed');
    return access_token;
  }
}
