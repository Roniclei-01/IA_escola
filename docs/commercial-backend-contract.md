# Contrato do Backend Comercial

Este documento descreve o primeiro contrato do backend comercial do Estudo IA
Local. O backend comercial fica fora do app desktop e nunca deve receber
conteudo dos livros do usuario.

## Gateway escolhido

Gateway inicial: Paddle.

Motivo:

- reduz responsabilidade operacional com impostos globais;
- oferece checkout hospedado e webhooks;
- permite enviar `custom_data` no checkout para transportar metadados proprios
  da compra, como plano e hash do e-mail;
- preserva o app desktop como local-first.

Stripe continua como alternativa futura se o projeto decidir assumir mais
controle fiscal e operacional.

## Endpoints planejados

```text
POST /webhooks/paddle      implementado como contrato puro
POST /licenses/activate    implementado como contrato puro
POST /licenses/refresh     planejado
GET  /licenses/status      planejado
```

## Adaptador de runtime

O contrato comercial tambem possui um adaptador baseado na API padrao
`Request`/`Response`:

- `src/commercial/license-fetch-adapter.ts`;
- `createCommercialFetchHandler()`;
- `handleCommercialFetchRequest()`.

Esse adaptador permite publicar o mesmo contrato em runtimes compativeis com
Fetch, como Cloudflare Workers, Deno, Bun ou Node com API Fetch, sem acoplar a
regra comercial a Express, Fastify ou outro framework.

Regra mantida: o backend comercial continua recebendo apenas metadados de
pagamento e licenca. Conteudo de livros, texto extraido, anotacoes e cards do
usuario continuam fora desse fluxo.

## Fluxo de compra

1. Site abre checkout Paddle com `custom_data`.
2. Paddle envia webhook assinado para `POST /webhooks/paddle`.
3. Backend valida assinatura do webhook antes de processar.
4. Backend normaliza o evento comercial.
5. Backend emite licenca assinada com chave privada do servidor.
6. App desktop recebe a licenca pelo endpoint de ativacao e valida offline.

## `custom_data` minimo no checkout

```json
{
  "plan": "pro",
  "customer_email_hash": "hash-do-email-normalizado",
  "expires_at": "2026-06-20T20:00:00Z"
}
```

Regras:

- `plan` deve ser `pro` ou `lifetime`;
- `customer_email_hash` evita gravar e-mail puro na licenca local;
- `expires_at` e obrigatorio para planos recorrentes e ausente ou `null` para
  lifetime.

## Licenca emitida

Formato compatível com o app desktop:

```json
{
  "id": "license_paddle_txn_01",
  "plan": "pro",
  "customer_email_hash": "hash-do-email-normalizado",
  "issued_at": "2026-05-20T20:00:00Z",
  "expires_at": "2026-06-20T20:00:00Z",
  "entitlements": [
    {
      "key": "cards.generate.multiple_choice",
      "limit": 500,
      "expires_at": "2026-06-20T20:00:00Z"
    },
    {
      "key": "export.anki.apkg",
      "limit": null,
      "expires_at": "2026-06-20T20:00:00Z"
    },
    {
      "key": "export.report.pdf",
      "limit": null,
      "expires_at": "2026-06-20T20:00:00Z"
    }
  ],
  "signature": "assinatura-do-servidor"
}
```

A assinatura da licenca usa o formato:

```text
ed25519:<assinatura-base64>
```

O payload assinado e a representacao canonica da licenca sem o campo
`signature`. A chave privada fica somente no backend comercial. O app desktop
valida a licenca offline usando a chave publica embutida.

## `POST /webhooks/paddle`

Entrada:

- metodo `POST`;
- header `Paddle-Signature`;
- corpo bruto do webhook Paddle.

Respostas:

```json
{ "status": "license_issued", "license_id": "license_paddle_txn_01" }
```

```json
{ "status": "duplicate", "license_id": "license_paddle_txn_01" }
```

```json
{ "status": "ignored", "license_id": null }
```

Erros:

- `401`: assinatura ausente ou invalida;
- `400`: payload invalido.

## `POST /licenses/activate`

Entrada minima:

```json
{
  "license_id": "license_paddle_txn_01",
  "customer_email_hash": "hash-do-email-normalizado"
}
```

Alternativa:

```json
{
  "gateway_object_id": "txn_01",
  "customer_email_hash": "hash-do-email-normalizado"
}
```

Resposta de sucesso:

```json
{
  "status": "activated",
  "license": {
    "id": "license_paddle_txn_01",
    "plan": "pro",
    "customer_email_hash": "hash-do-email-normalizado",
    "issued_at": "2026-05-20T20:00:00Z",
    "expires_at": "2026-06-20T20:00:00Z",
    "entitlements": [],
    "signature": "assinatura-do-servidor"
  }
}
```

Erros:

- `400`: request invalida;
- `403`: hash do cliente nao corresponde a licenca;
- `404`: licenca nao encontrada.

## Idempotencia

Todo webhook deve ser processado uma unica vez por `event_id`.

Se o gateway reenviar o mesmo evento:

- o backend deve retornar sucesso;
- nao deve duplicar cliente;
- nao deve duplicar licenca;
- deve retornar a licenca ja emitida para o objeto comercial quando aplicavel.

## Auditoria

Registrar apenas metadados comerciais:

- `gateway`;
- `event_id`;
- `event_type`;
- `customer_id`;
- `subscription_id`;
- `license_id`;
- resultado do processamento.

Nunca registrar:

- conteudo de livros;
- texto extraido;
- cards do usuario;
- anotacoes;
- arquivos importados.

## Implementacao inicial no repositorio

A fatia inicial esta em:

- `src/commercial/license-backend.ts`;
- `src/commercial/license-api.ts`;
- `src/commercial/license-ed25519-signer.ts`;
- `src/commercial/license-fetch-adapter.ts`;
- `src/commercial/license-persistent-repository.ts`;
- `src/commercial/license-backend.test.ts`;
- `src/commercial/license-api.test.ts`;
- `src/commercial/license-ed25519-signer.test.ts`;
- `src/commercial/license-fetch-adapter.test.ts`;
- `src/commercial/license-persistent-repository.test.ts`.

Ela cobre:

- normalizacao de webhook Paddle;
- validacao obrigatoria de assinatura por interface injetada;
- emissao de licenca;
- assinatura Ed25519 real para licencas comerciais;
- validacao offline de licenca Ed25519 no app desktop;
- idempotencia por `event_id`;
- persistencia de auditoria dos webhooks processados;
- persistencia de licencas emitidas por objeto comercial do gateway;
- ignorar eventos sem pagamento ativo;
- contrato puro de API para webhook Paddle;
- contrato puro de API para ativacao de licenca pelo desktop;
- adaptador `Request`/`Response` para deploy futuro em runtime compativel com
  Fetch.

## Persistencia comercial inicial

A camada comercial agora possui a porta `CommercialLicenseRepository`.

Essa porta separa regra de negocio de armazenamento e permite trocar a
implementacao em memoria por uma implementacao duravel sem alterar o fluxo de
webhook, emissao ou ativacao de licenca.

A implementacao inicial duravel e:

- `PersistentCommercialLicenseRepository`;
- `CommercialLicenseRepositorySnapshotStore`.

Ela persiste:

- webhooks processados;
- resultado do processamento (`license_issued` ou `ignored`);
- relacionamento entre objeto do gateway e licenca emitida;
- licencas emitidas para ativacao posterior pelo app.

Essa fatia ainda nao e o adaptador PostgreSQL real. Ela define o contrato de
storage e prova os comportamentos essenciais que o Postgres devera preservar:

- licenca continua disponivel apos recriar o repositorio;
- webhook duplicado continua idempotente apos recriar o repositorio;
- webhook ignorado tambem fica registrado para auditoria.

## Assinatura de licenca

A assinatura assimetrica Ed25519 esta implementada em duas pontas:

- backend comercial: `Ed25519CommercialLicenseSigner`;
- app desktop: `Ed25519LicenseSignatureVerifier`.

O backend comercial assina o payload canonico com a chave privada. O app valida
o payload com a chave publica e rejeita licencas com assinatura ausente,
assinatura legada de teste ou payload alterado.

Antes de vender, gerar um par de chaves de producao e substituir a chave publica
de desenvolvimento embutida no app. A chave privada de producao nao deve entrar
no repositorio, no app desktop, em logs ou em artefatos distribuiveis.

Regra de privacidade mantida: a persistencia comercial guarda apenas metadados
de pagamento e licenca. Conteudo de livros, texto extraido, anotacoes, paginas
traduzidas e cards continuam fora do backend comercial.
