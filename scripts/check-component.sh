#!/usr/bin/env bash
# Mechanical gate for ONE component (never judges taste). Usage: scripts/check-component.sh <Name>
# Checks: tsc (this folder only), portable-rule greps, never-loaded font families, remote URLs return 200,
# meta.json fields, PROMPT.md freshness. Exit 1 if any FAIL. Read-only: it changes no files.
set -uo pipefail
N=${1:?usage: check-component.sh <Name>}
REPO="$(cd "$(dirname "$0")/.." && pwd)"
D="$REPO/components/$N"
[ -d "$D" ] || { echo "no such component: $N"; exit 1; }
fail=0
bad() { echo "FAIL  $1"; fail=1; }
ok()  { echo "ok    $1"; }
TSX="$D/Component.tsx"; CSS="$D/Component.module.css"

# 1. tsc, filtered to this folder (other folders may be mid-edit by someone else)
out=$(cd "$REPO" && npx tsc --noEmit 2>&1 | grep "components/$N/" || true)
[ -z "$out" ] && ok "tsc clean for $N" || { bad "tsc errors"; echo "$out"; }

# 2. portable rules (CONTRACT §2)
chk() { # label, pattern, files...
  local label=$1 pat=$2; shift 2
  local hits; hits=$(grep -nE "$pat" "$@" 2>/dev/null || true)
  [ -z "$hits" ] && ok "$label: none" || { bad "$label"; echo "$hits" | head -8; }
}
chk "dangerouslySetInnerHTML" 'dangerouslySetInnerHTML' "$TSX"
chk "transition: all" 'transition:[[:space:]]*all' "$CSS"
chk "viewport @media (use @container)" '@media[^{]*\((min|max)-(width|height)' "$CSS"
chk "eyebrow/kicker in code (CONTRACT §10 ban)" '(eyebrow|kicker)' "$TSX" "$CSS"
chk "gradient text" 'background-clip:[[:space:]]*text' "$CSS"
chk "hard offset shadow" 'box-shadow:[[:space:]]*-?[0-9]+px[[:space:]]+-?[0-9]+px[[:space:]]+0[[:space:]]' "$CSS"
# window/document outside effects is a human check; list every use so you can eyeball it
n=$(grep -cE '\b(window|document)\.' "$TSX" || true)
echo "info  window./document. uses in Component.tsx: $n (each must sit inside an effect or event handler, never in render)"

# 3. fonts: Wix catalog families are named, never loaded (codegen loads them; preview.tsx imports @fontsource)
if grep -qE '@font-face|url\([^)]*\.woff2?' "$CSS"; then
  bad "fonts: @font-face or font file in the component; name a Wix catalog family instead (skill: wix-fonts.md)"
else
  ok "fonts: no @font-face in the component"
fi
grep -q "@fontsource/" "$D/preview.tsx" 2>/dev/null \
  || echo "info  preview.tsx imports no @fontsource package; captures will show a system font if the CSS names a catalog face"

# 4. remote URLs return 200 (images, video)
urls=$(grep -hoE "https?://[^'\"\`) <>\\\\]+" "$TSX" "$CSS" "$D/preview.tsx" 2>/dev/null | grep -vE 'www\.w3\.org|schema\.org|localhost' | sort -u)
for u in $urls; do
  code=$(curl -s -o /dev/null -L -m 15 -w '%{http_code}' "$u")
  [ "$code" = "200" ] && ok "200 $u" || bad "$code $u"
done
[ -z "$urls" ] && ok "no remote URLs"

# 5. files + meta.json + PROMPT freshness
for f in Component.tsx Component.module.css preview.tsx meta.json PROMPT.md; do [ -f "$D/$f" ] || bad "missing $f"; done
if [ -f "$D/meta.json" ]; then
  python3 - "$D/meta.json" <<'PY' || fail=1
import json,sys
m=json.load(open(sys.argv[1]))
req=["id","name","display_name","owner_settings","scores","art_direction","studio2_tested","checks","status"]
miss=[k for k in req if k not in m]
print("ok    meta.json fields complete" if not miss else "FAIL  meta.json missing: "+", ".join(miss))
if not m.get("selectable_parts"): print("warn  meta.json has no selectable_parts: inner pieces stay unselectable in the editor")
if miss: sys.exit(1)
PY
fi
if [ -f "$D/PROMPT.md" ]; then
  tmp=$(mktemp -d); mkdir -p "$tmp/components"; cp -R "$D" "$tmp/components/$N"; mkdir -p "$tmp/scripts"; cp "$REPO/scripts/build-prompts.sh" "$tmp/scripts/"
  (cd "$tmp" && bash scripts/build-prompts.sh "$N" >/dev/null 2>&1)
  cmp -s "$tmp/components/$N/PROMPT.md" "$D/PROMPT.md" && ok "PROMPT.md matches build-prompts.sh output" \
    || bad "PROMPT.md is stale or hand-written: run bash scripts/build-prompts.sh $N"
  rm -rf "$tmp"
fi

echo; [ $fail -eq 0 ] && echo "MECHANICAL GATE: PASS (this is a floor; judge the bar with your eyes)" || echo "MECHANICAL GATE: FAIL"
exit $fail
