#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:-/tmp/estudo-ia-local-mvp-samples}"

mkdir -p "$output_dir"

small_txt="$output_dir/mvp-small.txt"
large_txt="$output_dir/mvp-large.txt"
pdf_file="$output_dir/mvp-pdf-text.pdf"

cat >"$small_txt" <<'TXT'
Estudo IA Local - arquivo TXT pequeno para aceite do MVP.

Este material simula uma anotacao de estudo. A aplicacao deve importar o texto,
dividir o conteudo em chunks, gerar pelo menos um card e permitir marcar a
resposta como Acertei durante a revisao.

Topicos:
- Importacao local de arquivos.
- Geracao de flashcards com IA local.
- Persistencia dos documentos e cards no SQLite.
TXT

cat >"$large_txt" <<'TXT'
Estudo IA Local - arquivo TXT grande para validar geracao incremental.

Capitulo 1: Importacao local.
O estudante seleciona um arquivo do proprio computador. O aplicativo preserva
o caminho de origem e armazena o conteudo localmente, sem enviar dados para a
internet. Esse comportamento protege materiais privados e reduz dependencia de
servicos externos.

Capitulo 2: Chunking.
Depois da importacao, o conteudo e dividido em partes menores. Cada chunk deve
ser pequeno o suficiente para o modelo local responder sem travar a interface.
O usuario consegue acompanhar a quantidade de chunks e gerar cards em lotes.

Capitulo 3: Geracao com Ollama.
O modelo local recebe um trecho por vez e retorna perguntas e respostas. O app
deve tolerar respostas imperfeitas, salvar cards validos assim que aparecem e
informar erro quando a geracao nao puder continuar.

Capitulo 4: Revisao.
Durante o estudo, o usuario revela a resposta e classifica o card como Errei,
Dificil ou Acertei. Essa marcacao atualiza historico, prioridade e proxima data
de revisao, permitindo acompanhar retencao.

Capitulo 5: Exportacao.
Depois de estudar, o usuario pode exportar relatorios e cards. A exportacao
deve conter apenas dados do documento ativo, evitando misturar informacoes de
outros materiais.

Capitulo 6: Falhas controladas.
O MVP deve responder bem a caminhos invalidos, modelo ausente, Ollama parado e
cancelamento de operacoes longas. O objetivo e nao perder dados ja salvos.
TXT

write_pdf() {
  local path="$1"
  : >"$path"

  local offsets=()

  append() {
    printf '%s' "$1" >>"$path"
  }

  append_line() {
    printf '%s\n' "$1" >>"$path"
  }

  current_offset() {
    wc -c <"$path" | tr -d ' '
  }

  write_object() {
    local object_number="$1"
    local object_body="$2"
    offsets[$object_number]="$(current_offset)"
    append_line "$object_number 0 obj"
    append "$object_body"
    append_line ""
    append_line "endobj"
  }

  local stream_content
  stream_content=$'BT\n/F1 12 Tf\n72 720 Td\n(MVP PDF text sample for Estudo IA Local.) Tj\n0 -18 Td\n(This file validates PDF text extraction and card generation.) Tj\n0 -18 Td\n(The app should import this PDF, create chunks and generate cards.) Tj\nET\n'
  local stream_length
  stream_length="$(printf '%s' "$stream_content" | wc -c | tr -d ' ')"

  append_line "%PDF-1.4"
  write_object 1 $'<< /Type /Catalog /Pages 2 0 R >>'
  write_object 2 $'<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
  write_object 3 $'<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>'
  write_object 4 $'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  offsets[5]="$(current_offset)"
  append_line "5 0 obj"
  append_line "<< /Length $stream_length >>"
  append_line "stream"
  append "$stream_content"
  append_line "endstream"
  append_line "endobj"

  local xref_offset
  xref_offset="$(current_offset)"

  append_line "xref"
  append_line "0 6"
  append_line "0000000000 65535 f "

  for object_number in 1 2 3 4 5; do
    printf '%010d 00000 n \n' "${offsets[$object_number]}" >>"$path"
  done

  append_line "trailer"
  append_line "<< /Root 1 0 R /Size 6 >>"
  append_line "startxref"
  append_line "$xref_offset"
  append_line "%%EOF"
}

write_pdf "$pdf_file"

printf 'Amostras do MVP criadas em: %s\n' "$output_dir"
printf '%s\n' "- TXT pequeno: $small_txt"
printf '%s\n' "- TXT grande: $large_txt"
printf '%s\n' "- PDF com texto: $pdf_file"
