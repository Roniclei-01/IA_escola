# Estrategia de Testes

## Regra central

Nenhuma funcionalidade de aplicacao deve ser implementada antes de existir pelo menos um teste que defina seu comportamento esperado.

Essa regra nao exige perfeicao de cobertura no primeiro commit, mas exige que todo comportamento relevante nasca testado. O objetivo e reduzir regressao, proteger a arquitetura modular e permitir monetizacao futura sem fragilizar o produto.

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

## Riscos que os testes devem reduzir

- IA retornando JSON invalido ou texto fora do formato.
- Chunking quebrando frases de forma prejudicial.
- Perda de dados em atualizacao de schema.
- UI chamando operacoes privilegiadas sem passar pela camada Tauri.
- Regressao em i18n.
- Fluxo principal funcionando em desenvolvimento, mas quebrando empacotado.
