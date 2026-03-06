#!/bin/bash
set -e

echo "Discovering games with vite.config.js..."

games=()
for dir in */; do
  if [ -f "${dir}vite.config.js" ]; then
    game=$(basename "$dir")
    games+=("$game")
    echo "Found game: $game"
  fi
done

if [ ${#games[@]} -eq 0 ]; then
  echo "No games found!"
  exit 1
fi

echo ""
echo "Building ${#games[@]} game(s)..."
echo ""

for game in "${games[@]}"; do
  echo "==> Building $game..."
  npm run "build:$game"
  echo ""
done

echo "✓ All games built successfully"
