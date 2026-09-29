# Outils PDF : Fusionner, Diviser, PDF → Word, Word → PDF — conception

Date : 2026-09-29
Statut : validé par le porteur du projet (fusion par fichiers entiers ; livraison des 4 outils en une fois)
Réunit les plans 2 et 3 du cahier des charges (§ 3.2 à 3.5).

## 1. Principes communs

- Tout le traitement a lieu dans le navigateur ; aucune requête vers une autre origine (test automatique par outil).
- Une page par outil et par langue : `/[lang]/merge/`, `/[lang]/split/`, `/[lang]/pdf-to-word/`, `/[lang]/word-to-pdf/`. Les cartes « Bientôt » de l'accueil deviennent des liens ; une rangée « Autres outils » en bas de chaque page d'outil.
- Même langage visuel que « Filtrer » : zone de dépôt, fiches de fichiers, boutons fluides, barre de progression animée pendant le traitement, messages d'erreur clairs (PDF protégé, fichier illisible, type non pris en charge, fichier > 100 Mo).
- Le travail lourd (pdf-lib, ZIP, écriture Word, mise en page PDF) tourne dans un worker dédié (`src/workers/pdfTools.worker.ts`) ; pdf.js (lecture, miniatures) reste chargé à la demande dans la page.

## 2. Fusionner

- Dépôt de plusieurs PDF (ajout possible ensuite). Chaque fichier : fiche avec miniature de la 1re page, nom, nombre de pages, bouton « Retirer ».
- Réordonnancement par glisser-déposer et par boutons « Monter » / « Descendre » (clavier).
- « Fusionner les PDF » (au moins 2 fichiers) → `premier-nom_fusion.pdf`, pages copiées telles quelles (pdf-lib `copyPages`).

## 3. Diviser

- Dépôt d'un PDF ; grille de miniatures (rendu progressif).
- Sélection : clic (bascule), Maj + clic (plage), « Tout sélectionner », « Tout désélectionner ».
- **Extraire la sélection** → un PDF `nom_pages.pdf` (pages dans l'ordre du document).
- **Découper** → ZIP `nom_decoupe.zip` : par plages saisies (« 1-3, 4-6, 7 », validées avec message d'erreur) ou une page par fichier. Fichiers `nom_1-3.pdf`, `nom_p4.pdf`…

## 4. PDF → Word

- Lecture par pdf.js du texte avec position, taille et nom de police (gras / italique déduits du nom de police).
- Analyse de mise en page (fonction pure) : lignes (même ligne de base), paragraphes (écart vertical, retrait), titres (taille ≥ 1,25 × taille courante du document), gras / italique par morceau, saut de page entre pages.
- Écriture du `.docx` avec la bibliothèque `docx` (MIT) → `nom.docx`.
- Limites affichées : mise en page approximative ; colonnes multiples, tableaux complexes et images non reconstruits ; PDF scannés refusés.

## 5. Word → PDF

- Lecture du `.docx` avec `mammoth` (BSD-2) → HTML simple, découpé en blocs par un petit analyseur sans DOM (titres, paragraphes, gras, italique, listes à puces et numérotées, images, tableaux simples, sauts de ligne).
- Mise en page maison avec pdf-lib + `@pdf-lib/fontkit` (MIT) : A4, marges 2 cm, police Liberation Sans (4 styles, SIL OFL, déjà servie avec pdf.js), césure aux espaces, titres, puces et numéros, images mises à l'échelle, tableaux en colonnes égales avec bordures, pages ajoutées au besoin. Texte réel, sélectionnable → `nom.pdf`.
- Limites affichées : en-têtes, pieds de page, colonnes, zones de texte et mises en forme avancées approximés ou ignorés.

## 6. Tests

- Unitaires : fusion, extraction, découpage, lecture des plages, analyse de mise en page PDF → Word, analyseur HTML, mise en page Word → PDF (texte relu avec pdf.js).
- Bout en bout : un parcours complet par outil avec vérification du fichier téléchargé, erreurs (PDF protégé ou illisible, plages invalides), aucune requête externe.
