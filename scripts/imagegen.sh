#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PYTHON="$ROOT_DIR/.venv-imagegen/bin/python"
IMAGEGEN_SCRIPT="$HOME/.codex/skills/imagegen/scripts/image_gen.py"
ENV_FILE="$ROOT_DIR/.env.imagegen"

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "Error: missing $VENV_PYTHON. Create the imagegen venv first." >&2
  exit 1
fi

if [[ ! -f "$IMAGEGEN_SCRIPT" ]]; then
  echo "Error: missing imagegen skill script at $IMAGEGEN_SCRIPT." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

exec "$VENV_PYTHON" "$IMAGEGEN_SCRIPT" "$@"
