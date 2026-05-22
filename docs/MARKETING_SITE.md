# MemoryLane Marketing Site (GitHub Pages)

Static marketing pages live in this `docs/` folder and can be hosted free on **GitHub Pages**.

## What's included

| File | Purpose |
|------|---------|
| `index.html` | Landing page (hero, features, FAQ, download CTAs) |
| `privacy.html` | Privacy policy (required for App Store) |
| `terms.html` | Terms of use |
| `css/style.css` | Styles matching app colors |
| `assets/icon.png` | App icon |
| `.nojekyll` | Disables Jekyll so static assets work |

## Enable GitHub Pages

1. Push this repo to GitHub (if not already).
2. Open the repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
4. Branch: `main` (or your default branch), folder: **`/docs`**.
5. Save. After 1–2 minutes your site is live at:

   `https://<your-github-username>.github.io/<repo-name>/`

   Example: `https://kashish024.github.io/MemoryLane/`

## Custom domain (optional)

Your app references `memorylaneapp.com` for privacy/terms. To use that domain:

1. Add a `CNAME` file in `docs/` containing: `memorylaneapp.com`
2. In GitHub Pages settings, set **Custom domain** to `memorylaneapp.com`
3. At your DNS provider, add the records GitHub shows (usually `A` + `CNAME` for `www`)

Then update app links in `screens/PremiumScreen.js` if paths change.

## App Store links

Edit the bottom of `docs/index.html`:

```javascript
const APP_STORE_URL = "https://apps.apple.com/app/idXXXXXXXX";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.kashish024.memorylane";
```

Leave empty to show "Coming soon" disabled buttons.

## Preview locally

```bash
cd docs
python3 -m http.server 8080
# Open http://localhost:8080
```

Or open `index.html` directly in a browser (some features work best via a local server).

## Updating content

- **Copy / features:** Edit `index.html` sections directly.
- **Legal:** Update `privacy.html` and `terms.html` (have a lawyer review before production).
- **Branding:** Colors are in `css/style.css` (`:root` variables)—they match `tailwind.config.js` in the app.

## Note on existing docs

Other `.md` files in `docs/` are developer documentation. With `.nojekyll` present, GitHub serves `index.html` as the site root; markdown files are not published as pages unless linked.
