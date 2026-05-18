#!/usr/bin/env bash
set -euo pipefail

appimage_path="src-tauri/target/release/bundle/appimage/Estudo IA Local_0.1.0_amd64.AppImage"

if [ ! -s "$appimage_path" ]; then
  printf '[fail] AppImage ausente ou vazio: %s\n' "$appimage_path"
  printf 'Gere os pacotes com: npm run tauri build\n'
  exit 1
fi

chmod +x "$appimage_path"

printf 'Abrindo AppImage: %s\n' "$appimage_path"

set +e
"$appimage_path"
status=$?
set -e

if [ "$status" -eq 0 ]; then
  exit 0
fi

if [ "$status" -eq 127 ]; then
  printf '[info] AppImage direto falhou. Tentando modo sem FUSE...\n'
  APPIMAGE_EXTRACT_AND_RUN=1 "$appimage_path"
  exit $?
fi

printf '[fail] AppImage encerrou com codigo %s.\n' "$status"
exit "$status"
