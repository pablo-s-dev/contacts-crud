import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../db/prisma';
import { UpdateContactSchema } from './contact.schema';
import { z } from 'zod';
import { checkIdempotency, storeIdempotencyResult } from '../../utils/idempotency';
import { deleteCache, getCache, setCache } from '../../utils/cache';
import { logger } from '../../utils/logger';
import { getCorrelationId } from '../../utils/correlation';
import { dbQueryDuration, dbQueryErrors } from '../../utils/metrics';

const ParamsSchema = z.object({ id: z.uuid() });

export async function updateContact(app: FastifyInstance) {
  app.put('/contacts/:id', {
    schema: {
      params: ParamsSchema,
      body: UpdateContactSchema,
    }
  }, async (request: FastifyRequest<{ Params: z.infer<typeof ParamsSchema>, Body: z.infer<typeof UpdateContactSchema> }>, reply: FastifyReply) => {
    const correlationId = getCorrelationId(request);
    const { id } = request.params;
    const { name, email, phone } = request.body;

    // Check idempotency
    const idempotencyCheck = await checkIdempotency(request, `update-contact-${id}`);
    if (idempotencyCheck.isDuplicate && idempotencyCheck.cachedResponse) {
      logger.info({ correlationId, idempotencyKey: request.headers['idempotency-key'] }, 'Idempotent request');
      return reply.send(idempotencyCheck.cachedResponse);
    }

    const startTime = Date.now();

    try {
      // Use transaction for atomicity
      const updated = await prisma.$transaction(async (tx) => {
        // Check existence
        const existing = await tx.contact.findUnique({ where: { id } });
        if (!existing) {
          throw new Error('NOT_FOUND');
        }

        // Check email conflict if email is being updated
        const emailChanged = email && email !== existing.email;
        if (emailChanged) {
          const conflict = await tx.contact.findUnique({ where: { email } });
          if (conflict) {
            throw new Error('EMAIL_EXISTS');
          }
        }

        // Update contact
        return await tx.contact.update({
          where: { id },
          data: { name, email, phone },
        });
      }, {
        isolationLevel: 'ReadCommitted',
      });

      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation: 'update', model: 'Contact' }, duration);

      // Invalidate cache
      await deleteCache('list:');
      await deleteCache(`contact:${id}`);

      // Store idempotency result
      await storeIdempotencyResult(request, `update-contact-${id}`, updated);

      logger.info({ correlationId, contactId: id }, 'Contact updated');
      return reply.send(updated);
    } catch (error: any) {
      const duration = (Date.now() - startTime) / 1000;
      dbQueryDuration.observe({ operation: 'update', model: 'Contact' }, duration);
      dbQueryErrors.inc({ operation: 'update', model: 'Contact' });

      if (error.message === 'NOT_FOUND') {
        logger.warn({ correlationId, contactId: id }, 'Contact not found');
        return reply.status(404).send({ message: 'Contact not found' });
      }

      if (error.message === 'EMAIL_EXISTS') {
        logger.warn({ correlationId, email }, 'Email already exists');
        return reply.status(409).send({ message: 'Email already exists' });
      }

      logger.error({ correlationId, error }, 'Error updating contact');
      throw error;
    }
  });
}
