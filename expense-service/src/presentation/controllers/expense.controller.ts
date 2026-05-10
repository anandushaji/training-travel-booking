import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { generateUuid } from '@travel/shared';
import { JwtAuthGuard, JwtPayload } from '../guards/jwt-auth.guard';
import { ExpenseQueryService } from '../../application/services/expense-query.service';
import { ExpenseQueryDto } from '../../application/dtos/expense-query.dto';
import { ExpenseResponseDto } from '../../application/dtos/expense-response.dto';
import { ExpenseSummaryDto } from '../../application/dtos/expense-summary.dto';
import { CategoryResponseDto } from '../../application/dtos/category-response.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private readonly queryService: ExpenseQueryService) {}

  @Get('expenses')
  async getExpenses(
    @Query() query: ExpenseQueryDto,
    @Req() req: Request,
  ): Promise<{ expenses: ExpenseResponseDto[]; summary: { totalAmount: number; count: number } }> {
    const user = (req as any).user as JwtPayload;
    return this.queryService.getExpenses(query, user.sub, user.role);
  }

  @Get('expenses/summary')
  async getExpenseSummary(
    @Query('fiscalYear') fiscalYear: string,
    @Req() req: Request,
  ): Promise<ExpenseSummaryDto> {
    const user = (req as any).user as JwtPayload;
    return this.queryService.getExpenseSummary(
      parseInt(fiscalYear ?? String(new Date().getFullYear()), 10),
      user.sub,
      user.role,
    );
  }

  @Get('expenses/export')
  async exportExpenses(
    @Query() query: ExpenseQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = (req as any).user as JwtPayload;
    const csv = await this.queryService.exportExpenses(query, user.sub, user.role);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(csv);
  }

  @Get('categories')
  getCategories(): CategoryResponseDto[] {
    return this.queryService.getCategories();
  }
}
