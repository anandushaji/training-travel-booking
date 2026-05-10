import { Module } from '@nestjs/common';
import { AmadeusTokenService } from './amadeus-token.service';
import { AmadeusHttpClient } from './amadeus-http.client';

@Module({
  providers: [AmadeusTokenService, AmadeusHttpClient],
  exports: [AmadeusTokenService, AmadeusHttpClient],
})
export class AmadeusModule {}
