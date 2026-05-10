import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      correlationId?: string;
    }>();
    const response = context.switchToHttp().getResponse<{
      setHeader(name: string, value: string): void;
      headersSent?: boolean;
    }>();

    const existing = request.headers['x-correlation-id'];
    const correlationId = existing ?? randomUUID();

    request.correlationId = correlationId;

    return next.handle().pipe(
      tap(() => {
        // Skip if proxy controller already sent the response manually (@Res() without passthrough)
        if (!response.headersSent) {
          response.setHeader('X-Correlation-ID', correlationId);
        }
      }),
    );
  }
}
