import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateTravelerUseCase } from '../../application/use-cases/create-traveler.use-case';
import { GetTravelerUseCase } from '../../application/use-cases/get-traveler.use-case';
import { GetTravelersUseCase } from '../../application/use-cases/get-travelers.use-case';
import { UpdateTravelerUseCase } from '../../application/use-cases/update-traveler.use-case';
import { DeleteTravelerUseCase } from '../../application/use-cases/delete-traveler.use-case';
import { GetTravelerPreferencesUseCase } from '../../application/use-cases/get-traveler-preferences.use-case';
import { UpdateTravelerPreferencesUseCase } from '../../application/use-cases/update-traveler-preferences.use-case';
import { SyncTravelersUseCase } from '../../application/use-cases/sync-travelers.use-case';
import { CreateTravelerDto } from '../../application/dto/create-traveler.dto';
import { UpdateTravelerDto } from '../../application/dto/update-traveler.dto';
import { TravelerPreferencesDto } from '../../application/dto/traveler-preferences.dto';
import { SyncTravelersDto } from '../../application/dto/sync-travelers.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { SelfOrAdminGuard } from '../guards/self-or-admin.guard';
import { Roles } from '../decorators/roles.decorator';

type AuthRequest = Request & { user: { sub: string; role: string } };

@Controller('travelers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TravelerController {
  constructor(
    private readonly createTraveler: CreateTravelerUseCase,
    private readonly getTraveler: GetTravelerUseCase,
    private readonly getTravelers: GetTravelersUseCase,
    private readonly updateTraveler: UpdateTravelerUseCase,
    private readonly deleteTraveler: DeleteTravelerUseCase,
    private readonly getPreferences: GetTravelerPreferencesUseCase,
    private readonly updatePreferences: UpdateTravelerPreferencesUseCase,
    private readonly syncTravelers: SyncTravelersUseCase,
  ) {}

  @Post()
  @Roles('MANAGER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTravelerDto, @Req() req: AuthRequest) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.createTraveler.execute(dto, correlationId);
  }

  @Get()
  @Roles('MANAGER', 'ADMIN')
  async findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ): Promise<{ travelers: import('../../application/dto/traveler-response.dto').TravelerResponseDto[]; pagination: { currentPage: number; totalPages: number; totalItems: number; limit: number } }> {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '20', 10) || 20));
    const all = await this.getTravelers.execute();
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const travelers = all.slice((currentPage - 1) * limit, currentPage * limit);
    return { travelers, pagination: { currentPage, totalPages, totalItems, limit } };
  }

  @Get(':id/export')
  @UseGuards(SelfOrAdminGuard)
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  async exportGdprData(@Param('id') id: string) {
    const [profile, preferences] = await Promise.all([
      this.getTraveler.execute(id),
      this.getPreferences.execute(id),
    ]);
    return { exportedAt: new Date().toISOString(), profile, preferences };
  }

  @Get(':id')
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.getTraveler.execute(id);
  }

  @Patch(':id')
  @UseGuards(SelfOrAdminGuard)
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTravelerDto,
    @Req() req: AuthRequest,
  ) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.updateTraveler.execute(id, dto, correlationId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: AuthRequest) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.deleteTraveler.execute(id, correlationId);
  }

  @Get(':id/preferences')
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  findPreferences(@Param('id') id: string) {
    return this.getPreferences.execute(id);
  }

  @Put(':id/preferences')
  @UseGuards(SelfOrAdminGuard)
  @Roles('EMPLOYEE', 'MANAGER', 'ADMIN')
  updatePreferencesHandler(
    @Param('id') id: string,
    @Body() dto: TravelerPreferencesDto,
    @Req() req: AuthRequest,
  ) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.updatePreferences.execute(id, dto, correlationId);
  }

  @Post('sync')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  sync(@Body() dto: SyncTravelersDto, @Req() req: AuthRequest) {
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    return this.syncTravelers.execute(dto, correlationId);
  }
}
