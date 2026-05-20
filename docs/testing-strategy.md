# Estrategia de Testes

## Regra central

Nenhuma funcionalidade de aplicacao deve ser implementada antes de existir pelo menos um teste que defina seu comportamento esperado.

Essa regra nao exige perfeicao de cobertura no primeiro commit, mas exige que todo comportamento relevante nasca testado. O objetivo e reduzir regressao, proteger a arquitetura modular e permitir monetizacao futura sem fragilizar o produto.

Essa prioridade vale para todas as fases de producao: MVP, pos-MVP, refatoracoes, correcoes de bug e novas integracoes. Quando uma evolucao tocar comportamento ainda nao coberto, o primeiro passo e criar ou ajustar o teste que descreve o resultado esperado.

## Piramide de testes

### Testes unitarios

Responsaveis por validar regras pequenas e deterministicas.

Ferramentas:

- `cargo test` para dominio e backend Rust;
- `Vitest` para logica TypeScript e componentes isolados;
- `Testing Library` para componentes React.

Devem cobrir:

- validacao de entidades;
- criacao de chunks;
- normalizacao de texto;
- validacao de cards gerados;
- selecao de idioma;
- selecao de modelo por categoria.

### Testes de integracao

Responsaveis por validar comunicacao entre modulos.

Ferramentas:

- `cargo test` com SQLite temporario;
- `Vitest` com adaptadores mockados.

Devem cobrir:

- salvar e carregar livros;
- salvar chunks e cards;
- executar `GenerateFlashcards` com `MockModelAdapter`;
- tratar falha de IA;
- exibir progresso de fila por chunk em painel de segundo plano durante geracao de cards com IA;
- gerar pacote Anki `.apkg` com `collection.anki2`, arquivo `media` e quantidade correta de cards;
- acionar exportacao Anki `.apkg` e TSV pela interface sem misturar os formatos;
- adicionar, editar, excluir, carregar e exibir multiplas entradas de `Anotacao` por documento em modal acionado por `+`;
- recolher e expandir a caixa de idioma original por seta no leitor;
- tratar arquivo invalido;
- preservar dados apos migracao simples.

### Testes E2E

Responsaveis por validar fluxos reais do usuario.

Ferramenta:

- `Playwright`.

Fluxos minimos do MVP:

- abrir app;
- selecionar idioma;
- selecionar arquivo pelo dialog nativo;
- importar arquivo `.txt` ou `.pdf`;
- ver livro na biblioteca;
- gerar flashcards;
- estudar primeiro card;
- marcar card como erro, dificil ou acerto;
- validar prioridade e proxima revisao calculadas a partir da marcacao;
- fechar e abrir app mantendo dados salvos.

## Adaptadores de teste

O projeto deve ter um `MockModelAdapter` desde o inicio. Ele retorna respostas previsiveis e permite testar geracao de flashcards sem depender de Ollama, modelo instalado, GPU, rede ou variacao de resposta da IA.

Comportamentos esperados do mock:

- retornar cards validos para texto valido;
- retornar lista vazia para texto vazio;
- simular erro de modelo indisponivel;
- simular resposta malformada para testar validacao.

## Ordem obrigatoria para cada funcionalidade

1. Escrever requisito curto.
2. Criar teste unitario, de integracao ou E2E.
3. Rodar o teste e confirmar falha esperada.
4. Implementar codigo minimo.
5. Rodar testes.
6. Refatorar.
7. Atualizar documentacao se o comportamento mudou.

## Criterios de pronto do MVP

O MVP 0.1 so deve ser considerado pronto quando:

- todos os testes unitarios passarem;
- testes de integracao com SQLite passarem;
- fluxo E2E principal passar;
- app funcionar sem internet;
- falha do Ollama for tratada com mensagem clara;
- dados do usuario permanecerem locais;
- documentacao refletir o comportamento implementado.

## Checklist manual de aceite do MVP 0.1

Execute este roteiro no app desktop com `npm run tauri dev` e registre o resultado em `docs/mvp-acceptance.md` antes de declarar o MVP estavel para uso real.

### Preparacao

- Confirmar que o Ollama esta ativo.
- Confirmar que `ollama list` mostra `llama3.2:1b`.
- Abrir o app e testar a conexao na secao Ollama com URL `http://127.0.0.1:11434` e modelo `llama3.2:1b`.
- Rodar `npm run check:mvp`.
- Rodar `npm run check:mvp:env`.
- Gerar e testar o app empacotado com `npm run tauri build`.

### Idioma da interface

1. Trocar o idioma da interface para `Ingles`.
2. Confirmar que os rotulos principais da aplicacao mudam sem reiniciar o app.
3. Fechar e abrir o app.
4. Confirmar que o idioma escolhido continua aplicado.
5. Trocar o idioma da interface de volta para `Portugues`.

### Fluxo principal com TXT

1. Importar um arquivo `.txt` pequeno.
2. Confirmar que a previa do documento aparece.
3. Confirmar que a quantidade de chunks aparece.
4. Confirmar que pelo menos 1 card e gerado.
5. Revelar a resposta do primeiro card.
6. Marcar o card como `Acertei`.
7. Confirmar que o resumo muda para `Acertos: 1`.
8. Fechar e abrir o app.
9. Confirmar que o documento e os cards continuam na biblioteca.

### Fluxo principal com PDF

1. Importar um PDF com texto extraivel.
2. Confirmar que a origem aparece como `PDF`.
3. Confirmar que o PDF fica disponivel na previa sem gerar cards automaticamente.
4. Usar `Gerar cards` quando o usuario quiser iniciar a IA.
5. Confirmar que o app limita a geracao sob demanda aos primeiros chunks em documentos grandes.
6. Usar `Gerar mais cards`.
7. Confirmar que novos cards sao adicionados sem remover os anteriores.

### OCR

1. Verificar se a tela mostra `pdftoppm disponivel` e `tesseract disponivel`.
2. Importar um PDF digitalizado com `Ativar OCR para PDF digitalizado`.
3. Testar pelo menos os idiomas `Portugues` e `Ingles` quando houver arquivos adequados.
4. Confirmar que erro de OCR ausente mostra instrucao de instalacao.

### Falhas esperadas

1. Testar importacao com caminho inexistente.
2. Testar com Ollama parado.
3. Testar com modelo inexistente.
4. Testar cancelar uma operacao longa.
5. Confirmar que a UI mostra mensagem clara e nao perde documentos ja salvos.

### Exportacoes

1. Exportar relatorio Markdown.
2. Abrir previa PDF do relatorio.
3. Exportar deck Anki TSV.
4. Confirmar que os arquivos gerados nao contem dados de outro documento.

### Biblioteca

1. Confirmar que a biblioteca abre com a lista de categorias academicas, sem despejar todos os livros na tela inicial.
2. Selecionar categoria e subcategoria e confirmar que apenas livros do contexto aparecem.
3. Confirmar que o caminho curto mostra biblioteca, categoria, subcategoria e documento ativo.
4. Abrir `Importar livro`, escolher categoria/subcategoria e confirmar que o documento importado fica no contexto escolhido.
5. Confirmar que o estudo ativo abre em pagina secundaria apos importar ou selecionar um livro, sem ficar na tela inicial.
6. Clicar em `Voltar para biblioteca` e confirmar retorno para categorias/importacao.
7. Abrir `Meus Livros` e confirmar que a lista sobreposta respeita categoria, subcategoria e filtros ativos.
8. Digitar no campo `Buscar na biblioteca`.
9. Pressionar Enter e confirmar que os documentos sao filtrados.
10. Clicar no botao `Pesquisar` e confirmar o mesmo comportamento.
11. Confirmar que a busca considera conteudo e caminho de origem.

### Leitura traduzida

1. Abrir um documento importado.
2. Confirmar que a tela mostra `Idioma original` e `Idioma escolhido` lado a lado.
3. Usar `Proxima pagina` e `Pagina anterior` para confirmar que o arquivo completo fica acessivel no leitor.
4. Subir LibreTranslate local em `http://127.0.0.1:5000` para validar a rota dedicada.
5. Selecionar um idioma diferente do idioma original do documento.
6. Clicar em `Gerar leitura traduzida`.
7. Confirmar que a traducao aparece no painel `Idioma escolhido`.
8. Confirmar que documentos longos sao traduzidos em lotes sem travar a janela.
9. Fechar e abrir o app ou selecionar o documento novamente.
10. Confirmar que a traducao salva reaparece sem chamar a geracao novamente.
11. Parar o LibreTranslate e confirmar que a traducao tenta o fallback Ollama com erro controlado quando o modelo tambem falhar.
12. Confirmar que a importacao do documento nao gera traducao automaticamente.
13. Avancar paginas no leitor, fechar e reabrir o documento, e confirmar que o marcador retoma a pagina onde parou.

### Funcionalidades futuras documentadas

Esses itens nao bloqueiam o MVP 0.1, mas devem seguir a regra test-first quando forem implementados:

1. Busca semantica futura sem substituir a busca textual atual.
2. Importacao EPUB sem DRM com testes de capitulos, texto extraido, imagens quando houver leitor visual e persistencia local.
3. Importacao AZW3 sem DRM apenas se houver conversao local confiavel para EPUB, com teste explicito para ausencia de ferramenta externa.
4. KPF como suporte experimental futuro, sem compromisso de leitura nativa na primeira versao pos-MVP.

### Criterio de aprovacao manual

O MVP 0.1 passa no aceite manual quando todos os fluxos acima sao executados sem travamento, perda de dados ou mensagem generica sem acao clara.

## Riscos que os testes devem reduzir

- IA retornando JSON invalido ou texto fora do formato.
- Chunking quebrando frases de forma prejudicial.
- Perda de dados em atualizacao de schema.
- UI chamando operacoes privilegiadas sem passar pela camada Tauri.
- Regressao em i18n.
- Fluxo principal funcionando em desenvolvimento, mas quebrando empacotado.
