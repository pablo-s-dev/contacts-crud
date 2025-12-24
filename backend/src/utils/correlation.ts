import { FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";

const CORRELATION_ID_HEADER = "x-correlation-id";
const REQUEST_ID_HEADER = "x-request-id";

// Fastify normalizes headers to lowercase
const CORRELATION_ID_HEADER_LOWER = CORRELATION_ID_HEADER.toLowerCase();
const REQUEST_ID_HEADER_LOWER = REQUEST_ID_HEADER.toLowerCase();

export function getCorrelationId(request: FastifyRequest): string {
  // Check for correlation ID in headers (for distributed tracing)
  // Fastify normalizes headers to lowercase
  const correlationId = (request.headers[CORRELATION_ID_HEADER_LOWER] ||
    request.headers[CORRELATION_ID_HEADER]) as string;
  if (correlationId) {
    return correlationId;
  }

  // Fallback to request ID if available
  const requestId = (request.headers[REQUEST_ID_HEADER_LOWER] ||
    request.headers[REQUEST_ID_HEADER]) as string;
  if (requestId) {
    return requestId;
  }

  // Generate new correlation ID
  return randomUUID();
}

export function setCorrelationIdHeader(
  reply: FastifyReply,
  correlationId: string,
): void {
  reply.header(CORRELATION_ID_HEADER, correlationId);
}
