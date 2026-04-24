# Hansje Görtz Website — Change Log

## How to bust the cache after an update

Whenever you change `style.css` or `main.js`, bump the version number in `index.html` so returning visitors pick up the new files immediately. The two lines to update are at the top and bottom of the file:

```html
<!-- top of <head> -->
<link rel="stylesheet" href="css/style.css?v=1.2" />

<!-- bottom of <body> -->
<script src="js/main.js?v=1.2"></script>
```

Change `1.2` → `1.3` (or any new number) on each deploy. HTML itself is never cached by Netlify (`max-age=0, must-revalidate`), so the updated version tags are picked up immediately on the next visit.

---

## Version 1.3 — April 2026

### Inline editor
- **Editor** — New hidden inline editor accessible via `hansjegortz.com/#edit`; reveals a pencil button in the bottom-right corner
- **Auth** — GitHub Personal Access Token prompt; token stored in `sessionStorage` only (cleared on tab close)
- **Text editing** — All key text nodes (tagline, about headings & bio, credits fields, training entries, contact section) are `contenteditable` in edit mode
- **Tag editor** — Remove existing About tags with ×; add new tags via inline input
- **Training editor** — Add/remove entries per list; drag-and-drop reordering within each list
- **Photo editor** — Drag-and-drop reorder photos; upload new photo (commits file to GitHub); remove photo from grid
- **Save & Deploy** — Commits updated `index.html` directly to GitHub via Contents API; Netlify auto-redeploys in ~30 seconds
- **Cache busting** — Version timestamps on CSS/JS links are auto-bumped on every save (no manual edit needed)
- New files: `js/editor.js`, `css/editor.css`

---

## Version 1.2 — April 2026

### Fixes & adjustments
- **Hero** — Reverted underline margin-top back to original (`space-sm`); previous value pushed it too far from the name
- **Credits** — Strengthened left-alignment fix on project title column (`justify-self: start; width: 100%`)
- **Training** — Moved Courses subsection from the right column into the left column, directly below Education
- **Contact form** — Removed `novalidate` so the browser enforces required fields (email must be filled before sending)
- **Cache busting** — Added `?v=1.2` version query string to CSS and JS `<link>`/`<script>` tags

---

## Version 1.1 — April 2026

### New content
- **About** — Removed "the UK and the US" from bio paragraph
- **About** — Added "General American" and "British" accent skill tags
- **About** — Tags no longer react on hover (static, informational only)
- **Watch** — "Full credits and CV available on request" is now a link to the Contact section
- **Credits** — Project titles explicitly left-aligned
- **Training** — General American and British accents added after English in Languages list
- **Training** — RADA and Theatre Sports moved out of Education into a new Courses subsection
- **Training** — Added Manuel Puro 21 Day Selftape Challenge (2025) and Seth Mason 5 Day Selftape Challenge (2026) to Courses
- **Photos** — Added HansjeBadpak2, HansjeKlassiek3, HansjeSpijker1 (photos 6–8)
- **Contact form** — Switched from Formspree to Netlify Forms (`data-netlify="true"`)
- **Contact form** — Added "no confirmation email" notice below the form and in the success message

### Bug fixes
- **Gallery** — Fixed face cropping: `object-position` changed to `top center` on all gallery images
- **Gallery** — Simplified grid to uniform row heights (420px desktop / 360px tablet / 260px mobile); removed uneven tall-item spans
- **Training** — Fixed Languages & Physical Skills text jamming into 80px column: `training-desc:only-child` now spans full width

---

## Version 1.0 — April 2026

### Initial build
- Single-page portfolio: Hero, About, Showreel (YouTube embed), Credits (tabbed: Film / TV / Theatre / Commercial), Training & Skills, Photos (gallery + lightbox), Contact (Netlify form + social links)
- Vanilla HTML / CSS / JS — zero framework dependencies
- Fonts: Cormorant Garamond (display), Jost (UI), DM Sans (body) via Google Fonts CDN
- Sticky header with blur-on-scroll, mobile hamburger overlay nav
- CSS keyframe animations on hero (name, underline, scroll hint)
- Scroll-triggered fade-in via IntersectionObserver
- Keyboard-accessible lightbox (Tab, Enter, Escape, Arrow keys)
- Netlify deployment config (`netlify.toml`) with security headers and long-term cache for assets
