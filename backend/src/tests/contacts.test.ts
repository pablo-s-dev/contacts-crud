import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Contact } from "@prisma/client";
import { createServer } from "../app";
import { FastifyInstance } from "fastify";

describe("Contacts API Integration Tests", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = createServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Test 1: Create Success
  it("should create a new contact with valid data", async () => {
    const email = `test-create-${Date.now()}@example.com`;
    const response = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: { name: "John Doe", email, phone: "+55 11 98888-8888" },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.email).toBe(email);
  });

  // Test 2: Create Conflict
  it("should return 409 for duplicate email", async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    const payload = { name: "Original", email, phone: "+55 11 98888-8888" };

    await app.inject({ method: "POST", url: "/v1/contacts", payload });
    const response = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload,
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return 400 for invalid payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: {
        name: "",
        email: "not-an-email",
        phone: "123",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty("message");
  });

  // Test 3: Get All (Shape)
  it("should return contacts with correct metadata", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/contacts" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("totalPages");
  });

  // Test 4: Get Paged
  it("should respect pageSize parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/contacts",
      query: { pageSize: "2" },
    });
    const body = JSON.parse(response.payload);
    expect(body.pageSize).toBe(2);
    expect(body.data.length).toBeLessThanOrEqual(2);
  });

  // Test 5: Get Filtered (Search)
  it("should filter contacts by search query", async () => {
    const uniqueName = `UniqueSearchName-${Date.now()}`;
    await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: {
        name: uniqueName,
        email: `${uniqueName}@example.com`,
        phone: "+55 11 98888-8888",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/contacts",
      query: { q: uniqueName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.some((c: Contact) => c.name === uniqueName)).toBe(true);
  });

  // Test 5.1: Search by phone number
  it("should filter contacts by phone number", async () => {
    // Use a valid phone format that libphonenumber accepts (Brazilian number)
    const testPhone = `+55 11 98888-8888`;
    const uniqueEmail = `phone-search-${Date.now()}@example.com`;

    // Create contact with specific phone
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: {
        name: "Phone Test Contact",
        email: uniqueEmail,
        phone: testPhone,
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.payload);

    // Wait a bit to ensure cache is not interfering
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Search by full phone digits to avoid flakiness (pagination/sort + accidental collisions)
    const q = testPhone.replace(/\D/g, "");

    const response = await app.inject({
      method: "GET",
      url: "/v1/contacts",
      query: { q, sort: "createdAt", order: "desc", pageSize: "50" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    const found = body.data.find((c: Contact) => c.id === created.id);
    expect(found).toBeDefined();
    expect(found.phone).toBe(testPhone);
  });

  // Test 6: Get Sorted
  it("should sort contacts by name DESC", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/contacts",
      query: { sort: "name", order: "desc" },
    });
    const body = JSON.parse(response.payload);
    if (body.data.length >= 2) {
      const first = body.data[0].name.toLowerCase();
      const second = body.data[1].name.toLowerCase();
      expect(first >= second).toBe(true);
    }
  });

  // Test 7: Get Single Success
  it("should fetch a single contact by ID", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: {
        name: "Single",
        email: `single-${Date.now()}@example.com`,
        phone: "+55 11 98888-8888",
      },
    });
    const created = JSON.parse(createRes.payload);

    const response = await app.inject({
      method: "GET",
      url: `/v1/contacts/${created.id}`,
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).id).toBe(created.id);
  });

  // Test 8: Get Single 404
  it("should return 404 for non-existent ID", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/contacts/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
  });

  // Test 9: Update Partial
  it("should allow partial updates", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: {
        name: "Before",
        email: `update-${Date.now()}@example.com`,
        phone: "+55 11 98888-8888",
      },
    });
    const created = JSON.parse(createRes.payload);

    const response = await app.inject({
      method: "PUT",
      url: `/v1/contacts/${created.id}`,
      payload: { name: "After" },
    });

    expect(response.statusCode).toBe(200);
    const updated = JSON.parse(response.payload);
    expect(updated.name).toBe("After");
    expect(updated.email).toBe(created.email); // Unchanged
  });

  // Test 10: Delete Success
  it("should delete a contact", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/contacts",
      payload: {
        name: "To Delete",
        email: `delete-${Date.now()}@example.com`,
        phone: "+55 11 98888-8888",
      },
    });
    const created = JSON.parse(createRes.payload);

    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/v1/contacts/${created.id}`,
    });
    expect(deleteRes.statusCode).toBe(204);

    const getRes = await app.inject({
      method: "GET",
      url: `/v1/contacts/${created.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });
});
