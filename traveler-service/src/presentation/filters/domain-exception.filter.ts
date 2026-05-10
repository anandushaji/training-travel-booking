import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '@travel/shared';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? '';

    const statusCode =
      exception.statusCode in HttpStatus
        ? exception.statusCode
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(statusCode).json({
      error: exception.code,
      message: exception.message,
      details: [],
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
