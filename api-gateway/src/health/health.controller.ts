import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { register } from 'prom-client';
import { Public } from '../auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@Public()
@SkipThrottle()
export class HealthController {
  @Get('health')
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await register.metrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(metrics);
  }
}
