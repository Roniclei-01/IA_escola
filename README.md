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

O usuario deve conseguir estudar a partir de livros e materiais proprios, mantendo controle local sobre seus arquivos e dados. A aplicacao deve extrair texto, segmentar conteudo, gerar flashcards e exercicios, permitir revisao e, em fases posteriores, oferecer leitura traduzida em paralelo ao texto original, meditacoes do leitor, categorizacao do material, traducao, tutor conversacional e exportacoes.

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

EPUB, tutor, traducao completa persistida, exportacao avancada e calendario entram depois que esse fluxo estiver estavel.

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
- timeout no teste do Ollama para evitar espera indefinida quando o modelo local demora a carregar;
- painel de configuracao na UI para URL/modelo Ollama e teste de conexao;
- persistencia SQLite das configuracoes do Ollama em `app_settings`;
- comandos `load_ollama_settings` e `save_ollama_settings`;
- comando `generate_study_cards` usando Ollama e configuracoes salvas;
- UI usando Ollama por padrao com `llama3.2:1b` para reduzir gargalo local, com testes ainda injetando geradores previsiveis;
- timeout na geracao de cards com Ollama para evitar espera indefinida em modelos lentos;
- importacao separada da geracao de cards, permitindo subir TXT/PDF, revisar a previa e iniciar a IA apenas quando o usuario desejar;
- geracao sob demanda limitada aos primeiros chunks, com acao incremental para gerar mais cards sem sobrecarregar o modelo local;
- progresso de geracao por fila de chunks em painel de segundo plano, com contadores de concluidos, falhas e pendentes durante o processamento do Ollama;
- feedback visual para importacao, chunking, geracao com Ollama, salvamento e carregamento de cards;
- fallback de desenvolvimento para gerar cards mockados quando o Ollama falhar;
- revisao com marcacao de acerto, erro, dificuldade, prioridade e proxima data;
- historico visual de revisoes por documento com prioridade media;
- fila visual de cards vencidos ordenada por prioridade;
- metricas de retencao por documento com percentual de acertos e cards mais dificeis;
- tendencia temporal de retencao comparando sessoes concluidas;
- evolucao semanal de cards dificeis por periodo de estudo;
- filtro de periodo para metricas de estudo com resumo de sessoes, revisoes, acertos e dificuldades;
- meta persistida de revisoes por documento com progresso percentual;
- alerta visual para metas diarias ou semanais ainda nao cumpridas;
- notificacao local para metas recorrentes salvas com revisoes pendentes;
- preferencia persistida para ativar ou desativar lembretes de meta;
- agendamento nativo de lembretes diarios ou semanais com horario configuravel;
- cancelamento explicito do lembrete agendado ao desativar notificacoes de meta;
- filtros da biblioteca por tipo de arquivo e status de revisao;
- busca textual na biblioteca por conteudo e caminho de origem;
- ordenacao da biblioteca por data, tipo e status;
- sessoes de estudo vinculando novas revisoes a uma rodada ativa;
- resumo historico de desempenho por sessao;
- comparativo de progresso por documento com sessoes, revisoes e percentual de acertos;
- exportacao local de relatorio Markdown das sessoes do documento;
- previa e exportacao imprimivel em PDF do relatorio de estudo com paginacao, layout de impressao, grafico de desempenho e tendencia por sessao;
- exportacao local de cards para Anki em TSV com diretivas de importacao, GUID estavel e tags de origem;
- arquivamento de documentos da biblioteca ativa sem exclusao fisica imediata;
- listagem de documentos arquivados com restauracao para a biblioteca ativa;
- exclusao definitiva de documentos arquivados com confirmacao e limpeza dos dados de estudo relacionados;
- OCR opt-in para PDFs digitalizados usando `pdftoppm` e `tesseract` quando disponiveis no sistema;
- selecao de idioma OCR por importacao, com suporte inicial a portugues, ingles e espanhol;
- verificacao visual das dependencias OCR com instrucao de instalacao quando faltar componente local;
- dialog nativo do Tauri para selecionar arquivos `.txt` e `.pdf`;
- busca na biblioteca com filtro instantaneo, tecla Enter e botao `Pesquisar` como gatilhos explicitos;
- exibicao do tipo e caminho de origem na biblioteca e na previa do documento;
- seletor de idioma da interface entre Portugues, Ingles e Espanhol, com persistencia local;
- leitura paginada lado a lado do documento original e da versao em idioma escolhido;
- traducao sob demanda do conteudo ativo via Ollama em lotes menores, sem gerar automaticamente durante a importacao;
- persistencia das traducoes geradas por documento para reutilizacao offline ao reabrir o material;
- tela principal organizada em areas de `Importacao e IA`, `Biblioteca` e `Estudo ativo`;
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

## Fluxo de uso recomendado

1. Instale um modelo leve no Ollama, como `llama3.2:1b`.
2. Abra o app desktop e clique em `Testar` na secao Ollama.
3. Importe um arquivo `.txt` ou `.pdf`.
4. Aguarde a importacao e a divisao em chunks.
5. Revise a previa do conteudo importado.
6. Clique em `Gerar cards` quando quiser iniciar a IA.
7. Se o documento tiver muitos chunks, a acao de geracao processa apenas o lote inicial para evitar travamentos.
8. Use `Gerar mais cards` para processar os proximos chunks sob demanda.
9. No painel `Leitura do documento`, use `Proxima pagina` e `Pagina anterior` para ler o arquivo completo, escolha o idioma de leitura e clique em `Gerar leitura traduzida` quando desejar traduzir. Ao reabrir o documento, a traducao salva e reaproveitada.
10. Revise os cards gerados e acompanhe historico, fila de revisao e metas.

Durante operacoes longas, botoes de geracao e acoes da biblioteca ficam bloqueados para evitar cliques duplicados ou troca de documento no meio do processamento.

### Fase de expansao

- Importacao de EPUB sem DRM como primeiro formato rico pos-MVP, com extracao de texto, capitulos e suporte posterior a imagens no leitor.
- Avaliacao de AZW3 sem DRM em fase posterior, preferencialmente por conversao local para EPUB quando houver ferramenta compativel instalada, como Calibre.
- KPF deve permanecer fora do escopo imediato; se entrar no produto, sera tratado como importacao experimental ou fluxo de conversao para formato aberto.
- Melhorias para PDFs digitalizados.
- Campo `Meditacao` por documento, onde o leitor registra um breve resumo pessoal sobre o que entendeu.
- Cadastro de categorias de estudo e subcategorias, com descricao do documento dentro dessa classificacao.
- Exercicios de multipla escolha e perguntas abertas.
- Resumo por capitulo.
- Revisao espacada.
- Busca semantica com embeddings locais.
- Exportacao para PDF e formatos avancados de Anki.

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

1. Evoluir exportacao Anki para pacote `.apkg`.
2. Implementar `Meditacao` do leitor por documento.
3. Implementar categorias e subcategorias de estudo por documento.
4. Planejar importacao EPUB sem DRM para a versao futura, mantendo AZW3/KPF como conversao ou suporte experimental posterior.

## Comandos de desenvolvimento

```bash
npm install
npm run test
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
npm run test:e2e
npm run check:mvp
npm run check:mvp:env
npm run check:mvp:appimage
npm run create:mvp-samples
npm run open:mvp:appimage
npm run build
```

O comando `cargo test --no-default-features` valida o dominio sem compilar a camada grafica do Tauri. Para rodar o app desktop completo no Linux, o ambiente precisa das dependencias nativas exigidas pelo Tauri/WebKit, incluindo `pkg-config` e bibliotecas de sistema como DBus/WebKitGTK.

O comando `npm run check:mvp:env` tenta validar o modelo com `ollama list`. Se o CLI do Ollama falhar por restricao local, como pode acontecer em instalacoes via snap, ele usa a API HTTP local `http://127.0.0.1:11434/api/tags`, que e o caminho usado pelo aplicativo.
