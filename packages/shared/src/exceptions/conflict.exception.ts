import { DomainException } from './domain.exception';

export class ConflictException extends DomainException {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, 409, context);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
