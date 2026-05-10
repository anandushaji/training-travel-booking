import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import * as winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console({ format: winston.format.json() })],
});

function redactSensitive(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...(body as Record<string, unknown>) };
  if ('password' in copy) copy['password'] = '[REDACTED]';
  if ('refreshToken' in copy) copy['refreshToken'] = '[REDACTED]';
  return copy;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      body?: unknown;
      correlationId?: string;
      user?: { sub?: string };
      headers: Record<string, string | undefined>;
    }>();

    const { method, url, correlationId, user } = request;
    const startMs = Date.now();

    // Never log the Authorization header value
    logger.info('request', {
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'api-gateway',
      correlationId,
      message: `Incoming ${method} ${url}`,
      context: {
        method,
        path: url,
        userId: user?.sub,
        body: redactSensitive(request.body),
      },
    });

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse<{ statusCode: number }>();
        const durationMs = Date.now() - startMs;
        logger.info('response', {
          timestamp: new Date().toISOString(),
          level: 'info',
          service: 'api-gateway',
          correlationId,
          message: `Completed ${method} ${url}`,
          context: { method, path: url, statusCode: response.statusCode, durationMs },
        });
        return data;
      }),
      catchError((err: unknown) => {
        const durationMs = Date.now() - startMs;
        const status = (err as { status?: number }).status ?? 500;
        logger.error('request-error', {
          timestamp: new Date().toISOString(),
          level: 'error',
          service: 'api-gateway',
          correlationId,
          message: `Error ${method} ${url}`,
          context: { method, path: url, statusCode: status, durationMs, error: String(err) },
        });
        return throwError(() => err);
      }),
    );
  }
}
