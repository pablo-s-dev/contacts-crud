import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { getCache, setCache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { getCorrelationId } from '../../utils/correlation';
import { dbQueryDuration, dbQueryErrors } from '../../utils/metrics';

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function getContact(app: FastifyInstance) {
  app.get('/contacts/:id', {
    schema: {
      params: ParamsSchema,
    }
  }, async (request: FastifyRequest<{ Params: z.infer<typeof ParamsSchema> }>, reply: FastifyReply) => {
    const correlationId = getCorrelationId(request);
    const { id } = request.params;

    // Try cache first
    const cacheKey = `contact:${id}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      logger.debug({ correlationId, cacheKey }, 'Cache hit');
      return reply.send(cached);
    }

    const startTime = Date.now();

    try {
      const contact = await prisma.contact.findUnique({ where: { id } });
      
      if (!contact) {
        logger.warn({ correlationId, contactId: id }, 'Contact not found');
        return reply.status(404).send({ message: 'Contact not found' });
      }

      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation: 'findUnique', model: 'Contact' }, duration);

      // Cache for 5 minutes
      await setCache(cacheKey, contact, 300);

      return reply.send(contact);
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation: 'findUnique', model: 'Contact' }, duration);
      dbQueryErrors.inc({ operation: 'findUnique', model: 'Contact' });

      logger.error({ correlationId, error }, 'Error fetching contact');
      throw error;
    }
  });
}
