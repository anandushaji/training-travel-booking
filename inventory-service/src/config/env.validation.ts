import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3005),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  AMADEUS_BASE_URL: Joi.string().required(),
  AMADEUS_CLIENT_ID: Joi.string().required(),
  AMADEUS_CLIENT_SECRET: Joi.string().required(),
  RESERVATION_HOLD_MINUTES: Joi.number().default(15),
  PASSPORT_ENCRYPTION_KEY: Joi.string().required(),
}).options({ allowUnknown: true });
