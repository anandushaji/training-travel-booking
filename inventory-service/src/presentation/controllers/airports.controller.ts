import { Controller, Get, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { searchAirports } from '../../infrastructure/airports/airport-data';

@Controller('api/v1/inventory/airports')
@UseGuards(new RolesGuard(new Reflector()))
export class AirportsController {
  @Get('search')
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  search(@Query('q') q: string) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('Query parameter "q" must be at least 2 characters');
    }

    return searchAirports(q.trim());
  }
}
