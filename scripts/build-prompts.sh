#!/usr/bin/env bash
# Regenerates components/<Name>/PROMPT.md from meta.json + code (contract §7). Usage: build-prompts.sh [Name...]
set -euo pipefail
cd "$(dirname "$0")/../components"
names=("$@"); [ ${#names[@]} -eq 0 ] && names=(*/)
for n in "${names[@]}"; do
  n=${n%/}
  read_meta() { python3 -c "import json,sys;m=json.load(open('$n/meta.json'));print($1)"; }
  title=$(read_meta "m['display_name']")
  settings=$(read_meta "', '.join(s[0].lower()+s[1:] for s in m['owner_settings'])")
  {
    printf 'Create a custom element called "%s". Build it exactly as this React reference (same look, behavior and defaults).\n\n' "$title"
    printf 'The site owner must be able to change: %s. Add other settings if they help.\n\n' "$settings"
    printf '```tsx\n'; cat "$n/Component.tsx"; printf '```\n\n'
    printf '```css\n'; cat "$n/Component.module.css"; printf '```\n'
  } > "$n/PROMPT.md"
  echo "$n $(wc -c < "$n/PROMPT.md")"
done
