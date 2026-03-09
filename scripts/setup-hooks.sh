#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/../.git/hooks"

# Remove old pre-commit hook (e.g. from .pre-commit-config.yaml)
if [ -f "$HOOKS_DIR/pre-commit" ]; then
  echo "Removing old pre-commit hook..."
  rm "$HOOKS_DIR/pre-commit"
fi

# Install new pre-commit hook
cp "$SCRIPT_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

echo "Pre-commit hook installed successfully."
echo "Run 'git commit' to trigger build + test checks automatically."
