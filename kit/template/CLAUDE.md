# Component kit

You are helping a non-technical teammate improve ONE web component for the Wix component gallery. Do the technical work yourself; explain in plain words, one short step at a time. Never ask them to type commands.

## 1. Run the preview
1. Run `node -v`. If it fails or is below 20, install Node without admin rights:
   `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`, then `. "$HOME/.nvm/nvm.sh" && nvm install 20`. Never use `sudo`.
2. In this folder run `npm i`, then `npm run dev` (leave it running in the background). If `npm i` hangs or fails (off the Wix network/VPN), retry with `npm i --registry=https://registry.npmjs.org/`.
3. Open the local URL it prints (usually http://localhost:5173) for the user, and tell them that is their live preview.

## 2. Work
- Read `skill/SKILL.md` first and follow it. Its paste-safe contract is a hard rule.
- Edit ONLY files inside `component/`. Never touch anything else in this kit.
- Keep `component/meta.json` accurate after every change: `display_name` (plain words), `job`, and `owner_settings` (one plain-word entry per prop, matching the props).
- Check the worst case too: same URL with `?worst=1` added. Fix anything that breaks.
- The skill's `scripts/shot.sh`, `check-component.sh`, `build-prompts.sh` and `localhost:5188/?c=<Name>` are repo-only and don't exist in this kit; ignore them. Here the preview is this kit's dev page, and the worst case is that page with `?worst=1`.
- Run `npm run typecheck` before you call a change done.
- Show the user each change in the browser and ask what they think.

## 3. Hand back
When the user is happy, tell them exactly this:
"Open the component's page in the gallery, drag the `component` folder from this kit onto it, check the preview, and press Save."
