import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function databaseConfig(config: ConfigService): TypeOrmModuleOptions {
  const url = config.get<string>('DATABASE_URL') ?? '';
  return {
    type: 'postgres',
    url,
    entities: [__dirname + '/../../**/*.typeorm-entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    extra: { max: 20 },
    logging: ['error'],
  };
}
