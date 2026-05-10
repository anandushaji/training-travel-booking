import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { generateUuid } from '@travel/shared';
import { SearchFlightsUseCase } from '../../application/use-cases/search-flights/search-flights.use-case';
import { SearchFlightsRequestDto } from '../dto/search-flights-request.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import type { FlightOfferResult } from '../../application/use-cases/search-flights/search-flights.result';

/**
 * Maps the internal FlightOfferResult shape to the API contract shape
 * expected by the frontend (FlightOffer in search.types.ts).
 */
function mapOffer(offer: FlightOfferResult) {
  const depMs = new Date(offer.departureAt).getTime();
  const arrMs = new Date(offer.arrivalAt).getTime();
  const durationMin = Math.max(0, Math.round((arrMs - depMs) / 60_000));
  const durationHr = Math.floor(durationMin / 60);
  const durationRem = durationMin % 60;
  const duration = durationRem > 0 ? `${durationHr}h ${durationRem}m` : `${durationHr}h`;

  return {
    id: offer.offerId,
    airline: offer.carrier,
    origin: offer.origin,
    destination: offer.destination,
    departureTime: offer.departureAt,
    arrivalTime: offer.arrivalAt,
    price: {
      amount: parseFloat(offer.price.amount),
      currency: offer.price.currency,
    },
    stops: 0,
    duration,
  };
}

@Controller('api/v1/inventory/flights')
@UseGuards(new RolesGuard(new Reflector()))
export class FlightsController {
  constructor(private readonly searchFlightsUseCase: SearchFlightsUseCase) {}

  @Get('search')
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  async search(@Query() dto: SearchFlightsRequestDto) {
    const result = await this.searchFlightsUseCase.execute({
      origin: dto.origin,
      destination: dto.destination,
      departureDate: dto.departureDate,
      ...(dto.returnDate !== undefined && { returnDate: dto.returnDate }),
      passengers: dto.passengers,
      ...(dto.cabinClass !== undefined && { cabinClass: dto.cabinClass }),
    });

    return {
      offers: result.data.map(mapOffer),
      meta: {
        count: result.meta.count,
        cached: result.meta.cachedAt !== null,
        searchId: generateUuid(),
      },
    };
  }
}
