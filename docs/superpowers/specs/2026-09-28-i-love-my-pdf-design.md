# Cahier des charges — I Love My P.D.F.

Date : 2026-09-28
Statut : validé en brainstorming, en attente de relecture finale

## 1. Vision

**I Love My P.D.F.** (P.D.F. = *Private Data Filter*) est un site web gratuit et open source qui **est lui-même l'outil** : fusion, division et conversion PDF ↔ Word, plus un filtrage des données personnelles. Tout le traitement a lieu dans le navigateur de l'utilisateur. Aucun fichier, aucun texte n'est envoyé à un serveur.

Le filtrage sert aussi de sas avant d'utiliser un outil d'IA externe (ChatGPT, Claude, etc.) : l'utilisateur colle son texte, le site remplace les données personnelles par des étiquettes (`[EMAIL_1]`, `[TELEPHONE_1]`…), puis l'utilisateur copie le texte filtré vers l'outil de son choix.

Projet frère indépendant d'Alicia PDF (application Windows locale). Il en reprend la philosophie — traitement 100 % local, original jamais modifié, relecture humaine — mais pas le code ni la marque.

## 2. Public visé

Grand public francophone et anglophone, non technique en priorité. Le ton, les textes et l'interface doivent rassurer sans jargon.

## 3. Périmètre fonctionnel v1

### 3.1 Filtrer des données personnelles
- Entrées : texte collé, fichier TXT, DOCX ou PDF (PDF avec couche texte).
- Détection par règles (expressions régulières + validations) :
  - adresses email ;
  - numéros de téléphone (formats FR et internationaux E.164) ;
  - IBAN (avec contrôle de la clé modulo 97) ;
  - numéros de sécurité sociale français (avec clé de contrôle) ;
  - numéros de carte bancaire (avec contrôle de Luhn) ;
  - dates (dont dates de naissance) ;
  - adresses postales françaises (numéro + type de voie + code postal) ;
  - adresses IP ;
  - URL.
- Chaque donnée détectée est remplacée par une étiquette cohérente : la même valeur reçoit toujours la même étiquette dans un document (`jean@x.fr` → `[EMAIL_1]` partout).
- Relecture : l'utilisateur voit les détections surlignées, peut en décocher une (faux positif) ou sélectionner un passage oublié pour le masquer.
- Sorties :
  - bouton **Copier le texte filtré** ;
  - bouton **Télécharger le document filtré** : même format que l'entrée pour TXT et DOCX, nom `original_prv.ext`. Pour un PDF, v1 produit un TXT ou DOCX filtré (voir § 7).
- Avertissement permanent et visible : la détection par règles ne trouve pas tout (notamment les noms de personnes en texte libre) ; relire avant de partager.

### 3.2 Fusionner des PDF
- Déposer plusieurs PDF, les réordonner par glisser-déposer, obtenir un seul PDF.

### 3.3 Diviser un PDF
- Aperçu des pages en miniatures.
- Deux modes : extraire une sélection de pages dans un nouveau PDF ; découper en plusieurs fichiers (par plages ou une page par fichier, livrés en ZIP).

### 3.4 Convertir PDF → Word
- Objectif : un .docx dont le texte est **sélectionnable et modifiable**.
- Méthode : extraction du texte avec positions (pdf.js), regroupement en lignes puis paragraphes, conservation des niveaux de taille de police (titres), gras/italique quand l'information est disponible, sauts de page.
- Limites assumées et affichées : mise en page approximative, pas de reconstruction fidèle des tableaux complexes ni des colonnes multiples, PDF scannés (sans couche texte) non pris en charge en v1.

### 3.5 Convertir Word → PDF
- Lecture du .docx (mammoth.js → HTML structuré), puis génération d'un PDF avec texte réel (pas une image) via pdf-lib avec une police embarquée.
- Prise en charge : paragraphes, titres, gras/italique, listes, images, tableaux simples.
- Limites assumées : mise en page Word complexe (en-têtes/pieds, colonnes, zones de texte) approximée.

## 4. Pages du site

- **Accueil** : promesse, les outils en cartes, les trois preuves de confiance.
- **Une page par outil** : Filtrer, Fusionner, Diviser, PDF → Word, Word → PDF.
- **Comment ça marche** : explication sans jargon du traitement local, de l'absence de serveur et de traceurs, lien vers le code source, comment le vérifier soi-même (onglet Réseau du navigateur). Explique le nom : P.D.F. = *Private Data Filter*.
- **À propos / Soutenir** : projet, licence, lien de dons.
- Chaque page existe en français (`/fr/…`) et en anglais (`/en/…`).

## 5. Architecture technique

### 5.1 Principe
Site statique généré à l'avance, avec des « îlots » interactifs : chaque outil est un composant isolé, chargé uniquement sur sa page. Tout traitement lourd tourne dans un Web Worker pour que l'interface ne se fige jamais.

### 5.2 Choix
| Rôle | Choix |
|---|---|
| Générateur de site, i18n par routes | Astro |
| Composants interactifs (îlots) | React + TypeScript |
| Styles | CSS natif avec variables (design tokens), pas de framework CSS imposé |
| Lecture/rendu PDF, extraction de texte | pdf.js (`pdfjs-dist`) |
| Écriture PDF (fusion, division, Word → PDF) | pdf-lib (+ `@pdf-lib/fontkit` pour polices) |
| Lecture DOCX | mammoth.js |
| Écriture DOCX | `docx` |
| ZIP (division multi-fichiers) | fflate |
| Communication avec les workers | Comlink |
| Tests unitaires | Vitest |
| Tests de bout en bout | Playwright |
| Hébergement (plus tard) | statique : GitHub Pages ou Cloudflare Pages |

### 5.3 Découpage en unités
- `src/core/detect/` — moteur de détection : fonctions pures, une règle par type de donnée, entrée texte → liste de détections `{type, start, end, value}`. Aucune dépendance au navigateur, testable seul.
- `src/core/redact/` — applique des détections validées à un texte et gère la numérotation cohérente des étiquettes.
- `src/core/pdf/` — fusion, division, extraction de texte, PDF → Word, Word → PDF. Une fonction par opération, entrées/sorties en `Uint8Array`.
- `src/core/docx/` — lecture et réécriture de DOCX filtré.
- `src/workers/` — un worker par famille d'outils, qui expose les fonctions de `core` via Comlink.
- `src/components/tools/` — un îlot React par outil (UI seulement, appelle le worker).
- `src/components/ui/` — composants d'interface partagés (zone de dépôt, bouton, liste réordonnable, miniatures, bandeau d'avertissement).
- `src/i18n/` — textes FR/EN.
- `src/pages/[lang]/` — pages Astro.

Règle : `core` ne connaît ni React ni le DOM ; les composants ne contiennent aucune logique de traitement.

### 5.4 Flux de données (exemple : filtrage)
1. L'utilisateur dépose un fichier : lecture en `ArrayBuffer` dans le navigateur.
2. Transfert au worker ; extraction du texte ; détection.
3. Retour des détections à l'îlot ; affichage surligné ; l'utilisateur coche/décoche/ajoute.
4. Envoi des détections validées au worker ; génération du texte ou du fichier filtré.
5. Téléchargement via un `Blob` local ou copie dans le presse-papiers.

### 5.5 Garantie « zéro réseau »
- Content-Security-Policy stricte : `connect-src 'self'`, aucune origine tierce pour scripts, polices ou images. Toutes les dépendances et polices sont servies depuis le site lui-même.
- Aucun `fetch` vers l'extérieur dans le code ; un test automatisé Playwright vérifie qu'aucune requête vers une autre origine n'est émise pendant l'utilisation de chaque outil.
- Aucun cookie, aucun traceur, aucune statistique d'audience.

### 5.6 Gestion des erreurs
- PDF protégé par mot de passe, corrompu ou sans couche texte : message clair et localisé, pas de plantage.
- Fichier très volumineux : avertissement au-delà de 100 Mo (mémoire du navigateur).
- Toute erreur de worker est remontée à l'îlot et affichée ; l'original n'est jamais modifié.

## 6. Identité et UX/UI

- Nom : **I Love My P.D.F.** — P.D.F. = *Private Data Filter*. Les points dans « P.D.F. » marquent le sigle et distinguent le nom d'iLovePDF. Nom technique du dépôt : `i-love-my-pdf`.
- Direction visuelle : **Chaleureux & Accessible** — fond crème, accent terracotta, formes arrondies, ton amical et rassurant.
- Les couleurs, rayons, espacements et typographies sont définis comme design tokens (variables CSS) dans un seul fichier, pour itérer facilement sur l'interface.
- Thème sombre prévu via les mêmes tokens.
- Accessibilité : contraste AA, navigation clavier complète (dont le réordonnancement), libellés ARIA, responsive mobile.
- Le porteur du projet souhaite expérimenter en UX/UI : la v1 livre une base fonctionnelle et propre, les écrans restent ouverts à l'itération plutôt que figés.

## 7. Hors périmètre v1

- Masquage visuel directement dans un PDF (rectangles noirs réécrits dans le fichier) : le filtrage d'un PDF produit un TXT ou DOCX filtré en v1. Candidat prioritaire pour la v2.
- OCR des PDF scannés.
- Modèle d'IA (NER) dans le navigateur pour détecter les noms de personnes et lieux.
- Compression, rotation, conversion PDF ↔ images.
- Mode hors-ligne (PWA).
- Comptes utilisateurs, stockage, historique.

## 8. Open source et gouvernance

- Licence MIT.
- Dépôt Git local pour l'instant ; publication sur GitHub plus tard.
- Contributions par pull requests, fusionnées uniquement par le mainteneur.
- Fichiers attendus au moment de la publication : README (FR/EN), LICENSE, CONTRIBUTING, guide « ajouter un outil ».

## 9. Modèle économique

Gratuit, sans publicité, sans compte. Lien discret vers des dons optionnels (GitHub Sponsors / Ko-fi), aucune fonctionnalité réservée.

## 10. Critères de réussite v1

- Les cinq outils fonctionnent dans Chrome, Firefox, Safari et Edge récents, sur ordinateur et mobile.
- Le test automatisé « zéro requête externe » passe pour chaque outil.
- Le moteur de détection trouve 100 % des cas du jeu de tests synthétique (emails, téléphones, IBAN, NIR, cartes, dates, adresses, IP, URL) et ses faux positifs connus sont documentés.
- Aucune donnée détectée et validée ne subsiste dans un fichier filtré exporté (test automatisé).
- Site entièrement disponible en français et en anglais.
