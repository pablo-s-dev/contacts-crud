import { FastifyRequest, FastifyReply } from 'fastify';
import { httpRequestDuration, httpRequestTotal, httpRequestErrors } from '../utils/metrics';

export async function metricsMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();
  const route = (request as any).routeOptions?.url || request.url;
  const method = request.method;

  // Store metrics data on request for use in onSend hook
  (request as any).metricsStartTime = startTime;
  (request as any).metricsRoute = route;
  (request as any).metricsMethod = method;
}

