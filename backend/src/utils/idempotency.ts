import { FastifyRequest } from "fastify";
import { getCache, setCache } from "./cache";
import { logger } from "./logger";

const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const IDEMPOTENCY_KEY_HEADER_LOWER = IDEMPOTENCY_KEY_HEADER.toLowerCase();
const IDEMPOTENCY_TTL = 86400; // 24 hours

export interface IdempotencyResult<T> {
  isDuplicate: boolean;
  cachedResponse?: T;
}

export async function checkIdempotency<T>(
  request: FastifyRequest,
  operation: string,
): Promise<IdempotencyResult<T>> {
  // Fastify normalizes headers to lowercase
  const idempotencyKey = (request.headers[IDEMPOTENCY_KEY_HEADER_LOWER] ||
    request.headers[IDEMPOTENCY_KEY_HEADER]) as string;

  if (!idempotencyKey) {
    return { isDuplicate: false };
  }

  const cacheKey = `idempotency:${operation}:${idempotencyKey}`;
  const cached = await getCache<T>(cacheKey);

  if (cached) {
    logger.info({ idempotencyKey, operation }, "Idempotent request detected");
    return {
      isDuplicate: true,
      cachedResponse: cached,
    };
  }

  return { isDuplicate: false };
}

export async function storeIdempotencyResult<T>(
  request: FastifyRequest,
  operation: string,
  result: T,
): Promise<void> {
  // Fastify normalizes headers to lowercase
  const idempotencyKey = (request.headers[IDEMPOTENCY_KEY_HEADER_LOWER] ||
    request.headers[IDEMPOTENCY_KEY_HEADER]) as string;

  if (!idempotencyKey) {
    return;
  }

  const cacheKey = `idempotency:${operation}:${idempotencyKey}`;
  await setCache(cacheKey, result, IDEMPOTENCY_TTL);
}
