import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { generateUuid } from '@travel/shared';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateBookingUseCase } from '../../application/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from '../../application/use-cases/cancel-booking.use-case';
import { UpdateBookingUseCase } from '../../application/use-cases/update-booking.use-case';
import { BookingQueryService } from '../../application/services/booking-query.service';
import { CreateBookingDto } from '../../application/dtos/create-booking.dto';
import { CancelBookingDto } from '../../application/dtos/cancel-booking.dto';
import { UpdateBookingDto } from '../../application/dtos/update-booking.dto';
import { ListBookingsDto } from '../../application/dtos/list-bookings.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly createBooking: CreateBookingUseCase,
    private readonly cancelBooking: CancelBookingUseCase,
    private readonly updateBooking: UpdateBookingUseCase,
    private readonly queryService: BookingQueryService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() dto: CreateBookingDto,
    @Req() req: Request,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    const jwtPayload = (req as any).user;
    const corrId = correlationId ?? (req.headers['x-correlation-id'] as string | undefined) ?? generateUuid();
    return this.createBooking.execute(dto, jwtPayload, corrId);
  }

  @Get()
  async list(
    @Query() query: ListBookingsDto,
    @Req() req: Request,
  ) {
    return this.queryService.listBookings(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryService.getById(id);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Req() req: Request,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    const corrId = correlationId ?? (req.headers['x-correlation-id'] as string | undefined) ?? generateUuid();
    return this.cancelBooking.execute(id, dto, corrId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @Req() req: Request,
    @Headers('x-correlation-id') correlationId?: string,
  ) {
    const corrId = correlationId ?? (req.headers['x-correlation-id'] as string | undefined) ?? generateUuid();
    return this.updateBooking.execute(id, dto, corrId);
  }
}
