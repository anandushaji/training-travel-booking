import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

const SERVICE_NAME = 'traveler-service';

@Injectable()
export class LoggingService implements LoggerService {
  private readonly logger: Logger;
  private correlationId = '';

  constructor() {
    this.logger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json(),
      ),
      defaultMeta: { service: SERVICE_NAME },
      transports: [new transports.Console()],
    });
  }

  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  log(message: string, context?: string): void {
    this.logger.info(message, { context, correlationId: this.correlationId });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context, correlationId: this.correlationId });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context, correlationId: this.correlationId });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context, correlationId: this.correlationId });
  }
}
