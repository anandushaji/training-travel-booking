const SENSITIVE_KEYS = new Set([
  'cardNumber',
  'card_number',
  'pan',
  'cvv',
  'cvc',
  'stripeSecretKey',
  'stripe_secret_key',
  'STRIPE_SECRET_KEY',
]);

export function sanitizeLogContext(context: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeLogContext(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
