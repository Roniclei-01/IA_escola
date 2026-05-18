# Estudo IA Local

Aplicativo desktop local-first para estudo secular com IA open-source, focado em importar materiais, extrair conteudo, gerar flashcards e apoiar revisao de aprendizado sem dependencia obrigatoria de nuvem.

## Decisao tecnica principal

O projeto sera construido com:

- **Tauri 2** para aplicacao desktop.
- **React + TypeScript + Vite** para interface.
- **Rust** no backend local do Tauri.
- **SQLite** para persistencia local.
- **rusqlite** como primeira camada de acesso SQLite no backend Rust.
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

1. importar arquivo `.txt` ou `.pdf`;
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
- metadados de origem do documento com tipo (`txt`/`pdf`) e caminho local;
- servico de aplicacao `chunk_document`;
- contrato `ModelAdapter`;
- caso de uso `generate_flashcards`;
- `MockModelAdapter` no frontend para testes previsiveis;
- parser de `.txt` e `.pdf` no backend Tauri;
- comando Tauri `import_text_book`;
- ponte TypeScript `importTextBook`;
- UI minima para selecionar ou informar o caminho de um arquivo de estudo, importar e exibir previa;
- comando Tauri `chunk_text_document`;
- ponte TypeScript `chunkTextDocument`;
- exibicao da quantidade de chunks gerados apos importacao;
- geracao de flashcards com `MockModelAdapter`;
- exibicao da quantidade de cards gerados e previa do primeiro card;
- area de estudo para revelar resposta, avaliar cards e avancar entre cards;
- UI separada em componentes `ImportPanel`, `DocumentSummary` e `StudyCardViewer`;
- persistencia SQLite inicial para documentos importados;
- migracao SQLite para armazenar metadados de origem em documentos existentes;
- comando `import_text_book` persistindo documentos no SQLite;
- comando `list_imported_documents` para recuperar documentos salvos;
- UI carregando documentos salvos ao iniciar e exibindo lista de biblioteca;
- persistencia SQLite de `document_chunks`;
- comando `chunk_text_document` persistindo chunks gerados no SQLite;
- comando `list_document_chunks` para recuperar chunks salvos por documento;
- UI reaproveitando chunks persistidos ao selecionar documento salvo;
- persistencia SQLite de `study_cards`;
- comandos `save_study_cards` e `list_study_cards`;
- UI salvando cards gerados e reutilizando cards salvos ao abrir documento da biblioteca;
- persistencia SQLite de `study_reviews`;
- persistencia SQLite de `study_sessions`;
- agenda inicial de revisao com `priority` e `next_review_at`;
- comandos `save_study_review`, `list_study_reviews`, `start_study_session` e `list_study_session_summaries`;
- UI salvando e recarregando marcacoes de revisao, prioridade, proxima revisao e historico do documento;
- adaptador inicial `OllamaModelAdapter` no backend Rust com cliente injetavel e testes de contrato;
- cliente HTTP local para `/api/generate` do Ollama;
- comando `test_ollama_connection` para validar conexao e modelo;
- ponte TypeScript `testOllamaConnection`;
- painel de configuracao na UI para URL/modelo Ollama e teste de conexao;
- persistencia SQLite das configuracoes do Ollama em `app_settings`;
- comandos `load_ollama_settings` e `save_ollama_settings`;
- comando `generate_study_cards` usando Ollama e configuracoes salvas;
- UI usando Ollama por padrao para gerar cards, com testes ainda injetando geradores previsiveis;
- feedback visual para importacao, chunking, geracao com Ollama, salvamento e carregamento de cards;
- fallback de desenvolvimento para gerar cards mockados quando o Ollama falhar;
- revisao com marcacao de acerto, erro, dificuldade, prioridade e proxima data;
- historico visual de revisoes por documento com prioridade media;
- fila visual de cards vencidos ordenada por prioridade;
- filtros da biblioteca por tipo de arquivo e status de revisao;
- busca textual na biblioteca por conteudo e caminho de origem;
- ordenacao da biblioteca por data, tipo e status;
- sessoes de estudo vinculando novas revisoes a uma rodada ativa;
- resumo historico de desempenho por sessao;
- exportacao local de relatorio Markdown das sessoes do documento;
- dialog nativo do Tauri para selecionar arquivos `.txt` e `.pdf`;
- exibicao do tipo e caminho de origem na biblioteca e na previa do documento;
- testes unitarios cobrindo dominio, chunking e geracao de flashcards mockada.

## Funcionalidades por fase

### Fase inicial

- Importacao de `.txt` e `.pdf`.
- Chunking por tamanho e marcadores simples.
- Geracao de flashcards.
- Persistencia local em SQLite.
- Interface desktop com biblioteca, estudo e configuracoes.
- Adaptador inicial para Ollama.
- Testes automatizados antes da implementacao.

### Fase de expansao

- Importacao de EPUB e melhorias para PDFs digitalizados.
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

1. Melhorar suporte a PDFs digitalizados com OCR opcional.
2. Criar limpeza/arquivamento de documentos da biblioteca.
3. Evoluir exportacao para PDF/Anki quando o formato de estudo estabilizar.

## Comandos de desenvolvimento

```bash
npm install
npm run test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
npm run test:e2e
npm run build
```

O comando `cargo test --no-default-features` valida o dominio sem compilar a camada grafica do Tauri. Para rodar o app desktop completo no Linux, o ambiente precisa das dependencias nativas exigidas pelo Tauri/WebKit, incluindo `pkg-config` e bibliotecas de sistema como DBus/WebKitGTK.
