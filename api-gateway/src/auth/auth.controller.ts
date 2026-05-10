import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { LoginRequestDto } from './dto/login.request.dto';
import { RefreshRequestDto } from './dto/refresh.request.dto';
import { LoginResponseDto } from './dto/login.response.dto';
import { AuthService } from './auth.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
@Public()
@SkipThrottle()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: { correlationId?: string; idempotencyKey?: string },
  ): Promise<LoginResponseDto> {
    return this.authService.login(
      dto.email,
      dto.password,
      req.correlationId ?? '',
      req.idempotencyKey ?? '',
    );
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshRequestDto): Promise<LoginResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }
}
