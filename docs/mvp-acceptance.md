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
- [ ] Importar `/tmp/estudo-ia-local-mvp-samples/mvp-large.txt` para validar geracao incremental com arquivo maior.
- [ ] Confirmar limite inicial de geracao em documento grande.
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

## Resultado final

Status:

- [ ] Aprovado.
- [ ] Aprovado com ressalvas.
- [ ] Reprovado.

Observacoes:

```text

```
