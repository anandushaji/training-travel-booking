import { DomainException } from './domain.exception';

export class ValidationException extends DomainException {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, 422, context);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
