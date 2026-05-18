# Modelagem UML do aplicativo de estudo com IA local

Este documento resume a modelagem do sistema com a stack recomendada: Tauri, React, TypeScript, Rust, SQLite e Ollama via adaptador.

## Objetivo

Fornecer um modelo minimo e extensivel para iniciar o MVP sem acoplar o dominio a uma tecnologia especifica de IA, UI ou banco. O modelo tambem registra a regra de desenvolvimento test-first: casos de uso e componentes devem ter testes antes da implementacao de aplicacao.

## Camadas modeladas

- **UI**: telas React e componentes de interacao.
- **Aplicacao**: casos de uso que orquestram dominio e infraestrutura.
- **Dominio**: entidades de estudo, documentos, cards, modelos e configuracoes.
- **Infraestrutura**: SQLite, parsers de arquivos, adaptadores de IA e comandos Tauri.
- **Testes**: suites unitarias, integracao, E2E e adaptadores mock.

## Arquivo UML

O arquivo PlantUML esta em `docs/uml/software-model.puml`.

## Elementos principais

Entidades de dominio:

- `Book`
- `Document`
- `DocumentChunk`
- `DocumentTranslation`
- `StudyCard`
- `Category`
- `DocumentStudyMetadata`
- `MeditationNote`
- `ModelProfile`
- `UserSettings`
- `StudySession`

Casos de uso:

- `ImportTextBook`
- `ChunkDocument`
- `GenerateFlashcards`
- `TranslateDocument`
- `SaveMeditationNote`
- `AssignStudyCategory`
- `StartStudySession`
- `UpdateUserSettings`

Portas e adaptadores:

- `ModelAdapter`
- `StorageRepository`
- `BookParser`
- `OllamaModelAdapter`
- `SQLiteStorage`
- `TextBookParser`
- `TauriCommandGateway`

Testes:

- `DomainUnitTests`
- `ChunkingTests`
- `FlashcardGenerationTests`
- `StorageIntegrationTests`
- `AppE2ETests`
- `MockModelAdapter`

## Orientacao para geracao de codigo

Antes de gerar codigo de aplicacao com base nesse modelo, devem ser criados os testes correspondentes. A primeira fatia de implementacao deve seguir esta ordem:

1. testes para validacao de `Book`, `DocumentChunk` e `StudyCard`;
2. testes para `ChunkDocument`;
3. testes para `GenerateFlashcards` usando `MockModelAdapter`;
4. testes de persistencia SQLite em banco temporario;
5. implementacao minima para passar nos testes;
6. teste E2E do fluxo de importacao e estudo;
7. integracao real com Ollama.
