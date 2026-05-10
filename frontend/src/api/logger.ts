export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogPayload {
  timestamp: string;
  level: LogLevel;
  service: 'frontend';
  correlationId: string | null;
  message: string;
  context?: Record<string, unknown>;
}

function getCorrelationId(): string | null {
  // In the browser we don't have a server-side correlation ID at logger-call time.
  // A real implementation would read it from a React context / store.
  // For now we return null as a safe default.
  return null;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    service: 'frontend',
    correlationId: getCorrelationId(),
    message,
    ...(context ? { context } : {}),
  };

  if (typeof window === 'undefined' || level === 'error') {
    console.error(JSON.stringify(payload));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(payload));
  } else if (level === 'info') {
    console.info(JSON.stringify(payload));
  } else {
    console.debug(JSON.stringify(payload));
  }
}

export const logger = {
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
};
