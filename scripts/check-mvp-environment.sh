#!/usr/bin/env bash
set -euo pipefail

required_model="llama3.2:1b"
ollama_tags_url="http://127.0.0.1:11434/api/tags"
appimage_path="src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"
deb_path="src-tauri/target/release/bundle/deb/Estudo IA Local_0.1.0_amd64.deb"
rpm_path="src-tauri/target/release/bundle/rpm/Estudo IA Local-0.1.0-1.x86_64.rpm"

failures=0

check_ok() {
  printf '[ok] %s\n' "$1"
}

check_fail() {
  printf '[fail] %s\n' "$1"
  failures=$((failures + 1))
}

check_command() {
  local command_name="$1"
  local label="$2"

  if command -v "$command_name" >/dev/null 2>&1; then
    check_ok "$label encontrado"
  else
    check_fail "$label nao encontrado"
  fi
}

check_file() {
  local file_path="$1"
  local label="$2"

  if [ -s "$file_path" ]; then
    check_ok "$label gerado: $file_path"
  else
    check_fail "$label ausente ou vazio: $file_path"
  fi
}

check_ollama_model() {
  local model_name="$1"
  local ollama_list_output=""
  local tags_json=""

  if ollama_list_output="$(ollama list 2>/dev/null)"; then
    if printf '%s\n' "$ollama_list_output" | awk '{print $1}' | grep -Fxq "$model_name"; then
      check_ok "modelo $model_name instalado"
      return
    fi
  else
    printf '[info] ollama list falhou. Tentando API HTTP local do Ollama...\n'
  fi

  if ! command -v curl >/dev/null 2>&1; then
    check_fail "curl nao encontrado para consultar API local do Ollama"
    return
  fi

  if ! command -v node >/dev/null 2>&1; then
    check_fail "node nao encontrado para validar resposta da API local do Ollama"
    return
  fi

  if ! tags_json="$(curl -fsS "$ollama_tags_url" 2>/dev/null)"; then
    check_fail "API local do Ollama indisponivel em $ollama_tags_url"
    return
  fi

  if printf '%s' "$tags_json" | node -e '
const fs = require("fs");
const expectedModel = process.argv[1];

try {
  const payload = JSON.parse(fs.readFileSync(0, "utf8"));
  const models = Array.isArray(payload.models) ? payload.models : [];
  const found = models.some((model) => model.name === expectedModel || model.model === expectedModel);
  process.exit(found ? 0 : 1);
} catch {
  process.exit(1);
}
' "$model_name"; then
    check_ok "modelo $model_name disponivel pela API local do Ollama"
  else
    check_fail "modelo $model_name nao listado pelo Ollama"
  fi
}

check_command ollama "Ollama"

if command -v ollama >/dev/null 2>&1; then
  check_ollama_model "$required_model"
fi

check_command pdftoppm "pdftoppm"
check_command tesseract "tesseract"
check_command gst-inspect-1.0 "gst-inspect-1.0"

if command -v gst-inspect-1.0 >/dev/null 2>&1; then
  if gst-inspect-1.0 appsink >/dev/null 2>&1; then
    check_ok "GStreamer appsink disponivel"
  else
    check_fail "GStreamer appsink nao encontrado"
  fi
fi

check_file "$deb_path" "pacote DEB"
check_file "$rpm_path" "pacote RPM"
check_file "$appimage_path" "AppImage"

if [ "$failures" -gt 0 ]; then
  printf '\nAmbiente do MVP com %s pendencia(s).\n' "$failures"
  exit 1
fi

printf '\nAmbiente do MVP pronto para aceite manual.\n'
