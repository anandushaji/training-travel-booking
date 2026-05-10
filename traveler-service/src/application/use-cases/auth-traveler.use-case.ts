import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { TravelerRepository } from '../../infrastructure/persistence/repositories/traveler.repository';
import { AuthTravelerResponseDto } from '../dto/auth-traveler-response.dto';

@Injectable()
export class AuthTravelerUseCase {
  constructor(private readonly repository: TravelerRepository) {}

  async execute(email: string, password: string): Promise<AuthTravelerResponseDto> {
    const authData = await this.repository.findAuthDataByEmail(email);

    if (!authData || !authData.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, authData.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return new AuthTravelerResponseDto({
      userId: authData.userId,
      email: authData.email,
      role: authData.role,
    });
  }
}
