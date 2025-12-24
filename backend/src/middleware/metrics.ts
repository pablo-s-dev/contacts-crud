import { FastifyRequest } from "fastify";

export async function metricsMiddleware(
  request: FastifyRequest,
): Promise<void> {
  const startTime = Date.now();
  const route = request.routeOptions?.url || request.url;
  const method = request.method;

  // Store metrics data on request for use in onSend hook
  request.metricsStartTime = startTime;
  request.metricsRoute = route;
  request.metricsMethod = method;
}
