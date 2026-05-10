import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3002),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_CLIENT_ID: Joi.string().default('policy-service'),
  KAFKA_GROUP_ID: Joi.string().default('policy-service-group'),
  TRAVELER_SERVICE_URL: Joi.string().required(),
  TRAVELER_SERVICE_READ_TIMEOUT_MS: Joi.number().default(5000),
  TRAVELER_SERVICE_CONNECT_TIMEOUT_MS: Joi.number().default(2000),
}).options({ allowUnknown: true });
