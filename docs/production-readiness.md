# Preparacao Para Producao e Monetizacao

Este documento define o caminho para transformar o MVP aprovado em um produto
comercial sem quebrar o principio local-first do projeto.

## 1. Objetivo

Preparar o aplicativo para distribuicao publica, venda e suporte real.

O produto deve continuar funcionando localmente, sem conta obrigatoria e sem
enviar conteudo dos livros para nuvem por padrao. A monetizacao deve liberar
recursos premium, nao prender os dados do usuario.

## 2. Decisao comercial inicial

Modelo recomendado:

| Plano | Uso | Recursos |
|---|---|---|
| Free | Validar produto e atrair usuarios | Importacao TXT/PDF, leitura local, biblioteca, limite baixo de geracao de cards |
| Pro mensal/anual | Receita recorrente | Mais geracao de cards, multiplas escolhas avancadas, exportacoes, anotacoes avancadas, limites maiores |
| Lifetime | Compra unica para early adopters | Recursos Pro locais sem renovacao, sem sincronizacao paga |
| Add-ons futuros | Expansao | Pacotes de estudo, modelos por area, sync/backup opcional |

Regras:

- o usuario deve conseguir abrir e exportar os proprios dados mesmo sem plano pago;
- recursos pagos devem falhar com mensagem clara quando nao licenciados;
- ativacao online pode existir, mas a licenca validada deve funcionar offline;
- sync, telemetria e IA em nuvem devem ser opt-in.

## 3. Gateway de pagamento

### Opcao recomendada: Paddle

Paddle e a opcao recomendada para a primeira versao comercial porque atua como
merchant of record para produtos digitais, reduzindo trabalho com impostos,
checkout global, assinaturas e metodos de pagamento.

Uso planejado:

1. usuario compra no site;
2. Paddle confirma a compra por webhook;
3. backend comercial emite uma licenca assinada;
4. app desktop ativa a licenca;
5. app armazena a licenca localmente e valida offline.

### Alternativa: Stripe Checkout

Stripe Checkout e uma boa alternativa se o projeto quiser mais controle sobre o
fluxo comercial. Nesse caso, o backend proprio precisa cuidar de impostos,
emissao de licenca, renovacoes e eventos de assinatura.

Regra obrigatoria: a emissao de licenca nao deve depender do retorno do usuario
para a pagina final. O backend deve confirmar pagamento por webhook.

## 4. Arquitetura de licenca

### Entidades

```text
License
  id
  plan
  customer_email_hash
  issued_at
  expires_at
  entitlements
  signature

LicenseEntitlement
  key
  limit
  expires_at
```

Planos podem ser representados por entitlements, nao por condicionais espalhadas
na UI.

Exemplos de entitlements:

- `cards.generate.basic`
- `cards.generate.multiple_choice`
- `cards.generate.monthly_limit`
- `export.anki.apkg`
- `export.report.pdf`
- `reader.epub`
- `sync.backup`

### Servicos

```text
LicenseService
  validateLocalLicense()
  activateLicense()
  refreshLicense()
  hasEntitlement()
  usageRemaining()
```

### Regras

- licenca local deve ser assinada pelo backend comercial;
- app valida assinatura com chave publica embutida;
- chave privada nunca entra no app desktop;
- ausencia de licenca ativa libera apenas recursos Free;
- licenca expirada nao apaga dados locais;
- falha de rede nao deve bloquear recursos ja licenciados enquanto a licenca
  local ainda for valida.

## 5. Backend comercial minimo

O app desktop nao deve processar pagamento diretamente.

Backend minimo:

- receber webhook do gateway;
- validar assinatura do webhook;
- criar ou atualizar cliente;
- emitir licenca assinada;
- expor endpoint de ativacao;
- expor endpoint de refresh/revogacao;
- registrar auditoria sem conteudo de livros.

Endpoints iniciais:

```text
POST /webhooks/paddle
POST /webhooks/stripe
POST /licenses/activate
POST /licenses/refresh
GET  /licenses/status
```

## 6. Bloqueadores antes de vender

### App desktop

- trocar `identifier` de `local.estudo-ia.app` para dominio real do produto;
- trocar `csp: null` por uma Content Security Policy restritiva;
- revisar `src-tauri/capabilities/default.json`;
- remover qualquer fallback mockado em build de producao;
- revisar mensagens de erro que possam vazar caminho ou conteudo sensivel;
- definir armazenamento seguro para licenca e tokens quando disponivel;
- validar instaladores em ambiente limpo.

### Distribuicao

- gerar release reproduzivel por tag Git;
- assinar instalador Windows;
- assinar e notarizar macOS antes de distribuir para usuarios macOS;
- manter `.deb`, `.rpm` e AppImage para Linux;
- preparar atualizacao automatica com assinatura;
- publicar checksums dos artefatos.

### Privacidade

- criar Politica de Privacidade;
- criar Termos de Uso;
- deixar claro que livros ficam locais por padrao;
- telemetria deve ser desligada por padrao ou explicitamente opt-in;
- logs nao devem conter trechos de documentos.

## 7. Checklist de release

Antes de publicar qualquer versao:

```bash
npm run check
npm run check:production-config
npm run build
npm run test:e2e
npm run tauri build
npm run check:mvp:env
npm run check:mvp:appimage
```

Checklist manual:

- importar TXT;
- importar PDF;
- importar PDF com OCR;
- gerar cards;
- gerar mais cards;
- revisar cards;
- traduzir pagina;
- reabrir app e confirmar persistencia;
- exportar Anki `.apkg`;
- exportar TSV;
- exportar relatorio;
- testar tema claro/escuro;
- testar app empacotado, nao apenas `tauri dev`.

## 8. Testes obrigatorios para monetizacao

Antes de implementar licenciamento:

- licenca ausente cai no plano Free;
- licenca valida libera recurso Pro;
- licenca expirada bloqueia apenas recurso pago;
- licenca invalida por assinatura e rejeitada;
- app funciona offline com licenca local valida;
- recurso pago mostra mensagem clara quando bloqueado;
- exportacao de dados locais continua disponivel quando possivel;
- logs e telemetria nao incluem conteudo de documento.

Antes de implementar pagamento:

- webhook valido emite licenca;
- webhook duplicado e idempotente;
- webhook invalido e rejeitado;
- pagamento cancelado nao emite licenca;
- renovacao atualiza expiracao;
- cancelamento de assinatura remove apenas renovacao futura;
- reembolso/revogacao invalida entitlement pago.

## 9. Ordem recomendada das proximas fatias

### Fatia P1: endurecimento de producao

Escopo:

- ajustar `tauri.conf.json`;
- definir CSP;
- revisar capabilities;
- criar checklist de release por plataforma;
- documentar variaveis de ambiente de build.

Status inicial:

- `identifier` alterado para `com.estudoialocal.desktop`;
- CSP de producao definida para bloquear `object-src`, `frame-ancestors` e formularios;
- `devCsp` separada da CSP de producao para manter o Vite funcionando em desenvolvimento;
- imagens `data:` continuam permitidas para renderizacao local de paginas PDF;
- permissoes Tauri mantidas em `core:default`, dialogo de abrir/salvar e notificacoes;
- `npm run check:production-config` valida automaticamente configuracao Tauri e capabilities.

Aceite:

- app continua abrindo em dev e build;
- nenhum recurso quebra por CSP;
- capacidades continuam minimas.

Comandos de validacao:

```bash
npm run check:production-config
npm run build
npm run tauri build
```

Validado em 2026-05-20:

- `npm run check:production-config` passou;
- `npm run check` passou com 178 testes Vitest e 188 testes Rust;
- `npm run build` passou;
- `npm run tauri build` compilou o binario e gerou `.deb` e `.rpm`;
- o AppImage precisou de rede para baixar o runtime do `appimagetool`;
- `npm run tauri build -- --bundles appimage` passou com rede liberada e gerou
  `src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage`.

### Fatia P2: dominio de licenca

Escopo:

- criar entidade `License`;
- criar `LicenseService`;
- validar assinatura local com chave publica de teste;
- persistir licenca local;
- criar testes de licenca valida, ausente, expirada e invalida.

Aceite:

- app identifica plano Free sem licenca;
- app identifica Pro com licenca assinada;
- testes nao dependem de rede.

Status inicial:

- entidade `License` criada no dominio Rust;
- `LicenseService` criado com verificador local de assinatura de teste;
- comandos Tauri `load_license_status` e `activate_license` criados;
- licenca local persistida em `app_settings` com a chave `license.local.v1`;
- wrapper TypeScript criado para carregar status e ativar licenca;
- testes cobrem licenca ausente, Pro valida, expirada, assinatura invalida e
  persistencia local.

Observacao:

- a assinatura atual e um verificador local de teste para preparar a arquitetura;
- antes da venda real, a P4 deve substituir a emissao por assinatura assimetrica
  feita no backend comercial com chave privada fora do app.

Validado em 2026-05-20:

- `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features license`
  passou com 10 testes de licenca;
- `npm run test -- src/infrastructure/tauri/license.test.ts` passou com 2 testes;
- `npm run check` passou com 180 testes Vitest e 198 testes Rust;
- `npm run check:production-config` passou;
- `npm run build` passou.

### Fatia P3: gates de recurso

Escopo:

- criar `EntitlementGuard`;
- aplicar gates em recursos pagos;
- adicionar mensagens claras na UI;
- evitar esconder dados do usuario.

Aceite:

- usuario Free entende por que recurso Pro esta bloqueado;
- usuario Pro usa recurso sem atrito;
- dados locais continuam acessiveis.

Status inicial:

- `EntitlementGuard` criado no backend Rust;
- comando Tauri `check_entitlement` criado;
- wrapper TypeScript `checkEntitlement` criado;
- recursos gratuitos declarados para manter dados acessiveis, incluindo TSV e
  relatorio Markdown;
- exportacao Anki `.apkg` e exportacao de relatorio PDF passam a exigir
  entitlement Pro;
- UI exibe mensagem clara quando um recurso Pro esta bloqueado;
- exportacoes gratuitas continuam funcionando sem licenca paga.

Validado em 2026-05-20:

- `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features entitlement`
  passou com 9 testes;
- `npm run test -- src/infrastructure/tauri/entitlements.test.ts src/ui/App.test.tsx`
  passou com 90 testes;
- `npm run check` passou com 182 testes Vitest e 206 testes Rust;
- `npm run check:production-config` passou;
- `npm run build` passou.

### Fatia P4: backend comercial minimo

Escopo:

- escolher Paddle ou Stripe;
- implementar webhook;
- emitir licenca assinada;
- criar endpoint de ativacao;
- testar sandbox.

Aceite:

- compra sandbox gera licenca;
- app ativa licenca;
- webhook duplicado nao duplica licenca.

Status inicial:

- Paddle mantido como gateway recomendado para a primeira versao comercial;
- contrato inicial documentado em `docs/commercial-backend-contract.md`;
- nucleo puro de backend comercial criado em `src/commercial/license-backend.ts`;
- webhook Paddle normalizado para evento comercial interno;
- assinatura de webhook e obrigatoria por interface injetada;
- licenca emitida no formato compativel com o app desktop;
- idempotencia por `event_id` implementada;
- eventos sem pagamento ativo sao ignorados e nao emitem licenca;
- contrato puro de API criado em `src/commercial/license-api.ts`;
- `POST /webhooks/paddle` responde com status e `license_id`;
- `POST /licenses/activate` retorna a licenca assinada por `license_id` ou
  `gateway_object_id`;
- ativacao rejeita hash de cliente divergente para evitar entregar licenca ao
  usuario errado;
- adaptador `Request`/`Response` criado em
  `src/commercial/license-fetch-adapter.ts` para deploy futuro em runtime
  compativel com Fetch sem prender o backend comercial a um framework;
- porta `CommercialLicenseRepository` criada para separar regra comercial de
  armazenamento;
- repositorio persistente por snapshot criado em
  `src/commercial/license-persistent-repository.ts`;
- webhooks processados passam a ter registro de auditoria com resultado do
  processamento;
- licencas emitidas continuam disponiveis apos recriar o repositorio;
- idempotencia de webhook duplicado continua valida apos recriar o repositorio;
- eventos ignorados tambem sao persistidos como auditoria sem emitir licenca.

Validado em 2026-05-20:

- `npm run test -- src/commercial/license-backend.test.ts` passou com 5 testes;
- `npm run test -- src/commercial/license-backend.test.ts src/commercial/license-api.test.ts`
  passou com 11 testes;
- `npm run test -- src/commercial/license-backend.test.ts src/commercial/license-api.test.ts src/commercial/license-fetch-adapter.test.ts`
  passou com 15 testes;
- `npm run check` passou com 197 testes Vitest e 206 testes Rust;
- `npm run check:production-config` passou;
- `npm run build` passou.

Validado em 2026-05-21:

- `npm run test -- src/commercial/license-backend.test.ts src/commercial/license-api.test.ts src/commercial/license-fetch-adapter.test.ts src/commercial/license-persistent-repository.test.ts`
  passou com 18 testes.
- `npm run build` passou;
- `npm run check` passou com 202 testes Vitest e 206 testes Rust;
- `npm run check:production-config` passou.

### Fatia P5: assinatura e atualizacao

Escopo:

- configurar assinatura por plataforma;
- adicionar atualizador Tauri;
- publicar manifest de update;
- documentar rollback.

Aceite:

- app assinado instala sem alerta critico na plataforma alvo;
- atualizacao baixa somente pacote assinado;
- falha de update nao corrompe app instalado.

## 10. Matriz de risco

| Risco | Impacto | Mitigacao |
|---|---|---|
| Bloquear dados locais por erro de licenca | Alto | Licenca bloqueia recurso pago, nao acesso aos dados |
| Enviar conteudo de livro sem consentimento | Alto | IA e telemetria online sempre opt-in |
| Gateway confirmar pagamento no cliente | Alto | Webhook obrigatorio |
| App sem assinatura em Windows/macOS | Medio/alto | Assinatura antes de venda ampla |
| CSP frouxa | Medio | CSP restritiva antes de release comercial |
| Licenca falsificavel | Alto | Assinatura assimetrica; chave privada fora do app |
| Suporte caro por dependencia local | Medio | Diagnostico visual de Ollama/OCR/LibreTranslate |

## 11. Indicadores de pronto para venda

O produto pode entrar em venda beta quando:

- app empacotado passa no checklist em pelo menos Linux e Windows;
- politica de privacidade e termos existem;
- licenca local validada por teste automatizado;
- fluxo de compra sandbox emite licenca;
- usuario Free nao perde acesso aos dados;
- usuario Pro tem pelo menos um beneficio claro;
- suporte inicial tem roteiro de instalacao e troubleshooting.

Venda publica ampla exige:

- assinatura Windows;
- assinatura/notarizacao macOS, se houver macOS;
- atualizador assinado;
- landing page;
- checkout real;
- backup de releases;
- canal de suporte.

## 12. Referencias oficiais

- Tauri - distribuicao: https://v2.tauri.app/distribute/
- Tauri - assinatura Windows: https://v2.tauri.app/distribute/sign/windows/
- Tauri - updater: https://v2.tauri.app/plugin/updater/
- Tauri - capabilities: https://v2.tauri.app/security/capabilities/
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe fulfillment por webhook: https://docs.stripe.com/checkout/fulfillment
- Paddle Developer Docs: https://developer.paddle.com/
- Paddle Checkout: https://developer.paddle.com/concepts/sell/self-serve-checkout
