import { DomainException } from '@travel/shared';

export class AmadeusNotFoundException extends DomainException {
  constructor(message = 'Amadeus resource not found') {
    super(message, 'AmadeusNotFound', 404);
  }
}
