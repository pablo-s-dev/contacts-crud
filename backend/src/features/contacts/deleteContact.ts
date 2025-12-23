import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { deleteCache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { getCorrelationId } from '../../utils/correlation';
import { dbQueryDuration, dbQueryErrors } from '../../utils/metrics';

const ParamsSchema = z.object({ id: z.string().uuid() });

export async function deleteContact(app: FastifyInstance) {
  app.delete('/contacts/:id', {
    schema: {
      params: ParamsSchema,
    }
  }, async (request: FastifyRequest<{ Params: z.infer<typeof ParamsSchema> }>, reply: FastifyReply) => {
    const correlationId = getCorrelationId(request);
    const { id } = request.params;

    const startTime = Date.now();

    try {
      // Use transaction for atomicity
      await prisma.$transaction(async (tx) => {
        const existing = await tx.contact.findUnique({ where: { id } });
        if (!existing) {
          throw new Error('NOT_FOUND');
        }

        await tx.contact.delete({ where: { id } });
      }, {
        isolationLevel: 'ReadCommitted',
      });

      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation: 'delete', model: 'Contact' }, duration);

      // Invalidate cache
      await deleteCache('list:');
      await deleteCache(`contact:${id}`);

      logger.info({ correlationId, contactId: id }, 'Contact deleted');
      return reply.status(204).send();
    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation: 'delete', model: 'Contact' }, duration);
      dbQueryErrors.inc({ operation: 'delete', model: 'Contact' });

      if (error.message === 'NOT_FOUND') {
        logger.warn({ correlationId, contactId: id }, 'Contact not found');
        return reply.status(404).send({ message: 'Contact not found' });
      }

      logger.error({ correlationId, error }, 'Error deleting contact');
      throw error;
    }
  });
}
