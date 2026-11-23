# Custom Component Library: agent instructions

Building, redesigning or reviewing anything in `components/`? Read `skills/component-craft/SKILL.md` first and follow it (quality bar, art-direction law, common misses, process, file contract). Rules of record: `contract/CONTRACT.md`.

- `.skill/` is a read-only, git-ignored copy of the Wix codegen skill (`bash scripts/sync-skill.sh`). Use its `references/` for portable rules; never write your own files there.
- Touch only `components/<Name>/` for the component you own. Do not commit, switch branches, or start/stop the shared dev server unless told to.
- Gate before reporting: `bash scripts/check-component.sh <Name>`, then look at `bash scripts/shot.sh <Name> <scratch>` output.
