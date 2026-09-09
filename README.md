# Dipen Kalal — Cloud & DevOps portfolio

Source for [dipen.site](https://dipen.site). A curated six-phase journey through AWS foundations, Terraform, serverless applications, delivery pipelines, disaster recovery, and the Dipen AI Platform (DAP).

## Repository structure

- `index.html`: accessible portfolio content and six case studies.
- `assets/css/portfolio.css`: responsive layout, typography and reduced-motion-aware animation.
- `assets/js/portfolio.js`: phase selection, URL history and Background controls.
- `assets/icons/favicon.svg`: portfolio tab icon. Navigation icons are inline SVG.
- `CNAME`: GitHub Pages domain.
- `robots.txt`: public portfolio indexing policy.
- `_config.yml`: excludes the archived application from GitHub Pages.
- `service-worker.js`: retirement worker for the previous logbook cache.
- `archive/gig-work-hub/`: preserved original application snapshot; not part of the portfolio.
- `docs/`: maintenance and migration notes.

## Run locally

From the repository root run `python3 -m http.server 8000`, then open http://localhost:8000. No build step or frontend dependencies are required. Fonts use Google Fonts with system fallbacks.

## Maintain content

Edit the six articles in index.html. Retain phase IDs phase-01 through phase-06 so deep links and navigation work. Add only relevant original work. Keep claims grounded in source repositories or owner-supplied records. The Qwen tests used different completion lengths and are not a like-for-like speed benchmark.

## Deployment

GitHub Pages publishes main from the repository root using Jekyll. Keep CNAME set to dipen.site. The archive is excluded by _config.yml. No Supabase connection is used by the portfolio.

Before publishing, check JavaScript syntax with `node --check assets/js/portfolio.js`, asset paths, all six phases, browser back/forward, Background close, keyboard focus and mobile layout. Check animation with reduced motion enabled.

## Project status

DAP v2.1 and v2.2 investigation descriptions are based on owner-provided records; v2.2 validation does not mean v2.2 has been released. Disaster recovery timings have not been benchmarked.
