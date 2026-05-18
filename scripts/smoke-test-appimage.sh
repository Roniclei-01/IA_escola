#!/usr/bin/env bash
set -euo pipefail

appimage_path="src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"
timeout_seconds="${MVP_APPIMAGE_TIMEOUT_SECONDS:-20}"

if [ ! -s "$appimage_path" ]; then
  printf '[fail] AppImage ausente ou vazio: %s\n' "$appimage_path"
  exit 1
fi

chmod +x "$appimage_path"

run_appimage() {
  local mode="$1"
  local log_file
  log_file="$(mktemp)"

  set +e
  if [ "$mode" = "extract" ]; then
    APPIMAGE_EXTRACT_AND_RUN=1 timeout "${timeout_seconds}s" "$appimage_path" >"$log_file" 2>&1
  else
    timeout "${timeout_seconds}s" "$appimage_path" >"$log_file" 2>&1
  fi
  local status=$?
  set -e

  cat "$log_file"
  rm -f "$log_file"
  return "$status"
}

printf 'Iniciando smoke test do AppImage por %ss...\n' "$timeout_seconds"

set +e
direct_output="$(run_appimage direct 2>&1)"
direct_status=$?
set -e

printf '%s\n' "$direct_output"

if [ "$direct_status" -eq 124 ]; then
  printf '[ok] AppImage iniciou e permaneceu aberto ate o timeout.\n'
  exit 0
fi

if [ "$direct_status" -eq 0 ]; then
  printf '[ok] AppImage iniciou e encerrou sem erro.\n'
  exit 0
fi

if printf '%s\n' "$direct_output" | grep -Eiq 'FUSE|Cannot mount AppImage|fusermount'; then
  printf '[info] AppImage direto falhou por FUSE. Tentando APPIMAGE_EXTRACT_AND_RUN=1...\n'
else
  printf '[fail] AppImage falhou com codigo %s.\n' "$direct_status"
  exit "$direct_status"
fi

set +e
extract_output="$(run_appimage extract 2>&1)"
extract_status=$?
set -e

printf '%s\n' "$extract_output"

if [ "$extract_status" -eq 124 ]; then
  printf '[ok] AppImage iniciou em modo sem FUSE e permaneceu aberto ate o timeout.\n'
  exit 0
fi

if [ "$extract_status" -eq 0 ]; then
  printf '[ok] AppImage iniciou em modo sem FUSE e encerrou sem erro.\n'
  exit 0
fi

printf '[fail] AppImage em modo sem FUSE falhou com codigo %s.\n' "$extract_status"
exit "$extract_status"
