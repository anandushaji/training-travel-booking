import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttachPaymentMethodUseCase } from '../../application/use-cases/attach-payment-method/attach-payment-method.use-case';
import { DetachPaymentMethodUseCase } from '../../application/use-cases/detach-payment-method/detach-payment-method.use-case';
import { ListPaymentMethodsUseCase } from '../../application/use-cases/list-payment-methods/list-payment-methods.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AttachPaymentMethodDto } from '../dto/payment.dto';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodController {
  constructor(
    private readonly attachUseCase: AttachPaymentMethodUseCase,
    private readonly detachUseCase: DetachPaymentMethodUseCase,
    private readonly listUseCase: ListPaymentMethodsUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async attach(@Body() dto: AttachPaymentMethodDto, @Request() req: any) {
    const travelerId: string = req.user.sub as string;
    return this.attachUseCase.execute({
      travelerId,
      stripePaymentMethodId: dto.stripePaymentMethodId,
      cardBrand: dto.cardBrand,
      last4: dto.last4,
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
    });
  }

  @Get()
  async list(@Request() req: any) {
    const travelerId: string = req.user.sub as string;
    return this.listUseCase.execute(travelerId);
  }

  @Delete(':paymentMethodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detach(@Param('paymentMethodId') paymentMethodId: string, @Request() req: any) {
    const travelerId: string = req.user.sub as string;
    await this.detachUseCase.execute({ paymentMethodId, callerTravelerId: travelerId });
  }
}
