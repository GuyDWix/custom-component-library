#!/usr/bin/env bash
set -euo pipefail
REPO=wix-private/editor-react-component-creation-skills
SHA=517e0bb45ac50c7300b3e156a7c5855c1a843d15
SRC=packages/editor-component-creation
OUT="$(dirname "$0")/../.skill"

fetch() { gh api "repos/$REPO/contents/$1?ref=$SHA" -H "Accept: application/vnd.github.raw" > "$OUT/$2"; }

mkdir -p "$OUT/references" "$OUT/scripts"
fetch "$SRC/SKILL.md" SKILL.md
for f in $(gh api "repos/$REPO/contents/$SRC/references?ref=$SHA" --jq '.[].name'); do fetch "$SRC/references/$f" "references/$f"; done
for f in $(gh api "repos/$REPO/contents/$SRC/scripts?ref=$SHA" --jq '.[].name'); do fetch "$SRC/scripts/$f" "scripts/$f"; done
echo "Synced skill @ ${SHA:0:7} → $OUT"
