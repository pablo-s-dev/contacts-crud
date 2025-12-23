-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contacts_email_key" ON "contacts"("email");
