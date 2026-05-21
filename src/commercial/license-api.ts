import {
  CommercialLicenseBackend,
  handlePaddleWebhook,
  type CommercialActivationRequest,
  type WebhookSignatureVerifier
} from "./license-backend";

export interface CommercialApiRequest {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: string;
}

export interface CommercialApiResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export function handleCommercialApiRequest(
  request: CommercialApiRequest,
  dependencies: {
    backend: CommercialLicenseBackend;
    paddleVerifier: WebhookSignatureVerifier;
  }
): CommercialApiResponse {
  if (request.method === "POST" && request.path === "/webhooks/paddle") {
    return handlePaddleWebhookRequest(request, dependencies.backend, dependencies.paddleVerifier);
  }

  if (request.method === "POST" && request.path === "/licenses/activate") {
    return handleLicenseActivationRequest(request, dependencies.backend);
  }

  return jsonResponse(404, {
    status: "not_found"
  });
}

function handlePaddleWebhookRequest(
  request: CommercialApiRequest,
  backend: CommercialLicenseBackend,
  verifier: WebhookSignatureVerifier
): CommercialApiResponse {
  const signature = headerValue(request.headers, "paddle-signature");

  if (!signature) {
    return jsonResponse(401, {
      status: "missing_signature"
    });
  }

  const result = handlePaddleWebhook(request.body ?? "", signature, verifier, backend);

  if (result.status === "rejected_invalid_signature") {
    return jsonResponse(401, result);
  }

  if (result.status === "invalid_payload") {
    return jsonResponse(400, result);
  }

  return jsonResponse(200, {
    status: result.status,
    license_id: result.license?.id ?? null
  });
}

function handleLicenseActivationRequest(
  request: CommercialApiRequest,
  backend: CommercialLicenseBackend
): CommercialApiResponse {
  const activationRequest = parseActivationRequest(request.body);

  if (!activationRequest) {
    return jsonResponse(400, {
      status: "invalid_request"
    });
  }

  const result = backend.activateLicense(activationRequest);

  if (result.status === "not_found") {
    return jsonResponse(404, result);
  }

  if (result.status === "customer_mismatch") {
    return jsonResponse(403, result);
  }

  return jsonResponse(200, result);
}

function parseActivationRequest(body: string | undefined): CommercialActivationRequest | null {
  if (!body) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as CommercialActivationRequest;
    const hasLicenseId = typeof parsed.license_id === "string" && parsed.license_id.trim() !== "";
    const hasGatewayObjectId =
      typeof parsed.gateway_object_id === "string" && parsed.gateway_object_id.trim() !== "";

    if (!hasLicenseId && !hasGatewayObjectId) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function headerValue(
  headers: Record<string, string | undefined> | undefined,
  name: string
): string | null {
  if (!headers) {
    return null;
  }

  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(([headerName]) => headerName.toLowerCase() === lowerName);
  const value = entry?.[1]?.trim();

  return value && value.length > 0 ? value : null;
}

function jsonResponse(status: number, body: unknown): CommercialApiResponse {
  return {
    status,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
