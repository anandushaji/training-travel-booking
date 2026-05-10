import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthTravelerDto } from '../../application/dto/auth-traveler.dto';
import { AuthTravelerUseCase } from '../../application/use-cases/auth-traveler.use-case';

/**
 * Public controller for credential validation.
 * Called by the API Gateway auth service only — no JWT required.
 * This endpoint MUST NOT be exposed directly to the internet;
 * the API Gateway proxies it internally.
 */
@Controller('travelers/auth')
export class TravelerAuthController {
  constructor(private readonly authTraveler: AuthTravelerUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  authenticate(@Body() dto: AuthTravelerDto) {
    return this.authTraveler.execute(dto.email, dto.password);
  }
}
