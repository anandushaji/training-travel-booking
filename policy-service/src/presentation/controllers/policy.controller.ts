import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { generateUuid } from '@travel/shared';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { CreatePolicyUseCase } from '../../application/use-cases/create-policy.use-case';
import { GetPolicyUseCase } from '../../application/use-cases/get-policy.use-case';
import { ListPoliciesUseCase } from '../../application/use-cases/list-policies.use-case';
import { UpdatePolicyUseCase } from '../../application/use-cases/update-policy.use-case';
import { DeletePolicyUseCase } from '../../application/use-cases/delete-policy.use-case';
import { ValidatePolicyUseCase } from '../../application/use-cases/validate-policy.use-case';
import { CreatePolicyDto } from '../../application/dtos/create-policy.dto';
import { UpdatePolicyDto } from '../../application/dtos/update-policy.dto';
import { PolicyValidationRequestDto } from '../../application/dtos/policy-validation-request.dto';

@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PolicyController {
  constructor(
    private readonly createPolicy: CreatePolicyUseCase,
    private readonly getPolicy: GetPolicyUseCase,
    private readonly listPolicies: ListPoliciesUseCase,
    private readonly updatePolicy: UpdatePolicyUseCase,
    private readonly deletePolicy: DeletePolicyUseCase,
    private readonly validatePolicy: ValidatePolicyUseCase,
  ) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(201)
  async create(@Body() dto: CreatePolicyDto, @Req() req: Request) {
    const user = (req as any).user as { sub: string };
    return this.createPolicy.execute(dto, user.sub);
  }

  // IMPORTANT: /validate must be declared BEFORE /:id to avoid routing collision
  @Post('validate')
  async validate(@Body() dto: PolicyValidationRequestDto, @Req() req: Request) {
    const user = (req as any).user;
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ?? generateUuid();
    return this.validatePolicy.execute(dto, user, correlationId);
  }

  @Get()
  async findAll(
    @Query('department') department?: string,
    @Query('active') active?: string,
  ) {
    const filters: { department?: string; active?: boolean } = {};
    if (department !== undefined) filters.department = department;
    if (active !== undefined) filters.active = active === 'true';
    return this.listPolicies.execute(filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.getPolicy.execute(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.updatePolicy.execute(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    return this.deletePolicy.execute(id);
  }
}
