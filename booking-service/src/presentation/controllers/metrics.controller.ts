import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as prom from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  async metrics(@Res() res: Response): Promise<void> {
    const metrics = await prom.register.metrics();
    res.set('Content-Type', prom.register.contentType);
    res.send(metrics);
  }
}
