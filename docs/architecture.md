# Arquitetura do Projeto

## 1. Objetivo arquitetural

O projeto deve ser um aplicativo desktop local-first, seguro e extensivel, capaz de processar materiais de estudo com IA local. A arquitetura deve preservar a possibilidade de evoluir para mobile/PWA, sincronizacao opcional, licenciamento comercial e novos provedores de IA sem alterar o dominio central.

## 2. Stack recomendada

| Camada | Tecnologia | Decisao |
|---|---|---|
| Aplicacao desktop | Tauri 2 | Base leve, segura e multiplataforma |
| Interface | React + TypeScript + Vite | Produtividade, manutencao e ecossistema maduro |
| Estilo/UI | Tailwind CSS + shadcn/ui | Consistencia visual e velocidade de desenvolvimento |
| Backend local | Rust via Tauri commands | Acesso seguro a filesystem, banco e processos |
| Banco local | SQLite | Persistencia simples, offline e distribuivel |
| Query layer inicial | rusqlite no Rust | Camada sincrona, simples e suficiente para comandos Tauri locais |
| IA local | Ollama | Primeiro runtime local, acessado via adaptador |
| i18n | i18next | Suporte a Portugues, Ingles e Espanhol |
| Testes frontend | Vitest + Testing Library | Testes unitarios de UI e logica |
| Testes E2E | Playwright | Validacao de fluxos reais do usuario |
| Testes backend | Cargo test | Regras de dominio, comandos Tauri e infraestrutura |

## 3. Camadas do sistema

### Apresentacao

Responsavel por telas, navegacao, estado visual, selecao de idioma e interacao do usuario. A UI nao deve acessar banco, arquivos locais ou comandos de sistema diretamente. Todas as operacoes sensiveis passam por uma API interna exposta pelo Tauri ou por plugins oficiais com permissoes explicitas.

Telas iniciais:

- `Library`: importacao e gerenciamento de materiais.
- `Study`: estudo de flashcards.
- `Settings`: idioma, modelo IA e preferencias.

Telas futuras:

- `Tutor`: conversa baseada no material.
- `Review`: revisao espacada e calendario.
- `Metrics`: desempenho e retencao.
- `Reader`: leitura do documento original e da versao no idioma escolhido em janelas ou paineis paralelos.
- `Meditation`: registro do resumo pessoal do leitor sobre o que entendeu do documento.
- `Categories`: manutencao de categorias e subcategorias de estudo.

### Aplicacao

Orquestra os casos de uso. Esta camada coordena dominio, infraestrutura e adaptadores de IA.

Casos de uso iniciais:

- `ImportTextBook`.
- `ChunkDocument`.
- `GenerateFlashcards`.
- `StartStudySession`.
- `UpdateUserSettings`.

### Dominio

Contem entidades e regras independentes de UI, banco e provedor de IA.

Entidades iniciais:

- `Book`.
- `Document`.
- `DocumentChunk`.
- `StudyCard`.
- `ModelProfile`.
- `UserSettings`.
- `StudySession`.

Entidades previstas para expansao:

- `StudyCategory`, com suporte a hierarquia por `parentId` para representar categorias e subcategorias.
- `DocumentStudyMetadata`, com descricao do documento dentro da categoria/subcategoria escolhida.
- `DocumentTranslation`, contendo idioma de destino, texto traduzido e vinculo com o documento original.
- `MeditationNote`, contendo resumo pessoal do leitor, data de criacao e documento relacionado.

Regras iniciais:

- validar livro importado;
- segmentar texto em chunks;
- validar formato de flashcards;
- registrar progresso de estudo;
- escolher modelo padrao por categoria.

### Infraestrutura

Implementa detalhes externos ao dominio.

Componentes:

- `SQLiteStorage`.
- `TextBookParser` para `.txt` e `.pdf`, com OCR opt-in para PDFs digitalizados via `pdftoppm` e `tesseract`, idioma OCR configuravel por importacao e verificacao visual dessas dependencias na UI.
- `EpubBookParser` em fase posterior.
- `OllamaModelAdapter`.
- `TranslationAdapter` em fase posterior, preferencialmente local-first, para gerar uma versao traduzida do PDF no idioma escolhido.
- `ReaderWindowService` em fase posterior, para abrir ou organizar duas janelas/paineis: texto original e texto traduzido.
- `VectorIndex` em fase posterior.
- `LicenseService` em fase comercial.

## 4. Fronteira de seguranca

O app deve manter separacao rigorosa entre frontend e operacoes privilegiadas.

Regras:

- arquivos locais so podem ser acessados por comandos Tauri autorizados ou pelo dialog nativo com permissao explicita;
- paths devem ser validados antes de leitura;
- conteudo de livros nao deve ser enviado para nuvem sem consentimento explicito;
- logs nao devem armazenar trechos de livros por padrao;
- chaves, licencas e tokens devem ficar em storage seguro do sistema quando possivel;
- qualquer recurso online deve ser opt-in.

## 5. Estrutura modular para IAs

O dominio nao deve depender de Ollama. Toda IA deve implementar uma interface comum.

Interface conceitual:

```ts
interface ModelAdapter {
  generateText(prompt: string, options: GenerationOptions): Promise<string>;
  createFlashcards(chunks: DocumentChunk[], config: FlashcardConfig): Promise<StudyCard[]>;
  translate?(text: string, targetLanguage: Language): Promise<string>;
  summarize?(text: string): Promise<string>;
}
```

Adaptadores previstos:

- `OllamaModelAdapter` no MVP, iniciado no backend Rust com cliente injetavel, cliente HTTP local, comando de teste de conexao, painel de configuracao na UI, comando de geracao de cards, feedback visual durante operacoes longas e fallback mockado apenas em desenvolvimento.
- `LlamaCppModelAdapter` em fase futura.
- `OpenAIModelAdapter` opcional para recursos pagos ou nuvem.
- `MockModelAdapter` para testes.

## 6. Persistencia local

SQLite sera o banco inicial. A primeira implementacao usa `rusqlite`, por ser simples, local e suficiente para comandos Tauri sincronizados. Se a persistencia crescer para fluxos concorrentes ou sincronizacao remota, a camada `storage` permite migrar para SQLx sem alterar o dominio.

Ele deve armazenar metadados, chunks, cards, configuracoes e sessoes de estudo.

Tabelas ja iniciadas:

- `documents`.
- `document_chunks`.
- `document_translations`.
- `study_cards`.
- `study_reviews`.
- `study_sessions`.
- `app_settings`.

`documents` guarda tambem `source_type`, `source_path` e `archived_at`, permitindo diferenciar TXT/PDF, mostrar origem na UI, retirar documentos da biblioteca ativa sem apagar dados imediatamente, restaurar itens arquivados e excluir definitivamente documentos arquivados com limpeza dos dados de estudo relacionados.
`document_translations` guarda a leitura traduzida por documento e idioma de destino, permitindo reutilizacao offline sem chamar o Ollama novamente ao reabrir o material.
`study_reviews` guarda `rating`, `priority`, `next_review_at` e `session_id`, formando a base para revisao espacada, filas de estudo por prioridade, metricas de retencao, cards mais dificeis, filtros de periodo, tendencia por sessao, evolucao semanal de dificuldade e agrupamento de rodadas.
`study_sessions` registra o documento estudado e o inicio da rodada.
`app_settings` guarda configuracoes locais e metas de revisao por documento, incluindo recorrencia geral, diaria ou semanal.
A UI usa esses dados para exibir historico visual por documento, uma fila de cards vencidos, filtros, busca textual, ordenacao da biblioteca, comparativo de progresso entre documentos, resumo filtravel de metricas por periodo, metas persistidas e recorrentes de revisao por documento com alerta visual de pendencia, preferencia de lembretes, horario configuravel e notificacao nativa agendada do Tauri quando aplicavel, resumo de desempenho por sessao, tendencia temporal de retencao, evolucao de cards dificeis por periodo, exportacao local de relatorio Markdown, previa e relatorio imprimivel em PDF com paginacao, grafico de desempenho e tendencia por sessao, e exportacao de cards para Anki em TSV com diretivas de importacao, GUID estavel e tags de origem.

Tabelas futuras:

- `books`.
- `model_profiles`.
- `study_categories`.
- `document_study_metadata`.
- `meditation_notes`.
- `exercises`.
- `review_events`.
- `semantic_index`.
- `licenses`.
- `sync_state`.

## 7. Test-first como regra arquitetural

Antes de criar codigo de aplicacao, devem existir testes que definem o comportamento esperado. Isso vale para dominio, infraestrutura, UI e fluxos E2E.

Cobertura minima antes do MVP:

- testes unitarios para entidades e validacoes;
- testes para chunking de texto;
- testes com `MockModelAdapter` para geracao de flashcards;
- testes de persistencia SQLite em banco temporario;
- teste E2E do fluxo importar texto e estudar card.

Detalhes estao em `docs/testing-strategy.md`.

## 8. Roadmap tecnico

### Etapa 1: Fundacao

- Inicializar Git.
- Criar scaffold Tauri + React + TypeScript.
- Configurar lint, formatacao e testes.
- Criar estrutura de camadas.
- Escrever testes do dominio antes das entidades.

### Etapa 2: MVP 0.1

- Importar `.txt` e `.pdf`.
- Criar chunks.
- Gerar flashcards com `MockModelAdapter` nos testes.
- Integrar Ollama.
- Persistir dados em SQLite.
- Criar UI minima de biblioteca e estudo.

### Etapa 3: Conteudo rico

- Melhorar suporte a PDFs com metadados, paginacao e PDFs digitalizados.
- Adicionar EPUB.
- Melhorar leitura traduzida com paginacao, controle de progresso e reprocessamento por idioma.
- Adicionar campo `Meditacao` para o resumo pessoal do leitor.
- Adicionar categorias e subcategorias de estudo para organizar documentos.
- Criar resumos e exercicios.
- Melhorar prompts e validacao de saida da IA.

### Etapa 4: Retencao e monetizacao

- Revisao espacada.
- Exportacao PDF e formatos avancados de Anki.
- Licenciamento local.
- Sincronizacao opcional.
- Pacotes pagos de estudo.

## 9. Estrutura de pastas sugerida

```text
src/
  ui/
    components/
    pages/
    i18n/
  app/
    use-cases/
    ports/
  domain/
    entities/
    services/
    value-objects/
  infrastructure/
    model-adapters/
    storage/
    parsers/
src-tauri/
  src/
    commands/
    storage/
    security/
  tests/
tests/
  unit/
  integration/
  e2e/
docs/
  architecture.md
  testing-strategy.md
  software-modeling-uml.md
  uml/
```
