import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { GetAdminTravelersUseCase } from '../../application/use-cases/get-admin-travelers.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('admin/travelers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminTravelerController {
  constructor(
    private readonly getAdminTravelers: GetAdminTravelersUseCase,
  ) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.getAdminTravelers.execute();
  }
}
