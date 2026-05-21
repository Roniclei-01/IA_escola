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
POST /webhooks/paddle
POST /licenses/activate
POST /licenses/refresh
GET  /licenses/status
```

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
- `src/commercial/license-backend.test.ts`.

Ela cobre:

- normalizacao de webhook Paddle;
- validacao obrigatoria de assinatura por interface injetada;
- emissao de licenca;
- idempotencia por `event_id`;
- ignorar eventos sem pagamento ativo.

Antes de vender, substituir o assinador de teste por assinatura assimetrica com
chave privada mantida somente no backend comercial.
