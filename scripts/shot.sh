#!/bin/bash
# usage: [SHOT_CLICK=sel SHOT_SETTLE=ms SHOT_AFTER_CLICK=ms] shot.sh <Name> <outdir>  (needs `npm run dev` on :5188; see shotcdp.mjs for env)
# writes <Name>-1280.png, -375.png, -worst.png (1280, ?worst=1), -reduced.png (1280, reduced motion); prints console errors (none = clean)
N=$1; O=${2:-.}; mkdir -p "$O"
U="http://localhost:5188/?c=$N"
S="$(dirname "$0")/shotcdp.mjs"
node "$S" "$U" "$O/${N}-1280.png" 1280
node "$S" "$U" "$O/${N}-375.png" 375
node "$S" "$U&worst=1" "$O/${N}-worst.png" 1280
node "$S" "$U" "$O/${N}-reduced.png" 1280 reduced
echo "shots in $O"
