import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { GetContactsQuerySchema } from "./contact.schema";
import { z } from "zod";
import { getCache, setCache } from "../../utils/cache";
import { logger } from "../../utils/logger";
import { getCorrelationId } from "../../utils/correlation";
import { dbQueryDuration, dbQueryErrors } from "../../utils/metrics";
import {
  decodeCursor,
  encodeCursor,
  buildCursorCondition,
} from "../../utils/cursor";

type ContactsSortField = "name" | "email" | "createdAt";
type ContactsSortOrder = "asc" | "desc";
type ContactsPagination = "offset" | "keyset";

function column(field: string) {
  switch (field) {
    case 'name':
      return Prisma.sql`name`
    case 'email':
      return Prisma.sql`email`
    case "createdAt":
      return Prisma.sql`"createdAt"`
    default:
      throw new Error('Invalid sort field')
  }
}
function order(dir: string) {
  return dir === 'desc'
    ? Prisma.sql`DESC`
    : Prisma.sql`ASC`
}



function buildContactsCacheKey(params: {
  q?: string;
  page: number;
  pageSize: number;
  sort?: ContactsSortField;
  order: ContactsSortOrder;
  cursor?: string;
  pagination: ContactsPagination;
}) {
  return `list:${JSON.stringify(params)}`;
}

function normalizePhoneQuery(q?: string) {
  const normalizedPhoneQuery = q ? q.replace(/\D/g, "") : "";
  const isPhoneSearch = normalizedPhoneQuery.length >= 3;
  return { normalizedPhoneQuery, isPhoneSearch };
}

function buildRegularSearchWhere(q: string) {
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { phone: { contains: q } },
    ],
  };
}

async function fetchContactsOffsetPhoneSearch(params: {
  q: string;
  normalizedPhoneQuery: string;
  sortField: ContactsSortField;
  sortOrder: ContactsSortOrder;
  page: number;
  pageSize: number;
}) {
  const qLike = `%${params.q}%`;
  const phoneLike = `%${params.normalizedPhoneQuery}%`;

  const contacts = await prisma.$queryRaw(
    Prisma.sql`SELECT * FROM contacts
    WHERE
      name ILIKE ${qLike}
      OR email ILIKE ${qLike}
      OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${phoneLike}
    ORDER BY ${column(params.sortField)} ${order(params.sortOrder)}
    LIMIT ${params.pageSize} OFFSET ${(params.page - 1) * params.pageSize}`,
  );

  const totalResult = await prisma.$queryRaw<Array<{ count: number }>>(
    Prisma.sql`SELECT COUNT(*)::int as count FROM contacts
    WHERE
      name ILIKE ${qLike}
      OR email ILIKE ${qLike}
      OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${phoneLike}`,
  );

  const total = Number(totalResult[0].count);
  return { contacts, total };
}

export async function getContacts(app: FastifyInstance) {
  app.get(
    "/contacts",
    {
      schema: {
        querystring: GetContactsQuerySchema,
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof GetContactsQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const correlationId = getCorrelationId(request);
      // Destructure with defaults matching the Zod schema
      const {
        q,
        page = 1,
        pageSize = 10,
        sort,
        order = "asc",
        cursor,
        pagination = "offset",
      } = request.query;

      // Build cache key
      const cacheKey = buildContactsCacheKey({
        q,
        page,
        pageSize,
        sort,
        order,
        cursor,
        pagination,
      });

      // Try cache first
      const cached = await getCache<unknown>(cacheKey);
      if (cached) {
        logger.debug({ correlationId, cacheKey }, "Cache hit");
        return reply.send(cached);
      }

      const startTime = Date.now();
      const sortField = sort ?? "createdAt";
      const sortOrder = order;

      try {
        // Normalize phone query: extract digits for flexible phone search
        const { normalizedPhoneQuery, isPhoneSearch } = normalizePhoneQuery(q);

        // Build where clause - use raw SQL for phone when we have normalized digits
        let where: Prisma.ContactWhereInput = {};

        if (q) {
          if (isPhoneSearch && pagination !== "keyset") {
            // Use raw SQL for phone search to handle formatted/unformatted numbers
            const { contacts, total } = await fetchContactsOffsetPhoneSearch({
              q,
              normalizedPhoneQuery,
              sortField: sortField as ContactsSortField,
              sortOrder: sortOrder as ContactsSortOrder,
              page,
              pageSize,
            });

            const response = {
              data: contacts,
              page,
              pageSize,
              total,
              totalPages: Math.ceil(total / pageSize),
              pagination: "offset" as const,
            };

            await setCache(cacheKey, response, 300);
            return reply.send(response);
          } else {
            // Regular search (no phone normalization needed or keyset pagination)
            where = buildRegularSearchWhere(q);
          }
        }

        let contacts;
        let total: number;
        let nextCursor: string | null = null;
        let hasMore = false;

        if (pagination === "keyset" && cursor) {
          // Keyset pagination (cursor-based) - better for large datasets
          let cursorValue: string | Date;
          let cursorId: string;

          try {
            const decoded = decodeCursor(cursor, sortField);
            cursorValue = decoded.value;
            cursorId = decoded.id;
          } catch (error) {
            logger.warn(
              { correlationId, cursor, error },
              "Invalid cursor format for keyset pagination",
            );
            return reply.status(400).send({
              message:
                "Invalid cursor format. Keyset pagination requires a properly encoded cursor.",
            });
          }

          // Build cursor condition using utility function
          const cursorCondition = buildCursorCondition(
            sortField,
            cursorValue,
            cursorId,
            sortOrder,
          );

          // Merge with existing where clause
          const cursorWhere =
            Object.keys(where).length > 0
              ? { AND: [where, cursorCondition] }
              : cursorCondition;

          contacts = await prisma.contact.findMany({
            where: cursorWhere,
            take: pageSize + 1, // Fetch one extra to check if there's more
            orderBy: [
              { [sortField]: sortOrder },
              { id: sortOrder }, // Secondary sort by ID for consistency
            ],
          });

          hasMore = contacts.length > pageSize;
          if (hasMore) {
            contacts = contacts.slice(0, pageSize);
            const lastContact = contacts[contacts.length - 1];
            // Encode cursor using utility function
            const sortValue =
              lastContact[sortField as keyof typeof lastContact];
            nextCursor = encodeCursor(
              sortValue as string | Date,
              lastContact.id,
            );
          }

          // For keyset, we don't need total count (expensive operation)
          total = -1; // Indicates total not calculated
        } else {
          // Offset pagination (traditional)
          [contacts, total] = await Promise.all([
            prisma.contact.findMany({
              where,
              take: pageSize,
              skip: (page - 1) * pageSize,
              orderBy: { [sortField]: sortOrder },
            }),
            prisma.contact.count({ where }),
          ]);
        }

        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          { operation: "findMany", model: "Contact" },
          duration,
        );

        const response =
          pagination === "keyset"
            ? {
                data: contacts,
                cursor: nextCursor,
                hasMore,
                pagination: "keyset" as const,
              }
            : {
                data: contacts,
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
                pagination: "offset" as const,
              };

        // Cache for 5 minutes
        await setCache(cacheKey, response, 300);

        return reply.send(response);
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        dbQueryDuration.observe(
          { operation: "findMany", model: "Contact" },
          duration,
        );
        dbQueryErrors.inc({ operation: "findMany", model: "Contact" });

        logger.error({ correlationId, error }, "Error fetching contacts");
        throw error;
      }
    },
  );
}
