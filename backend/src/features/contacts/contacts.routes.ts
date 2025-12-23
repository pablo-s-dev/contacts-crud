import { FastifyInstance } from 'fastify';
import { createContact } from './createContact';
import { getContacts } from './getContacts';
import { getContact } from './getContact';
import { updateContact } from './updateContact';
import { deleteContact } from './deleteContact';

export async function contactsRoutes(app: FastifyInstance) {
  app.register(createContact);
  app.register(getContacts);
  app.register(getContact);
  app.register(updateContact);
  app.register(deleteContact);
}
