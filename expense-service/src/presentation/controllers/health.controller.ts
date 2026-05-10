import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as prom from 'prom-client';

@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('health')
  health(): { status: string; timestamp: string } {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready(): Promise<{ status: string; database: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ready', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException('Database is not available');
    }
  }

  @Get('metrics')
  async metrics(): Promise<string> {
    const metricsOutput = await prom.register.metrics();
    return metricsOutput;
  }
}
