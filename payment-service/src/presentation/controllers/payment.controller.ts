import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthorizePaymentUseCase } from '../../application/use-cases/authorize-payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from '../../application/use-cases/capture-payment/capture-payment.use-case';
import { RefundPaymentUseCase } from '../../application/use-cases/refund-payment/refund-payment.use-case';
import { GetPaymentUseCase } from '../../application/use-cases/get-payment/get-payment.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreatePaymentDto, RefundPaymentDto } from '../dto/payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly authorizeUseCase: AuthorizePaymentUseCase,
    private readonly captureUseCase: CapturePaymentUseCase,
    private readonly refundUseCase: RefundPaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
  ) {}

  @Post()
  async authorize(
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Request() req: any,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const travelerId: string = req.user.sub as string;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    const { payment, isNew } = await this.authorizeUseCase.execute({
      travelerId,
      bookingId: dto.bookingId,
      paymentMethodId: dto.paymentMethodId,
      amount: dto.amount,
      currency: dto.currency,
      idempotencyKey,
      ...(dto.description !== undefined && { description: dto.description }),
      ...(correlationId !== undefined && { correlationId }),
    });

    // HTTP 201 for new, 200 for existing (idempotent repeat)
    req.res.status(isNew ? HttpStatus.CREATED : HttpStatus.OK);
    return payment;
  }

  @Get(':paymentId')
  async getPayment(@Param('paymentId') paymentId: string, @Request() req: any) {
    const travelerId: string = req.user.sub as string;
    return this.getPaymentUseCase.execute({ paymentId, callerTravelerId: travelerId });
  }

  @Post(':paymentId/capture')
  @HttpCode(HttpStatus.OK)
  async capture(@Param('paymentId') paymentId: string, @Request() req: any) {
    const travelerId: string = req.user.sub as string;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.captureUseCase.execute({
      paymentId,
      callerTravelerId: travelerId,
      ...(correlationId !== undefined && { correlationId }),
    });
  }

  @Post(':paymentId/refund')
  @HttpCode(HttpStatus.OK)
  async refund(
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
    @Request() req: any,
  ) {
    const travelerId: string = req.user.sub as string;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.refundUseCase.execute({
      paymentId,
      callerTravelerId: travelerId,
      ...(dto.amount !== undefined && { amount: dto.amount }),
      reason: dto.reason,
      ...(correlationId !== undefined && { correlationId }),
    });
  }
}
