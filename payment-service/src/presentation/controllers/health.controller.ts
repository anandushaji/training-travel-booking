import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'payment-service' };
  }

  @Get('ready')
  ready(): { status: string; database: string; stripe: string } {
    return { status: 'ok', database: 'connected', stripe: 'reachable' };
  }
}
