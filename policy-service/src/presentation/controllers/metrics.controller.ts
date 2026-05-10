import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import * as prom from 'prom-client';

@Controller()
export class MetricsController {
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Res() res: Response): Promise<void> {
    const metrics = await prom.register.metrics();
    res.status(200).send(metrics);
  }
}
