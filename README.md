# Dashbord-Test-V1

Dashboard de prospection commerciale permettant d’analyser les clients, prospects, machines et opportunités à partir de fichiers de données CSV / Power BI.

L’objectif principal est d’aider les PSSR à prioriser les visites clients grâce à des filtres, indicateurs, tableaux et visualisations simples.

---

## Objectif du projet

Ce dashboard permet de :

- visualiser les clients et prospects prioritaires ;
- filtrer les données par PSSR, agence, secteur, NAF / APE, âge machine, CA, etc. ;
- identifier les clients à visiter en priorité ;
- afficher les machines récentes ou anciennes ;
- analyser le CA PDR et Service sur 2024 / 2025 / 2026 ;
- préparer une liste de visites commerciales ;
- faciliter la prospection terrain.

---

## Fonctionnalités principales

### Tableau de bord

- Vue synthétique des clients / prospects.
- Liste filtrable des lignes visibles.
- Compteurs dynamiques.
- Affichage du Top 200 clients selon les critères de priorité.

### Filtres disponibles

- PSSR
- Agence
- Client / Prospect
- Secteur d’activité
- NAF / APE
- Âge machine
- CA PDR
- CA Service
- Machines récentes
- Machines sans visite récente

### Top 200

Le Top 200 est calculé selon une logique de priorité :

1. Clients avec CA global le plus élevé.
2. Clients éligibles selon les critères commerciaux.
3. Clients avec machines récentes.
4. Clients avec machines anciennes ou sans visite récente.

L’objectif est de générer une liste exploitable pour les visites commerciales (export .xlsx/pdf in progress).

### Données machines

Le dashboard affiche notamment :

- numéro de série ;
- modèle machine ;
- date de mise en service ;
- âge machine ;
- fin de garantie ;
- machines récentes ;
- machines anciennes ;
- machines de plus d’un an sans visite en 2026 (in progress)

### Données commerciales

Le dashboard permet de suivre :

- CA PDR 2024 / 2025 / 2026 ;
- CA Service 2024 / 2025 / 2026 ;
- opportunités CRM ;
- dernières visites ;
- prochaines visites ;
- informations client ;
- contact, téléphone et e-mail.

### Itinéraire

Une partie itinéraire peut être utilisée pour organiser les visites terrain.

Fonctionnalités prévues ou disponibles :

- affichage des clients sur une carte ;
- choix du point de départ ;
- possibilité d’utiliser sa position actuelle ;
- possibilité d’utiliser sa position actuelle comme départ et arrivée ;
- préparation d’une tournée commerciale.

---

## Structure du projet

Exemple de structure recommandée :

```txt
Dashbord-Test-V1/
│
├── index.html
├── README.md
│
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── img/
│
├── data/
│   ├── clients.csv
│   ├── machines.csv
│   ├── ventes_pdr.csv
│   ├── ventes_service.csv
│   ├── crm_activites.csv
│   └── crm_opportunites.csv
│
└── docs/
