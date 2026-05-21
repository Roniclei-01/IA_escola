import { readFileSync } from "node:fs";

const tauriConfigPath = new URL("../src-tauri/tauri.conf.json", import.meta.url);
const capabilitiesPath = new URL("../src-tauri/capabilities/default.json", import.meta.url);

const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf8"));
const capabilities = JSON.parse(readFileSync(capabilitiesPath, "utf8"));

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const identifier = tauriConfig.identifier ?? "";
assert(
  /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/.test(identifier),
  "identifier deve usar formato reverse-DNS estavel, exemplo: com.produto.desktop"
);
assert(
  identifier !== "local.estudo-ia.app",
  "identifier generico de desenvolvimento nao pode seguir para producao"
);

const security = tauriConfig.app?.security ?? {};
const csp = security.csp ?? "";
const devCsp = security.devCsp ?? "";

assert(typeof csp === "string" && csp.trim().length > 0, "csp de producao deve estar definido");
assert(csp !== "null", "csp de producao nao pode ser null");
assert(!csp.includes("unsafe-eval"), "csp de producao nao deve permitir unsafe-eval");
assert(csp.includes("object-src 'none'"), "csp deve bloquear object-src");
assert(csp.includes("frame-ancestors 'none'"), "csp deve bloquear frame-ancestors");
assert(csp.includes("connect-src") && csp.includes("ipc:"), "csp deve permitir IPC do Tauri");
assert(csp.includes("img-src") && csp.includes("data:"), "csp deve permitir imagens data: para paginas PDF renderizadas");

assert(
  typeof devCsp === "string" && devCsp.includes("ws://127.0.0.1:1420"),
  "devCsp deve permitir websocket local do Vite em desenvolvimento"
);

const permissions = capabilities.permissions ?? [];
const allowedPermissions = new Set([
  "core:default",
  "dialog:allow-open",
  "dialog:allow-save",
  "notification:default"
]);

for (const permission of permissions) {
  assert(
    allowedPermissions.has(permission),
    `permissao inesperada em capabilities/default.json: ${permission}`
  );
}

assert(permissions.includes("core:default"), "capability deve manter core:default");
assert(permissions.includes("dialog:allow-open"), "capability deve permitir abrir arquivos");
assert(permissions.includes("dialog:allow-save"), "capability deve permitir salvar exportacoes");

if (errors.length > 0) {
  console.error("[fail] Configuracao de producao invalida:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("[ok] Configuracao de producao validada.");
