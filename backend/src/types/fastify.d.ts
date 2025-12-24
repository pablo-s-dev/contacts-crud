import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    correlationId?: string;
    startTime?: number;
    route?: string;
    metricsStartTime?: number;
    metricsRoute?: string;
    metricsMethod?: string;
  }
}
