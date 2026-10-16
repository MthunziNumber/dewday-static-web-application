export interface Env {
  APP_NAME?: string;
  EMAIL_API_URL?: string;
  EMAIL_API_TOKEN?: string;
  EMAIL_FROM?: string;
  ASSETS?: Fetcher;
  fetch?: typeof fetch;
}

interface ContactPayload {
  name: string;
  email: string;
  number: string;
  message: string;
}

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_NUMBER_LENGTH = 30;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_PATTERN = /^[+()\d\s.-]+$/;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message }, 400);
}

function normalizeInput(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateContact(body: unknown): ContactPayload | null {
  if (!body || typeof body !== "object") return null;

  const candidate = body as Record<string, unknown>;
  const name = normalizeInput(candidate.name);
  const email = normalizeInput(candidate.email).toLowerCase();
  const number = normalizeInput(candidate.number);
  const message = normalizeInput(candidate.message);

  if (
    name.length < 2 ||
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(email) ||
    number.length < 3 ||
    number.length > MAX_NUMBER_LENGTH ||
    !NUMBER_PATTERN.test(number) ||
    message.length < 10 ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return null;
  }

  return { name, email, number, message };
}

async function sendEmail(payload: ContactPayload, env: Env): Promise<Response> {
  const apiUrl = env.EMAIL_API_URL;
  const token = env.EMAIL_API_TOKEN;
  const from = env.EMAIL_FROM;

  if (!apiUrl || !token || !from) {
    return jsonResponse({ error: "Email delivery is not configured." }, 503);
  }

  const request = new Request(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    body: JSON.stringify({
      subject: `New quotation request from ${payload.name}`,
      to: "dewdaytrading@gmail.com",
      from,
      reply_to: payload.email,
      text: `${payload.message}\n\nFrom: ${payload.name}\nEmail: ${payload.email}\nContact number: ${payload.number}`,
    }),
  });

  const fetcher = env.fetch ?? fetch;
  return fetcher(request);
}

export async function handleRequest(request: Request, env: Env = {}): Promise<Response> {
  if (request.method !== "POST" || new URL(request.url).pathname !== "/api/contact") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Please provide a valid JSON request body.");
  }

  const validPayload = validateContact(body);
  if (!validPayload) {
    return badRequest("Please provide a valid name, email, contact number, and message.");
  }

  try {
    const emailResponse = await sendEmail(validPayload, env);
    if (emailResponse.status === 503) {
      return emailResponse;
    }

    if (!emailResponse.ok) {
      console.error("Email delivery failed", await emailResponse.text());
      return jsonResponse({ error: "The message could not be sent. Please try again later." }, 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Contact submission failed", error);
    return jsonResponse({ error: "The message could not be sent. Please try again later." }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact") {
      return handleRequest(request, env);
    }

    if (url.pathname === "/health") {
      return jsonResponse({ ok: true, app: env.APP_NAME ?? "Dewday" });
    }

    if (!env.ASSETS) {
      return new Response("Static assets are not configured.", { status: 500 });
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      return asset;
    }

    return new Response("Not found", { status: 404 });
  },
};
