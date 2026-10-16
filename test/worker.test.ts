import { describe, expect, it } from "vitest";
import { handleRequest } from "../src/worker";

describe("contact form Worker", () => {
  it("returns 405 for unsupported methods", async () => {
    const response = await handleRequest(new Request("https://example.com/", { method: "GET" }));

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
  });

  it("rejects an empty contact submission", async () => {
    const response = await handleRequest(
      new Request("https://example.com/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      {
        EMAIL_API_URL: "https://example.com/api/email",
        EMAIL_API_TOKEN: "test-token",
      },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Please provide a valid name, email, contact number, and message.",
    });
  });

  it("sends a valid email and returns success", async () => {
    let emailRequest: Request | undefined;
    const response = await handleRequest(
      new Request("https://example.com/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          number: "+27 73 761 8175",
          message: "Hello from the test suite.",
        }),
      }),
      {
        EMAIL_API_URL: "https://example.com/api/email",
        EMAIL_API_TOKEN: "test-token",
        EMAIL_FROM: "verified@example.com",
        fetch: async (input: string | URL | Request, init?: RequestInit) => {
          emailRequest = input instanceof Request ? input : new Request(input, init);
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(emailRequest?.headers.get("authorization")).toBe("Bearer test-token");
    expect(emailRequest?.headers.get("content-type")).toBe("application/json");
    expect(await emailRequest?.json()).toEqual({
      subject: "New quotation request from Ada Lovelace",
      to: "dewdaytrading@gmail.com",
      from: "verified@example.com",
      reply_to: "ada@example.com",
      text: "Hello from the test suite.\n\nFrom: Ada Lovelace\nEmail: ada@example.com\nContact number: +27 73 761 8175",
    });
  });

  it("rejects a missing or invalid contact number", async () => {
    const response = await handleRequest(
      new Request("https://example.com/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          number: "call me",
          message: "Hello from the test suite.",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns a service-unavailable response when email delivery is not configured", async () => {
    const response = await handleRequest(
      new Request("https://example.com/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Ada Lovelace",
          email: "ada@example.com",
          number: "+27 73 761 8175",
          message: "Hello from the test suite.",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Email delivery is not configured." });
  });
});
