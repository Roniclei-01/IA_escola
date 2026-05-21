import {
  handleCommercialApiRequest,
  type CommercialApiRequest,
  type CommercialApiResponse
} from "./license-api";
import type { CommercialLicenseBackend, WebhookSignatureVerifier } from "./license-backend";

export interface CommercialFetchAdapterDependencies {
  backend: CommercialLicenseBackend;
  paddleVerifier: WebhookSignatureVerifier;
}

export type CommercialFetchHandler = (request: Request) => Promise<Response>;

export function createCommercialFetchHandler(
  dependencies: CommercialFetchAdapterDependencies
): CommercialFetchHandler {
  return (request) => handleCommercialFetchRequest(request, dependencies);
}

export async function handleCommercialFetchRequest(
  request: Request,
  dependencies: CommercialFetchAdapterDependencies
): Promise<Response> {
  const apiRequest = await toCommercialApiRequest(request);
  const apiResponse = handleCommercialApiRequest(apiRequest, dependencies);

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
