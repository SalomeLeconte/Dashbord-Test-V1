# Dashbord-Test-V1

Dashboard de prospection déployable sur Cloudflare Pages.

## Architecture

```text
.
├── index.html                  # Application principale
├── data11.csv                  # Données chargées par le dashboard
├── assets/                     # Images et fichiers statiques
├── src/                        # Sources JS optionnelles conservées dans le build
├── scripts/
│   └── build-cloudflare.mjs    # Script de build Cloudflare Pages
├── _headers                    # En-têtes HTTP Cloudflare Pages
├── _redirects                  # Fallback vers index.html
├── package.json                # Scripts npm
└── .gitignore
```

## Déploiement Cloudflare Pages

Réglages recommandés :

```text
Framework preset: None
Build command: npm run build
Build output directory: dist
Root directory: laisser vide
```

## Test local

```bash
npm run build
npm run preview
```

Puis ouvrir :

```text
http://127.0.0.1:4180
```

## Données

Le dashboard charge le fichier :

```text
data11.csv
```

Si le CSV est remplacé, conserver exactement ce nom ou modifier la constante `CSV_FILE` dans `index.html`.
