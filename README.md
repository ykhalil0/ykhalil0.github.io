# Yusuf Khalil Personal Website

Source for your personal website at:
- `https://yusufkhalil.com`

## Stack
- Static HTML + CSS
- Hosted with GitHub Pages (`ykhalil0.github.io`)

## Project Structure
- `index.html`: main page content and metadata
- `books/index.html`: standalone books page
- `style.css`: site styling
- `CNAME`: custom domain (`yusufkhalil.com`)
- `docs/website-philosophy.md`: design/content principles for this site

## Local Preview
From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Design Philosophy
Reference `docs/website-philosophy.md` before making UI or content-structure changes.
Treat it as the source of truth for current design preferences and constraints.

Quick reminders:
- Use `Inter` and preserve the current type scale.
- Publications: title + right-side cedar year + IEEE-style metadata (no `[1]`, newest first).
- Books: `Title — Author, Year.` format on `/books/`; comments optional.
- Timeline logos should stay visually consistent in size and alignment.
- Check desktop, iPad, and mobile before pushing.

## Editing Workflow
1. Update `index.html` and/or `style.css`.
2. Commit changes.
3. Push to `main`.
4. GitHub Pages deploys automatically.
