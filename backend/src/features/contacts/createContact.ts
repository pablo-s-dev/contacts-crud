import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma";
import { CreateContactSchema } from "./contact.schema";
import { z } from "zod";
import {
  checkIdempotency,
  storeIdempotencyResult,
} from "../../utils/idempotency";
import { deleteCache } from "../../utils/cache";
import { logger } from "../../utils/logger";
import { getCorrelationId } from "../../utils/correlation";
import { dbQueryDuration, dbQueryErrors } from "../../utils/metrics";
import { Prisma } from "@prisma/client";

export async function createContact(app: FastifyInstance) {
  app.post(
    "/contacts",
    {
      schema: {
        body: CreateContactSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateContactSchema> }>,
      reply: FastifyReply,
    ) => {
      const correlationId = getCorrelationId(request);
      const { name, email, phone } = request.body;

      // Check idempotency
      const idempotencyCheck = await checkIdempotency(
        request,
        "create-contact",
      );
      if (idempotencyCheck.isDuplicate && idempotencyCheck.cachedResponse) {
        logger.info(
          { correlationId, idempotencyKey: request.headers["idempotency-key"] },
          "Idempotent request",
        );
        return reply.status(201).send(idempotencyCheck.cachedResponse);
      }

      const startTime = Date.now();

      try {
        // Use transaction for atomicity
        const contact = await prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            // Check for existing email within transaction
            const existing = await tx.contact.findUnique({ where: { email } });
            if (existing) {
              throw new Error("EMAIL_EXISTS");
            }

            // Create contact
            return await tx.contact.create({
              data: { name, email, phone },
            });
          },
          {
            isolationLevel: "ReadCommitted",
          },
        );

        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          { operation: "create", model: "Contact" },
          duration,
        );

        // Invalidate cache
        await deleteCache("list:");

        // Store idempotency result
        await storeIdempotencyResult(request, "create-contact", contact);

        logger.info(
          { correlationId, contactId: contact.id },
          "Contact created",
        );
        return reply.status(201).send(contact);
      } catch (error: unknown) {
        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          { operation: "create", model: "Contact" },
          duration,
        );
        dbQueryErrors.inc({ operation: "create", model: "Contact" });

        if ((error as Error).message === "EMAIL_EXISTS") {
          logger.warn({ correlationId, email }, "Email already exists");
          return reply.status(409).send({ message: "Email already exists" });
        }

        logger.error({ correlationId, error }, "Error creating contact");
        throw error;
      }
    },
  );
}
