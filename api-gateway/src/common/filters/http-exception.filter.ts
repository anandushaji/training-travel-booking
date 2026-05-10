import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const errorCode =
      exception instanceof HttpException
        ? (exception.getResponse() as { error?: string }).error ?? exception.name
        : 'InternalServerError';

    response.status(status).json({
      error: errorCode,
      message,
      details: [],
      correlationId: request.correlationId ?? '',
      timestamp: new Date().toISOString(),
    });
  }
}
