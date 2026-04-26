# CLAUDE.md

## Project Context

This is the static portfolio website for Hansje Görtz, a Dutch-Indonesian actress based in Amsterdam. The site presents her acting profile, showreel, credits, training, skills, photo gallery, contact form, and Spotlight link.

The site is deployed on Netlify from this repository and is served as plain HTML, CSS, and JavaScript. There is no build step or package manager dependency.

## Key Files

- `index.html` - Main single-page website content and structure.
- `css/style.css` - Public site styling.
- `css/editor.css` - Hidden inline editor styling.
- `js/main.js` - Public site interactions.
- `js/editor.js` - Hidden inline editor behavior for `#edit`.
- `images/` - Hero, about, and gallery images.
- `netlify.toml` - Netlify publish settings, cache headers, and security headers.
- `LOGS.md` - Human-readable change log.

## Development Notes

- Keep the site lightweight and dependency-free unless the user explicitly asks otherwise.
- Preserve the existing visual tone: elegant, cinematic, actor portfolio, image-led, refined typography.
- The hidden editor is available at `/#edit`; changes there can update editable content and commit through GitHub.
- Netlify caches CSS, JS, and images for a long time. If `css/style.css` or `js/main.js` changes, update the version query strings in `index.html` unless the editor save flow already does it.
- Keep accessibility in mind for navigation, tabs, forms, lightbox, and keyboard behavior.

## Change Log Rule

After every meaningful code, content, styling, image, config, or behavior change, update `LOGS.md`.

Keep log entries short to avoid wasting tokens:

- Add the newest entry near the top of the relevant version section, or create a new dated section if the change is large.
- Use 1-4 bullets total for a normal change.
- Each bullet should be one short line: `- **Area** - What changed.`
- Do not paste long explanations, diffs, command output, screenshots, or implementation notes.
- Do not repeat unchanged historical context.
- If the change is tiny, add one bullet only.

Suggested format:

```md
## Version X.Y - Month YYYY

### Updates
- **Area** - Short description of the change.
```

If the user asks for especially minimal logs, use this even shorter format:

```md
## YYYY-MM-DD
- **Area** - Short change summary.
```

## Before Finishing

- Confirm `LOGS.md` has a concise entry for the work completed.
- Mention any tests or checks run.
- If no check was run, say so briefly in the final response.
