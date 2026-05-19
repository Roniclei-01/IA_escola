# Aceite do MVP 0.1

Use este arquivo para registrar a validacao final antes de marcar o MVP como pronto para uso real.

## 1. Validacao automatizada

Execute:

```bash
npm run check:mvp
```

Resultado esperado:

- [x] Vitest passa.
- [x] Testes Rust passam.
- [x] Build web passa.
- [x] Playwright E2E passa.

Validado em 2026-05-18 com `npm run check:mvp`.

Atualizado em 2026-05-19:

- `npm run check:mvp` passou em Vitest, testes Rust e build web.
- O Playwright E2E precisou ser repetido fora do sandbox porque o servidor local do Vite recebeu `EPERM` ao abrir `127.0.0.1:1421` no ambiente sandboxado.
- `npm run test:e2e` passou fora do sandbox com 2 testes Playwright.

Fechamento tecnico em 2026-05-19:

- `npm run check:mvp` passou fora do sandbox.
- Vitest passou com 135 testes.
- Testes Rust passaram com 143 testes.
- Build web passou.
- Playwright E2E passou com 2 testes.
- O teste de extracao de PDF grande foi estabilizado para nao depender do comando externo `seq` durante a suite paralela.

## 2. App empacotado

Verifique ambiente, dependencias locais e artefatos:

```bash
npm run check:mvp:env
```

Resultado esperado:

- [x] Ollama instalado.
- [x] Modelo `llama3.2:1b` instalado.
- [x] `pdftoppm` instalado.
- [x] `tesseract` instalado.
- [x] `GStreamer appsink` disponivel.
- [x] Pacotes `.deb`, `.rpm` e AppImage encontrados.

Validado em 2026-05-18 com `npm run check:mvp:env`.

Atualizado em 2026-05-19 com `npm run check:mvp:env` fora do sandbox:

- Ollama encontrado.
- Modelo `llama3.2:1b` instalado.
- `pdftoppm`, `tesseract` e `GStreamer appsink` encontrados.
- Pacotes `.deb`, `.rpm` e AppImage encontrados.

Gere os pacotes:

```bash
npm run tauri build
```

Artefatos esperados:

- [x] `src-tauri/target/release/bundle/deb/Estudo IA Local_0.1.0_amd64.deb`
- [x] `src-tauri/target/release/bundle/rpm/Estudo IA Local-0.1.0-1.x86_64.rpm`
- [x] `src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage`

Smoke test recomendado com AppImage:

```bash
npm run check:mvp:appimage
```

Esse comando tenta abrir o AppImage diretamente. Se o sistema retornar erro de FUSE ao montar o AppImage, ele tenta automaticamente o modo sem FUSE:

```bash
APPIMAGE_EXTRACT_AND_RUN=1 "src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"
```

Resultado esperado:

- [x] O app abre fora do `tauri dev`.
- [x] O smoke test finaliza com `[ok]`.
- [ ] A biblioteca carrega sem erro.
- [ ] A secao Ollama testa o modelo `llama3.2:1b`.
- [ ] A secao OCR mostra `pdftoppm` e `tesseract` quando instalados.

Validado em 2026-05-18 com `npm run check:mvp:appimage`. No ambiente atual, o AppImage direto falhou por FUSE e o smoke test abriu corretamente com `APPIMAGE_EXTRACT_AND_RUN=1`.

Atualizado em 2026-05-19:

- `npm run tauri build` passou fora do sandbox e gerou `.deb`, `.rpm` e AppImage.
- `npm run check:mvp:appimage` passou em modo sem FUSE com `APPIMAGE_EXTRACT_AND_RUN=1`.
- Durante o smoke test apareceu a mensagem `GStreamer element appsink not found`; por isso, a secao OCR ainda deve ser confirmada manualmente na interface.

Fechamento tecnico em 2026-05-19:

- `npm run check:mvp:env` passou fora do sandbox.
- Ollama e modelo `llama3.2:1b` foram encontrados.
- `pdftoppm`, `tesseract` e `GStreamer appsink` foram encontrados.
- `npm run tauri build` passou novamente e regenerou `.deb`, `.rpm` e AppImage.
- `npm run check:mvp:appimage` passou usando fallback sem FUSE.
- A validacao visual de OCR no aplicativo continua como item manual do aceite.

Para executar o aceite manual no AppImage:

```bash
npm run open:mvp:appimage
```

## 3. Fluxo com TXT

Crie arquivos de amostra para o aceite:

```bash
npm run create:mvp-samples
```

Arquivos gerados:

- `/tmp/estudo-ia-local-mvp-samples/mvp-small.txt`
- `/tmp/estudo-ia-local-mvp-samples/mvp-large.txt`
- `/tmp/estudo-ia-local-mvp-samples/mvp-pdf-text.pdf`

Atualizado em 2026-05-19 com `npm run create:mvp-samples`.

- [ ] Importar `/tmp/estudo-ia-local-mvp-samples/mvp-small.txt`.
- [ ] Ver previa do conteudo.
- [ ] Ver quantidade de chunks.
- [ ] Gerar pelo menos 1 card.
- [ ] Revelar resposta.
- [ ] Marcar `Acertei`.
- [ ] Confirmar resumo com `Acertos: 1`.
- [ ] Fechar e abrir o app.
- [ ] Confirmar documento e cards persistidos.

## 4. Fluxo com PDF

- [ ] Importar `/tmp/estudo-ia-local-mvp-samples/mvp-pdf-text.pdf`.
- [ ] Confirmar origem `PDF`.
- [ ] Confirmar que a importacao termina sem gerar cards automaticamente.
- [ ] Clicar em `Gerar cards` para iniciar a IA sob demanda.
- [ ] Importar `/tmp/estudo-ia-local-mvp-samples/mvp-large.txt` para validar geracao incremental com arquivo maior.
- [ ] Confirmar limite de geracao sob demanda em documento grande.
- [ ] Usar `Gerar mais cards`.
- [ ] Confirmar que novos cards sao adicionados sem remover os anteriores.

## 5. OCR

- [ ] Importar PDF digitalizado com OCR ativo em Portugues.
- [ ] Importar PDF digitalizado com OCR ativo em Ingles, se houver arquivo adequado.
- [ ] Confirmar mensagem de instalacao quando faltar dependencia OCR.

## 6. Falhas controladas

- [ ] Caminho inexistente mostra erro claro.
- [ ] Ollama parado mostra erro claro.
- [ ] Modelo inexistente mostra erro claro.
- [ ] Cancelamento de operacao longa nao perde dados ja salvos.

## 7. Exportacoes

- [ ] Exportar relatorio Markdown.
- [ ] Abrir previa PDF.
- [ ] Exportar PDF imprimivel.
- [ ] Exportar deck Anki TSV.
- [ ] Confirmar que os arquivos exportados pertencem ao documento ativo.

## 8. Biblioteca

- [ ] Digitar no campo `Buscar na biblioteca`.
- [ ] Pressionar Enter e confirmar filtragem.
- [ ] Clicar em `Pesquisar` e confirmar filtragem.
- [ ] Confirmar busca por conteudo.
- [ ] Confirmar busca por caminho de origem.

## 9. Idioma da interface

- [ ] Trocar o idioma da interface para `Ingles`.
- [ ] Confirmar que os rotulos principais mudam sem reiniciar o app.
- [ ] Fechar e abrir o app.
- [ ] Confirmar que o idioma escolhido continua aplicado.
- [ ] Trocar o idioma da interface de volta para `Portugues`.

## 10. Leitura traduzida

- [ ] Abrir um documento importado.
- [ ] Confirmar que `Idioma original` e `Idioma escolhido` aparecem lado a lado.
- [ ] Usar `Proxima pagina` e `Pagina anterior` para confirmar acesso ao arquivo completo.
- [ ] Selecionar um idioma diferente do original.
- [ ] Clicar em `Gerar leitura traduzida`.
- [ ] Confirmar que a traducao aparece no painel `Idioma escolhido`.
- [ ] Confirmar que documentos longos sao traduzidos em lotes sem travar a janela.
- [ ] Fechar e abrir o app ou selecionar o documento novamente.
- [ ] Confirmar que a traducao salva reaparece sem precisar gerar novamente.
- [ ] Confirmar que a importacao nao gera traducao automaticamente.

## 11. Funcionalidades futuras registradas

Esses itens estao documentados para as proximas fatias e nao bloqueiam o aceite do MVP 0.1:

- [ ] Campo `Meditacao` para resumo pessoal do leitor.
- [ ] Categorias e subcategorias de estudo por documento, com descricao da classificacao.
- [ ] Exportacao Anki em `.apkg`.

## Resultado final

Status:

- [ ] Aprovado.
- [ ] Aprovado com ressalvas.
- [ ] Reprovado.

Observacoes:

```text
Fechamento tecnico automatizado em 2026-05-19 concluido com sucesso.
Pendente confirmacao manual dos fluxos listados acima antes de marcar o MVP como aprovado para uso real.
```
