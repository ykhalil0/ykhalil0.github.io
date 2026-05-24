# Yusuf Khalil Personal Website

Source for your personal website at:
- `https://yusufkhalil.com`

## Stack
- Static HTML + CSS for the main site pages
- Isolated React + Vite + Tailwind build for `games/`
- Hosted with GitHub Pages (`ykhalil0.github.io`)

## Project Structure
- `index.html`: main page content and metadata
- `books/index.html`: standalone books page
- `game-src/`: source for the React game pages
- `games/`: built static output served by GitHub Pages
- `style.css`: site styling
- `package.json`: game build and preview scripts
- `vite.config.mjs`: isolated Vite config for the game page
- `CNAME`: custom domain (`yusufkhalil.com`)
- `docs/website-philosophy.md`: design/content principles for this site

## Local Preview
For the main site pages, from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

For game development:

```bash
npm install
npm run dev:game
```

For a production rebuild of the published game pages:

```bash
npm run build:game
```

## Design Philosophy
Reference `docs/website-philosophy.md` before making UI or content-structure changes.
Treat it as the source of truth for current design preferences and constraints.

Quick reminders:
- Use Source Serif 4 for homepage/books body text, Source Sans 3 for headings, UI/meta text, and game pages, and preserve the current type scale.
- Keep the top-right light/dark theme toggle minimal and text-only.
- Publications: title + right-side cedar year + IEEE-style metadata (no `[1]`, newest first).
- Books: `Title — Author, Year.` format on `/books/`; personal comments optional; no numbering.
- Books can be grouped with simple lowercase category sub-headers.
- User-authored notes/comments should be lowercase and italic.
- Timeline logos should stay visually consistent in size and alignment.
- Check desktop, iPad, and mobile before pushing.

## Editing Workflow
1. Update `index.html`, `style.css`, and/or `game-src/`.
2. If `game-src/` changed, run `npm run build:game`.
3. Commit both source changes and the rebuilt `games/` output.
4. Push to `main`.
5. GitHub Pages deploys automatically.
