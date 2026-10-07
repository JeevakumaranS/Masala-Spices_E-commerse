import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-encoding",
  "content-length",
  "accept-encoding",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyApiRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const target = process.env.BACKEND_API_URL?.trim();
  if (!target) {
    console.error("BACKEND_API_URL is not configured for the API proxy.");
    return Response.json(
      { detail: "Backend API endpoint is not configured." },
      { status: 500 },
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch (error) {
    console.error("BACKEND_API_URL is not a valid URL.", error);
    return Response.json(
      { detail: "Backend API endpoint configuration is invalid." },
      { status: 500 },
    );
  }
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    console.error("BACKEND_API_URL must use HTTP or HTTPS.");
    return Response.json(
      { detail: "Backend API endpoint must use HTTP or HTTPS." },
      { status: 500 },
    );
  }
  if (targetUrl.username || targetUrl.password || targetUrl.search || targetUrl.hash) {
    console.error("BACKEND_API_URL must not include credentials, a query, or a fragment.");
    return Response.json(
      { detail: "Backend API endpoint configuration is invalid." },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const basePath = targetUrl.pathname.replace(/\/+$/, "");
  targetUrl.pathname = `${basePath}/api/${path.map(encodeURIComponent).join("/")}`;
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);
    return new Response(
      request.method === "HEAD" || [204, 205, 304].includes(upstream.status)
        ? null
        : upstream.body,
      {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error("Backend API proxy request failed.", error);
    return Response.json(
      { detail: "Backend API is unavailable." },
      { status: 502 },
    );
  }
}

export const GET = proxyApiRequest;
export const HEAD = proxyApiRequest;
export const POST = proxyApiRequest;
export const PUT = proxyApiRequest;
export const PATCH = proxyApiRequest;
export const DELETE = proxyApiRequest;
export const OPTIONS = proxyApiRequest;
