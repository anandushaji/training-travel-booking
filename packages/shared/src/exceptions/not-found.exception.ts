import { DomainException } from './domain.exception';

export class NotFoundException extends DomainException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, context);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
