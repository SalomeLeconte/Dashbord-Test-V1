# Dashbord-Test-V1

Dashboard de prospection commerciale permettant d’analyser les clients, prospects, machines, visites, chiffres d’affaires et données terrain à partir du fichier `data11.csv`.

L’objectif principal est d’aider les PSSR à prioriser les visites clients grâce à des filtres, indicateurs, tableaux, cartographie et outils de préparation d’itinéraire.

---

## Objectif du projet

Ce dashboard permet de :

- visualiser les clients et prospects prioritaires ;
- filtrer les données par PSSR, département, ville, canton, secteur d’activité, NAF / APE, CA et flotte machine ;
- identifier les clients à visiter en priorité ;
- suivre les machines récentes, anciennes, en fin de garantie ou liées à l’undercarriage ;
- analyser le CA PDR, Service et Global ;
- préparer une liste de visites commerciales ;
- organiser une tournée terrain sur carte.

---

## Nouveautés WIP — version 07/08/2026 à 15:00

Cette date est volontairement figée jusqu’à demande de mise à jour.

### Données et affichage

- Intégration du nouveau `data11.csv` corrigé.
- Correction des colonnes nécessaires au dashboard : séparateur CSV, noms de colonnes, départements et villes.
- Affichage d’un bandeau d’angle discret `MAJ data + contenu 7 Août 15:00` sur ordinateur et tablette.
- Tri par défaut de l’onglet **Données** du plus gros CA Global vers le plus faible.

### Filtres type Excel

- Ajout de menus rapides dans les en-têtes de colonnes de l’onglet **TOP 200** :
  - Client / Prospect ;
  - Localisation ;
  - CA 2025 / CA 2026 ;
  - NB machines ;
  - Visites 2026 ;
  - Priorités.
- Ajout de menus rapides dans l’onglet **Données** :
  - Client / Prospect ;
  - Localisation ;
  - Indicateur financier ;
  - Flotte identifiée / NB machines.
- Les petits triangles des en-têtes fonctionnent en toggle : un clic ouvre, un deuxième clic referme.

### TOP 200 et priorisation

- TOP 200 recalculable côté dashboard à partir du CA, des clients éligibles et des machines récentes.
- Détection des machines récentes restaurée via le flag `NEW` et la colonne `Machines récentes par client`.
- Lecture améliorée des objectifs de visite 2026 : objectif annuel, déjà fait, reste à faire.

### Undercarriage

- Ajout du filtre **Train de roulement / Undercarriage** dans la section `7. UNDERCARRIAGE`.
- Lecture des colonnes :
  - `Machines SMR par client` ;
  - `Class BULL par client` ;
  - `Class EXCA par client` ;
  - `Class MVM par client` ;
  - `travel pct exca par client` ;
  - `travel hours exca par client`.
- Lecture des classes `AA`, `AB`, `AC`, `BA`, `BB`, `BC`, `CA`, `CB`, `CC` avec la logique corrigée :
  - `AA` = plus prioritaire ;
  - `CC` = priorité faible.
- Filtres par type, classe, priorité, SMR, activité moyenne, travel EXCA % et travel hours.
- Ajout d’un tableau undercarriage dans la fiche détail client.
- Suppression de l’ancienne box temporaire `Filtre non fonctionnel`.

### Canton adaptatif

- Ajout d’un filtre **Canton adaptatif**.
- La liste des cantons s’adapte au département sélectionné.
- Si une ville est saisie, la liste est réduite aux cantons cohérents autour de cette ville.
- Option GPS **Cantons autour de moi** avec rayon 10 / 25 / 50 km.
- Déduction automatique du canton depuis commune, département et coordonnées quand disponibles.
- Suppression de l’ancien bloc temporaire `Cantons — in progress`.

### Cartographie et itinéraire

- Remplacement de la heat map peu lisible par une lecture départementale plus claire dans **Mon terrain**.
- Ajout d’une recherche intelligente sur la cartographie classique pour ajouter un client du PSSR en bleu sur la carte.
- Les points bleus ajoutés via la recherche intelligente sont pris en compte dans l’itinéraire optimisé.
- Le bouton Effacer et les poubelles gèrent aussi les points bleus.
- Simplification du statut itinéraire avec suppression de messages redondants.

### Nettoyage interface et responsive

- Suppression des blocs temporaires visibles côté utilisateur.
- Optimisations d’affichage ordinateur, tablette et mobile.
- Feedback conservé sans animation clignotante.

---

## Fonctionnalités principales

### Tableau de bord

- Vue synthétique des clients / prospects.
- Liste filtrable des lignes visibles.
- Compteurs dynamiques.
- Affichage du Top 200 clients selon les critères de priorité.
- Onglet Données trié par CA Global décroissant.

### Filtres disponibles

- PSSR.
- Département.
- Ville.
- Canton adaptatif.
- Agence.
- Client / Prospect.
- Secteur d’activité.
- NAF / APE.
- Âge machine.
- CA Global, PDR et Service.
- Machines récentes.
- Machines anciennes.
- Fin de garantie.
- Undercarriage.
- Visites 2026.
- Priorités TOP 200.

### Top 200

Le Top 200 est calculé selon une logique de priorité :

1. clients avec CA global le plus élevé ;
2. clients éligibles selon les critères commerciaux ;
3. clients avec machines récentes ;
4. clients avec machines anciennes ou sans visite récente.

L’objectif est de générer une liste exploitable pour les visites commerciales.

### Données machines

Le dashboard affiche notamment :

- numéro de série ;
- modèle machine ;
- date de mise en service ;
- âge machine ;
- fin de garantie ;
- machines récentes ;
- machines anciennes ;
- machines de 5 ans et plus ;
- données undercarriage.

### Données commerciales

Le dashboard permet de suivre :

- CA PDR 2024 / 2025 / 2026 ;
- CA Service 2024 / 2025 / 2026 ;
- CA Global ;
- opportunités CRM ;
- dernières visites ;
- devis récents ;
- informations client ;
- contact, téléphone et e-mail.

### Cartographie et itinéraire

- Affichage des clients sur une carte.
- Recherche intelligente pour ajouter un client à la carte.
- Ajout de points bleus à l’itinéraire.
- Suppression / réintégration des points dans l’itinéraire.
- Calcul d’un itinéraire optimisé.
- Ouverture de la tournée dans Google Maps.
- Vue **Mon terrain** par département.

---

## Structure du projet

```txt
Dashbord-Test-V1/
│
├── index.html
├── dashboard-wip.html
├── README.md
├── data11.csv
├── wip-*.js
├── scripts/
│   └── build-cloudflare.mjs
└── assets/
```
