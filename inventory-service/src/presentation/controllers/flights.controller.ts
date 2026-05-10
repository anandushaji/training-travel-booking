import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SearchFlightsUseCase } from '../../application/use-cases/search-flights/search-flights.use-case';
import { SearchFlightsRequestDto } from '../dto/search-flights-request.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('api/v1/flights')
@UseGuards(new RolesGuard(new Reflector()))
export class FlightsController {
  constructor(private readonly searchFlightsUseCase: SearchFlightsUseCase) {}

  @Get('search')
  @Roles('Employee', 'Manager', 'Admin')
  async search(@Query() dto: SearchFlightsRequestDto) {
    return this.searchFlightsUseCase.execute({
      origin: dto.origin,
      destination: dto.destination,
      departureDate: dto.departureDate,
      ...(dto.returnDate !== undefined && { returnDate: dto.returnDate }),
      passengers: dto.passengers,
      ...(dto.cabinClass !== undefined && { cabinClass: dto.cabinClass }),
    });
  }
}
