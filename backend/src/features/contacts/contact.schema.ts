import { z } from 'zod';
import { isValidPhoneNumber } from "libphonenumber-js";

export const ContactSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, "Name is required").max(50, "Name must be at most 50 characters long"),
  email: z.email("Invalid email address"),
  phone: z.string().refine(isValidPhoneNumber, "Invalid phone number"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateContactSchema = ContactSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const UpdateContactSchema = CreateContactSchema.partial();

export const GetContactsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).default(10).optional(),
  sort: z.enum(['name', 'email', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  // Keyset pagination
  cursor: z.string().uuid().optional(),
  pagination: z.enum(['offset', 'keyset']).default('offset'),
});
