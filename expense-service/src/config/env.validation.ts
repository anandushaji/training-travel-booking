import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3006),
  DATABASE_URL: Joi.string().required(),
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_CLIENT_ID: Joi.string().default('expense-service'),
  KAFKA_GROUP_ID: Joi.string().default('expense-service-consumer'),
  JWT_SECRET: Joi.string().required(),
}).options({ allowUnknown: true });
