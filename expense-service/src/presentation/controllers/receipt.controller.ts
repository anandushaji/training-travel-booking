import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { generateUuid } from '@travel/shared';
import { JwtAuthGuard, JwtPayload } from '../guards/jwt-auth.guard';
import { ExpenseQueryService } from '../../application/services/expense-query.service';
import { ReceiptResponseDto, PaginationDto } from '../../application/dtos/receipt-response.dto';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptController {
  constructor(private readonly queryService: ExpenseQueryService) {}

  @Get()
  async getReceipts(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ receipts: ReceiptResponseDto[]; pagination: PaginationDto }> {
    const user = (req as any).user as JwtPayload;
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ?? generateUuid();
    return this.queryService.getReceipts(
      user.sub,
      user.role,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  async getReceiptById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ReceiptResponseDto> {
    const user = (req as any).user as JwtPayload;
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ?? generateUuid();
    return this.queryService.getReceiptById(id, user.sub, user.role);
  }
}
