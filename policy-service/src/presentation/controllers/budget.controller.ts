import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { CreateBudgetUseCase } from '../../application/use-cases/create-budget.use-case';
import { GetBudgetUseCase } from '../../application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from '../../application/use-cases/list-budgets.use-case';
import { GetRemainingBudgetUseCase } from '../../application/use-cases/get-remaining-budget.use-case';
import { CreateBudgetDto } from '../../application/dtos/create-budget.dto';

@Controller('budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class BudgetController {
  constructor(
    private readonly createBudget: CreateBudgetUseCase,
    private readonly getBudget: GetBudgetUseCase,
    private readonly listBudgets: ListBudgetsUseCase,
    private readonly getRemainingBudget: GetRemainingBudgetUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateBudgetDto) {
    return this.createBudget.execute(dto);
  }

  @Get()
  async findAll(@Query('fiscalYear') fiscalYear?: string) {
    const year = fiscalYear !== undefined ? parseInt(fiscalYear, 10) : undefined;
    return this.listBudgets.execute(year);
  }

  @Get(':department/:fiscalYear')
  async findOne(
    @Param('department') department: string,
    @Param('fiscalYear', ParseIntPipe) fiscalYear: number,
  ) {
    return this.getBudget.execute(department, fiscalYear);
  }

  @Get(':department/:fiscalYear/remaining')
  async getRemaining(
    @Param('department') department: string,
    @Param('fiscalYear', ParseIntPipe) fiscalYear: number,
  ) {
    return this.getRemainingBudget.execute(department, fiscalYear);
  }
}
