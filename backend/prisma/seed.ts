/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const AMOUNT = 50;

const prisma = new PrismaClient();

async function main() {
  const contacts = Array.from({ length: AMOUNT }).map((_, i) => ({
    name: faker.person.firstName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
  }));

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { email: contact.email },
      update: {},
      create: contact,
    });
  }

  console.log(`✅ Seeded database with ${AMOUNT} contacts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
