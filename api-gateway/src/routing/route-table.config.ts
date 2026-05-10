import { ConfigService } from '@nestjs/config';

export interface RouteEntry {
  prefix: string;
  serviceUrl: string;
  serviceName: string;
}

export function buildRouteTable(config: ConfigService): RouteEntry[] {
  return [
    { prefix: '/api/v1/bookings', serviceUrl: config.get<string>('BOOKING_SERVICE_URL') ?? '', serviceName: 'booking' },
    { prefix: '/api/v1/policies', serviceUrl: config.get<string>('POLICY_SERVICE_URL') ?? '', serviceName: 'policy' },
    { prefix: '/api/v1/travelers', serviceUrl: config.get<string>('TRAVELER_SERVICE_URL') ?? '', serviceName: 'traveler' },
    { prefix: '/api/v1/payments', serviceUrl: config.get<string>('PAYMENT_SERVICE_URL') ?? '', serviceName: 'payment' },
    { prefix: '/api/v1/inventory', serviceUrl: config.get<string>('INVENTORY_SERVICE_URL') ?? '', serviceName: 'inventory' },
    { prefix: '/api/v1/expenses', serviceUrl: config.get<string>('EXPENSE_SERVICE_URL') ?? '', serviceName: 'expense' },
  ];
}
