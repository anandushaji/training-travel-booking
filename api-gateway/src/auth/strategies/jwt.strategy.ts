import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    const result: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    if (payload.exp !== undefined) result.exp = payload.exp;
    if (payload.iat !== undefined) result.iat = payload.iat;
    return result;
  }
}
