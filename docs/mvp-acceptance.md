# Aceite do MVP 0.1

Use este arquivo para registrar a validacao final antes de marcar o MVP como pronto para uso real.

## 1. Validacao automatizada

Execute:

```bash
npm run check:mvp
```

Resultado esperado:

- [ ] Vitest passa.
- [ ] Testes Rust passam.
- [ ] Build web passa.
- [ ] Playwright E2E passa.

## 2. App empacotado

Verifique ambiente, dependencias locais e artefatos:

```bash
npm run check:mvp:env
```

Resultado esperado:

- [ ] Ollama instalado.
- [ ] Modelo `llama3.2:1b` instalado.
- [ ] `pdftoppm` instalado.
- [ ] `tesseract` instalado.
- [ ] `GStreamer appsink` disponivel.
- [ ] Pacotes `.deb`, `.rpm` e AppImage encontrados.

Gere os pacotes:

```bash
npm run tauri build
```

Artefatos esperados:

- [ ] `src-tauri/target/release/bundle/deb/Estudo IA Local_0.1.0_amd64.deb`
- [ ] `src-tauri/target/release/bundle/rpm/Estudo IA Local-0.1.0-1.x86_64.rpm`
- [ ] `src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage`

Smoke test recomendado com AppImage:

```bash
chmod +x "src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"
"src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"
```

Se o sistema retornar erro de FUSE ao montar o AppImage, use o modo sem FUSE:

```bash
APPIMAGE_EXTRACT_AND_RUN=1 "src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"
```

Resultado esperado:

- [ ] O app abre fora do `tauri dev`.
- [ ] A biblioteca carrega sem erro.
- [ ] A secao Ollama testa o modelo `llama3.2:1b`.
- [ ] A secao OCR mostra `pdftoppm` e `tesseract` quando instalados.

## 3. Fluxo com TXT

- [ ] Importar um `.txt` pequeno.
- [ ] Ver previa do conteudo.
- [ ] Ver quantidade de chunks.
- [ ] Gerar pelo menos 1 card.
- [ ] Revelar resposta.
- [ ] Marcar `Acertei`.
- [ ] Confirmar resumo com `Acertos: 1`.
- [ ] Fechar e abrir o app.
- [ ] Confirmar documento e cards persistidos.

## 4. Fluxo com PDF

- [ ] Importar PDF com texto extraivel.
- [ ] Confirmar origem `PDF`.
- [ ] Confirmar limite inicial de geracao em PDF grande.
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
