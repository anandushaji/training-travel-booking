import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InventoryConfig {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return this.config.get<number>('PORT') ?? 3005;
  }

  get databaseUrl(): string {
    return this.config.get<string>('DATABASE_URL') ?? '';
  }

  get redisUrl(): string {
    return this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
  }

  get kafkaBrokers(): string[] {
    return (this.config.get<string>('KAFKA_BROKERS') ?? 'localhost:9092').split(',');
  }

  get amadeusBaseUrl(): string {
    return this.config.get<string>('AMADEUS_BASE_URL') ?? 'https://test.api.amadeus.com';
  }

  get amadeusClientId(): string {
    return this.config.get<string>('AMADEUS_CLIENT_ID') ?? '';
  }

  get amadeusClientSecret(): string {
    return this.config.get<string>('AMADEUS_CLIENT_SECRET') ?? '';
  }

  get reservationHoldMinutes(): number {
    return this.config.get<number>('RESERVATION_HOLD_MINUTES') ?? 15;
  }

  get passportEncryptionKey(): string {
    return this.config.get<string>('PASSPORT_ENCRYPTION_KEY') ?? '';
  }
}
