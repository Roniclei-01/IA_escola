#!/usr/bin/env bash
set -euo pipefail

required_model="llama3.2:1b"
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

check_command ollama "Ollama"

if command -v ollama >/dev/null 2>&1; then
  if ollama list | awk '{print $1}' | grep -Fxq "$required_model"; then
    check_ok "modelo $required_model instalado"
  else
    check_fail "modelo $required_model nao listado pelo Ollama"
  fi
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
