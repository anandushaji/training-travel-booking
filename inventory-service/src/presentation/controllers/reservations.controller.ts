import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isValidUuid } from '@travel/shared';
import { CreateReservationUseCase } from '../../application/use-cases/create-reservation/create-reservation.use-case';
import { GetReservationUseCase } from '../../application/use-cases/get-reservation/get-reservation.use-case';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation/cancel-reservation.use-case';
import { CreateReservationRequestDto } from '../dto/create-reservation-request.dto';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('api/v1/inventory/flights/reservations')
@UseGuards(new RolesGuard(new Reflector()))
export class ReservationsController {
  constructor(
    private readonly createReservationUseCase: CreateReservationUseCase,
    private readonly getReservationUseCase: GetReservationUseCase,
    private readonly cancelReservationUseCase: CancelReservationUseCase,
  ) {}

  @Post()
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  async create(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Headers('x-correlation-id') correlationId: string | undefined,
    @Body() dto: CreateReservationRequestDto,
  ) {
    if (!idempotencyKey || !isValidUuid(idempotencyKey)) {
      throw new BadRequestException('Missing or invalid Idempotency-Key header (must be UUID v4)');
    }

    const result = await this.createReservationUseCase.execute({
      offerId: dto.offerId,
      passengerId: dto.passengerId,
      passengerFirstName: 'Unknown', // populated from passenger service in real flow
      passengerLastName: 'Unknown',
      cabinClass: dto.cabinClass,
      idempotencyKey,
      ...(correlationId !== undefined && { correlationId }),
    });

    return {
      ...result.response,
      statusCode: result.isNew ? HttpStatus.CREATED : HttpStatus.OK,
    };
  }

  @Get(':reservationId')
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  async getOne(@Param('reservationId') reservationId: string) {
    return this.getReservationUseCase.execute({ reservationId });
  }

  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  async cancel(
    @Param('reservationId') reservationId: string,
    @Headers('x-correlation-id') correlationId: string | undefined,
  ): Promise<void> {
    await this.cancelReservationUseCase.execute({
      reservationId,
      ...(correlationId !== undefined && { correlationId }),
    });
  }
}
