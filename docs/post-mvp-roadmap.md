# Roadmap Pos-MVP

Este documento organiza as proximas funcionalidades depois do MVP 0.1 aprovado.
Toda fatia deve continuar seguindo a regra test-first: escrever ou ajustar testes
antes de implementar comportamento de aplicacao.

## Situacao atual

O MVP 0.1 esta fechado com:

- importacao TXT/PDF;
- OCR opt-in para PDF digitalizado;
- biblioteca por categorias e subcategorias;
- estudo em pagina secundaria;
- geracao incremental de cards;
- leitura paginada com marcador;
- traducao sob demanda com LibreTranslate local e fallback Ollama;
- anotacoes por documento;
- exportacao Markdown, PDF imprimivel e Anki `.apkg`;
- aceite registrado em `docs/mvp-acceptance.md`.

## Ordem recomendada

### Fatia 1: Manutencao de categorias e subcategorias

Objetivo: transformar as categorias fixas atuais em uma area de manutencao pelo
usuario.

Escopo inicial:

- tela propria para listar categorias e subcategorias;
- criar, editar, arquivar/restaurar e excluir categorias sem livros vinculados;
- impedir exclusao destrutiva quando houver documento usando a categoria;
- definir categoria e subcategoria padrao para novas importacoes;
- manter a navegacao atual da biblioteca funcionando com as categorias salvas.

Testes antes da implementacao:

- dominio: validar nome, hierarquia e regra contra exclusao com documentos;
- storage: salvar, listar, atualizar e arquivar categorias;
- UI: abrir manutencao, criar categoria, editar subcategoria e filtrar biblioteca;
- E2E: importar livro usando categoria criada pelo usuario.

Aceite:

- o usuario cria uma categoria e uma subcategoria;
- importa um livro nessa subcategoria;
- a biblioteca mostra apenas os livros do contexto escolhido;
- reiniciar o app preserva categorias e vinculos.

### Fatia 2: Melhorias de leitura traduzida

Objetivo: dar mais controle e previsibilidade ao processo de traducao.

Escopo inicial:

- painel de status do provedor ativo: LibreTranslate ou fallback Ollama;
- progresso por lote/pagina durante traducao;
- opcao de reprocessar traducao de uma pagina ou idioma;
- indicacao visual de paginas traduzidas, pendentes e com erro;
- preservacao da traducao ja salva quando um lote posterior falhar.

Testes antes da implementacao:

- aplicacao: tradutor processa lotes e preserva resultado parcial;
- backend: erro do provedor retorna mensagem acionavel;
- UI: progresso, cancelamento e reprocessamento por idioma;
- E2E: traduzir pagina, navegar, reabrir e reutilizar traducao salva.

Aceite:

- o usuario entende qual provedor esta sendo usado;
- uma falha nao trava a janela nem apaga traducoes existentes;
- pagina traduzida pode ser reprocessada sob demanda.

### Fatia 3: EPUB sem DRM

Objetivo: adicionar o primeiro formato rico pos-MVP sem lidar com DRM.

Escopo inicial:

- importar EPUB sem DRM;
- extrair metadados basicos, capitulos e texto;
- preservar ordem de leitura por capitulo;
- reutilizar chunking, cards, anotacoes, traducao e biblioteca existentes;
- documentar claramente que arquivos com DRM nao sao suportados.

Testes antes da implementacao:

- parser: EPUB valido, EPUB vazio, EPUB corrompido e EPUB com capitulos;
- storage: persistir origem `epub` e capitulos extraidos;
- UI: importar EPUB, listar na biblioteca e abrir no leitor;
- E2E: importar EPUB sem DRM e gerar card.

Aceite:

- EPUB sem DRM abre no leitor com ordem de capitulos correta;
- o usuario consegue gerar cards e anotacoes como em TXT/PDF;
- EPUB com erro mostra mensagem clara.

### Fatia 4: Anotacoes avancadas

Objetivo: tornar `Anotacao` util para revisao e exportacao.

Escopo inicial:

- busca nas anotacoes do documento;
- filtros por data;
- exportacao Markdown das anotacoes;
- vinculo opcional da anotacao com pagina atual do leitor;
- atalho visual para voltar da anotacao para a pagina vinculada.

Testes antes da implementacao:

- storage: buscar anotacoes por texto e intervalo;
- UI: criar anotacao vinculada a pagina e navegar de volta;
- exportacao: arquivo Markdown com documento, pagina e data.

Aceite:

- o usuario encontra uma anotacao pelo texto;
- exporta anotacoes do documento ativo;
- anotacao vinculada abre a pagina correspondente.

### Fatia 5: Resumos e exercicios

Objetivo: expandir estudo alem de flashcards.

Escopo inicial:

- resumo por pagina, capitulo ou chunk selecionado;
- exercicios de multipla escolha;
- perguntas abertas com resposta esperada;
- revisao dos exercicios mantendo historico por documento.

Testes antes da implementacao:

- contratos de IA para saida estruturada de resumo e exercicios;
- validacao contra JSON invalido ou incompleto;
- UI para gerar, salvar e revisar exercicios;
- persistencia de exercicios e respostas.

Aceite:

- o usuario gera resumo de uma parte do documento;
- gera exercicios e consegue responder;
- historico fica salvo por documento.

### Fatia 6: AZW3 e KPF

Objetivo: avaliar formatos proprietarios sem comprometer a estabilidade do app.

Escopo para AZW3:

- suportar apenas arquivos sem DRM;
- depender de conversao local para EPUB quando ferramenta compativel existir;
- detectar ausencia da ferramenta e orientar o usuario.

Escopo para KPF:

- manter como experimental;
- preferir conversao para formato aberto;
- nao bloquear evolucao de EPUB, PDF e TXT.

Testes antes da implementacao:

- ausencia da ferramenta externa;
- conversao bem-sucedida para EPUB;
- erro de conversao com mensagem clara;
- garantia de que nenhum fluxo tenta remover DRM.

Aceite:

- AZW3 sem DRM so entra se a conversao local for confiavel;
- KPF permanece desativado ou experimental ate haver decisao tecnica segura.

### Fatia 7: Produto comercial

Objetivo: preparar distribuicao e monetizacao sem quebrar o modelo local-first.

Escopo inicial:

- instaladores assinados;
- licenca local;
- ativacao online opcional;
- backups e sincronizacao opt-in;
- pacotes pagos de estudo;
- telemetria opt-in sem capturar conteudo de livros.

Testes antes da implementacao:

- licenca valida, expirada e ausente;
- app funcionando offline com licenca local;
- sincronizacao sem sobrescrever dados locais;
- garantia de que logs e telemetria nao incluem conteudo dos documentos.

Aceite:

- usuario pode continuar usando dados locais sem conta obrigatoria;
- recurso pago falha de forma controlada quando nao licenciado;
- conteudo dos livros permanece privado por padrao.

## Prioridade imediata

A proxima fatia recomendada e `Fatia 1: Manutencao de categorias e subcategorias`.
Ela reaproveita comportamento ja existente, reduz friccao da biblioteca e prepara
a base para modelos padrao por area de estudo sem introduzir parsers novos.
