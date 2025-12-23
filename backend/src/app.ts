import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { env } from './config/env';
import { contactsRoutes } from './features/contacts/contacts.routes';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { logger } from './utils/logger';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { register, httpRequestDuration, httpRequestTotal, httpRequestErrors } from './utils/metrics';
import { getCorrelationId } from './utils/correlation';

export function createServer() {
  const app = Fastify({
    logger: false, // We use pino logger instead
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const origin = env.NODE_ENV === 'development' ? '*' : env.FRONTEND_URL;

  // Security Plugins
  app.register(helmet);
  app.register(cors, {
    origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Add logging and metrics middleware
  app.addHook('onRequest', loggingMiddleware);
  app.addHook('onRequest', metricsMiddleware);

  // Add response logging and metrics hooks
  app.addHook('onSend', async (request, reply, payload) => {
    const correlationId = (request as any).correlationId || getCorrelationId(request);
    const startTime = (request as any).startTime;
    const route = (request as any).route || request.url;
    const method = (request as any).metricsMethod || request.method;
    const metricsRoute = (request as any).metricsRoute || route;
    const metricsStartTime = (request as any).metricsStartTime;

    // Log response
    if (startTime) {
      const duration = Date.now() - startTime;
      logger.info({
        correlationId,
        method: request.method,
        url: request.url,
        route,
        statusCode: reply.statusCode,
        duration: `${duration}ms`,
      }, 'Request completed');
    }

    // Record metrics
    if (metricsStartTime) {
      const duration = (Date.now() - metricsStartTime) / 1000; // Convert to seconds
      const statusCode = reply.statusCode.toString();

      httpRequestDuration.observe({ method, route: metricsRoute, status_code: statusCode }, duration);
      httpRequestTotal.inc({ method, route: metricsRoute, status_code: statusCode });

      // Track errors
      if (reply.statusCode >= 400) {
        const errorType = reply.statusCode >= 500 ? 'server_error' : 'client_error';
        httpRequestErrors.inc({ method, route: metricsRoute, error_type: errorType });
      }
    }

    return payload;
  });

  // Metrics endpoint
  app.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    const correlationId = getCorrelationId(request);

    if (error instanceof ZodError) {
      logger.warn({ correlationId, error: fromZodError(error).toString() }, 'Validation error');
      return reply.status(400).send({
        message: 'Validation Error',
        errors: fromZodError(error).toString(),
      });
    }

    if ((error as any)?.code === 'FST_ERR_VALIDATION') {
      const message = error instanceof Error ? error.message : 'Validation Error';
      logger.warn({ correlationId, error: message }, 'Validation error');
      return reply.status(400).send({
        message: 'Validation Error',
        errors: message,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error({ correlationId, error: errorMessage, stack: errorStack }, 'Unhandled error');
    return reply.status(500).send({ message: 'Internal Server Error' });
  });

  // Register Features
  app.register(contactsRoutes, { prefix: '/v1' });

  return app;
}
