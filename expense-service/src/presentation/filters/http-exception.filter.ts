import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { DomainException } from '@travel/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? 'unknown';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        error = String(resp['error'] ?? exception.constructor.name);
        message = Array.isArray(resp['message'])
          ? (resp['message'] as string[]).join('; ')
          : String(resp['message'] ?? exception.message);
        details = Array.isArray(resp['message']) ? (resp['message'] as unknown[]) : [];
      } else {
        message = String(exceptionResponse);
      }
    } else if (exception instanceof DomainException) {
      statusCode = exception.statusCode;
      error = exception.code;
      message = exception.message;
      details = exception.context ? [exception.context] : [];
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    response.status(statusCode).json({
      error,
      message,
      details,
    });
  }
}
