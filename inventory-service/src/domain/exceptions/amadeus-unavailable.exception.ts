import { DomainException } from '@travel/shared';

export class AmadeusUnavailableException extends DomainException {
  constructor(message = 'Amadeus service is currently unavailable') {
    super(message, 'AmadeusUnavailable', 503);
  }
}
