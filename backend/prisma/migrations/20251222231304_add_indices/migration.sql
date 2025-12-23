-- CreateIndex
CREATE INDEX "contacts_name_idx" ON "contacts"("name");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_createdAt_idx" ON "contacts"("createdAt");
