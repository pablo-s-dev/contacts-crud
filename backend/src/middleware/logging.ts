import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger';
import { getCorrelationId, setCorrelationIdHeader } from '../utils/correlation';

export async function loggingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = getCorrelationId(request);
  setCorrelationIdHeader(reply, correlationId);

  // Attach correlation ID to request for use in handlers
  (request as any).correlationId = correlationId;

  const startTime = Date.now();
  const route = (request as any).routeOptions?.url || request.url;

  // Log request
  logger.info({
    correlationId,
    method: request.method,
    url: request.url,
    route,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  }, 'Incoming request');

  // Log response using app hook (set up in app.ts)
  (request as any).startTime = startTime;
  (request as any).correlationId = correlationId;
  (request as any).route = route;
}

