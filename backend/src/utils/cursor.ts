/**
 * Utilities for keyset pagination cursor encoding/decoding
 * 
 * Cursor format: base64 encoded JSON with sort field value and ID for tie-breaking
 * Example: { value: "John Doe", id: "uuid-here" } or { value: "2024-01-01T00:00:00Z", id: "uuid-here" }
 */

export interface CursorData {
  value: string;
  id: string;
}

/**
 * Encodes a cursor from sort field value and ID
 * @param value - The value of the sort field (string or Date converted to ISO string)
 * @param id - The record ID for tie-breaking
 * @returns Base64 encoded cursor string
 */
export function encodeCursor(value: string | Date, id: string): string {
  const cursorData: CursorData = {
    value: value instanceof Date ? value.toISOString() : value,
    id,
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

/**
 * Decodes a cursor string into sort field value and ID
 * @param cursor - Base64 encoded cursor string
 * @param sortField - The field being sorted by (to determine if value should be Date)
 * @returns Decoded cursor data with proper types
 */
export function decodeCursor(
  cursor: string,
  sortField: string
): { value: string | Date; id: string } {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString()) as CursorData;
    
    // Convert value to Date if sorting by createdAt
    const value = sortField === 'createdAt' ? new Date(decoded.value) : decoded.value;
    
    return {
      value,
      id: decoded.id,
    };
  } catch (error) {
    throw new Error(`Invalid cursor format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Builds a Prisma where condition for keyset pagination
 * @param sortField - The field being sorted by
 * @param cursorValue - The cursor value (string or Date)
 * @param cursorId - The cursor ID for tie-breaking
 * @param sortOrder - Sort order ('asc' or 'desc')
 * @returns Prisma where condition for cursor-based filtering
 */
export function buildCursorCondition(
  sortField: string,
  cursorValue: string | Date,
  cursorId: string,
  sortOrder: 'asc' | 'desc'
) {
  const comparison = sortOrder === 'asc' ? 'gt' : 'lt';
  
  return {
    OR: [
      { [sortField]: { [comparison]: cursorValue } },
      {
        AND: [
          { [sortField]: cursorValue },
          { id: { [comparison]: cursorId } },
        ],
      },
    ],
  };
}



