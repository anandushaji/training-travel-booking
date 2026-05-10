import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_CLIENT_ID: Joi.string().default('booking-service'),
  KAFKA_GROUP_ID: Joi.string().default('booking-service-group'),
  POLICY_SERVICE_URL: Joi.string().required(),
  INVENTORY_SERVICE_URL: Joi.string().required(),
  PAYMENT_SERVICE_URL: Joi.string().required(),
  POLICY_CONNECT_TIMEOUT_MS: Joi.number().default(2000),
  POLICY_READ_TIMEOUT_MS: Joi.number().default(5000),
  INVENTORY_CONNECT_TIMEOUT_MS: Joi.number().default(2000),
  INVENTORY_READ_TIMEOUT_MS: Joi.number().default(5000),
  PAYMENT_CONNECT_TIMEOUT_MS: Joi.number().default(2000),
  PAYMENT_READ_TIMEOUT_MS: Joi.number().default(5000),
}).options({ allowUnknown: true });
