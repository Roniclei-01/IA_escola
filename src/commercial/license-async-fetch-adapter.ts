import { handleCommercialAsyncApiRequest } from "./license-async-api";
import type { AsyncCommercialLicenseBackend } from "./license-async-backend";
import type { WebhookSignatureVerifier } from "./license-backend";
import type { CommercialApiRequest, CommercialApiResponse } from "./license-api";

export interface CommercialAsyncFetchAdapterDependencies {
  backend: AsyncCommercialLicenseBackend;
  paddleVerifier: WebhookSignatureVerifier;
}

export type CommercialAsyncFetchHandler = (request: Request) => Promise<Response>;

export function createCommercialAsyncFetchHandler(
  dependencies: CommercialAsyncFetchAdapterDependencies
): CommercialAsyncFetchHandler {
  return (request) => handleCommercialAsyncFetchRequest(request, dependencies);
}

export async function handleCommercialAsyncFetchRequest(
  request: Request,
  dependencies: CommercialAsyncFetchAdapterDependencies
): Promise<Response> {
  const apiRequest = await toCommercialApiRequest(request);
  const apiResponse = await handleCommercialAsyncApiRequest(apiRequest, dependencies);

  return toFetchResponse(apiResponse);
}

async function toCommercialApiRequest(request: Request): Promise<CommercialApiRequest> {
  const url = new URL(request.url);

  return {
    method: request.method.toUpperCase(),
    path: url.pathname,
    headers: headersToRecord(request.headers),
    body: await requestBodyText(request)
  };
}

function headersToRecord(headers: Headers): Record<string, string> {
  const values: Record<string, string> = {};
  headers.forEach((value, key) => {
    values[key] = value;
  });

  return values;
}

async function requestBodyText(request: Request): Promise<string | undefined> {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.text();
  return body.length > 0 ? body : undefined;
}

function toFetchResponse(response: CommercialApiResponse): Response {
  return new Response(response.body, {
    status: response.status,
    headers: response.headers
  });
}
