import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  HR_SYSTEM_URL: Joi.string().required(),
  HR_SYSTEM_USERNAME: Joi.string().required(),
  HR_SYSTEM_PASSWORD: Joi.string().required(),
  PORT: Joi.number().default(3003),
}).options({ allowUnknown: true });
