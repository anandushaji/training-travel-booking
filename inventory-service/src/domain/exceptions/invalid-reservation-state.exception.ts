import { DomainException } from '@travel/shared';

export class InvalidReservationStateException extends DomainException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_STATUS_TRANSITION', 422, context);
  }
}
