export class DomainException extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
