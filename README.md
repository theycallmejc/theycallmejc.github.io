# Jwala Chaubey - Portfolio

A static personal portfolio presenting Jwala Chaubey's platform engineering, SRE, cloud, and AI infrastructure work. The site is published through GitHub Pages.

## Content and assets

- `index.html` is the entry point.
- `profile.json`, `projects.json`, and `skills.json` hold portfolio content.
- `portfolio-data.js`, `portfolio.js`, and `styles.css` render and style the experience.

## Preview locally

From the repository root, start a static HTTP server:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Serving over HTTP keeps browser asset and data loading consistent with GitHub Pages.

## Publish

GitHub Pages serves the static site; update the JSON content and verify the page before publishing changes.