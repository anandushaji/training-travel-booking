import { Controller, Get } from '@nestjs/common';

@Controller('api/v1')
export class HealthController {
  @Get('health')
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'inventory-service' };
  }
}
