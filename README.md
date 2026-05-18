# Estudo IA Local

Aplicativo desktop local-first para estudo secular com IA open-source, focado em importar materiais, extrair conteudo, gerar flashcards e apoiar revisao de aprendizado sem dependencia obrigatoria de nuvem.

## Decisao tecnica principal

O projeto sera construido com:

- **Tauri 2** para aplicacao desktop.
- **React + TypeScript + Vite** para interface.
- **Rust** no backend local do Tauri.
- **SQLite** para persistencia local.
- **Ollama** como primeiro runtime de IA local.
- **ModelAdapter** como camada de abstracao para suportar outros provedores no futuro.
- **i18next** para interface em Portugues, Ingles e Espanhol.
- **Vitest, Playwright e testes Rust** antes da escrita de funcionalidades de aplicacao.

Essa stack foi escolhida por favorecer manutencao, seguranca, instaladores menores, funcionamento offline, evolucao para mobile/PWA e monetizacao futura com licenca local, recursos premium e sincronizacao opcional.

## Visao do produto

O usuario deve conseguir estudar a partir de livros e materiais proprios, mantendo controle local sobre seus arquivos e dados. A aplicacao deve extrair texto, segmentar conteudo, gerar flashcards e exercicios, permitir revisao e, em fases posteriores, oferecer traducao, tutor conversacional e exportacoes.

## Principios de arquitetura

- **Local-first**: o app deve funcionar sem conta obrigatoria e sem dependencia de nuvem.
- **Test-first**: antes de implementar uma funcionalidade, devem existir testes que definam o comportamento esperado.
- **Modularidade**: IA, parsing, persistencia, revisao e UI devem evoluir sem reescrever o nucleo.
- **Seguranca por fronteira**: o frontend nao acessa diretamente arquivos, banco ou processos locais; essas operacoes passam por comandos controlados do Tauri.
- **Monetizacao sem aprisionamento**: o usuario pode usar a versao local, enquanto recursos pagos podem ser adicionados por licenca, sync, modelos premium ou pacotes de estudo.

## MVP 0.1

O primeiro MVP deve validar o fluxo mais importante do produto:

1. importar arquivo `.txt`;
2. extrair texto;
3. dividir conteudo em chunks;
4. gerar flashcards usando um adaptador de IA;
5. salvar livro, chunks e cards em SQLite;
6. estudar cards em uma tela simples;
7. trocar idioma da interface entre Portugues, Ingles e Espanhol.

PDF, EPUB, tutor, traducao completa, exportacao e calendario entram depois que esse fluxo estiver estavel.

## Estado atual da implementacao

Ja existe a fundacao do app com Tauri, React, TypeScript, Rust, i18n e testes automatizados. A primeira fatia do pipeline tambem foi iniciada com desenvolvimento test-first:

- entidade `Document`;
- servico de aplicacao `chunk_document`;
- contrato `ModelAdapter`;
- caso de uso `generate_flashcards`;
- `MockModelAdapter` no frontend para testes previsiveis;
- parser de `.txt` no backend Tauri;
- comando Tauri `import_text_book`;
- ponte TypeScript `importTextBook`;
- UI minima para informar o caminho de um `.txt`, importar e exibir previa;
- testes unitarios cobrindo dominio, chunking e geracao de flashcards mockada.

## Funcionalidades por fase

### Fase inicial

- Importacao de `.txt`.
- Chunking por tamanho e marcadores simples.
- Geracao de flashcards.
- Persistencia local em SQLite.
- Interface desktop com biblioteca, estudo e configuracoes.
- Adaptador inicial para Ollama.
- Testes automatizados antes da implementacao.

### Fase de expansao

- Importacao de PDF e EPUB.
- Exercicios de multipla escolha e perguntas abertas.
- Resumo por capitulo.
- Revisao espacada.
- Busca semantica com embeddings locais.
- Exportacao para Anki ou PDF.

### Fase de produto comercial

- Instaladores assinados.
- Licenca local e ativacao opcional online.
- Backups e sincronizacao opcional.
- Pacotes de estudo pagos.
- Modelos e prompts premium.
- Telemetria opt-in, sem capturar conteudo dos livros.

## Fluxo obrigatorio de desenvolvimento

Toda funcionalidade nova deve seguir esta ordem:

1. escrever requisito curto;
2. escrever teste unitario, de integracao ou E2E;
3. confirmar que o teste falha pelo motivo esperado;
4. implementar o menor codigo que passa;
5. refatorar mantendo testes verdes;
6. atualizar documentacao quando houver mudanca de comportamento.

Nenhuma funcionalidade de aplicacao deve ser escrita antes dos testes que definem seu comportamento.

## Estrutura de pastas esperada

```text
src/
  ui/
  app/
  domain/
  infrastructure/
  i18n/
src-tauri/
  src/
  tests/
tests/
  unit/
  integration/
  e2e/
data/
  books/
  models/
  indexes/
docs/
  architecture.md
  software-modeling-uml.md
  testing-strategy.md
  uml/
```

## Proximos passos

1. Inicializar Git.
2. Criar scaffold Tauri + React + TypeScript.
3. Configurar Vitest, Playwright e testes Rust.
4. Criar testes do dominio inicial.
5. Implementar entidades `Book`, `DocumentChunk`, `StudyCard` e `ModelProfile`.
6. Criar testes do pipeline `.txt -> chunks -> flashcards`.
7. Implementar adaptador inicial para Ollama.
8. Criar tela minima de biblioteca e estudo.

## Comandos de desenvolvimento

```bash
npm install
npm run test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
npm run test:e2e
npm run build
```

O comando `cargo test --no-default-features` valida o dominio sem compilar a camada grafica do Tauri. Para rodar o app desktop completo no Linux, o ambiente precisa das dependencias nativas exigidas pelo Tauri/WebKit, incluindo `pkg-config` e bibliotecas de sistema como DBus/WebKitGTK.
